import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { albumSchema, AlbumInput, FileKind, FILE_KINDS, VAULT_TYPES } from '@vaultx/shared';
import { FilesService } from './files.service';
import { zod } from '../common/zod-validation.pipe';
import { CurrentUser, JwtUser } from '../common/decorators';

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  list(
    @CurrentUser() user: JwtUser,
    @Query('kind') kind?: FileKind,
    @Query('albumId') albumId?: string,
    @Query('trash') trash?: string,
    @Query('favorite') favorite?: string,
  ) {
    if (kind && !FILE_KINDS.includes(kind)) kind = undefined;
    return this.files.list(user.sub, { kind, albumId, trash: trash === 'true', favorite: favorite === 'true' });
  }

  @Get('storage')
  storage(@CurrentUser() user: JwtUser) {
    return this.files.storageUsed(user.sub).then((bytes) => ({ bytes }));
  }

  @Get('albums')
  albums(@CurrentUser() user: JwtUser) {
    return this.files.listAlbums(user.sub);
  }

  @Post('albums')
  createAlbum(@CurrentUser() user: JwtUser, @Body(zod(albumSchema)) body: AlbumInput) {
    return this.files.createAlbum(user.sub, body);
  }

  @Patch('albums/:id')
  updateAlbum(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() body: Partial<AlbumInput>) {
    return this.files.updateAlbum(user.sub, id, body);
  }

  @Delete('albums/:id')
  deleteAlbum(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.files.deleteAlbum(user.sub, id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: JwtUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('kind') kind: FileKind,
    @Body('albumId') albumId?: string,
    @Body('tags') tags?: string,
    @Body('favorite') favorite?: string,
    @Body('encryptedName') encryptedName?: string,
    @Body('iv') iv?: string,
    @Body('contentIv') contentIv?: string,
  ) {
    if (!file) throw new Error('No file provided');
    const safeKind = kind && FILE_KINDS.includes(kind) ? kind : 'other';
    const parsedTags = tags ? tags.split(',').filter(Boolean).slice(0, 10) : [];
    return this.files.upload(user.sub, file, {
      kind: safeKind,
      albumId,
      tags: parsedTags,
      favorite: favorite === 'true',
      encryptedName: encryptedName ?? 'encrypted',
      iv: iv ?? '',
      contentIv,
    });
  }

  @Get(':id/download')
  async download(@CurrentUser() user: JwtUser, @Param('id') id: string, @Res() res: Response) {
    const { stream, entry } = await this.files.download(user.sub, id);
    res.set({
      'Content-Type': entry.mime ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="vault-file-${entry._id}"`,
      'Content-Length': String(entry.size),
    });
    stream.pipe(res);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.files.get(user.sub, id);
  }

  @Post(':id/toggle-favorite')
  toggleFavorite(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.files.toggleFavorite(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.files.softDelete(user.sub, id);
  }

  @Post(':id/restore')
  restore(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.files.restore(user.sub, id);
  }

  @Delete(':id/permanent')
  permanent(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.files.permanentDelete(user.sub, id);
  }

  @Post('trash/empty')
  emptyTrash(@CurrentUser() user: JwtUser) {
    return this.files.emptyTrash(user.sub);
  }
}
