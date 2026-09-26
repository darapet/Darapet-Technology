import { LegalLayout } from './LegalLayout';

export function TermsPage() {
  return (
    <LegalLayout
      title="Terms and Conditions"
      intro="These Terms and Conditions govern your use of the dearapet lead engine application and its connected Gmail features."
    >
      <h2>1. Accepting these terms</h2>
      <p>By creating an account or using dearapet lead engine, you agree to these Terms and Conditions and to the Privacy Policy. If you do not agree, do not use the service.</p>

      <h2>2. The Darapet service</h2>
      <p>Darapet provides tools for organizing campaigns, scouting, scheduling, and sending email. Features may change, be limited, or become unavailable as the service develops.</p>

      <h2>3. Your account</h2>
      <p>You are responsible for providing accurate account information, protecting your login details, and all activity carried out through your account. Notify us promptly if you believe your account has been accessed without permission.</p>

      <h2>4. Gmail connection and email responsibility</h2>
      <p>If you connect Gmail, you authorize Darapet to use the Gmail permissions you approve to provide the requested features. You may disconnect Gmail or revoke access at any time.</p>
      <p>You are responsible for the recipients, content, timing, and legality of messages sent through Darapet. You must have the right to contact your recipients and comply with applicable privacy, marketing, anti-spam, and electronic communications laws.</p>
      <p>Do not use Darapet to send unlawful, deceptive, abusive, fraudulent, threatening, or harmful content, or to send unsolicited bulk messages in violation of applicable law or provider rules.</p>

      <h2>5. Your content</h2>
      <p>You retain responsibility for content, contacts, campaign material, and other information you submit to Darapet. You grant Darapet the limited permission needed to host, process, and display that content to provide the service.</p>

      <h2>6. Prohibited use</h2>
      <ul>
        <li>Do not attempt to gain unauthorized access to the service or another user's account.</li>
        <li>Do not interfere with the service, bypass security controls, or abuse usage limits.</li>
        <li>Do not use Darapet to violate the law, another person's rights, or Google's policies.</li>
        <li>Do not upload malware or content intended to harm people or systems.</li>
      </ul>

      <h2>7. Third-party services</h2>
      <p>Darapet may rely on third-party services such as Google, Supabase, and hosting providers. Your use of those services may also be governed by their own terms and privacy policies. Darapet is not responsible for outages or changes controlled by those providers.</p>

      <h2>8. Suspension and termination</h2>
      <p>We may suspend or terminate access if you violate these terms, create security or legal risk, misuse the service, or if continued operation is not reasonably possible. You may stop using Darapet at any time.</p>

      <h2>9. Disclaimers</h2>
      <p>Darapet is provided on an as-available basis. We do not guarantee that the service will always be uninterrupted, error-free, or suitable for every purpose. You are responsible for reviewing messages and campaign settings before sending them.</p>

      <h2>10. Limitation of liability</h2>
      <p>To the extent permitted by applicable law, Darapet will not be responsible for indirect, incidental, special, consequential, or lost-profit damages arising from your use of or inability to use the service.</p>

      <h2>11. Changes to these terms</h2>
      <p>We may update these Terms and Conditions when the service or legal requirements change. We will update the date at the top of this page and provide additional notice where appropriate.</p>

      <h2>12. Contact</h2>
      <p>For questions about these Terms and Conditions, use the support contact shown in your Darapet account or the contact email listed in the Darapet Google OAuth consent screen.</p>
    </LegalLayout>
  );
}
