import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Common')
@ApiBearerAuth()
@Controller('common')
export class CommonController {
    @Post('video')
    @UseInterceptors(
        FileInterceptor('video', {
            limits: {
                fileSize: 20000000
            },
            fileFilter(req, file, callback) {
                if (file.mimetype !== 'video/mp4') {
                    return callback(new BadRequestException('MP4 타입의 영상만 업로드 가능합니다.'), false);
                }
                return callback(null, true);
            }
        })
    )
    createVideo(@UploadedFile() video: Express.Multer.File) {
        return { fileName: video.filename };
    }
}
