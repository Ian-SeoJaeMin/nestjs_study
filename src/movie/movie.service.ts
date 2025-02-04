import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entity/movie.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { MovieDetail } from './entity/movie-detail.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entities/genre.entity';
import { GetMoviesDto } from './dto/get-movies.dto';
import { CommonService } from 'src/common/common.service';
import { join } from 'path';
import { rename } from 'fs/promises';
import { User } from 'src/user/entities/user.entity';
import { MovieUserLike } from './entity/movie-user-like.entity';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class MovieService {
    constructor(
        @InjectRepository(Movie) private movieRepository: Repository<Movie>,
        @InjectRepository(MovieDetail)
        private movieDetailRepository: Repository<MovieDetail>,
        @InjectRepository(Director)
        private directorRepository: Repository<Director>,
        @InjectRepository(Genre)
        private genreRepository: Repository<Genre>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(MovieUserLike)
        private movieUserLikeRepository: Repository<MovieUserLike>,
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
        private readonly dataSource: DataSource,
        private readonly commonService: CommonService
    ) {}

    /* istanbul ignore next */
    async getMovies() {
        return this.movieRepository
            .createQueryBuilder('movie')
            .leftJoinAndSelect('movie.director', 'director')
            .leftJoinAndSelect('movie.genres', 'genres');
    }

    /* istanbul ignore next */
    async getLikedMovies(movieIds: number[], userId: number) {
        return this.movieUserLikeRepository
            .createQueryBuilder('mul')
            .leftJoinAndSelect('mul.movie', 'movie')
            .leftJoinAndSelect('mul.user', 'user')
            .where('movie.id in(:...movieIds)', { movieIds })
            .andWhere('user.id = :userId', { userId })
            .getMany();
    }

    async findAll(getMoviesDto: GetMoviesDto, userId?: number) {
        const { title } = getMoviesDto;
        const qb = await this.getMovies();

        if (title) {
            qb.where('movie.title like :title', { title: `%${title}%` });
        }

        // this.commonService.applyPagePaginationParamsToQb(qb, getMoviesDto);
        const { nextCursor } = await this.commonService.applyCursorPaginationParamsToQb(qb, getMoviesDto);

        let [data, count] = await qb.getManyAndCount();

        // userId 가 있는 경우 좋아요 데이터 맵핑
        // 이 부분은 함수로 분리하는게 좋을 듯
        if (userId) {
            const movieIds = data.map(m => m.id);
            const likeRecords = movieIds.length < 1 ? [] : await this.getLikedMovies(movieIds, userId);
            const likeRecordsMap = likeRecords.reduce(
                (acc, next) => ({
                    ...acc,
                    [next.movie.id]: next.isLike
                }),
                {}
            );

            data = data.map(x => ({
                ...x,
                likeStatus: x.id in likeRecordsMap ? likeRecordsMap[x.id] : null
            }));
        }

        return {
            data,
            count,
            nextCursor
        };
    }

    async findRecent() {
        const recentMovies =
            (await this.cacheManager.get('RECENT_MOVIES')) ??
            (await this.movieRepository.find({
                order: {
                    createdAt: 'DESC'
                },
                take: 10
            }));
        // RECENT_MOVIES : [{...최신영화들...}] ttl : 0 = 무제한으로 저장; 3000 = 3초
        // ttl 전역 설정을 override 함.
        // await this.cacheManager.set('RECENT_MOVIES', recentMovies, 0);

        await this.cacheManager.set('RECENT_MOVIES', recentMovies);
        return recentMovies;
    }

    /* istanbul ignore next */
    async findMovieDetail(id: number) {
        return this.movieRepository
            .createQueryBuilder('movie')
            .leftJoinAndSelect('movie.director', 'director')
            .leftJoinAndSelect('movie.detail', 'detail')
            .leftJoinAndSelect('movie.genres', 'genres')
            .leftJoinAndSelect('movie.creator', 'creator')
            .where('movie.id = :id', { id })
            .getOne();
    }

    async findOne(id: number) {
        const movie = await this.findMovieDetail(id);

        if (!movie) {
            throw new NotFoundException('존재하지 않는 ID의 영화입니다!');
        }

        return movie;
        // const movie = await this.movieRepository.findOne({
        //   where: { id },
        //   relations: ['detail', 'director', 'genres'],
        // });
        // if (!movie) throw new NotFoundException('Movie not found');
        // return movie;
    }

    /* istanbul ignore next */
    async createMovieDetail(qr: QueryRunner, detail: string) {
        return qr.manager.createQueryBuilder().insert().into(MovieDetail).values({ detail }).execute();
    }

    /* istanbul ignore next */
    async createMovie(
        qr: QueryRunner,
        userId: number,
        title: string,
        movieDetailId: number,
        director: Director,
        movieFolder: string,
        movieFileName: string
    ) {
        return qr.manager
            .createQueryBuilder()
            .insert()
            .into(Movie)
            .values({
                title,
                creator: {
                    id: userId
                },
                detail: { id: movieDetailId },
                director,
                movieFilePath: join(movieFolder, movieFileName)
                //genres // many-to-many 관계로 인해 이렇게 넣을 수 없음
            })
            .execute();
    }

    /* istanbul ignore next */
    async createMovieGenreRelation(qr: QueryRunner, movieId: number, genres: Genre[]) {
        await qr.manager
            .createQueryBuilder()
            .relation(Movie, 'genres')
            .of(movieId)
            .add(genres.map(genre => genre.id));
    }

    /* istanbul ignore next */
    async renameMovieFile(tempFolder: string, movieFileName: string, movieFolder: string) {
        await rename(join(process.cwd(), tempFolder, movieFileName), join(process.cwd(), movieFolder, movieFileName));
    }

    async create(movieData: CreateMovieDto, userId: number, qr: QueryRunner) {
        const { detail, directorId, genreIds, movieFileName, title } = movieData;
        const director = await qr.manager.findOne(Director, {
            where: { id: directorId }
        });
        if (!director) throw new NotFoundException('Director not found');

        const genres = await qr.manager.find(Genre, {
            where: { id: In(genreIds) }
        });

        if (genres.length !== genreIds.length)
            throw new NotFoundException(`Genres not found (exist ids => ${genres.map(genre => genre.id).join(', ')})`);

        const movieDetail = await this.createMovieDetail(qr, detail);

        const movieDetailId = movieDetail.identifiers[0].id;
        const movieFolder = join('public', 'movie');
        const tempFolder = join('public', 'temp');

        const movie = await this.createMovie(qr, userId, title, movieDetailId, director, movieFolder, movieFileName);

        const movieId = movie.identifiers[0].id;

        await this.createMovieGenreRelation(qr, movieId, genres);
        // await qr.commitTransaction();

        await this.renameMovieFile(tempFolder, movieFileName, movieFolder);

        return qr.manager.findOne(Movie, {
            where: { id: movieId },
            relations: ['detail', 'director', 'genres']
        });
    }

    /* istanbul ignore next */
    async updateMovie(qr: QueryRunner, movieData: UpdateMovieDto, newDirector: Director, id: number) {
        await qr.manager
            .createQueryBuilder()
            .update(Movie)
            .set({
                title: movieData.title,
                movieFileName: movieData.movieFileName,
                ...(newDirector && { director: newDirector })
                // ...(newGenres && { genres: newGenres }), // TypeORM 에선 이렇게 업데이트 불가
            })
            .where('id = :id', { id })
            .execute();
    }

    /* istanbul ignore next */
    async updateMovieDetail(qr: QueryRunner, detail: string, movie: Movie) {
        await qr.manager.createQueryBuilder().update(MovieDetail).set({ detail }).where('id = :id', { id: movie.detail.id }).execute();
    }

    /* istanbul ignore next */
    async updateMovieGenreRelation(qr: QueryRunner, id: number, newGenres: Genre[], movie: Movie) {
        await qr.manager
            .createQueryBuilder()
            .relation(Movie, 'genres')
            .of(id)
            .addAndRemove(
                newGenres.map(genre => genre.id),
                movie.genres.map(genre => genre.id)
            );
    }

    async update(id: number, movieData: UpdateMovieDto) {
        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {
            const movie = await qr.manager.findOne(Movie, {
                where: { id },
                relations: ['detail', 'genres']
            });

            if (!movie) throw new NotFoundException('Movie not found');

            const { detail, directorId, genreIds } = movieData;
            let newDirector, newGenres;

            if (directorId) {
                const director = await qr.manager.findOne(Director, {
                    where: { id: directorId }
                });
                if (!director) throw new NotFoundException('Director not found');
                newDirector = director;
            }

            if (genreIds) {
                const genres = await qr.manager.find(Genre, {
                    where: { id: In(genreIds) }
                });

                if (genres.length !== genreIds.length)
                    throw new NotFoundException(`Genres not found (exist ids => ${genres.map(genre => genre.id).join(', ')})`);

                newGenres = genres;
            }

            await this.updateMovie(qr, movieData, newDirector, id);

            // await this.movieRepository.update(
            //   { id },
            //   {
            //     ...movieRest,
            //     ...(newDirector && { director: newDirector }),
            //     // ...(newGenres && { genres: newGenres }), // TypeORM 에선 이렇게 업데이트 불가
            //   },
            // );

            if (detail) {
                await this.updateMovieDetail(qr, detail, movie);
                // await this.movieDetailRepository.update(
                //   { id: movie.detail.id },
                //   { detail },
                // );
            }

            if (newGenres) {
                await this.updateMovieGenreRelation(qr, id, newGenres, movie);
            }

            // const newMovie = await this.movieRepository.findOne({
            //   where: { id },
            //   relations: ['detail', 'director', 'genres'],
            // });

            // newMovie.genres = newGenres;
            // await this.movieRepository.save(newMovie);

            // return this.movieRepository.preload(newMovie); // newMovie에 있는 값들로 데이터를 채워서 반환

            await qr.commitTransaction();
            return this.movieRepository.findOne({
                where: { id },
                relations: ['detail', 'director', 'genres']
            });
        } catch (error) {
            await qr.rollbackTransaction();
            throw error;
        } finally {
            await qr.release();
        }
    }

    /* istanbul ignore next */
    deleteMovie(id: number) {
        return this.movieRepository.createQueryBuilder().delete().where('id = :id', { id }).execute();
    }

    async remove(id: number) {
        const movie = await this.movieRepository.findOne({
            where: { id },
            relations: ['detail']
        });

        if (!movie) throw new NotFoundException('Movie not found');

        await this.deleteMovie(id);
        await this.movieDetailRepository.delete({ id: movie.detail.id });
    }

    /* istanbul ignore next */
    getLikedRecord(movieId: number, userId: number) {
        return this.movieUserLikeRepository
            .createQueryBuilder('mul')
            .leftJoinAndSelect('mul.movie', 'movie')
            .leftJoinAndSelect('mul.user', 'user')
            .where('movie.id = :movieId', { movieId })
            .andWhere('user.id = :userId', { userId })
            .getOne();
    }

    async ToggleMovieLike(movieId: number, userId: number, isLike: boolean) {
        const movie = await this.movieRepository.findOne({ where: { id: movieId } });
        if (!movie) throw new BadRequestException('존재하지 않는 영화입니다.');
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('사용자 정보가 없습니다.');

        const movieUserLike = await this.getLikedRecord(movieId, userId);

        if (!movieUserLike) await this.movieUserLikeRepository.save({ movie, user, isLike });
        else if (movieUserLike.isLike === isLike) await this.movieUserLikeRepository.delete({ movie, user });
        else await this.movieUserLikeRepository.update({ movie, user }, { isLike });

        const result = await this.getLikedRecord(movieId, userId);
        return {
            isLike: result && result.isLike
        };
    }
}
