# Pinavia Trial Invite Runbook

**Status:** Release gate for the trial-invite portal added in local commit `bb2af6c`.

## Purpose

This runbook enables Pinavia staff to issue a time-bound Nexus trial without
giving customer organization administrators the ability to create product
access. The portal is staff-only at `/admin/invites`; invitees redeem a
single-use link at `/invite/accept` after Clerk sign-up or sign-in.

## Preconditions

1. The release branch is pushed and GitHub CI is green.
2. Render has the standard production Clerk, database, LLM, and storage
   configuration.
3. The migration runner can reach the production non-pooling database URL.

## Enablement

1. Deploy the application revision containing migration 0038.
2. Run the standard migration command. Confirm `trial_invites` exists before
   issuing an invite.
3. In Render, add `PINAVIA_ADMIN_PRINCIPALS` as a comma-separated list of
   Pinavia Clerk user IDs and/or organization IDs. For example:

   ```text
   user_pinavia_owner,org_pinavia_staff
   ```

   Do not include customer workspace administrators. The application returns
   `403 platform_admin_required` for everyone while this value is empty.
4. Redeploy if Render prompts for one after saving the environment value.

## Smoke Test

1. Sign in as a configured Pinavia principal and open `/admin/invites`.
2. Create an invite with a disposable test email and a demo pack.
3. Copy the returned link. Treat it as a bearer credential: it is shown once
   and only its SHA-256 hash is stored.
4. In a separate Clerk identity, open the link, sign up or sign in, and redeem.
5. Confirm the workspace has a Pro trial and an expiry date, then confirm the
   optional sector pack seeded through the redeem API if selected. The invitee
   page must not call the admin-only demo-reset endpoint. A sector pack only
   seeds an otherwise empty workspace; it is skipped rather than replacing an
   existing workspace's evidence.
6. Confirm the invite list records the redemption and the audit trail contains
   `trial_invite.issued` and `trial_invite.redeemed`.
7. Confirm a non-staff signed-in identity receives 403 from the admin portal.

## Rollback and Safety

- Revoke any unredeemed invite from `/admin/invites`.
- Do not delete the database record or expose the invite code in tickets,
  screenshots, or committed documents.
- A redeemed trial is reversible through the existing workspace plan and
  expiry controls; do not delete a customer workspace as a rollback shortcut.
