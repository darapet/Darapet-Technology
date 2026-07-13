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
    }
    interface EmailTemplate {
    id: string; name: string; category: string;
    icon: LucideIcon;
    renderHTML: (props: TemplateProps) => string;
    }

    const EMAIL_SOCIAL_ICONS: Record<string, { color: string; label: string; path: string }> = {
    website:   { color: '#6B7280', label: 'Website',   path: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 0 1 5.08 16zm2.95-8H5.08a7.987 7.987 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z' },
    linkedin:  { color: '#0A66C2', label: 'LinkedIn',  path: 'M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z' },
    instagram: { color: '#E4405F', label: 'Instagram', path: 'M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z' },
    facebook:  { color: '#1877F2', label: 'Facebook',  path: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2m13 2h-2.5A3.5 3.5 0 0 0 12 8.5V11h-2v3h2v7h3v-7h3v-3h-3V9a1 1 0 0 1 1-1h2V5z' },
    twitter:   { color: '#000000', label: 'X/Twitter', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
    youtube:   { color: '#FF0000', label: 'YouTube',   path: 'M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z' },
    tiktok:    { color: '#000000', label: 'TikTok',    path: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.29 6.29 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34l.04-8.37A8.17 8.17 0 0 0 21 8.26V4.83a4.85 4.85 0 0 1-1.41.18z' },
    };

    function renderSocialRow(links: SocialLink[], websiteUrl?: string): string {
    const all: SocialLink[] = [];
    if (websiteUrl) all.push({ platform: 'website', url: websiteUrl });
    if (links) all.push(...links);
    if (all.length === 0) return '';
    const badges = all.map(({ platform, url }) => {
      const cfg = EMAIL_SOCIAL_ICONS[platform];
      if (!cfg || !url) return '';
      const { color, label, path } = cfg;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'><rect width='36' height='36' rx='10' fill='${color}'/><g transform='translate(6,6)'><svg width='24' height='24' viewBox='0 0 24 24'><path fill='white' d='${path}'/></svg></g></svg>`;
      const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
      return `<a href="${url}" target="_blank" style="display:inline-block;margin:0 5px;text-decoration:none;"><img src="${uri}" width="36" height="36" alt="${label}" border="0" style="display:block;border-radius:10px;"></a>`;
    }).join('');
    return badges;
    }

    // ─── Design helpers ────────────────────────────────────────────────────────────
    const F = `-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif`;

    const cta = (label: string, color: string, href = '#', light = false) =>
    `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:32px 0 8px;">
      <tr><td align="center">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr><td align="center" bgcolor="${color}" style="border-radius:100px;">
            <a href="${href}" target="_blank" class="btn-full"
              style="display:inline-block;padding:17px 48px;font-family:${F};font-size:15px;font-weight:700;color:${light ? '#000000' : '#ffffff'};text-decoration:none;border-radius:100px;letter-spacing:0.4px;white-space:nowrap;">${label} &rarr;</a>
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
      ? `<img src="${p.logoUrl}" alt="${p.brandName}" height="36"
           style="max-height:36px;max-width:140px;object-fit:contain;display:block;">`
      : `<span style="font-family:${F};font-size:15px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;">${p.brandName}</span>`;

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
    <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:${outerBg};">${previewText}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${outerBg}">
    <tr><td align="center" style="padding:32px 16px;">
    <table class="email-card" border="0" cellpadding="0" cellspacing="0" width="600"
    style="border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(15,23,42,0.12);">

    <!-- TOP ACCENT BAR -->
    <tr><td style="height:4px;background:${accentColor};font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- NAV BAR -->
    <tr><td bgcolor="#ffffff" style="padding:20px 40px;border-bottom:1px solid #f1f5f9;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td>${logoBlock}</td>
        ${p.websiteUrl ? `<td align="right"><a href="${p.websiteUrl}" style="font-family:${F};font-size:12px;font-weight:600;color:#94a3b8;text-decoration:none;letter-spacing:0.3px;">Visit website &rarr;</a></td>` : ''}
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
        <a href="#" style="color:#475569;text-decoration:underline;">Unsubscribe</a>&nbsp;&middot;&nbsp;
        <a href="#" style="color:#475569;text-decoration:underline;">Privacy Policy</a>&nbsp;&middot;&nbsp;
        <a href="#" style="color:#475569;text-decoration:underline;">View in browser</a>
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
    