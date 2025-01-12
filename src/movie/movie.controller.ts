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
    Version,
    VERSION_NEUTRAL
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
import { CacheKey, CacheTTL, CacheInterceptor as CI } from '@nestjs/cache-manager';
import { Throttle } from 'src/common/decorator/throttle.decorator';
@Controller('movie')
@UseInterceptors(ClassSerializerInterceptor) // class-transformer 를 moviceController에 적용
export class MovieController {
    constructor(private readonly movieService: MovieService) {}

    @Get()
    @Public()
    @Throttle({
        count: 5,
        unit: 'minute'
    })
    getMovies(@Query() getMoviesDto: GetMoviesDto, @UserId() userId?: number) {
        return this.movieService.findAll(getMoviesDto, userId);
    }

    // recent 먼저 걸리도록 :id 엔드포인트 위에 설정
    @Get('recent')
    // URL 기반으로 응답 데이터를 캐싱함
    // QueryParam 에 따라서 URL이 바뀌기 때문에 각각 캐싱함.
    @UseInterceptors(CI)
    @CacheKey('getMoviesRecent') // 캐시키를 지정할 수 있다.
    @CacheTTL(0) // 캐싱 ttl 을 override 할 수 있다.
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
