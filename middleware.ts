const CRAWLER =
  /discordbot|facebookexternalhit|twitterbot|slackbot|linkedinbot|telegrambot|whatsapp|embedly|pinterest|redditbot/i;

function isSocialCrawler(userAgent: string): boolean {
  return CRAWLER.test(userAgent);
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (url.pathname !== '/') return undefined;

  const ua = request.headers.get('user-agent') ?? '';
  if (!isSocialCrawler(ua)) return undefined;

  const preview = new URL('/api/social-preview', url.origin);
  preview.search = url.search;
  return fetch(preview);
}

export const config = {
  matcher: ['/'],
};
