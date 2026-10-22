import type { Metadata } from "next";
import PublicLeadForm from "@/features/leadCapture/components/PublicLeadForm";

export const metadata: Metadata = {
  title: "Get in touch",
  robots: { index: false, follow: false },
};

export default async function PublicLeadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicLeadForm token={token} />;
}
