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
  emoji: string;
  renderHTML: (props: TemplateProps) => string;
}

const base = (props: TemplateProps, accentColor: string, headerContent: string, bodyHTML: string) => `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f4f4f5;}
  .wrap{max-width:600px;margin:0 auto;background:#ffffff;}
  .header{background:${accentColor};padding:32px 40px;text-align:center;}
  .logo{max-height:60px;max-width:200px;object-fit:contain;}
  .brand-name{color:#ffffff;font-size:22px;font-weight:700;margin:0;}
  .body{padding:40px;}
  .greeting{font-size:16px;color:#374151;font-weight:600;margin-bottom:16px;}
  .content{font-size:15px;color:#4b5563;line-height:1.75;white-space:pre-line;}
  .cta{display:inline-block;margin:24px 0;padding:14px 32px;background:${accentColor};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;}
  .footer{background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;}
  .sig-img{max-height:80px;margin-top:8px;}
  .divider{height:1px;background:#e5e7eb;margin:24px 0;}
</style></head>
<body>
<div class="wrap">
  <div class="header">
    ${props.logoUrl ? `<img src="${props.logoUrl}" alt="${props.brandName}" class="logo"><br>` : ''}
    <p class="brand-name">${props.brandName}</p>
    ${headerContent}
  </div>
  <div class="body">
    ${props.recipientName ? `<p class="greeting">Hi ${props.recipientName},</p>` : ''}
    ${bodyHTML}
  </div>
  <div class="footer">
    ${props.signatureUrl ? `<img src="${props.signatureUrl}" alt="Signature" class="sig-img">` : `<p style="color:#9ca3af;font-size:13px;margin:0">${props.brandName}</p>`}
    <p style="color:#d1d5db;font-size:11px;margin:8px 0 0">You received this because you're a potential fit for our services.<br>Reply STOP to unsubscribe.</p>
  </div>
</div>
</body></html>`;

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'professional',
    name: 'Professional Outreach',
    category: 'Business',
    emoji: '💼',
    renderHTML: (p) => base(p, p.brandColor,
      `<p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Professional Business Outreach</p>`,
      `<p class="content">${p.body}</p>
       <div class="divider"></div>
       <p style="font-size:14px;color:#6b7280;">Warm regards,<br><strong>${p.brandName}</strong></p>`
    )
  },
  {
    id: 'campaign',
    name: 'Sales Campaign',
    category: 'Sales',
    emoji: '🚀',
    renderHTML: (p) => base(p, p.brandColor,
      `<p style="color:rgba(255,255,255,0.9);font-size:20px;font-weight:700;margin:8px 0 0;">🚀 Special Opportunity</p>`,
      `<p class="content">${p.body}</p>
       <a href="mailto:${p.brandName}" class="cta">Get Started →</a>
       <div class="divider"></div>
       <p style="font-size:13px;color:#9ca3af;">— The ${p.brandName} Team</p>`
    )
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    category: 'Newsletter',
    emoji: '📰',
    renderHTML: (p) => base(p, '#1e293b',
      `<p style="color:#94a3b8;font-size:13px;margin:8px 0 0;letter-spacing:1px;text-transform:uppercase;">Newsletter</p>
       <h1 style="color:#ffffff;font-size:26px;margin:8px 0 0;">${p.subject}</h1>`,
      `<p class="content">${p.body}</p>`
    )
  },
  {
    id: 'welcome',
    name: 'Welcome Email',
    category: 'Onboarding',
    emoji: '👋',
    renderHTML: (p) => base(p, p.brandColor,
      `<p style="color:#ffffff;font-size:32px;margin:8px 0 0;">👋</p>
       <p style="color:rgba(255,255,255,0.9);font-size:18px;font-weight:600;margin:4px 0 0;">Welcome aboard!</p>`,
      `<p class="content">${p.body}</p>
       <a href="mailto:${p.brandName}" class="cta">Let's Talk →</a>`
    )
  },
  {
    id: 'followup',
    name: 'Follow-Up',
    category: 'Follow-Up',
    emoji: '🔁',
    renderHTML: (p) => base(p, '#0f172a',
      `<p style="color:#64748b;font-size:13px;margin:8px 0 0;letter-spacing:0.5px;">Following Up</p>`,
      `<p style="font-size:15px;color:#374151;margin-bottom:16px;">Just wanted to circle back...</p>
       <p class="content">${p.body}</p>`
    )
  },
  {
    id: 'partnership',
    name: 'Partnership Proposal',
    category: 'Partnership',
    emoji: '🤝',
    renderHTML: (p) => base(p, '#7c3aed',
      `<p style="color:rgba(255,255,255,0.8);font-size:14px;margin:8px 0 0;">Partnership Opportunity</p>`,
      `<p class="content">${p.body}</p>
       <a href="mailto:${p.brandName}" class="cta" style="background:#7c3aed;">Explore Partnership →</a>`
    )
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    category: 'Launch',
    emoji: '🎯',
    renderHTML: (p) => base(p, '#dc2626',
      `<div style="background:rgba(255,255,255,0.15);display:inline-block;padding:6px 16px;border-radius:20px;margin-top:8px;">
         <p style="color:#ffffff;margin:0;font-size:13px;font-weight:600;letter-spacing:1px;">🎯 NEW LAUNCH</p>
       </div>
       <h2 style="color:#ffffff;margin:12px 0 0;font-size:24px;">${p.subject}</h2>`,
      `<p class="content">${p.body}</p>
       <a href="mailto:${p.brandName}" class="cta" style="background:#dc2626;">Learn More →</a>`
    )
  },
  {
    id: 'event',
    name: 'Event Invitation',
    category: 'Events',
    emoji: '🎪',
    renderHTML: (p) => base(p, '#0891b2',
      `<p style="color:rgba(255,255,255,0.8);font-size:13px;margin:8px 0 0;letter-spacing:1px;text-transform:uppercase;">You're Invited</p>
       <h2 style="color:#ffffff;margin:8px 0 0;">${p.subject}</h2>`,
      `<p class="content">${p.body}</p>
       <a href="mailto:${p.brandName}" class="cta" style="background:#0891b2;">RSVP Now →</a>`
    )
  },
  {
    id: 'cold-outreach',
    name: 'Cold Outreach',
    category: 'Outreach',
    emoji: '🌊',
    renderHTML: (p) => base(p, '#475569',
      `<p style="color:rgba(255,255,255,0.7);font-size:13px;margin:8px 0 0;">Quick note from ${p.brandName}</p>`,
      `<p class="content">${p.body}</p>
       <div class="divider"></div>
       <p style="font-size:13px;color:#6b7280;font-style:italic;">P.S. I'd love to hear your thoughts — just hit reply!</p>`
    )
  },
  {
    id: 'thankyou',
    name: 'Thank You',
    category: 'Engagement',
    emoji: '💛',
    renderHTML: (p) => base(p, '#ca8a04',
      `<p style="color:#ffffff;font-size:40px;margin:8px 0 0;">💛</p>
       <h2 style="color:#ffffff;margin:8px 0 0;">Thank You!</h2>`,
      `<p class="content">${p.body}</p>
       <div class="divider"></div>
       <p style="font-size:14px;color:#374151;">With gratitude,<br><strong>${p.brandName}</strong></p>`
    )
  },
];
