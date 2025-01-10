import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { CommonController } from './common.controller';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { v4 } from 'uuid';
import { TasksService } from './tasks.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from 'src/movie/entity/movie.entity';
import { DefaultLogger } from './logger/default.logger';

@Module({
    imports: [
        TypeOrmModule.forFeature([Movie]),
        MulterModule.register({
            storage: diskStorage({
                destination: join(process.cwd(), 'public', 'temp'),
                filename: (req, file, cb) => {
                    const split = file.originalname.split('.');
                    let extension = 'mp4';
                    if (split.length > 1) extension = split[split.length - 1];
                    const filename = `${v4()}_${Date.now()}.${extension}`;
                    cb(null, filename);
                }
            })
        })
    ],
    controllers: [CommonController],
    providers: [CommonService, TasksService, DefaultLogger],
    exports: [CommonService, DefaultLogger]
})
export class CommonModule {}
