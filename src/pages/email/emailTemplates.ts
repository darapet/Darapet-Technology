import {
  Briefcase, Rocket, Newspaper, Sparkles, Repeat2, Handshake, Target, PartyPopper, Waves, Heart,
  type LucideIcon,
} from 'lucide-react';

export interface SocialLink {
  platform: string;
  url: string;
}

interface TemplateProps {
  brandName: string;
  logoUrl: string;
  brandColor: string;
  /** Override the email outer background colour (default #f1f5f9) */
  emailBgColor?: string;
  /** Override the template header background colour regardless of the template's own default */
  headerBgOverride?: string;
  subject: string;
  body: string;
  signatureUrl: string | null;
  recipientName: string;
  /** Social links from the user's profile — rendered as clickable icons in the footer */
  socialLinks?: SocialLink[];
  websiteUrl?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  /** In-app UI icon (Lucide component) shown in the template picker. */
  icon: LucideIcon;
  renderHTML: (props: TemplateProps) => string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email-safe brand icon SVGs (viewBox 0 0 24 24, fill white)
// Rendered as data-URI images inside coloured rounded-rect badges.
// These render correctly in Gmail, Outlook, Apple Mail, and mobile clients.
// ─────────────────────────────────────────────────────────────────────────────
const EMAIL_SOCIAL_ICONS: Record<string, { color: string; label: string; path: string }> = {
  website:    { color: '#6B7280', label: 'Website',    path: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 0 1 5.08 16zm2.95-8H5.08a7.987 7.987 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z' },
  linkedin:   { color: '#0A66C2', label: 'LinkedIn',   path: 'M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z' },
  instagram:  { color: '#E4405F', label: 'Instagram',  path: 'M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z' },
  facebook:   { color: '#1877F2', label: 'Facebook',   path: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2m13 2h-2.5A3.5 3.5 0 0 0 12 8.5V11h-2v3h2v7h3v-7h3v-3h-3V9a1 1 0 0 1 1-1h2V5z' },
  twitter:    { color: '#000000', label: 'X / Twitter', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
  youtube:    { color: '#FF0000', label: 'YouTube',    path: 'M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z' },
  tiktok:     { color: '#FF0050', label: 'TikTok',     path: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z' },
  whatsapp:   { color: '#25D366', label: 'WhatsApp',   path: 'M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2m.01 1.67c4.54 0 8.23 3.69 8.23 8.23s-3.69 8.23-8.23 8.23c-1.49 0-2.93-.41-4.19-1.18l-.28-.17-2.93.77.77-2.85-.19-.29A8.17 8.17 0 0 1 3.82 11.9c0-4.54 3.7-8.23 8.23-8.23M8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.87.86-.87 2.07 0 1.22.89 2.39 1 2.56.14.17 1.76 2.67 4.25 3.73.59.27 1.05.42 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.27-.25-.14-1.47-.74-1.69-.82-.23-.08-.37-.12-.56.12-.16.25-.64.81-.78.97-.15.17-.29.19-.53.07-.26-.13-1.06-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.12-.24-.01-.39.11-.5.11-.11.27-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.11-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43-.14 0-.3-.01-.47-.01z' },
  github:     { color: '#24292e', label: 'GitHub',     path: 'M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z' },
  telegram:   { color: '#26A5E4', label: 'Telegram',   path: 'M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z' },
  discord:    { color: '#5865F2', label: 'Discord',    path: 'M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.056a19.989 19.989 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.201 13.201 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z' },
  twitter_x:  { color: '#000000', label: 'X / Twitter', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
  reddit:     { color: '#FF4500', label: 'Reddit',     path: 'M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z' },
  pinterest:  { color: '#E60023', label: 'Pinterest',  path: 'M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z' },
  medium:     { color: '#000000', label: 'Medium',     path: 'M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z' },
  spotify:    { color: '#1DB954', label: 'Spotify',    path: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z' },
  behance:    { color: '#1769FF', label: 'Behance',    path: 'M7.803 5.731c.582 0 1.217.02 1.822.124.46.085.892.225 1.269.48.37.248.66.59.855 1.008.184.401.272.87.272 1.368 0 .595-.147 1.096-.438 1.517-.288.421-.735.76-1.337.996.779.22 1.36.608 1.744 1.157.382.552.577 1.217.577 1.99 0 .5-.097.97-.275 1.4-.182.43-.447.803-.8 1.107-.35.3-.77.516-1.258.664-.486.148-1.031.222-1.633.222H1.18V5.731zm-.217 4.79c.548 0 .983-.116 1.28-.353.3-.235.44-.597.44-1.08 0-.267-.048-.494-.14-.681a1.136 1.136 0 0 0-.385-.44 1.633 1.633 0 0 0-.576-.237 3.47 3.47 0 0 0-.712-.07H3.56V10.52zm.13 5.001c.275 0 .535-.025.775-.077.24-.053.45-.136.63-.254.182-.116.323-.278.426-.482.104-.206.157-.467.157-.777 0-.619-.173-1.067-.513-1.342-.34-.276-.795-.414-1.355-.414H3.56v3.346zm9.743-1.205c.31.297.764.449 1.358.449.427 0 .793-.106 1.1-.318.31-.21.499-.436.569-.675h2.058c-.33.996-.832 1.706-1.512 2.138-.677.43-1.498.646-2.456.646-.667 0-1.27-.106-1.804-.316a4.093 4.093 0 0 1-1.372-.896 4.017 4.017 0 0 1-.878-1.375 4.77 4.77 0 0 1-.309-1.747c0-.624.107-1.205.32-1.74a4.11 4.11 0 0 1 .898-1.382 4.11 4.11 0 0 1 1.383-.908 4.635 4.635 0 0 1 1.789-.329c.73 0 1.371.14 1.917.42.55.283 1.004.664 1.36 1.147.357.48.61 1.032.764 1.647.153.618.208 1.266.164 1.942h-6.148c.038.654.255 1.147.559 1.497zm2.375-4.012c-.254-.275-.657-.414-1.208-.414-.358 0-.653.06-.889.178a1.784 1.784 0 0 0-.565.44 1.623 1.623 0 0 0-.301.565 2.627 2.627 0 0 0-.1.589h3.578c-.073-.59-.26-1.082-.515-1.358zm-3.24-4.503h4.527v.995h-4.527z' },
  dribbble:   { color: '#EA4C89', label: 'Dribbble',   path: 'M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.048 6.385 1.73 1.35 3.92 2.163 6.295 2.163 1.42 0 2.77-.29 4.01-.8zm-11.62-2.971c.242-.396 3.27-5.25 8.435-6.968.15-.05.3-.09.45-.13-.286-.646-.599-1.29-.922-1.92-5.073 1.523-9.99 1.462-10.43 1.447-.004.094-.004.19-.004.285 0 2.94 1.118 5.63 2.942 7.687zM.306 9.65c.457.006 4.696.095 9.45-1.252-1.698-3.018-3.52-5.558-3.8-5.928C3.93 3.524 1.554 6.24.306 9.65zm7.92-7.947c.29.38 2.145 2.914 3.82 5.995 3.645-1.365 5.19-3.44 5.378-3.7C16.03 2.494 14.14 1.2 12 1.2c-1.37 0-2.656.37-3.773 1.002zm9.54 2.703c-.225.307-1.94 2.51-5.72 4.058.24.49.47.99.68 1.49.07.18.14.36.2.53 3.39-.43 6.76.27 7.1.34-.04-2.29-.87-4.39-2.26-6.42z' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Renders a row of social platform icon badges for the email footer
// ─────────────────────────────────────────────────────────────────────────────
function renderSocialRow(links: SocialLink[], websiteUrl?: string): string {
  const allLinks: SocialLink[] = [];
  if (websiteUrl) allLinks.push({ platform: 'website', url: websiteUrl });
  if (links) allLinks.push(...links);
  if (allLinks.length === 0) return '';

  const badges = allLinks
    .map(({ platform, url }) => {
      const cfg = EMAIL_SOCIAL_ICONS[platform];
      if (!cfg || !url) return '';
      const { color, label, path } = cfg;
      const innerSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'><rect width='36' height='36' rx='10' fill='${color}'/><g transform='translate(6,6)'><svg width='24' height='24' viewBox='0 0 24 24'><path fill='white' d='${path}'/></svg></g></svg>`;
      const uri = `data:image/svg+xml,${encodeURIComponent(innerSvg)}`;
      return `<a href="${url}" target="_blank" style="display:inline-block;margin:0 5px;text-decoration:none;"><img src="${uri}" width="36" height="36" alt="${label}" border="0" style="display:block;border-radius:10px;"></a>`;
    })
    .join('');

  if (!badges.trim()) return '';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:24px;">
      <tr>
        <td style="text-align:center;padding:0 0 8px;">
          <p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:2.5px;">Connect with us</p>
          ${badges}
        </td>
      </tr>
    </table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Premium shared wrapper — every template uses this shell
// ─────────────────────────────────────────────────────────────────────────────
const wrap = (
  preheader: string,
  headerContent: string,
  bodyContent: string,
  accentColor: string,
  props: TemplateProps,
  options: {
    headerBg?: string;
    outerBg?: string;
    bodyBg?: string;
    footerBg?: string;
    topBorderColor?: string;
  } = {}
) => {
  const outerBg   = props.emailBgColor || options.outerBg || '#EFF2F7';
  const headerBg  = props.headerBgOverride || options.headerBg || accentColor;
  const bodyBg    = options.bodyBg  || '#ffffff';
  const footerBg  = options.footerBg || '#F8FAFC';
  const topBorder = options.topBorderColor || accentColor;
  const socialRow = renderSocialRow(props.socialLinks ?? [], props.websiteUrl);

  const logoBlock = props.logoUrl
    ? `<img src="${props.logoUrl}" alt="${props.brandName}" height="44" style="max-height:44px;max-width:160px;object-fit:contain;display:block;margin:0 auto;">`
    : '';

  const signatureBlock = props.signatureUrl
    ? `<img src="${props.signatureUrl}" alt="Signature" style="max-height:60px;max-width:180px;object-fit:contain;display:block;">`
    : `<p style="margin:0 0 2px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#1e293b;font-weight:700;">${props.brandName}</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${props.subject}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
    img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
    body{margin:0!important;padding:0!important;width:100%!important;background-color:${outerBg}}
    a{color:${accentColor};text-decoration:none}
    .ec{max-width:600px;margin:0 auto}
    @media screen and (max-width:620px){
      .ec{width:100%!important}
      .p48{padding:32px 24px!important}
      .p40{padding:40px 24px!important}
      .btn-full{width:100%!important;display:block!important;box-sizing:border-box!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${outerBg};">
  <!-- PREHEADER -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:${outerBg};">${preheader} &nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${outerBg};">
    <tr>
      <td style="padding:40px 16px 48px;">

        <!-- CARD -->
        <table role="presentation" class="ec" cellspacing="0" cellpadding="0" border="0" width="600" style="margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);">

          <!-- TOP ACCENT BAR -->
          <tr>
            <td style="height:5px;background-color:${topBorder};font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- LOGO ROW (above header) -->
          ${logoBlock ? `<tr>
            <td style="background-color:${headerBg};padding:28px 48px 0;text-align:center;">
              ${logoBlock}
            </td>
          </tr>` : ''}

          <!-- HEADER -->
          <tr>
            <td class="p40" style="background-color:${headerBg};padding:40px 48px 48px;text-align:center;">
              ${headerContent}
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td class="p48" style="background-color:${bodyBg};padding:44px 48px 40px;">
              ${props.recipientName
                ? `<p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#64748b;">Hi ${props.recipientName},</p>`
                : ''}
              ${bodyContent}
            </td>
          </tr>

          <!-- SIGN-OFF ROW -->
          <tr>
            <td class="p48" style="background-color:${bodyBg};padding:0 48px 44px;border-top:1px solid #F1F5F9;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-top:28px;">
                    ${signatureBlock}
                    <p style="margin:4px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#94a3b8;">${props.brandName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:${footerBg};padding:28px 48px 32px;border-top:1px solid #E2E8F0;">
              ${socialRow}
              <p style="margin:${socialRow ? '20px' : '0'} 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:#94a3b8;line-height:1.8;text-align:center;">
                You received this email because you're a contact of ${props.brandName}.<br>
                <a href="#" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="#" style="color:#94a3b8;text-decoration:underline;">Privacy Policy</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="#" style="color:#94a3b8;text-decoration:underline;">View in browser</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /CARD -->

      </td>
    </tr>
  </table>
</body>
</html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable premium building blocks
// ─────────────────────────────────────────────────────────────────────────────

/** Large pill CTA button — full-width on mobile */
const cta = (label: string, color: string, href = '#', textColor = '#ffffff') =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:32px auto 0;">
    <tr>
      <td style="border-radius:100px;background-color:${color};box-shadow:0 4px 14px rgba(0,0,0,0.18);">
        <a href="${href}" class="btn-full" style="display:inline-block;padding:16px 44px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${textColor};text-decoration:none;letter-spacing:0.4px;white-space:nowrap;">${label}&nbsp;&nbsp;→</a>
      </td>
    </tr>
  </table>`;

/** Body copy paragraphs — converts plain text or HTML to premium-styled content */
const bodyText = (text: string) =>
  `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.85;color:#374151;">${text}</div>`;

/** Thin decorative divider */
const divider = (color = '#E2E8F0') =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:32px 0;">
    <tr><td style="height:1px;background:linear-gradient(to right, transparent, ${color} 20%, ${color} 80%, transparent);font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>`;

/** Highlighted callout / quote block */
const highlight = (text: string, accentColor: string) =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:28px 0;">
    <tr>
      <td style="border-left:4px solid ${accentColor};background-color:${accentColor}0D;border-radius:0 10px 10px 0;padding:18px 20px;">
        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.75;color:#1e293b;font-style:italic;">${text}</p>
      </td>
    </tr>
  </table>`;

/** Three feature/icon cells in a row */
const featureRow = (items: { icon: string; label: string; desc: string }[], accentColor: string) => {
  const cells = items.map(it =>
    `<td width="33%" style="vertical-align:top;text-align:center;padding:0 12px;">
      <div style="font-size:28px;margin-bottom:8px;">${it.icon}</div>
      <p style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;color:#1e293b;">${it.label}</p>
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#64748b;line-height:1.5;">${it.desc}</p>
    </td>`
  ).join('');
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:28px 0 8px;background:${accentColor}08;border-radius:12px;padding:24px 12px;">
    <tr>${cells}</tr>
  </table>`;
};

/** Eyebrow label above headline */
const eyebrow = (text: string, color = 'rgba(255,255,255,0.65)') =>
  `<p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;color:${color};letter-spacing:3px;text-transform:uppercase;">${text}</p>`;

/** Large hero headline */
const headline = (text: string, color = '#ffffff', size = '32px') =>
  `<h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:${size};font-weight:700;color:${color};line-height:1.2;letter-spacing:-0.5px;">${text}</h1>`;

/** Sub-headline below hero */
const subline = (text: string, color = 'rgba(255,255,255,0.75)') =>
  `<p style="margin:14px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:${color};line-height:1.6;">${text}</p>`;

/** Inline pill badge in header */
const badge = (text: string, bg = 'rgba(255,255,255,0.15)', color = '#ffffff') =>
  `<p style="display:inline-block;margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;color:${color};letter-spacing:2px;text-transform:uppercase;background:${bg};padding:7px 18px;border-radius:100px;">${text}</p>`;

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────
export const EMAIL_TEMPLATES: EmailTemplate[] = [

  // 1 — Professional Outreach
  {
    id: 'professional',
    name: 'Professional Outreach',
    category: 'Business',
    icon: Briefcase,
    renderHTML: (p) => {
      const color = p.brandColor;
      return wrap(
        `A message from ${p.brandName}`,
        `${eyebrow('Professional Outreach')}
         ${headline(p.brandName, '#ffffff', '30px')}
         ${subline('A personal message, just for you.')}`,
        `${bodyText(p.body)}
         ${divider()}`,
        color, p,
        { headerBg: color, outerBg: '#EEF1F7', bodyBg: '#ffffff', footerBg: '#F8FAFC' }
      );
    },
  },

  // 2 — Sales Campaign
  {
    id: 'campaign',
    name: 'Sales Campaign',
    category: 'Sales',
    icon: Rocket,
    renderHTML: (p) => {
      const color = p.brandColor;
      return wrap(
        `Exclusive opportunity inside — ${p.subject}`,
        `${badge('Limited Opportunity', `${color}33`, color === '#0f172a' ? '#ffffff' : color)}
         ${headline(p.subject)}
         ${subline(`From ${p.brandName}`)}`,
        `${bodyText(p.body)}
         ${featureRow([
           { icon: '⚡', label: 'Fast Results',   desc: 'See measurable outcomes quickly'   },
           { icon: '🎯', label: 'Targeted',        desc: 'Tailored to your specific needs'    },
           { icon: '🛡️', label: 'Risk-Free',       desc: 'Satisfaction guaranteed'             },
         ], color)}
         ${cta('Claim Your Offer', color)}`,
        color, p,
        { headerBg: '#0f172a', outerBg: '#E8EDF5', topBorderColor: color, bodyBg: '#ffffff', footerBg: '#F8FAFC' }
      );
    },
  },

  // 3 — Newsletter
  {
    id: 'newsletter',
    name: 'Newsletter',
    category: 'Newsletter',
    icon: Newspaper,
    renderHTML: (p) => {
      const color = p.brandColor;
      return wrap(
        p.subject,
        `${eyebrow(`${p.brandName}  ·  Newsletter`)}
         ${headline(p.subject, '#ffffff', '34px')}
         ${subline('Your curated update — read in under 5 minutes.')}`,
        `${bodyText(p.body)}
         ${divider(color + '44')}
         <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#64748b;font-style:italic;">Enjoyed this? Forward it to someone who'd love it too.</p>`,
        color, p,
        { headerBg: '#1e293b', outerBg: '#ECF0F7', bodyBg: '#ffffff', footerBg: '#F8FAFC', topBorderColor: color }
      );
    },
  },

  // 4 — Welcome Email
  {
    id: 'welcome',
    name: 'Welcome Email',
    category: 'Onboarding',
    icon: PartyPopper,
    renderHTML: (p) => {
      const color = p.brandColor;
      return wrap(
        `Welcome — you're in good hands`,
        `${badge('You\'re In ✦', 'rgba(255,255,255,0.18)')}
         ${headline('Welcome aboard! 🎉')}
         ${subline(`We're so glad to have you with ${p.brandName}.`)}`,
        `${bodyText(p.body)}
         ${featureRow([
           { icon: '🚀', label: 'Quick Start',   desc: 'Get up and running in minutes' },
           { icon: '💬', label: 'Support',        desc: 'We\'re here whenever you need us' },
           { icon: '🌟', label: 'Community',      desc: 'Join thousands of happy members'  },
         ], color)}
         ${cta('Get Started Now', color)}`,
        color, p,
        { headerBg: color, outerBg: '#EEF1F8', bodyBg: '#ffffff', footerBg: '#F8FAFC' }
      );
    },
  },

  // 5 — Follow-Up
  {
    id: 'followup',
    name: 'Follow-Up',
    category: 'Follow-Up',
    icon: Repeat2,
    renderHTML: (p) => {
      const color = p.brandColor;
      return wrap(
        `Following up — ${p.brandName}`,
        `${eyebrow('Following Up', 'rgba(255,255,255,0.6)')}
         ${headline('Just Checking In', '#f8fafc', '28px')}
         ${subline('I wanted to make sure my last message found you.')}`,
        `${highlight('I circled back because I genuinely believe what we discussed could be a great fit — and I\'d hate for it to get lost in a busy inbox.', color)}
         ${bodyText(p.body)}
         ${divider()}
         <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#64748b;font-style:italic;">P.S. — Even a quick "not right now" is helpful. I read every reply personally.</p>`,
        color, p,
        { headerBg: '#334155', outerBg: '#EBF0F7', bodyBg: '#ffffff', footerBg: '#F8FAFC', topBorderColor: color }
      );
    },
  },

  // 6 — Partnership Proposal
  {
    id: 'partnership',
    name: 'Partnership Proposal',
    category: 'Partnership',
    icon: Handshake,
    renderHTML: (p) => {
      const color = p.brandColor;
      return wrap(
        `A partnership opportunity from ${p.brandName}`,
        `${badge('Partnership Opportunity')}
         ${headline("Let's Build Something Great Together")}
         ${subline(`${p.brandName} is looking for the right partner.`)}`,
        `${bodyText(p.body)}
         ${featureRow([
           { icon: '🤝', label: 'Mutual Benefit', desc: 'Win-win structures only'        },
           { icon: '📈', label: 'Growth',          desc: 'Shared goals, shared success'   },
           { icon: '🔒', label: 'Trust',            desc: 'Long-term, transparent working' },
         ], color)}
         ${cta('Explore the Partnership', color)}`,
        color, p,
        { headerBg: color, outerBg: '#EEF0F8', bodyBg: '#ffffff', footerBg: '#F8FAFC' }
      );
    },
  },

  // 7 — Product Launch
  {
    id: 'product-launch',
    name: 'Product Launch',
    category: 'Launch',
    icon: Target,
    renderHTML: (p) => {
      const color = p.brandColor;
      return wrap(
        `Introducing something new from ${p.brandName}`,
        `${badge('New Release ✦', 'rgba(255,255,255,0.12)', '#ffffff')}
         ${headline(p.subject, '#ffffff', '34px')}
         ${subline(`Brought to you by ${p.brandName}. Be the first to experience it.`)}`,
        `${bodyText(p.body)}
         ${highlight('This is more than just a launch — it\'s a new chapter. We\'ve put everything into making this exactly right.', color)}
         ${cta('See What\'s New', color)}`,
        color, p,
        {
          headerBg: '#0a0a0a',
          outerBg: '#E8EBF5',
          bodyBg: '#ffffff',
          footerBg: '#F8FAFC',
          topBorderColor: color,
        }
      );
    },
  },

  // 8 — Event Invitation
  {
    id: 'event',
    name: 'Event Invitation',
    category: 'Events',
    icon: PartyPopper,
    renderHTML: (p) => {
      const color = p.brandColor;
      return wrap(
        `You're invited — ${p.subject}`,
        `${eyebrow('You\'re Invited ✦')}
         ${headline(p.subject)}
         ${subline(`Hosted by ${p.brandName}`)}`,
        `${featureRow([
           { icon: '📅', label: 'Save the Date',  desc: 'Mark your calendar now'            },
           { icon: '🎟️', label: 'Limited Seats',  desc: 'Spots fill up fast'                 },
           { icon: '📍', label: 'Exclusive Event', desc: 'A curated experience just for you' },
         ], color)}
         ${bodyText(p.body)}
         ${cta('RSVP Now — Secure Your Spot', color)}
         ${divider()}
         <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#64748b;text-align:center;">Questions? Simply reply to this email — we respond within 24 hours.</p>`,
        color, p,
        { headerBg: color, outerBg: '#ECF0F7', bodyBg: '#ffffff', footerBg: '#F8FAFC' }
      );
    },
  },

  // 9 — Cold Outreach
  {
    id: 'cold-outreach',
    name: 'Cold Outreach',
    category: 'Outreach',
    icon: Waves,
    renderHTML: (p) => {
      const color = p.brandColor;
      return wrap(
        `A quick note from ${p.brandName}`,
        `${eyebrow('A Personal Note', 'rgba(255,255,255,0.55)')}
         ${headline(p.brandName, '#f8fafc', '26px')}
         ${subline('Reaching out with something I think you\'ll find relevant.')}`,
        `${bodyText(p.body)}
         ${divider()}
         <p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#64748b;font-style:italic;">I keep my outreach personal and targeted — if this isn't a fit, just let me know and I'll never reach out again.</p>`,
        color, p,
        { headerBg: '#374151', outerBg: '#EAEeF5', bodyBg: '#ffffff', footerBg: '#F8FAFC', topBorderColor: color }
      );
    },
  },

  // 10 — Thank You
  {
    id: 'thankyou',
    name: 'Thank You',
    category: 'Engagement',
    icon: Heart,
    renderHTML: (p) => {
      const color = p.brandColor;
      return wrap(
        `A sincere thank you from ${p.brandName}`,
        `${badge('With Gratitude ♥', 'rgba(255,255,255,0.15)')}
         ${headline('Thank You — Truly.')}
         ${subline(`From everyone at ${p.brandName}, we mean it.`)}`,
        `${highlight('Your support, trust, and time are the foundation of everything we do. This email is a small token of genuine appreciation.', color)}
         ${bodyText(p.body)}
         ${divider()}
         <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#64748b;text-align:center;line-height:1.8;">We hope to continue earning your trust — one experience at a time.</p>`,
        color, p,
        { headerBg: color, outerBg: '#F0EDF7', bodyBg: '#ffffff', footerBg: '#F8FAFC' }
      );
    },
  },
];

export { EMAIL_SOCIAL_ICONS };
