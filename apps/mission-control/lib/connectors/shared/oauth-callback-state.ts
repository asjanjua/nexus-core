/**
 * Callback-side verification of the connector OAuth state.
 *
 * Connector callbacks are unauthenticated GET redirects from the provider, so
 * they never ran `requireScope`. That left the signed state as the only thing
 * deciding which workspace the incoming tokens are filed under, and a signed
 * state proves only "this server issued it, recently" — not "the person
 * finishing this install is the person who started it".
 *
 * The attack that closes: an attacker starts an install for THEIR workspace,
 * captures the signed state, and induces a victim to complete the provider
 * consent screen with it. The victim's SharePoint or QuickBooks tokens land in
 * the attacker's workspace. See docs/PR_REVIEW_2026-08-08.md §5.5.
 *
 * The provider redirect is a top-level navigation back to our own origin, so
 * the Clerk session cookie is present (SameSite=Lax permits it). That gives the
 * callback a caller identity to compare against the state.
 *
 * STRICTNESS, AND THE ESCAPE HATCH
 * --------------------------------
 * Default is strict: no resolvable session means the callback is refused. That
 * is the correct security posture, and it is also the change most likely to
 * surface an environment-specific surprise, because it depends on the session
 * cookie surviving a third-party redirect chain in every browser a customer
 * might use.
 *
 * `NEXUS_CONNECTOR_CALLBACK_BIND=report-only` downgrades a missing session from
 * a refusal to a logged warning for the duration of a rollout. It does NOT
 * downgrade a MISMATCH — a state naming a different user than the caller is
 * always refused, in both modes, because that is the attack itself rather than
 * an environment quirk.
 */

import { auth } from "@clerk/nextjs/server";
import {
  consumeConnectorState,
  verifyConnectorState,
  type ConnectorStatePayload,
} from "@/lib/connectors/shared/oauth-state";
import { reportDegradedState, reportHandledError } from "@/lib/observability/report";

function isReportOnly(): boolean {
  return process.env.NEXUS_CONNECTOR_CALLBACK_BIND === "report-only";
}

/**
 * Verify the state, bind it to the signed-in caller, and burn its nonce.
 *
 * Returns null on any of: bad signature, malformed payload, expired, replayed,
 * or a caller who is not the user that started the install. Callers should
 * redirect to `invalid_state` on null — the same handling the previous
 * `verifyConnectorState` call had.
 */
export async function consumeConnectorCallbackState(
  state: string,
  connectorType: string
): Promise<ConnectorStatePayload | null> {
  // Peek before consuming. A state issued to an API key carries a key id that
  // no Clerk session can ever equal, so demanding a session for it would refuse
  // every legitimate token-initiated install. Only `clerk` states are bindable;
  // the rest fall back to signature + expiry + nonce, which is what they had.
  const peeked = verifyConnectorState(state);
  if (!peeked) {
    reportDegradedState("connector callback state failed verification", {
      route: "connectors.shared.consumeConnectorCallbackState",
      errorType: "connector_callback_state_rejected",
      extra: { connectorType, reason: "signature_or_expiry" },
    });
    return null;
  }

  if (peeked.identityKind !== "clerk") {
    reportDegradedState(
      "connector callback state is not session-bindable; nonce and expiry only",
      {
        route: "connectors.shared.consumeConnectorCallbackState",
        errorType: "connector_callback_unbindable_identity",
        workspaceId: peeked.workspaceId,
        extra: { connectorType },
      }
    );
    return consumeConnectorState(state);
  }

  let callerUserId: string | null = null;
  try {
    callerUserId = (await auth()).userId;
  } catch (error) {
    // Clerk throwing here is an infrastructure problem, not an attack. Treat it
    // as "no session" and let the mode decide, but report it — a sustained
    // failure would otherwise look like customers randomly failing to install.
    reportHandledError(error, {
      route: "connectors.shared.consumeConnectorCallbackState",
      errorType: "connector_callback_session_lookup_failed",
      extra: { connectorType },
    });
  }

  if (!callerUserId) {
    if (!isReportOnly()) {
      reportDegradedState("connector callback refused: no signed-in session", {
        route: "connectors.shared.consumeConnectorCallbackState",
        errorType: "connector_callback_no_session",
        extra: { connectorType },
      });
      return null;
    }
    reportDegradedState(
      "connector callback accepted without a session (NEXUS_CONNECTOR_CALLBACK_BIND=report-only)",
      {
        route: "connectors.shared.consumeConnectorCallbackState",
        errorType: "connector_callback_unbound",
        extra: { connectorType },
      }
    );
    // Nonce is still burned, so replay protection holds even in report-only.
    return consumeConnectorState(state);
  }

  const payload = consumeConnectorState(state, callerUserId);
  if (!payload) {
    // Covers signature, schema, expiry, replay AND user mismatch. Mismatch is
    // the interesting one, so it is worth a line either way.
    reportDegradedState("connector callback state rejected", {
      route: "connectors.shared.consumeConnectorCallbackState",
      errorType: "connector_callback_state_rejected",
      extra: { connectorType, callerUserId },
    });
  }
  return payload;
}
