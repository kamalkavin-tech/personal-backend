import { Controller, Get, Param, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser, JwtUser } from '../common/decorators';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: JwtUser) {
    const [items, unread] = await Promise.all([this.notifications.list(user.sub), this.notifications.unreadCount(user.sub)]);
    return { items, unread };
  }

  @Post(':id/read')
  read(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.notifications.markRead(user.sub, id);
  }

  @Post('read-all')
  readAll(@CurrentUser() user: JwtUser) {
    return this.notifications.markAllRead(user.sub);
  }
}
