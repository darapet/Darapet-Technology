import {
  Briefcase, Rocket, Newspaper, Sparkles, Repeat2, Handshake, Target, PartyPopper, Waves, Heart,
  type LucideIcon,
} from 'lucide-react';

interface TemplateProps {
  brandName: string;
  logoUrl: string;
  brandColor: string;
  subject: string;
  body: string;
  signatureUrl: string | null;
  recipientName: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  /** In-app UI icon (Lucide component) shown in the template picker — replaces the old emoji glyphs. */
  icon: LucideIcon;
  renderHTML: (props: TemplateProps) => string;
}

// Lightweight inline-SVG icon badges for use inside the sent email HTML itself, so
// recipients see a crisp real icon instead of an emoji glyph (which renders
// inconsistently — or as a "tofu" box — across mail clients and OSes).
const ICON_PATHS = {
  sparkles: `<path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/>`,
  target: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
  heart: `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>`,
};

function svgIcon(paths: string, size: number, fill: boolean) {
  const svg = fill
    ? `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24' fill='#ffffff' stroke='none'>${paths}</svg>`
    : `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24' fill='none' stroke='#ffffff' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>${paths}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const iconBadge = (icon: keyof typeof ICON_PATHS, size = 40, fill = false, extraStyle = '') =>
  `<img src="${svgIcon(ICON_PATHS[icon], size, fill)}" width="${size}" height="${size}" alt="" style="display:block;margin:0 auto 12px;${extraStyle}">`;

const iconInline = (icon: keyof typeof ICON_PATHS, size = 14) =>
  `<img src="${svgIcon(ICON_PATHS[icon], size, false)}" width="${size}" height="${size}" alt="" style="display:inline-block;vertical-align:middle;margin-right:6px;">`;

// Shared wrapper: table-based layout for maximum email client compatibility
const wrap = (preheader: string, headerBg: string, headerContent: string, bodyContent: string, footerContent: string, props: TemplateProps) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${props.subject}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; background-color: #f1f5f9; width: 100% !important; }
    a { color: inherit; }
    .email-container { max-width: 600px; margin: 0 auto; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .mobile-padding { padding: 24px 20px !important; }
      .mobile-btn { width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td style="padding:32px 16px;">
        <table role="presentation" class="email-container" cellspacing="0" cellpadding="0" border="0" width="600" style="margin:0 auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <!-- HEADER -->
          <tr>
            <td style="background-color:${headerBg};padding:40px 48px;text-align:center;">
              ${props.logoUrl ? `<img src="${props.logoUrl}" alt="${props.brandName}" height="48" style="max-height:48px;max-width:160px;object-fit:contain;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;">` : ''}
              ${headerContent}
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td class="mobile-padding" style="background-color:#ffffff;padding:40px 48px;">
              ${props.recipientName ? `<p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1e293b;font-weight:600;">Dear ${props.recipientName},</p>` : ''}
              ${bodyContent}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f8fafc;padding:28px 48px;border-top:1px solid #e2e8f0;text-align:center;">
              ${props.signatureUrl
                ? `<img src="${props.signatureUrl}" alt="Signature" style="max-height:64px;max-width:200px;object-fit:contain;margin-bottom:16px;">`
                : `<p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#334155;font-weight:600;">${props.brandName}</p>`}
              ${footerContent}
              <p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#94a3b8;line-height:1.6;">
                You are receiving this email because you expressed interest in our services.<br>
                <a href="#" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a> &nbsp;·&nbsp; <a href="#" style="color:#94a3b8;text-decoration:underline;">Privacy Policy</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const cta = (label: string, color: string, href = '#') =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
    <tr>
      <td style="border-radius:8px;background-color:${color};">
        <a href="${href}" class="mobile-btn" style="display:inline-block;padding:14px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">${label}</a>
      </td>
    </tr>
  </table>`;

const bodyText = (text: string) =>
  `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.8;color:#475569;white-space:pre-line;">${text}</div>`;

const divider = () =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:28px 0;"><tr><td style="height:1px;background-color:#e2e8f0;"></td></tr></table>`;

const signOff = (name: string, title = '') =>
  `<p style="margin:24px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#64748b;line-height:1.6;">
    Warm regards,<br>
    <strong style="color:#1e293b;">${name}</strong>${title ? `<br><span style="font-size:13px;color:#94a3b8;">${title}</span>` : ''}
  </p>`;

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // 1 — Professional Outreach
  {
    id: 'professional',
    name: 'Professional Outreach',
    category: 'Business',
    icon: Briefcase,
    renderHTML: (p) => wrap(
      `A message from ${p.brandName}`,
      p.brandColor,
      `<p style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#ffffff;margin:0;letter-spacing:-0.3px;">${p.brandName}</p>
       <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:rgba(255,255,255,0.75);margin:8px 0 0;letter-spacing:1.5px;text-transform:uppercase;">Professional Outreach</p>`,
      `${bodyText(p.body)}${divider()}${signOff(p.brandName)}`,
      '',
      p
    ),
  },

  // 2 — Sales Campaign
  {
    id: 'campaign',
    name: 'Sales Campaign',
    category: 'Sales',
    icon: Rocket,
    renderHTML: (p) => wrap(
      `Exclusive opportunity inside — ${p.subject}`,
      '#0f172a',
      `<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;font-weight:700;color:${p.brandColor};letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Limited Opportunity</p>
       <p style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;color:#ffffff;margin:0 0 8px;line-height:1.2;">${p.subject}</p>
       <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:rgba(255,255,255,0.65);margin:0;">From ${p.brandName}</p>`,
      `${bodyText(p.body)}${cta('Claim Your Offer →', p.brandColor)}${signOff(p.brandName)}`,
      '',
      p
    ),
  },

  // 3 — Newsletter
  {
    id: 'newsletter',
    name: 'Newsletter',
    category: 'Newsletter',
    icon: Newspaper,
    renderHTML: (p) => wrap(
      p.subject,
      '#1e293b',
      `<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;font-weight:700;color:#64748b;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 16px;">${p.brandName} &nbsp;·&nbsp; Newsletter</p>
       <p style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:700;color:#ffffff;margin:0;line-height:1.2;">${p.subject}</p>`,
      `${bodyText(p.body)}${divider()}
       <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#94a3b8;margin:0;">Thanks for reading. If you found this valuable, feel free to share it with someone who'd benefit.</p>`,
      '',
      p
    ),
  },

  // 4 — Welcome Email
  {
    id: 'welcome',
    name: 'Welcome Email',
    category: 'Onboarding',
    icon: PartyPopper,
    renderHTML: (p) => wrap(
      `Welcome — we're glad you're here`,
      p.brandColor,
      `${iconBadge('sparkles', 40)}
       <p style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#ffffff;margin:0 0 8px;">Welcome aboard!</p>
       <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:rgba(255,255,255,0.8);margin:0;">You're in good hands with ${p.brandName}</p>`,
      `${bodyText(p.body)}${cta("Let's Get Started →", p.brandColor)}${signOff(p.brandName)}`,
      '',
      p
    ),
  },

  // 5 — Follow-Up
  {
    id: 'followup',
    name: 'Follow-Up',
    category: 'Follow-Up',
    icon: Repeat2,
    renderHTML: (p) => wrap(
      `Following up on my previous note`,
      '#334155',
      `<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Following Up</p>
       <p style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#f1f5f9;margin:0;font-weight:700;">Checking in — ${p.brandName}</p>`,
      `<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#64748b;margin:0 0 20px;font-style:italic;border-left:3px solid #e2e8f0;padding-left:16px;">
        Just circling back on my previous message — I wanted to make sure it didn't get buried.
       </p>
       ${bodyText(p.body)}${divider()}
       <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#94a3b8;margin:0;">P.S. — Even a quick reply to let me know if this isn't the right fit would mean a lot.</p>
       ${signOff(p.brandName)}`,
      '',
      p
    ),
  },

  // 6 — Partnership Proposal
  {
    id: 'partnership',
    name: 'Partnership Proposal',
    category: 'Partnership',
    icon: Handshake,
    renderHTML: (p) => wrap(
      `A partnership opportunity from ${p.brandName}`,
      '#4f46e5',
      `<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Partnership Opportunity</p>
       <p style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#ffffff;margin:0 0 8px;">Let's Build Something Together</p>
       <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:rgba(255,255,255,0.7);margin:0;">From ${p.brandName}</p>`,
      `${bodyText(p.body)}${cta('Explore the Partnership →', '#4f46e5')}${divider()}${signOff(p.brandName, 'Partnerships')}`,
      '',
      p
    ),
  },

  // 7 — Product Launch
  {
    id: 'product-launch',
    name: 'Product Launch',
    category: 'Launch',
    icon: Target,
    renderHTML: (p) => wrap(
      `Introducing something new from ${p.brandName}`,
      '#be123c',
      `<p style="display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:2px;text-transform:uppercase;background:rgba(255,255,255,0.15);padding:6px 16px;border-radius:100px;margin:0 0 16px;">${iconInline('target', 13)}New Release</p>
       <p style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;color:#ffffff;margin:0 0 8px;line-height:1.2;">${p.subject}</p>
       <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:rgba(255,255,255,0.75);margin:0;">by ${p.brandName}</p>`,
      `${bodyText(p.body)}${cta('See What\'s New →', '#be123c')}${signOff(p.brandName)}`,
      '',
      p
    ),
  },

  // 8 — Event Invitation
  {
    id: 'event',
    name: 'Event Invitation',
    category: 'Events',
    icon: PartyPopper,
    renderHTML: (p) => wrap(
      `You're invited — ${p.subject}`,
      '#0369a1',
      `<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:rgba(255,255,255,0.65);letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">You're Invited</p>
       <p style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;color:#ffffff;margin:0 0 8px;line-height:1.2;">${p.subject}</p>
       <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:rgba(255,255,255,0.7);margin:0;">Hosted by ${p.brandName}</p>`,
      `${bodyText(p.body)}${cta('RSVP Now →', '#0369a1')}${divider()}
       <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#94a3b8;margin:0;">Spots are limited — please confirm your attendance at your earliest convenience.</p>
       ${signOff(p.brandName)}`,
      '',
      p
    ),
  },

  // 9 — Cold Outreach
  {
    id: 'cold-outreach',
    name: 'Cold Outreach',
    category: 'Outreach',
    icon: Waves,
    renderHTML: (p) => wrap(
      `A quick note from ${p.brandName}`,
      '#475569',
      `<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:rgba(255,255,255,0.55);letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">A Quick Note</p>
       <p style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#f8fafc;margin:0;">${p.brandName}</p>`,
      `${bodyText(p.body)}${divider()}
       <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#94a3b8;font-style:italic;margin:0 0 20px;">P.S. — I'd genuinely love to hear your thoughts. Hit reply anytime — I read every response personally.</p>
       ${signOff(p.brandName)}`,
      '',
      p
    ),
  },

  // 10 — Thank You
  {
    id: 'thankyou',
    name: 'Thank You',
    category: 'Engagement',
    icon: Heart,
    renderHTML: (p) => wrap(
      `A sincere thank you from ${p.brandName}`,
      '#b45309',
      `${iconBadge('heart', 40, true)}
       <p style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#ffffff;margin:0 0 8px;">Thank You</p>
       <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:rgba(255,255,255,0.75);margin:0;">From the team at ${p.brandName}</p>`,
      `${bodyText(p.body)}${divider()}${signOff(p.brandName)}`,
      '<p style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:13px;color:#94a3b8;margin:0 0 4px;">Your trust means the world to us.</p>',
      p
    ),
  },
];
