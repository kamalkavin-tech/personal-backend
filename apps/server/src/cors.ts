/**
 * Dependency-light CORS helpers (no NestJS imports) so probe endpoints and
 * error responses can attach CORS headers without bootstrapping the app.
 *
 * We intentionally use a NO-CREDENTIALS, wildcard-allow design:
 * - The frontend never relies on cookies cross-site (SameSite=Lax blocks them
 *   between frontend.vercel.app and backend.vercel.app), so the browser does
 *   not send credentials and `Access-Control-Allow-Origin: *` is valid.
 * - Auth is carried entirely by Authorization header + refresh token in the
 *   request body, both of which work cross-site without credentials.
 */

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}
