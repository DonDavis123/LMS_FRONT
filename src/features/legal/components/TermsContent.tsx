import Link from "next/link";
import LegalPageShell, { LegalSection } from "@/features/legal/components/LegalPageShell";
import { LEGAL } from "@/features/legal/config/legal.config";

export default function TermsContent() {
  const { shortName, appName, contactEmail } = LEGAL;

  return (
    <LegalPageShell
      title="Terms of Service"
      updated={LEGAL.termsUpdated}
      intro={`These terms govern your use of ${appName}. By signing in or using the service you agree to them.`}
    >
      <LegalSection id="the-service" title="The service">
        <p>
          {shortName} is a hosted CRM for managing leads, contacts, accounts, tasks, meetings, calls
          and reminders. Accounts are created for you by your company&apos;s workspace admin; you
          are responsible for the activity under your login and for keeping your password
          confidential.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="Acceptable use">
        <ul>
          <li>Use {shortName} only for lawful business purposes and only with data you are allowed to hold.</li>
          <li>Do not attempt to access another company&apos;s workspace, probe or disrupt the service, or upload malicious files.</li>
          <li>Do not use the service to send spam or to contact people in breach of applicable law.</li>
        </ul>
      </LegalSection>

      <LegalSection id="your-data" title="Your data">
        <p>
          Your company owns the content it puts into {shortName}. We process it only to provide the
          service, as described in our <Link href={LEGAL.privacyPath}>Privacy Policy</Link>. You are
          responsible for having the right to store the personal information of your leads and
          contacts and for honouring their requests.
        </p>
      </LegalSection>

      <LegalSection id="google" title="Google integration">
        <p>
          Connecting a Google account is optional and subject to Google&apos;s own terms. You can
          disconnect at any time. How we use Google data is described in the Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="Availability and changes">
        <p>
          We work to keep the service available but do not guarantee uninterrupted operation. We may
          change or discontinue features, and may suspend a workspace or user that breaches these
          terms or puts the service at risk.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="Disclaimer and liability">
        <p>
          The service is provided &ldquo;as is&rdquo;. To the extent the law allows, {shortName} is
          not liable for indirect or consequential loss, or for loss of data, profit or business
          arising from use of the service.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to these terms">
        <p>
          We may update these terms; the date above shows the latest version. Continued use after an
          update means you accept it.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          Questions about these terms: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
