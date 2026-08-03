/**
 * Dependency-light CORS helpers (no NestJS imports) so probe endpoints and
 * error responses can attach CORS headers without bootstrapping the app.
 */

export function parseCorsOrigins(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isAllowedPreviewOrigin(origin: string): boolean {
  return /^https:\/\/personal-frontend(?:-web|-[a-z0-9-]+)?(?:-git-[^.]+)?\.vercel\.app$/.test(origin);
}

export function corsHeaders(origin: string | undefined, allowedOrigins: string[] = []): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  if (!origin) return headers;

  if (allowedOrigins.includes(origin) || isAllowedPreviewOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Vary'] = 'Origin';
  }

  return headers;
}
