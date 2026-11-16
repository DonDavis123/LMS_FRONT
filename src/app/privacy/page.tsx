import type { Metadata } from "next";
import PrivacyPolicyContent from "@/features/legal/components/PrivacyPolicyContent";

export const metadata: Metadata = {
  title: "Privacy Policy | LeadPulse CRM",
  description:
    "How LeadPulse CRM handles your information, including data received from Google APIs.",
};

export default function PrivacyPage() {
  return <PrivacyPolicyContent />;
}
