import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseInterceptors,
    ClassSerializerInterceptor,
    Query,
    ParseIntPipe,
    Request,
    UploadedFile,
    UploadedFiles,
    BadRequestException
} from '@nestjs/common';
import { MovieService } from './movie.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Public } from 'src/auth/decorator/public.decorator';
import { RBAC } from 'src/auth/decorator/rbac.decorator';
import { Role } from 'src/user/entities/user.entity';
import { GetMoviesDto } from './dto/get-movies.dto';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MovieFilePipe } from './pipe/movie-file.pipe';

@Controller('movie')
@UseInterceptors(ClassSerializerInterceptor) // class-transformer 를 moviceController에 적용
export class MovieController {
    constructor(private readonly movieService: MovieService) {}

    @Get()
    @Public()
    getMovies(@Query() getMoviesDto: GetMoviesDto) {
        return this.movieService.findAll(getMoviesDto);
    }

    @Get(':id')
    @Public()
    getMovie(@Param('id', ParseIntPipe) id: number) {
        return this.movieService.findOne(id);
    }

    @Post()
    @RBAC(Role.admin)
    @UseInterceptors(TransactionInterceptor)
    postMovie(@Body() movieData: CreateMovieDto, @Request() req: any) {
        return this.movieService.create(movieData, req.queryRunner);
    }

    @Patch(':id')
    @RBAC(Role.admin)
    patchMovie(@Param('id', ParseIntPipe) id: string, @Body() movieData: UpdateMovieDto) {
        return this.movieService.update(+id, movieData);
    }

    @Delete(':id')
    @RBAC(Role.admin)
    deleteMovie(@Param('id', ParseIntPipe) id: string) {
        return this.movieService.remove(+id);
    }
}
