import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { vaultEntrySchema, folderSchema, VaultEntryInput, FolderInput, VaultType, VAULT_TYPES } from '@vaultx/shared';
import { VaultService } from './vault.service';
import { zod } from '../common/zod-validation.pipe';
import { CurrentUser, JwtUser } from '../common/decorators';

@Controller('vault')
export class VaultController {
  constructor(private readonly vault: VaultService) {}

  // ----- Folders (declared before :id routes) -----
  @Get('folders')
  folders(@CurrentUser() user: JwtUser, @Query('type') type?: VaultType | 'all') {
    return this.vault.listFolders(user.sub, type);
  }

  @Post('folders')
  createFolder(@CurrentUser() user: JwtUser, @Body(zod(folderSchema)) body: FolderInput) {
    return this.vault.createFolder(user.sub, body);
  }

  @Patch('folders/:id')
  updateFolder(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() body: Partial<FolderInput>) {
    return this.vault.updateFolder(user.sub, id, body);
  }

  @Delete('folders/:id')
  deleteFolder(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.vault.deleteFolder(user.sub, id);
  }

  // ----- Entries -----
  @Get()
  list(
    @CurrentUser() user: JwtUser,
    @Query('type') type?: VaultType,
    @Query('folderId') folderId?: string,
    @Query('archived') archived?: string,
    @Query('trash') trash?: string,
    @Query('favorite') favorite?: string,
    @Query('pinned') pinned?: string,
    @Query('tag') tag?: string,
  ) {
    if (type && !VAULT_TYPES.includes(type)) throw new BadRequestException('Invalid type');
    return this.vault.list(user.sub, {
      type,
      folderId,
      archived: archived === 'true',
      trash: trash === 'true',
      favorite: favorite === 'true',
      pinned: pinned === 'true',
      tag,
    });
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body(zod(vaultEntrySchema)) body: VaultEntryInput) {
    return this.vault.create(user.sub, body);
  }

  @Get('trash-count')
  trashCount(@CurrentUser() user: JwtUser) {
    return this.vault.list(user.sub, { trash: true, limit: 0 }).then((items) => ({ count: items.length }));
  }

  @Post('trash/empty')
  emptyTrash(@CurrentUser() user: JwtUser) {
    return this.vault.emptyTrash(user.sub);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.vault.get(user.sub, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() body: Partial<VaultEntryInput>) {
    return this.vault.update(user.sub, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.vault.softDelete(user.sub, id);
  }

  @Post(':id/restore')
  restore(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.vault.restore(user.sub, id);
  }

  @Delete(':id/permanent')
  permanent(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.vault.permanentDelete(user.sub, id);
  }
}
