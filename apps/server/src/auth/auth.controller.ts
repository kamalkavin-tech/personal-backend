import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  registerSchema,
  loginSchema,
  verify2faSchema,
  changePasswordSchema,
  setup2faSchema,
  verify2faSetupSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  prepareLoginSchema,
  RegisterInput,
  LoginInput,
  Verify2faInput,
} from '@vaultx/shared';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { zod } from '../common/zod-validation.pipe';
import { Public, CurrentUser, UserAgent, IpAddress, JwtUser, JWT_REFRESH_COOKIE, JWT_PENDING_COOKIE } from '../common/decorators';

interface AuthedRequest extends Request {
  user?: JwtUser;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
  ) {}

  private setRefresh(res: Response, token: string): void {
    res.cookie(JWT_REFRESH_COOKIE, token, this.tokens.refreshCookieOptions());
  }

  @Public()
  @Post('register')
  async register(
    @Body(zod(registerSchema)) body: RegisterInput,
    @UserAgent() ua: string,
    @IpAddress() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(body, { ip, ua });
    if (result.refreshToken) this.setRefresh(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('prepare')
  async prepare(@Body(zod(prepareLoginSchema)) body: { email: string }) {
    return await this.auth.prepareLogin(body.email);
  }

  @Public()
  @Post('login')
  async login(
    @Body(zod(loginSchema)) body: LoginInput,
    @UserAgent() ua: string,
    @IpAddress() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(body, { ip, ua });
    if (result.requiresTwoFactor) {
      res.cookie(JWT_PENDING_COOKIE, result.pending!, { httpOnly: true, sameSite: 'lax', maxAge: 300_000, path: '/' });
      return { requiresTwoFactor: true, pendingEmail: result.pendingEmail };
    }
    if (result.refreshToken) this.setRefresh(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('verify-2fa')
  async verify2fa(
    @Body(zod(verify2faSchema)) body: Verify2faInput,
    @Req() req: Request,
    @UserAgent() ua: string,
    @IpAddress() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pending = (req.cookies as Record<string, string>)[JWT_PENDING_COOKIE];
    const result = await this.auth.verify2fa(body, pending, { ip, ua });
    if (result.refreshToken) this.setRefresh(res, result.refreshToken);
    res.clearCookie(JWT_PENDING_COOKIE, { path: '/' });
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string>)[JWT_REFRESH_COOKIE];
    const result = await this.auth.refresh(token);
    this.setRefresh(res, result.refreshToken);
    return { accessToken: result.accessToken };
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string>)[JWT_REFRESH_COOKIE];
    await this.auth.logout(token, {});
    res.clearCookie(JWT_REFRESH_COOKIE, { path: '/' });
    res.clearCookie(JWT_PENDING_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  async me(@CurrentUser() user: JwtUser) {
    return { user: await this.auth.me(user.sub) };
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: JwtUser, @Body('name') name?: string) {
    return { user: await this.auth.updateProfile(user.sub, { name }) };
  }

  @Get('devices')
  async devices(@CurrentUser() user: JwtUser) {
    return { devices: await this.auth.listDevices(user.sub) };
  }

  @Patch('devices/:id/trust')
  async trustDevice(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body('trusted') trusted: boolean) {
    return { device: await this.auth.setDeviceTrusted(user.sub, id, trusted) };
  }

  @Delete('devices/:id')
  async revokeDevice(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    await this.auth.revokeDevice(user.sub, id);
    return { ok: true };
  }

  @Get('sessions')
  async sessions(@CurrentUser() user: JwtUser) {
    return { sessions: await this.auth.listSessions(user.sub) };
  }

  @Delete('sessions/:id')
  async revokeSession(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    await this.auth.revokeSession(user.sub, id);
    return { ok: true };
  }

  @Post('2fa/setup')
  async setup2fa(@CurrentUser() user: JwtUser) {
    return await this.auth.setup2fa(user.sub);
  }

  @Post('2fa/verify-setup')
  async verify2faSetup(@CurrentUser() user: JwtUser, @Body(zod(verify2faSetupSchema)) body: { secret: string; code: string }) {
    return await this.auth.verify2faSetup(user.sub, body);
  }

  @Post('2fa/disable')
  async disable2fa(@CurrentUser() user: JwtUser, @Body('code') code: string) {
    await this.auth.disable2fa(user.sub, code);
    return { ok: true };
  }

  @Post('change-password')
  async changePassword(
    @CurrentUser() user: JwtUser,
    @Body(zod(changePasswordSchema)) body: unknown,
    @UserAgent() ua: string,
    @IpAddress() ip: string,
  ) {
    await this.auth.changePassword(user.sub, body as never, { ip, ua });
    return { ok: true };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body(zod(forgotPasswordSchema)) body: { email: string }) {
    return await this.auth.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body(zod(resetPasswordSchema)) body: never, @UserAgent() ua: string, @IpAddress() ip: string) {
    await this.auth.resetPassword(body, { ip, ua });
    return { ok: true };
  }

  @Delete('account')
  async deleteAccount(
    @CurrentUser() user: JwtUser,
    @Body(zod(deleteAccountSchema)) body: { authKey: string },
    @UserAgent() ua: string,
    @IpAddress() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.deleteAccount(user.sub, body.authKey, { ip, ua });
    res.clearCookie(JWT_REFRESH_COOKIE, { path: '/' });
    return { ok: true };
  }
}
