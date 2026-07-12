/**
 * Real brand icons for every social platform in socialMedia.ts
 * Uses react-icons/fa6 (Font Awesome 6 brands) + react-icons/si (Simple Icons).
 * Import SocialIcon for a ready-made component, or SOCIAL_ICON_MAP for raw access.
 */
import type { ComponentType, SVGAttributes } from 'react';
import { Globe } from 'lucide-react';

// ── Font Awesome 6 brands ──────────────────────────────────────────────────
import {
  FaFacebook,
  FaInstagram,
  FaXTwitter,
  FaTiktok,
  FaSnapchat,
  FaPinterest,
  FaReddit,
  FaTumblr,
  FaWhatsapp,
  FaTelegram,
  FaDiscord,
  FaYoutube,
  FaTwitch,
  FaVimeoV,
  FaSpotify,
  FaSoundcloud,
  FaGithub,
  FaGitlab,
  FaStackOverflow,
  FaDev,
  FaBehance,
  FaDribbble,
  FaFlickr,
  FaEtsy,
  FaYelp,
  FaMedium,
  FaLinkedin,
  FaWordpress,
  FaQuora,
} from 'react-icons/fa6';

// ── Simple Icons (brands not covered by FA6) ───────────────────────────────
import {
  SiThreads,
  SiMastodon,
  SiVk,
  SiSignal,
  SiWechat,
  SiLine,
  SiViber,
  SiKakaotalk,
  SiProducthunt,
  SiHashnode,
  SiDeviantart,
  SiDailymotion,
  SiBandcamp,
  SiSubstack,
  SiBlogger,
  SiFiverr,
  SiUpwork,
  SiTrustpilot,
  SiWellfound,
  SiRumble,
  SiClubhouse,
  SiBereal,
} from 'react-icons/si';

type IconComponent = ComponentType<SVGAttributes<SVGElement> & { size?: number | string; color?: string; className?: string }>;

// Fallback for any platform not yet mapped
const FallbackIcon = ({ size = 18, color, className, style }: { size?: number; color?: string; className?: string; style?: React.CSSProperties }) => (
  <Globe width={size} height={size} color={color} className={className} style={style} strokeWidth={1.8} />
);

/** Platform ID → react-icons component */
export const SOCIAL_ICON_MAP: Record<string, IconComponent> = {
  // Social
  facebook:    FaFacebook,
  instagram:   FaInstagram,
  twitter:     FaXTwitter,
  threads:     SiThreads,
  tiktok:      FaTiktok,
  snapchat:    FaSnapchat,
  pinterest:   FaPinterest,
  reddit:      FaReddit,
  tumblr:      FaTumblr,
  mastodon:    SiMastodon,
  bereal:      SiBereal,
  vk:          SiVk,

  // Messaging
  whatsapp:    FaWhatsapp,
  telegram:    FaTelegram,
  discord:     FaDiscord,
  signal:      SiSignal,
  wechat:      SiWechat,
  viber:       SiViber,
  line:        SiLine,
  kakao:       SiKakaotalk,

  // Professional
  linkedin:    FaLinkedin,
  angellist:   SiWellfound,
  producthunt: SiProducthunt,
  quora:       FaQuora,

  // Creative
  behance:     FaBehance,
  dribbble:    FaDribbble,
  deviantart:  SiDeviantart,
  flickr:      FaFlickr,

  // Video
  youtube:     FaYoutube,
  twitch:      FaTwitch,
  vimeo:       FaVimeoV,
  dailymotion: SiDailymotion,
  rumble:      SiRumble,

  // Audio
  spotify:     FaSpotify,
  soundcloud:  FaSoundcloud,
  bandcamp:    SiBandcamp,
  clubhouse:   SiClubhouse,

  // Writing / Content
  medium:      FaMedium,
  substack:    SiSubstack,
  wordpress:   FaWordpress,
  blogger:     SiBlogger,

  // Developer
  github:      FaGithub,
  gitlab:      FaGitlab,
  stackoverflow: FaStackOverflow,
  hashnode:    SiHashnode,
  devto:       FaDev,

  // Marketplace
  etsy:        FaEtsy,
  fiverr:      SiFiverr,
  upwork:      SiUpwork,
  yelp:        FaYelp,
  trustpilot:  SiTrustpilot,
};

// ─────────────────────────────────────────────────────────────────────────────
// Ready-to-use component
// ─────────────────────────────────────────────────────────────────────────────

interface SocialIconProps {
  /** Platform ID matching socialMedia.ts — e.g. "linkedin", "instagram" */
  platformId: string;
  /** Render in the platform's brand colour (default true). Pass false to inherit currentColor. */
  color?: string;
  size?: number;
  className?: string;
}

export function SocialIcon({ platformId, color, size = 18, className }: SocialIconProps) {
  const Icon = SOCIAL_ICON_MAP[platformId];
  if (!Icon) return <FallbackIcon size={size} color={color} className={className} />;
  return <Icon size={size} color={color} className={className} style={color ? { color } : undefined} />;
}
