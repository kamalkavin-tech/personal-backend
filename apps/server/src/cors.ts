/**
 * Dependency-light CORS helpers (no NestJS imports) so probe endpoints and
 * error responses can attach CORS headers without bootstrapping the app.
 */

export function originAllowed(origin: string | undefined, frontendUrl: string | undefined): boolean {
  if (!origin) return true; // non-browser requests (curl, server-to-server)
  const normalized = origin.replace(/\/$/, '');
  if (frontendUrl && normalized === frontendUrl.replace(/\/$/, '')) return true;
  if (normalized === 'http://localhost:3000' || normalized === 'http://localhost:5173') return true;
  // Vercel production + preview deployments (frontend.vercel.app / *.vercel.app)
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(normalized);
}

export function corsHeaders(origin: string | undefined, frontendUrl: string | undefined): Record<string, string> {
  const allowed = originAllowed(origin, frontendUrl) ? origin ?? '*' : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}
