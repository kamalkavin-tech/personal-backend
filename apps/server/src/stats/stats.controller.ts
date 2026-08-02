import { Controller, Get } from '@nestjs/common';
import { VaultService } from '../vault/vault.service';
import { FilesService } from '../files/files.service';
import { SecurityService } from '../security/security.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CurrentUser, JwtUser } from '../common/decorators';

@Controller('app')
export class StatsController {
  constructor(
    private readonly vault: VaultService,
    private readonly files: FilesService,
    private readonly security: SecurityService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get('stats')
  async stats(@CurrentUser() user: JwtUser) {
    const [byType, recent, total, filesCount, storageBytes, security, unread] = await Promise.all([
      this.vault.countByType(user.sub),
      this.vault.recent(user.sub, 8),
      this.vault.total(user.sub),
      this.files.count(user.sub),
      this.files.storageUsed(user.sub),
      this.security.overview(user.sub),
      this.notifications.unreadCount(user.sub),
    ]);
    return {
      totalItems: total,
      byType,
      recentItems: recent,
      filesCount,
      storageUsedBytes: storageBytes,
      security,
      unread,
    };
  }
}
