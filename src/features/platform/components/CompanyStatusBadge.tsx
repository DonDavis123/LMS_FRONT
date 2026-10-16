import { companyStatusClasses, companyStatusLabel } from "@/features/platform/utils/platformLabels";

export default function CompanyStatusBadge({ status }: { status: string | null | undefined }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${companyStatusClasses(status)}`}>
      {companyStatusLabel(status)}
    </span>
  );
}
