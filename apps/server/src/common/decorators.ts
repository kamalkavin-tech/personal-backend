import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const JWT_REFRESH_COOKIE = 'vaultx_refresh';
export const JWT_PENDING_COOKIE = 'vaultx_pending';

export interface JwtUser {
  sub: string;
  email: string;
  deviceId?: string;
  sessionId?: string;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as JwtUser;
});

export const UserAgent = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return (request.headers['user-agent'] as string) ?? 'unknown';
});

export const IpAddress = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return (request.ips?.length ? request.ips[0] : request.ip) ?? '0.0.0.0';
});
