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
    ParseIntPipe
} from '@nestjs/common';
import { MovieService } from './movie.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Public } from 'src/auth/decorator/public.decorator';
import { RBAC } from 'src/auth/decorator/rbac.decorator';
import { Role } from 'src/user/entities/user.entity';
import { GetMoviesDto } from './dto/get-movies.dto';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { UserId } from 'src/user/decorator/user-id.decorator';
import { QueryRunner } from 'src/common/decorator/query-runner.decorator';
import { QueryRunner as qr } from 'typeorm';

@Controller('movie')
@UseInterceptors(ClassSerializerInterceptor) // class-transformer 를 moviceController에 적용
export class MovieController {
    constructor(private readonly movieService: MovieService) {}

    @Get()
    @Public()
    getMovies(@Query() getMoviesDto: GetMoviesDto, @UserId() userId?: number) {
        return this.movieService.findAll(getMoviesDto, userId);
    }

    // recent 먼저 걸리도록 :id 엔드포인트 위에 설정
    @Get('recent')
    getMoviesRecent() {
        return this.movieService.findRecent();
    }

    @Get(':id')
    @Public()
    getMovie(@Param('id', ParseIntPipe) id: number) {
        return this.movieService.findOne(id);
    }

    @Post()
    @RBAC(Role.admin)
    @UseInterceptors(TransactionInterceptor)
    postMovie(@Body() movieData: CreateMovieDto, @QueryRunner() queryRunner: qr, @UserId() userId: number) {
        return this.movieService.create(movieData, userId, queryRunner);
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

    @Post(':id/like')
    createMovieLike(@Param('id', ParseIntPipe) movieId: number, @UserId() userId: number) {
        return this.movieService.ToggleMovieLike(movieId, userId, true);
    }

    @Post(':id/dislike')
    createMovieDisLike(@Param('id', ParseIntPipe) movieId: number, @UserId() userId: number) {
        return this.movieService.ToggleMovieLike(movieId, userId, false);
    }
}
