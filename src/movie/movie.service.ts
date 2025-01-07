import { Injectable, NotFoundException } from '@nestjs/common';
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
        private readonly dataSource: DataSource,
        private readonly commonService: CommonService
    ) {}

    async findAll(getMoviesDto: GetMoviesDto) {
        const { title } = getMoviesDto;
        const qb = await this.movieRepository
            .createQueryBuilder('movie')
            .leftJoinAndSelect('movie.director', 'director')
            .leftJoinAndSelect('movie.genres', 'genres');

        if (title) {
            qb.where('movie.title like :title', { title: `%${title}%` });
        }

        // this.commonService.applyPagePaginationParamsToQb(qb, getMoviesDto);
        const { nextCursor } = await this.commonService.applyCursorPaginationParamsToQb(qb, getMoviesDto);

        const [data, count] = await qb.getManyAndCount();

        return {
            data,
            count,
            nextCursor
        };
    }

    async findOne(id: number) {
        const qb = await this.movieRepository
            .createQueryBuilder('movie')
            .leftJoinAndSelect('movie.director', 'director')
            .leftJoinAndSelect('movie.detail', 'detail')
            .leftJoinAndSelect('movie.genres', 'genres')
            .where('movie.id = :id', { id });
        return qb.getOne();
        // const movie = await this.movieRepository.findOne({
        //   where: { id },
        //   relations: ['detail', 'director', 'genres'],
        // });
        // if (!movie) throw new NotFoundException('Movie not found');
        // return movie;
    }

    async create(movieData: CreateMovieDto, qr: QueryRunner) {
        const { detail, directorId, genreIds, movieFileName, ...movieRest } = movieData;
        const director = await qr.manager.findOne(Director, {
            where: { id: directorId }
        });
        if (!director) throw new NotFoundException('Director not found');

        const genres = await qr.manager.find(Genre, {
            where: { id: In(genreIds) }
        });

        if (genres.length !== genreIds.length)
            throw new NotFoundException(`Genres not found (exist ids => ${genres.map(genre => genre.id).join(', ')})`);

        const movieDetail = await qr.manager.createQueryBuilder().insert().into(MovieDetail).values({ detail }).execute();

        const movieDetailId = movieDetail.identifiers[0].id;
        const movieFolder = join('public', 'movie');
        const tempFolder = join('public', 'temp');

        await rename(join(process.cwd(), tempFolder, movieFileName), join(process.cwd(), movieFolder, movieFileName));

        const movie = await qr.manager
            .createQueryBuilder()
            .insert()
            .into(Movie)
            .values({
                ...movieRest,
                detail: { id: movieDetailId },
                director,
                movieFilePath: join(movieFolder, movieFileName)
                //genres // many-to-many 관계로 인해 이렇게 넣을 수 없음
            })
            .execute();

        const movieId = movie.identifiers[0].id;

        await qr.manager
            .createQueryBuilder()
            .relation(Movie, 'genres')
            .of(movieId)
            .add(genres.map(genre => genre.id));

        // await qr.commitTransaction();

        return qr.manager.findOne(Movie, {
            where: { id: movieId },
            relations: ['detail', 'director', 'genres']
        });
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

            const { detail, directorId, genreIds, ...movieRest } = movieData;
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

            await qr.manager
                .createQueryBuilder()
                .update(Movie)
                .set({
                    ...movieRest,
                    ...(newDirector && { director: newDirector })
                    // ...(newGenres && { genres: newGenres }), // TypeORM 에선 이렇게 업데이트 불가
                })
                .where('id = :id', { id })
                .execute();

            // await this.movieRepository.update(
            //   { id },
            //   {
            //     ...movieRest,
            //     ...(newDirector && { director: newDirector }),
            //     // ...(newGenres && { genres: newGenres }), // TypeORM 에선 이렇게 업데이트 불가
            //   },
            // );

            if (detail) {
                await qr.manager
                    .createQueryBuilder()
                    .update(MovieDetail)
                    .set({ detail })
                    .where('id = :id', { id: movie.detail.id })
                    .execute();
                // await this.movieDetailRepository.update(
                //   { id: movie.detail.id },
                //   { detail },
                // );
            }

            if (newGenres) {
                await qr.manager
                    .createQueryBuilder()
                    .relation(Movie, 'genres')
                    .of(id)
                    .addAndRemove(
                        newGenres.map(genre => genre.id),
                        movie.genres.map(genre => genre.id)
                    );
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

    async remove(id: number) {
        const movie = await this.movieRepository.findOne({
            where: { id },
            relations: ['detail']
        });

        if (!movie) throw new NotFoundException('Movie not found');

        await this.movieRepository.createQueryBuilder().delete().where('id = :id', { id }).execute();

        // await this.movieRepository.delete({ id });
        await this.movieDetailRepository.delete({ id: movie.detail.id });
    }
}
