import { Controller, Delete, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { BackupService } from './backup.service';
import { CurrentUser, JwtUser } from '../common/decorators';

@Controller('backup')
export class BackupController {
  constructor(private readonly backup: BackupService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.backup.list(user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtUser) {
    return this.backup.create(user.sub, 'manual');
  }

  @Get(':id/download')
  async download(@CurrentUser() user: JwtUser, @Param('id') id: string, @Res() res: Response) {
    const { stream, backup } = await this.backup.download(user.sub, id);
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${backup.filename}"`,
      'Content-Length': String(backup.size),
    });
    stream.pipe(res);
  }

  @Post(':id/restore')
  restore(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.backup.restore(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.backup.remove(user.sub, id);
  }
}
