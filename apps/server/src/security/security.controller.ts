import { Controller, Get, Query } from '@nestjs/common';
import { SecurityService } from './security.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, JwtUser } from '../common/decorators';

@Controller('security')
export class SecurityController {
  constructor(
    private readonly security: SecurityService,
    private readonly audit: AuditService,
  ) {}

  @Get('overview')
  overview(@CurrentUser() user: JwtUser) {
    return this.security.overview(user.sub);
  }

  @Get('history')
  history(@CurrentUser() user: JwtUser, @Query('limit') limit?: string) {
    return this.security.history(user.sub, Number(limit) || 50);
  }

  @Get('audit')
  auditLog(@CurrentUser() user: JwtUser, @Query('limit') limit?: string) {
    return this.audit.list(user.sub, Number(limit) || 100);
  }
}
