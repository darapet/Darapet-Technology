export interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  domain: string;
  searchPrefix: string;
  category: 'social' | 'messaging' | 'professional' | 'creative' | 'video' | 'audio' | 'marketplace' | 'developer';
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  // Social
  { id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877F2', domain: 'facebook.com', searchPrefix: 'site:facebook.com', category: 'social' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: '#E4405F', domain: 'instagram.com', searchPrefix: 'site:instagram.com', category: 'social' },
  { id: 'twitter', name: 'X / Twitter', icon: '🐦', color: '#000000', domain: 'x.com', searchPrefix: 'site:x.com OR site:twitter.com', category: 'social' },
  { id: 'threads', name: 'Threads', icon: '🧵', color: '#000000', domain: 'threads.net', searchPrefix: 'site:threads.net', category: 'social' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#FF0050', domain: 'tiktok.com', searchPrefix: 'site:tiktok.com', category: 'social' },
  { id: 'snapchat', name: 'Snapchat', icon: '👻', color: '#FFFC00', domain: 'snapchat.com', searchPrefix: 'site:snapchat.com', category: 'social' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌', color: '#E60023', domain: 'pinterest.com', searchPrefix: 'site:pinterest.com', category: 'social' },
  { id: 'reddit', name: 'Reddit', icon: '🤖', color: '#FF4500', domain: 'reddit.com', searchPrefix: 'site:reddit.com', category: 'social' },
  { id: 'tumblr', name: 'Tumblr', icon: '💙', color: '#35465C', domain: 'tumblr.com', searchPrefix: 'site:tumblr.com', category: 'social' },
  { id: 'mastodon', name: 'Mastodon', icon: '🦣', color: '#6364FF', domain: 'mastodon.social', searchPrefix: 'site:mastodon.social', category: 'social' },
  { id: 'bereal', name: 'BeReal', icon: '📷', color: '#000000', domain: 'bere.al', searchPrefix: 'site:bere.al', category: 'social' },
  { id: 'vk', name: 'VKontakte', icon: '🇷🇺', color: '#0077FF', domain: 'vk.com', searchPrefix: 'site:vk.com', category: 'social' },

  // Messaging
  { id: 'whatsapp', name: 'WhatsApp', icon: '💬', color: '#25D366', domain: 'wa.me', searchPrefix: 'site:wa.me', category: 'messaging' },
  { id: 'telegram', name: 'Telegram', icon: '✈️', color: '#26A5E4', domain: 't.me', searchPrefix: 'site:t.me', category: 'messaging' },
  { id: 'discord', name: 'Discord', icon: '🎮', color: '#5865F2', domain: 'discord.gg', searchPrefix: 'site:discord.gg OR site:discord.com', category: 'messaging' },
  { id: 'signal', name: 'Signal', icon: '🔒', color: '#2592E9', domain: 'signal.org', searchPrefix: 'site:signal.org', category: 'messaging' },
  { id: 'wechat', name: 'WeChat', icon: '🟢', color: '#07C160', domain: 'wechat.com', searchPrefix: 'site:wechat.com', category: 'messaging' },
  { id: 'viber', name: 'Viber', icon: '📞', color: '#7360F2', domain: 'viber.com', searchPrefix: 'site:viber.com', category: 'messaging' },
  { id: 'line', name: 'LINE', icon: '💚', color: '#00B900', domain: 'line.me', searchPrefix: 'site:line.me', category: 'messaging' },
  { id: 'kakao', name: 'KakaoTalk', icon: '💛', color: '#FAE100', domain: 'kakao.com', searchPrefix: 'site:kakao.com', category: 'messaging' },

  // Professional
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0A66C2', domain: 'linkedin.com', searchPrefix: 'site:linkedin.com/in OR site:linkedin.com/company', category: 'professional' },
  { id: 'angellist', name: 'AngelList / Wellfound', icon: '🚀', color: '#000000', domain: 'wellfound.com', searchPrefix: 'site:wellfound.com', category: 'professional' },
  { id: 'crunchbase', name: 'Crunchbase', icon: '📊', color: '#0288D1', domain: 'crunchbase.com', searchPrefix: 'site:crunchbase.com', category: 'professional' },
  { id: 'producthunt', name: 'Product Hunt', icon: '🏆', color: '#DA552F', domain: 'producthunt.com', searchPrefix: 'site:producthunt.com', category: 'professional' },
  { id: 'quora', name: 'Quora', icon: '❓', color: '#B92B27', domain: 'quora.com', searchPrefix: 'site:quora.com', category: 'professional' },

  // Creative
  { id: 'behance', name: 'Behance', icon: '🎨', color: '#1769FF', domain: 'behance.net', searchPrefix: 'site:behance.net', category: 'creative' },
  { id: 'dribbble', name: 'Dribbble', icon: '🏀', color: '#EA4C89', domain: 'dribbble.com', searchPrefix: 'site:dribbble.com', category: 'creative' },
  { id: 'deviantart', name: 'DeviantArt', icon: '🖼️', color: '#05CC47', domain: 'deviantart.com', searchPrefix: 'site:deviantart.com', category: 'creative' },
  { id: 'flickr', name: 'Flickr', icon: '📷', color: '#FF0084', domain: 'flickr.com', searchPrefix: 'site:flickr.com', category: 'creative' },
  { id: '500px', name: '500px', icon: '📸', color: '#0099E5', domain: '500px.com', searchPrefix: 'site:500px.com', category: 'creative' },

  // Video
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: '#FF0000', domain: 'youtube.com', searchPrefix: 'site:youtube.com', category: 'video' },
  { id: 'twitch', name: 'Twitch', icon: '🎮', color: '#9146FF', domain: 'twitch.tv', searchPrefix: 'site:twitch.tv', category: 'video' },
  { id: 'vimeo', name: 'Vimeo', icon: '🎬', color: '#1AB7EA', domain: 'vimeo.com', searchPrefix: 'site:vimeo.com', category: 'video' },
  { id: 'dailymotion', name: 'Dailymotion', icon: '📹', color: '#0066DC', domain: 'dailymotion.com', searchPrefix: 'site:dailymotion.com', category: 'video' },
  { id: 'rumble', name: 'Rumble', icon: '🔊', color: '#85C742', domain: 'rumble.com', searchPrefix: 'site:rumble.com', category: 'video' },

  // Audio
  { id: 'spotify', name: 'Spotify', icon: '🎵', color: '#1DB954', domain: 'open.spotify.com', searchPrefix: 'site:open.spotify.com/artist', category: 'audio' },
  { id: 'soundcloud', name: 'SoundCloud', icon: '🔊', color: '#FF5500', domain: 'soundcloud.com', searchPrefix: 'site:soundcloud.com', category: 'audio' },
  { id: 'bandcamp', name: 'Bandcamp', icon: '🎸', color: '#1DA0C3', domain: 'bandcamp.com', searchPrefix: 'site:bandcamp.com', category: 'audio' },
  { id: 'clubhouse', name: 'Clubhouse', icon: '🎙️', color: '#F5ECD7', domain: 'joinclubhouse.com', searchPrefix: 'site:joinclubhouse.com', category: 'audio' },

  // Writing / Content
  { id: 'medium', name: 'Medium', icon: '✍️', color: '#000000', domain: 'medium.com', searchPrefix: 'site:medium.com', category: 'creative' },
  { id: 'substack', name: 'Substack', icon: '📧', color: '#FF6719', domain: 'substack.com', searchPrefix: 'site:substack.com', category: 'creative' },
  { id: 'wordpress', name: 'WordPress', icon: '📝', color: '#21759B', domain: 'wordpress.com', searchPrefix: 'site:wordpress.com', category: 'creative' },
  { id: 'blogger', name: 'Blogger', icon: '📰', color: '#FF5722', domain: 'blogger.com', searchPrefix: 'site:blogspot.com', category: 'creative' },

  // Developer
  { id: 'github', name: 'GitHub', icon: '🐙', color: '#181717', domain: 'github.com', searchPrefix: 'site:github.com', category: 'developer' },
  { id: 'gitlab', name: 'GitLab', icon: '🦊', color: '#FC6D26', domain: 'gitlab.com', searchPrefix: 'site:gitlab.com', category: 'developer' },
  { id: 'stackoverflow', name: 'Stack Overflow', icon: '💡', color: '#F58025', domain: 'stackoverflow.com', searchPrefix: 'site:stackoverflow.com/users', category: 'developer' },
  { id: 'hashnode', name: 'Hashnode', icon: '⚡', color: '#2962FF', domain: 'hashnode.dev', searchPrefix: 'site:hashnode.dev', category: 'developer' },
  { id: 'devto', name: 'DEV Community', icon: '💻', color: '#0A0A0A', domain: 'dev.to', searchPrefix: 'site:dev.to', category: 'developer' },

  // Marketplace
  { id: 'etsy', name: 'Etsy', icon: '🛍️', color: '#F56400', domain: 'etsy.com', searchPrefix: 'site:etsy.com/shop', category: 'marketplace' },
  { id: 'fiverr', name: 'Fiverr', icon: '💚', color: '#1DBF73', domain: 'fiverr.com', searchPrefix: 'site:fiverr.com', category: 'marketplace' },
  { id: 'upwork', name: 'Upwork', icon: '💰', color: '#6FDA44', domain: 'upwork.com', searchPrefix: 'site:upwork.com/freelancers', category: 'marketplace' },
  { id: 'yelp', name: 'Yelp', icon: '⭐', color: '#FF1A1A', domain: 'yelp.com', searchPrefix: 'site:yelp.com/biz', category: 'marketplace' },
  { id: 'trustpilot', name: 'Trustpilot', icon: '⭐', color: '#00B67A', domain: 'trustpilot.com', searchPrefix: 'site:trustpilot.com', category: 'marketplace' },
];

export const SOCIAL_CATEGORIES = [
  { id: 'social', label: 'Social Media' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'professional', label: 'Professional' },
  { id: 'creative', label: 'Creative' },
  { id: 'video', label: 'Video' },
  { id: 'audio', label: 'Audio' },
  { id: 'developer', label: 'Developer' },
  { id: 'marketplace', label: 'Marketplace' },
];

export function getPlatformById(id: string): SocialPlatform | undefined {
  return SOCIAL_PLATFORMS.find(p => p.id === id);
}
