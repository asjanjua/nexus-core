/**
 * Maps a Meridian scope onto the requirement library.
 *
 * Two vocabularies have to meet here and they do not line up one-to-one:
 *
 *   Scope (what the user declares)   five values: not_licensed, applicant,
 *                                    licensed, variation, renewal
 *   Library (how requirements split) two values: aspirational (what you must
 *                                    prove to GET licensed) and existing
 *                                    (what you must keep proving to STAY
 *                                    licensed)
 *
 * The mapping returns an ARRAY rather than a single value because `applicant`
 * legitimately needs both. An applicant must prove they qualify AND that they
 * can operate on an ongoing basis; a regulator assessing an application looks
 * at both. Collapsing that to one set would hide obligations the applicant is
 * in fact being judged on — the conservative reading, chosen deliberately.
 *
 * Everything else is unambiguous: not_licensed is purely aspirational;
 * licensed, variation, and renewal all describe an entity that already holds a
 * permission and must keep satisfying the ongoing set.
 */

import type { LicenseStatus } from "@/lib/domain/regulatory-requirement-library";
import type { MeridianLicenseStatus } from "@/lib/contracts";

/** Which library requirement sets apply to a declared scope status. */
export function librarySetsFor(status: MeridianLicenseStatus): LicenseStatus[] {
  switch (status) {
    case "not_licensed":
      // Nothing held yet: only the get-licensed set is meaningful.
      return ["aspirational"];
    case "applicant":
      // Judged on both. See the note above — this is the deliberate choice.
      return ["aspirational", "existing"];
    case "licensed":
    case "variation":
    case "renewal":
      // A permission is already held; the ongoing set is what binds.
      return ["existing"];
    default:
      // Unreachable while the enum is exhaustive, but a new status must not
      // silently return an empty requirement pack, which would render as
      // "fully compliant".
      return ["aspirational", "existing"];
  }
}

/** Human-readable reason, shown next to the requirement list. */
export function selectionRationale(status: MeridianLicenseStatus): string {
  switch (status) {
    case "not_licensed":
      return "Showing the requirements for obtaining this licence.";
    case "applicant":
      return "Showing both sets: an application is assessed on what you must prove to qualify and on your ability to operate on an ongoing basis.";
    case "licensed":
      return "Showing the ongoing requirements that apply while the licence is held.";
    case "variation":
      return "Showing the ongoing requirements. A variation is assessed against the permission you already hold.";
    case "renewal":
      return "Showing the ongoing requirements that must still be satisfied at renewal.";
    default:
      return "Showing all requirements for this licence.";
  }
}
