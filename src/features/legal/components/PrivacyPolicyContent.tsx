import LegalPageShell, { LegalSection } from "@/features/legal/components/LegalPageShell";
import { GOOGLE_SCOPES, LEGAL } from "@/features/legal/config/legal.config";

const GOOGLE_POLICY_URL = "https://developers.google.com/terms/api-services-user-data-policy";
const GOOGLE_PERMISSIONS_URL = "https://myaccount.google.com/permissions";

export default function PrivacyPolicyContent() {
  const { shortName, appName, contactEmail } = LEGAL;

  return (
    <LegalPageShell
      title="Privacy Policy"
      updated={LEGAL.privacyUpdated}
      intro={`${appName} is a lead management tool for sales teams: it keeps leads, contacts, accounts, tasks, meetings, calls and reminders together in one workspace. This policy explains what information ${shortName} handles, why, and the choices you have.`}
    >
      <LegalSection id="information-we-collect" title="Information we collect">
        <ul>
          <li>
            <strong>Account information.</strong> Your name, work email address, role and the
            company workspace you belong to. Passwords are stored only in hashed form.
          </li>
          <li>
            <strong>Workspace content.</strong> Records your team creates in {shortName}: leads,
            contacts, accounts, tasks, meetings, calls, reminders, notes, imported spreadsheets and
            call recordings you choose to upload. This content belongs to your company and is
            visible only to members of that company workspace.
          </li>
          <li>
            <strong>Lead capture form submissions.</strong> If you fill in a company&apos;s public
            lead form, the details you type (such as your name and contact details) are sent to
            that company, which is responsible for how it uses them.
          </li>
          <li>
            <strong>Activity and technical data.</strong> Audit logs of changes made in the
            workspace and standard server logs needed to run and secure the service.
          </li>
          <li>
            <strong>Google account data</strong>, only if you choose to connect Google. See the
            next section.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="google-user-data" title="Google user data">
        <p>
          Connecting Google is optional. It lets you add a Google Meet link to a meeting and have
          Google Calendar send the invitation to participants from your own Google account. If you
          never connect Google, {shortName} receives no data from Google.
        </p>
        <p>When you connect, {shortName} asks for these permissions:</p>
        <ul>
          {GOOGLE_SCOPES.map(({ scope, purpose }) => (
            <li key={scope}>
              <code className="break-all rounded bg-slate-light px-1.5 py-0.5 text-[13px] text-fg">
                {scope}
              </code>
              <br />
              {purpose}
            </li>
          ))}
        </ul>

        <p>
          <strong>What we store.</strong> The email address of the Google account you connected, the
          list of permissions you granted, the time you connected, and a refresh token. The refresh
          token is encrypted before it is saved and is used only to act for you when you schedule or
          change a meeting.
        </p>
        <p>
          <strong>What we do with it.</strong> When you create, edit or delete a meeting that has
          Google Meet, {shortName} creates, updates or cancels the matching event on your primary
          Google Calendar. The event contains the meeting&apos;s title, description, location, time
          and the email addresses of the people you invited. {shortName} only reads back events it
          created itself, to fetch the Meet link. It does not read, list or search the rest of your
          calendar.
        </p>
        <p>
          <strong>What we don&apos;t do.</strong> We don&apos;t sell Google user data, use it for
          advertising or profiling, use it to train machine-learning models, or transfer it to
          anyone except as needed to provide the meeting feature, to comply with the law, or with
          your consent. People at {shortName} do not read your Google data unless you ask us to for
          support, it is needed to investigate abuse or a security issue, or the law requires it.
        </p>
        <p>
          <strong>Limited Use.</strong> {shortName}&apos;s use and transfer to any other app of
          information received from Google APIs will adhere to the{" "}
          <a href={GOOGLE_POLICY_URL} target="_blank" rel="noopener noreferrer">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
        <p>
          <strong>Revoking access.</strong> Use <em>Disconnect</em> on the Google connection in{" "}
          {shortName}: it revokes the token at Google and deletes the stored connection. You can
          also remove {shortName} at any time from your{" "}
          <a href={GOOGLE_PERMISSIONS_URL} target="_blank" rel="noopener noreferrer">
            Google Account permissions
          </a>{" "}
          page. Events already created on your calendar stay there until you delete them.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use-information" title="How we use information">
        <ul>
          <li>To provide the service: sign you in, show your workspace and run its features.</li>
          <li>To send service emails such as password-reset links.</li>
          <li>To secure the service, prevent abuse and keep audit trails for workspace admins.</li>
          <li>To fix problems and improve reliability.</li>
        </ul>
        <p>We do not sell personal information and we do not show advertising.</p>
      </LegalSection>

      <LegalSection id="sharing" title="Who we share it with">
        <p>
          We share information only with infrastructure providers that run {shortName} for us, such
          as hosting, database, file storage and email delivery, and only so they can provide those
          services. Within a workspace, content is shared with other members of the same company
          according to their roles. We may also disclose information when the law requires it.
        </p>
      </LegalSection>

      <LegalSection id="security-retention" title="Security and retention">
        <p>
          Data is sent over HTTPS, workspaces are isolated from each other, access is controlled by
          role, and Google refresh tokens are encrypted at rest. No system is perfectly secure, but
          we work to protect your information.
        </p>
        <p>
          We keep workspace content while the company account is active. A user&apos;s Google
          connection is deleted when they disconnect it or when their user account is deleted.
          Deleted records are removed from our systems; backups are overwritten on their normal
          cycle.
        </p>
      </LegalSection>

      <LegalSection id="your-choices" title="Your choices and rights">
        <p>
          You can view and edit your records in the app, disconnect Google at any time, and ask
          your workspace admin to remove your user account. To ask us to access, correct or delete
          personal information we hold about you, including information you submitted through a
          company&apos;s lead form, email{" "}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. For records a company holds about
          its own leads and contacts, that company decides how they are used, so we may refer your
          request to them.
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children">
        <p>{shortName} is a business tool and is not directed at children under 16.</p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <p>
          If we make a material change we will update the date above and, where appropriate, tell
          workspace admins. Continued use after a change means you accept the updated policy.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          Questions about privacy: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
