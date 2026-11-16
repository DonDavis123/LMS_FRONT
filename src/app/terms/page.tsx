import type { Metadata } from "next";
import TermsContent from "@/features/legal/components/TermsContent";

export const metadata: Metadata = {
  title: "Terms of Service | LeadPulse CRM",
  description: "The terms that govern use of LeadPulse CRM.",
};

export default function TermsPage() {
  return <TermsContent />;
}
