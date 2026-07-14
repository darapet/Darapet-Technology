import {
    Briefcase, Rocket, Newspaper, Sparkles, Repeat2, Handshake,
    Target, PartyPopper, Waves, Heart, type LucideIcon,
    } from 'lucide-react';

    export interface SocialLink { platform: string; url: string; }

    interface TemplateProps {
    brandName: string; logoUrl: string; brandColor: string;
    emailBgColor?: string; headerBgOverride?: string; footerBgOverride?: string;
    subject: string; body: string; signatureUrl: string | null;
    recipientName: string; socialLinks?: SocialLink[];
    websiteUrl?: string; ctaUrl?: string;
    /** URL that unsubscribes the recipient. Required for Gmail/Yahoo bulk delivery. */
    unsubscribeUrl?: string;
    }
    interface EmailTemplate {
    id: string; name: string; category: string;
    icon: LucideIcon;
    renderHTML: (props: TemplateProps) => string;
    }

    // Social platform brand colours and short labels used for the pill buttons.
    // No SVG / data-URI images — those are blocked by Gmail, Outlook, and most
    // email clients. Pure HTML table cells work everywhere.
    const EMAIL_SOCIAL_ICONS: Record<string, { color: string; label: string }> = {
    website:   { color: '#6B7280', label: '🌐 Website'   },
    linkedin:  { color: '#0A66C2', label: 'in LinkedIn'  },
    instagram: { color: '#E4405F', label: '📷 Instagram' },
    facebook:  { color: '#1877F2', label: 'f Facebook'   },
    twitter:   { color: '#000000', label: '𝕏 Twitter'    },
    youtube:   { color: '#FF0000', label: '▶ YouTube'    },
    tiktok:    { color: '#000000', label: '♪ TikTok'     },
    };

    function renderSocialRow(links: SocialLink[], websiteUrl?: string): string {
    const all: SocialLink[] = [];
    if (websiteUrl) all.push({ platform: 'website', url: websiteUrl });
    if (links) all.push(...links);
    if (all.length === 0) return '';
    // Pill-button links — no images, no data URIs. Works in Gmail, Outlook,
    // Apple Mail, and every other client that blocks external/inline images.
    const badges = all.map(({ platform, url }) => {
      const cfg = EMAIL_SOCIAL_ICONS[platform];
      if (!cfg || !url) return '';
      const { color, label } = cfg;
      return `<a href="${url}" target="_blank"
        style="display:inline-block;margin:0 4px 6px;padding:7px 14px;background:${color};border-radius:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">${label}</a>`;
    }).join('');
    return badges;
    }

    // ─── Design helpers ────────────────────────────────────────────────────────────
    const F = `-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif`;

    const cta = (label: string, color: string, href = '#', light = false) =>
    `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:26px 0 10px;">
      <tr><td align="center">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr><td align="center" bgcolor="${color}" style="border-radius:10px;box-shadow:0 6px 18px ${color}40;">
            <a href="${href}" target="_blank" class="btn-full"
              style="display:inline-block;padding:13px 32px;font-family:${F};font-size:13.5px;font-weight:700;color:${light ? '#000000' : '#ffffff'};text-decoration:none;border-radius:10px;letter-spacing:0.4px;white-space:nowrap;">${label} &rarr;</a>
          </td></tr>
        </table>
      </td></tr>
    </table>`;

    const eyebrow = (text: string, color = 'rgba(255,255,255,0.6)') =>
    `<p style="margin:0 0 14px;font-family:${F};font-size:11px;font-weight:700;letter-spacing:3.5px;text-transform:uppercase;color:${color};">${text}</p>`;

    const heroHeadline = (text: string, color = '#ffffff', size = '38px') =>
    `<h1 class="main-headline" style="margin:0 0 16px;font-family:${F};font-size:${size};font-weight:900;line-height:1.1;letter-spacing:-1px;color:${color};">${text}</h1>`;

    const heroSub = (text: string, color = 'rgba(255,255,255,0.75)') =>
    `<p style="margin:0;font-family:${F};font-size:16px;font-weight:400;line-height:1.65;color:${color};">${text}</p>`;

    const bodyText = (html: string) =>
    `<div style="font-family:${F};font-size:16px;line-height:1.85;color:#374151;margin:0 0 24px;">${html}</div>`;

    const highlight = (text: string, color: string) =>
    `<div style="border-left:3px solid ${color};background:${color}12;border-radius:0 10px 10px 0;padding:18px 22px;margin:0 0 28px;">
      <p style="margin:0;font-family:${F};font-size:15px;line-height:1.7;color:#1e293b;font-style:italic;">${text}</p>
    </div>`;

    const divider = () =>
    `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0;">
      <tr><td style="border-top:1px solid #e2e8f0;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>`;

    const statRow = (items: Array<{num:string;label:string}>, color: string) =>
    `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px;">
      <tr>${items.map(it => `<td align="center" style="padding:20px 12px;background:${color}0a;border-radius:12px;margin:0 6px;">
        <p style="margin:0 0 4px;font-family:${F};font-size:28px;font-weight:900;color:${color};">${it.num}</p>
        <p style="margin:0;font-family:${F};font-size:11px;font-weight:600;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;">${it.label}</p>
      </td>`).join('<td width="8"></td>')}</tr>
    </table>`;

    // ─── Email shell ───────────────────────────────────────────────────────────────
    function wrap(
    previewText: string,
    headerHtml: string,
    bodyHtml: string,
    accentColor: string,
    p: TemplateProps,
    opts: { headerBg: string; outerBg?: string; footerBg?: string }
    ): string {
    const outerBg = p.emailBgColor || opts.outerBg || '#F1F5F9';
    const footerBg = p.footerBgOverride || opts.footerBg || '#0F172A';
    const socialRow = renderSocialRow(p.socialLinks ?? [], p.websiteUrl);
    const headerBarBg = p.headerBgOverride || opts.headerBg;

    const logoBlock = p.logoUrl
      ? `<table border="0" cellpadding="0" cellspacing="0"><tr>
           <td valign="middle"><img src="${p.logoUrl}" alt="${p.brandName}" height="22"
             style="max-height:22px;max-width:90px;object-fit:contain;display:block;"></td>
           <td valign="middle" style="padding-left:8px;"><span style="font-family:${F};font-size:13px;font-weight:700;color:#0f172a;letter-spacing:-0.2px;">${p.brandName}</span></td>
         </tr></table>`
      : `<span style="font-family:${F};font-size:13px;font-weight:700;color:#0f172a;letter-spacing:-0.2px;">${p.brandName}</span>`;

    const greeting = p.recipientName && p.recipientName !== '{{First Name}}'
      ? `<p style="margin:0 0 20px;font-family:${F};font-size:16px;color:#64748b;">Hi ${p.recipientName},</p>`
      : '';

    const sig = p.signatureUrl
      ? `<tr><td bgcolor="#ffffff" style="padding:0 40px 32px;">
          <img src="${p.signatureUrl}" alt="Signature"
            style="max-height:56px;max-width:160px;object-fit:contain;display:block;">
         </td></tr>`
      : '';

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="format-detection" content="email=no">
    <title>${p.subject}</title>
    <style>
    body{margin:0;padding:0;background:${outerBg};-webkit-font-smoothing:antialiased;}
    @media only screen and (max-width:640px){
    .email-card{width:100%!important;border-radius:0!important;}
    .hero-pad{padding:40px 24px 36px!important;}
    .body-pad{padding:36px 24px!important;}
    .main-headline{font-size:28px!important;}
    .btn-full{width:90%!important;display:block!important;box-sizing:border-box!important;}
    }
    </style>
    </head>
    <body>
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}</div>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${outerBg}">
    <tr><td align="center" style="padding:32px 16px;">
    <table class="email-card" border="0" cellpadding="0" cellspacing="0" width="600"
    style="border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(15,23,42,0.12);">

    <!-- TOP ACCENT BAR -->
    <tr><td style="height:4px;background:${accentColor};font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- NAV BAR -->
    <tr><td bgcolor="#ffffff" style="padding:12px 32px;border-bottom:1px solid #f1f5f9;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td valign="middle">${logoBlock}</td>
        ${p.websiteUrl ? `<td valign="middle" align="right"><a href="${p.websiteUrl}" style="font-family:${F};font-size:11px;font-weight:600;color:#94a3b8;text-decoration:none;letter-spacing:0.3px;">Visit website &rarr;</a></td>` : ''}
      </tr></table>
    </td></tr>

    <!-- HERO HEADER -->
    <tr><td bgcolor="${headerBarBg}" class="hero-pad" style="padding:56px 48px 48px;">
      ${headerHtml}
    </td></tr>

    <!-- BODY -->
    <tr><td bgcolor="#ffffff" class="body-pad" style="padding:44px 48px 36px;">
      ${greeting}
      ${bodyHtml}
    </td></tr>

    ${sig}

    <!-- FOOTER -->
    <tr><td bgcolor="${footerBg}" style="padding:36px 40px;">
      ${socialRow ? `<table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr><td align="center" style="padding-bottom:22px;">${socialRow}</td></tr>
      </table>` : ''}
      <p style="margin:0 0 6px;font-family:${F};font-size:13px;font-weight:700;color:#e2e8f0;text-align:center;">${p.brandName}</p>
      <p style="margin:0 0 16px;font-family:${F};font-size:11px;color:#475569;text-align:center;line-height:2;">
        <a href="${p.unsubscribeUrl || `mailto:?subject=unsubscribe`}" style="color:#475569;text-decoration:underline;">Unsubscribe</a>&nbsp;&middot;&nbsp;
        ${p.websiteUrl ? `<a href="${p.websiteUrl}" style="color:#475569;text-decoration:underline;">Privacy Policy</a>&nbsp;&middot;&nbsp;` : ''}
        <a href="${p.websiteUrl || '#'}" style="color:#475569;text-decoration:underline;">View in browser</a>
      </p>
      <p style="margin:0;font-family:${F};font-size:10px;color:#334155;text-align:center;">You received this because you're subscribed to ${p.brandName} updates.</p>
    </td></tr>

    </table>
    </td></tr></table>
    </body></html>`;
    }

    // ─── Templates ─────────────────────────────────────────────────────────────────
    export const EMAIL_TEMPLATES: EmailTemplate[] = [

    // 1 ── Promotional
    { id:'promotional', name:'Promotional', category:'Sales', icon:Target,
      renderHTML: (p) => wrap(
        `A special offer from ${p.brandName} — made just for you`,
        eyebrow('EXCLUSIVE OFFER') + heroHeadline("An offer you<br>don't want<br>to miss.") + heroSub('Crafted exclusively for our subscribers. Limited time only.'),
        bodyText(p.body) +
        cta('Claim Your Offer', p.brandColor, p.ctaUrl || '#') +
        `<p style="text-align:center;font-family:${F};font-size:12px;color:#94a3b8;margin:8px 0 0;">Limited time · Terms apply</p>`,
        p.brandColor, p,
        { headerBg: p.brandColor, outerBg:'#F0F4F8', footerBg:'#0F172A' }
      )},

    // 2 ── Product Launch
    { id:'product', name:'Product Launch', category:'Product', icon:Rocket,
      renderHTML: (p) => wrap(
        `Introducing something new from ${p.brandName}`,
        eyebrow('NEW ARRIVAL', 'rgba(255,255,255,0.55)') +
        heroHeadline(`${p.brandName}<br>just got better.`, '#ffffff', '34px') +
        heroSub("Something we've been perfecting — now available."),
        bodyText(p.body) +
        cta('Get Started Now', p.brandColor, p.ctaUrl || '#'),
        p.brandColor, p,
        { headerBg:'#0F172A', outerBg:'#F8FAFC', footerBg:'#0F172A' }
      )},

    // 3 ── Newsletter
    { id:'newsletter', name:'Newsletter', category:'Content', icon:Newspaper,
      renderHTML: (p) => wrap(
        `Your update from ${p.brandName} — curated this week`,
        eyebrow('THIS WEEK') + heroHeadline('Your weekly<br>update is here.') + heroSub('The best from us, delivered straight to you.'),
        bodyText(p.body) +
        cta('Read More', p.brandColor, p.ctaUrl || '#'),
        p.brandColor, p,
        { headerBg: p.brandColor, outerBg:'#F8FAFC', footerBg:'#0F172A' }
      )},

    // 4 ── Cold Outreach
    { id:'outreach', name:'Cold Outreach', category:'Sales', icon:Briefcase,
      renderHTML: (p) => wrap(
        `A personal note from ${p.brandName}`,
        eyebrow('A PERSONAL NOTE', 'rgba(255,255,255,0.5)') +
        heroHeadline('Reaching out<br>with purpose.', '#ffffff', '32px') +
        heroSub("I'll keep this short — I think there's something here worth exploring."),
        bodyText(p.body) + divider() +
        `<p style="font-family:${F};font-size:13px;color:#94a3b8;font-style:italic;margin:0;">Not the right fit? Just reply — I read every response personally.</p>`,
        p.brandColor, p,
        { headerBg:'#1E293B', outerBg:'#EEF2F7', footerBg:'#0F172A' }
      )},

    // 5 ── Partnership
    { id:'partnership', name:'Partnership', category:'Business', icon:Handshake,
      renderHTML: (p) => wrap(
        `A collaboration opportunity from ${p.brandName}`,
        eyebrow("LET'S BUILD TOGETHER") + heroHeadline('A partnership<br>worth exploring.') + heroSub('We believe the best outcomes are built side by side.'),
        bodyText(p.body) +
        cta('Explore the Partnership', p.brandColor, p.ctaUrl || '#'),
        p.brandColor, p,
        { headerBg: p.brandColor, outerBg:'#F5F7FA', footerBg:'#0F172A' }
      )},

    // 6 ── Abandoned / Recovery
    { id:'abandoned', name:'Abandoned Cart', category:'Recovery', icon:Sparkles,
      renderHTML: (p) => {
        const red = '#EF4444';
        return wrap(
          `You left something behind — it's still waiting for you`,
          eyebrow('YOU LEFT SOMETHING BEHIND', 'rgba(255,255,255,0.65)') +
          heroHeadline('Still thinking<br>it over?', '#ffffff', '36px') +
          heroSub("Your selection is saved — but it won’t last forever."),
          highlight("Don’t let this one slip away. We’ve held your spot.", red) +
          bodyText(p.body) +
          cta('Complete Your Order', red, p.ctaUrl || '#'),
          red, p,
          { headerBg: red, outerBg:'#FEF2F2', footerBg:'#0F172A' }
        );
      }},

    // 7 ── Event
    { id:'event', name:'Event Invite', category:'Events', icon:PartyPopper,
      renderHTML: (p) => wrap(
        `You're invited — ${p.brandName} has something special for you`,
        eyebrow("YOU’RE INVITED ✦") + heroHeadline('Join us for<br>something special.') + heroSub("An experience worth showing up for — we’d love to see you there."),
        bodyText(p.body) +
        cta('RSVP — Secure Your Spot', p.brandColor, p.ctaUrl || '#') +
        `<p style="text-align:center;font-family:${F};font-size:12px;color:#94a3b8;margin:8px 0 0;">Spots are limited · Questions? Reply to this email</p>`,
        p.brandColor, p,
        { headerBg: p.brandColor, outerBg:'#F5F0FF', footerBg:'#0F172A' }
      )},

    // 8 ── Re-engagement
    { id:'reengagement', name:'Re-engagement', category:'Retention', icon:Repeat2,
      renderHTML: (p) => {
        const purple = '#7C3AED';
        return wrap(
          `It's been a while — ${p.brandName} misses you`,
          eyebrow('WE MISS YOU', 'rgba(255,255,255,0.6)') +
          heroHeadline("It's been<br>a while.", '#ffffff', '38px') +
          heroSub("We've been building great things — come see what's new."),
          bodyText(p.body) +
          cta('Come Back & Explore', purple, p.ctaUrl || '#'),
          purple, p,
          { headerBg: purple, outerBg:'#F5F3FF', footerBg:'#0F172A' }
        );
      }},

    // 9 ── Personal Note
    { id:'personal', name:'Personal Note', category:'Outreach', icon:Waves,
      renderHTML: (p) => wrap(
        `A quick personal note from ${p.brandName}`,
        eyebrow('A PERSONAL NOTE', 'rgba(255,255,255,0.5)') +
        heroHeadline(`From ${p.brandName},<br>with intention.`, '#ffffff', '30px') +
        heroSub('Keeping outreach personal and purposeful.'),
        bodyText(p.body) + divider() +
        `<p style="font-family:${F};font-size:13px;color:#94a3b8;font-style:italic;margin:0;">If this isn't relevant right now, just say the word — no hard feelings.</p>`,
        p.brandColor, p,
        { headerBg:'#334155', outerBg:'#EEF2F7', footerBg:'#0F172A' }
      )},

    // 10 ── Thank You
    { id:'thankyou', name:'Thank You', category:'Engagement', icon:Heart,
      renderHTML: (p) => wrap(
        `A sincere thank you from everyone at ${p.brandName}`,
        eyebrow('WITH GRATITUDE ♥') + heroHeadline('Thank you —<br>truly.') + heroSub(`From everyone at ${p.brandName}, we mean every word.`),
        highlight('Your trust and support are the foundation of everything we do. This email is a small token of genuine appreciation.', p.brandColor) +
        bodyText(p.body) + divider() +
        `<p style="font-family:${F};font-size:14px;color:#64748b;text-align:center;line-height:1.8;margin:0;">We hope to keep earning your trust — one experience at a time.</p>`,
        p.brandColor, p,
        { headerBg: p.brandColor, outerBg:'#F0EDF7', footerBg:'#0F172A' }
      )},
    ];

    export { EMAIL_SOCIAL_ICONS };
    