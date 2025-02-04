import { Test, TestingModule } from '@nestjs/testing';
import { MovieController } from './movie.controller';
import { MovieService } from './movie.service';
import { TestBed } from '@automock/jest';
import { GetMoviesDto } from './dto/get-movies.dto';
import { CreateMovieDto } from './dto/create-movie.dto';
import { QueryRunner } from 'typeorm';
import { UpdateMovieDto } from './dto/update-movie.dto';

describe('MovieController', () => {
    let movieController: MovieController;
    let movieService: jest.Mocked<MovieService>;

    beforeEach(async () => {
        const { unit, unitRef } = TestBed.create(MovieController).compile();
        movieController = unit;
        movieService = unitRef.get(MovieService);
    });

    it('should be defined', () => {
        expect(movieController).toBeDefined();
    });

    describe('getMovies', () => {
        it('should return movies', async () => {
            const dto = { page: 1, limit: 10 };
            const userId = 1;
            const movies = [
                { id: 1, title: 'test' },
                { id: 2, title: 'test2' }
            ];

            jest.spyOn(movieService, 'findAll').mockResolvedValue(movies as any);

            const result = await movieController.getMovies(dto as any, userId);

            expect(movieService.findAll).toHaveBeenCalledWith(dto, userId);
            expect(result).toEqual(movies);
        });
    });

    describe('getMovie', () => {
        it('should return movie', async () => {
            await movieController.getMovie(1);

            expect(movieService.findOne).toHaveBeenCalledWith(1);
        });
    });

    describe('postMovie', () => {
        it('should return movie', async () => {
            const body = { title: 'test' };
            const userId = 1;
            const queryRunner = {
                manager: {
                    createQueryBuilder: jest.fn()
                }
            };

            await movieController.postMovie(body as CreateMovieDto, queryRunner as unknown as QueryRunner, userId);
            expect(movieService.create).toHaveBeenCalledWith(body, userId, queryRunner);
        });
    });

    describe('patchMovie', () => {
        it('should return movie', async () => {
            const body: UpdateMovieDto = { title: 'test' };

            await movieController.patchMovie(1, body);

            expect(movieService.update).toHaveBeenCalledWith(1, body);
        });
    });

    describe('deleteMovie', () => {
        it('should return movie', async () => {
            await movieController.deleteMovie(1);

            expect(movieService.remove).toHaveBeenCalledWith(1);
        });
    });

    describe('recentMovies', () => {
        it('should return recent movies', async () => {
            await movieController.getMoviesRecent();

            expect(movieService.findRecent).toHaveBeenCalled();
        });
    });

    describe('createMovieLike', () => {
        it('should return movie', async () => {
            await movieController.createMovieLike(1, 1);

            expect(movieService.ToggleMovieLike).toHaveBeenCalledWith(1, 1, true);
        });
    });

    describe('createMovieDisLike', () => {
        it('should return movie', async () => {
            await movieController.createMovieDisLike(1, 1);

            expect(movieService.ToggleMovieLike).toHaveBeenCalledWith(1, 1, false);
        });
    });
});
