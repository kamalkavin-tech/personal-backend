import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FileEntry, FileEntrySchema } from './schemas/file-entry.schema';
import { Album, AlbumSchema } from './schemas/album.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FileEntry.name, schema: FileEntrySchema },
      { name: Album.name, schema: AlbumSchema },
    ]),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService, MongooseModule],
})
export class FilesModule {}
