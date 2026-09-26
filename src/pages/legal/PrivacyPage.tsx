import { LegalLayout } from './LegalLayout';

export function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro="This Privacy Policy explains how Darapet collects, uses, stores, and protects information when you use the Darapet application."
    >
      <h2>1. Information we collect</h2>
      <p>We collect information you provide when you create and use a Darapet account, including your name, email address, account preferences, campaigns, contacts, and other content you choose to store in the application.</p>
      <p>If you connect Gmail, we receive the Google account email address and the authorization information needed to provide the Gmail features you request. Darapet requests the Gmail permission to send email on your behalf when you instruct the application to do so.</p>

      <h2>2. How we use information</h2>
      <ul>
        <li>To create and authenticate your Darapet account.</li>
        <li>To provide campaign, scouting, scheduling, and email features you request.</li>
        <li>To send messages through your connected Gmail account when you instruct us to do so.</li>
        <li>To maintain, secure, troubleshoot, and improve the application.</li>
        <li>To communicate with you about your account, service updates, and security matters.</li>
      </ul>

      <h2>3. Gmail data</h2>
      <p>Darapet uses Google OAuth to connect your Gmail account. We do not ask for or store your Google password. Gmail authorization tokens are handled by the server and stored in encrypted form.</p>
      <p>We use Gmail data only to provide the Gmail features you request. We do not sell Gmail data or use it for advertising. We do not transfer Gmail data to data brokers. We do not use Gmail data to train general-purpose artificial intelligence models.</p>
      <p>You can disconnect Gmail from Darapet at any time. You can also revoke Darapet's access from your Google Account security settings.</p>

      <h2>4. Sharing and service providers</h2>
      <p>We may use service providers that help us host, secure, authenticate, store, and operate Darapet. These providers process information only as needed to provide their services and are expected to protect it.</p>
      <p>We may disclose information when required by law, to protect the security of the service, or to prevent fraud, abuse, or harm.</p>

      <h2>5. Data retention and deletion</h2>
      <p>We retain information while your account or requested service remains active, or for as long as reasonably necessary for legitimate business, legal, security, and backup purposes. You may request deletion of your account information and connected Gmail data through the support contact associated with Darapet.</p>

      <h2>6. Security</h2>
      <p>We use reasonable technical and organizational safeguards to protect information. No online service can guarantee absolute security, so please protect your Darapet and Google accounts and notify us if you suspect unauthorized access.</p>

      <h2>7. Children</h2>
      <p>Darapet is not intended for children under 13, and we do not knowingly collect personal information from children under 13.</p>

      <h2>8. Changes to this policy</h2>
      <p>We may update this Privacy Policy when the service or legal requirements change. We will update the date at the top of this page and provide additional notice where appropriate.</p>

      <h2>9. Contact</h2>
      <p>For privacy questions or data deletion requests, use the support contact shown in your Darapet account or the contact email listed in the Darapet Google OAuth consent screen.</p>
    </LegalLayout>
  );
}
