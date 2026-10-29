import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import type { ImportOptions, OwnerChoice } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import { MIN_ROTATION_OWNERS, ownerName } from "@/features/leadImport/utils/optionRules";

type Owners = LeadOwnerOption[] | null;

/** Who a single choice points at, in words. "you" when no owner is named. */
function choiceWho(choice: OwnerChoice, owners: Owners): string {
  if (choice.kind === "round_robin") {
    const count = new Set(choice.owner_ids).size;
    return count >= MIN_ROTATION_OWNERS ? `${count} owners in turn` : "a group of owners (choose at least 2)";
  }
  if (!choice.owner_id) return "you";
  return ownerName(owners, choice.owner_id) ?? "the chosen owner";
}

/** The one-line owner summary at the bottom of the owner card. No trailing full stop. */
export function ownerLine(options: ImportOptions, owners: Owners, totalRows: number): string {
  const plan = options.owner_plan;
  const rows = formatCount(totalRows);

  if (plan.mode === "me") return `All ${rows} leads will be assigned to you`;

  if (plan.mode === "selected") {
    const choice = plan.selected;
    if (choice.kind === "round_robin") {
      const count = new Set(choice.owner_ids).size;
      return count >= MIN_ROTATION_OWNERS
        ? `Up to ${rows} leads will be shared between ${count} owners in turn`
        : "Choose at least 2 owners to share leads in turn";
    }
    return choice.owner_id
      ? `All ${rows} leads will be assigned to ${choiceWho(choice, owners)}`
      : "Choose an owner to see who gets the leads";
  }

  if (plan.on_unmatched === "error") return "Each lead goes to the owner named in your file. Rows with a blank or unknown owner are rejected";
  const fallback = plan.fallback;
  const rest =
    fallback.kind === "round_robin"
      ? `are shared between ${new Set(fallback.owner_ids).size} owners in turn`
      : `go to ${choiceWho(fallback, owners)}`;
  return `Each lead goes to the owner named in your file. Blank or unknown owners ${rest}`;
}

export function duplicateSentence(options: ImportOptions): string {
  switch (options.duplicate_action) {
    case "update":
      return options.owner_plan.change_owner_on_update
        ? "Existing leads are updated from your file, and their owner is changed too. Only filled-in cells are used, and converted leads are never changed."
        : "Existing leads are updated from your file and keep their owner. Only filled-in cells are used, and converted leads are never changed.";
    case "create_anyway":
      return "Every row is added as a new lead, even if it looks like a duplicate.";
    default:
      return "Rows that match an existing lead are skipped. The existing lead stays as it is.";
  }
}

export function convertedSentence(options: ImportOptions): string {
  const account =
    options.account_match === "use_existing"
      ? "an account with the same company name is reused"
      : "a new account is always created";
  const contact =
    options.contact_match === "use_existing"
      ? "a contact with the same email or phone is reused"
      : "a new contact is always created";
  return `Rows marked as converted become an Account and a Contact: ${account}, and ${contact}.`;
}

export function phoneSentence(options: ImportOptions): string {
  return options.split_multiple_phones
    ? "Cells that hold several phone numbers are split into phone and mobile."
    : "Cells that hold several phone numbers are kept as they are.";
}

export function unknownValuesSentence(options: ImportOptions): string {
  return options.unknown_values_as_blank
    ? "Dropdown values we don't recognise are left empty."
    : "A row with a dropdown value we don't recognise is rejected, so you can fix it.";
}
