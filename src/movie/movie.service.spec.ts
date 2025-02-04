import { MovieService } from './movie.service';
import { TestBed } from '@automock/jest';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { Movie } from './entity/movie.entity';
import { MovieDetail } from './entity/movie-detail.entity';
import { MovieUserLike } from './entity/movie-user-like.entity';
import { Genre } from 'src/genre/entities/genre.entity';
import { User } from 'src/user/entities/user.entity';
import { Director } from 'src/director/entity/director.entity';
import { CommonService } from 'src/common/common.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { GetMoviesDto } from './dto/get-movies.dto';
import { NotFoundException } from '@nestjs/common';

describe('MovieService', () => {
    let movieService: MovieService;
    let movieRepository: jest.Mocked<Repository<Movie>>;
    let movieDetailRepository: jest.Mocked<Repository<MovieDetail>>;
    let directReposotory: jest.Mocked<Repository<Director>>;
    let genreReposotory: jest.Mocked<Repository<Genre>>;
    let userReposotory: jest.Mocked<Repository<User>>;
    let movieUserLikeReposotory: jest.Mocked<Repository<MovieUserLike>>;
    let dataSource: jest.Mocked<DataSource>;
    let commonService: jest.Mocked<CommonService>;
    let cacheManager: Cache;

    beforeEach(async () => {
        const { unit, unitRef } = TestBed.create(MovieService).compile();

        movieService = unit;
        movieRepository = unitRef.get(getRepositoryToken(Movie) as string);
        movieDetailRepository = unitRef.get(getRepositoryToken(MovieDetail) as string);
        directReposotory = unitRef.get(getRepositoryToken(Director) as string);
        genreReposotory = unitRef.get(getRepositoryToken(Genre) as string);
        userReposotory = unitRef.get(getRepositoryToken(User) as string);
        movieUserLikeReposotory = unitRef.get(getRepositoryToken(MovieUserLike) as string);
        dataSource = unitRef.get(DataSource);
        commonService = unitRef.get(CommonService);
        cacheManager = unitRef.get(CACHE_MANAGER);
    });

    it('should be defined', () => {
        expect(movieService).toBeDefined();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findRecent', () => {
        const cachedMovies = [
            {
                id: 1,
                title: 'movie 1'
            }
        ];

        it('should return recent movie from cache', async () => {
            jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedMovies);
            const result = await movieService.findRecent();

            expect(result).toEqual(cachedMovies);
            expect(cacheManager.get).toHaveBeenCalledWith('RECENT_MOVIES');
            expect(movieRepository.find).not.toHaveBeenCalledWith({ order: { createdAt: 'DESC' }, take: 10 });
            expect(cacheManager.set).toHaveBeenCalledWith('RECENT_MOVIES', cachedMovies);
        });

        it('should return recent movie from repository(datasource)', async () => {
            jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
            jest.spyOn(movieRepository, 'find').mockResolvedValue(cachedMovies as Movie[]);
            const result = await movieService.findRecent();

            expect(result).toEqual(cachedMovies);
            expect(cacheManager.get).toHaveBeenCalledWith('RECENT_MOVIES');
            expect(movieRepository.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' }, take: 10 });
            expect(cacheManager.set).toHaveBeenCalledWith('RECENT_MOVIES', cachedMovies);
        });
    });

    describe('findAll', () => {
        let getMoviesMock: jest.SpyInstance;
        let getLikedMoviesMock: jest.SpyInstance;

        beforeEach(() => {
            getMoviesMock = jest.spyOn(movieService, 'getMovies');
            getLikedMoviesMock = jest.spyOn(movieService, 'getLikedMovies');
        });

        it('should return a list of movies without user likes', async () => {
            const movies = [
                {
                    id: 1,
                    title: 'Movie 1'
                }
            ];

            const dto = { title: 'movie' } as GetMoviesDto;
            const qb: any = {
                where: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([movies, 1])
            };

            getMoviesMock.mockResolvedValue(qb);

            jest.spyOn(commonService, 'applyCursorPaginationParamsToQb').mockResolvedValue({
                nextCursor: 'any'
            } as any);

            const result = await movieService.findAll(dto);
            expect(getMoviesMock).toHaveBeenCalled();
            expect(qb.where).toHaveBeenCalledWith('movie.title like :title', { title: `%${dto.title}%` });
            expect(commonService.applyCursorPaginationParamsToQb).toHaveBeenCalledWith(qb, dto);
            expect(qb.getManyAndCount).toHaveBeenCalled();

            expect(result).toEqual({
                count: 1,
                data: movies,
                nextCursor: 'any'
            });
        });

        it('should return a list of movies with user likes', async () => {
            const movies = [
                {
                    id: 1,
                    title: 'movie 1'
                },
                {
                    id: 2,
                    title: 'movie 2'
                }
            ];

            const likedMovies = [
                {
                    movie: { id: 1 },
                    isLike: true
                },
                {
                    movie: { id: 2 },
                    isLike: false
                }
            ];

            const dto = { title: 'movie' } as GetMoviesDto;
            const qb: any = {
                where: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([movies, 1])
            };

            getMoviesMock.mockResolvedValue(qb);
            getLikedMoviesMock.mockResolvedValue(likedMovies);

            jest.spyOn(commonService, 'applyCursorPaginationParamsToQb').mockResolvedValue({
                nextCursor: 'any'
            } as any);

            const userId = 1;
            const result = await movieService.findAll(dto, userId);

            expect(getMoviesMock).toHaveBeenCalled();
            expect(qb.where).toHaveBeenCalledWith('movie.title like :title', { title: `%${dto.title}%` });
            expect(commonService.applyCursorPaginationParamsToQb).toHaveBeenCalledWith(qb, dto);
            expect(qb.getManyAndCount).toHaveBeenCalled();
            expect(getLikedMoviesMock).toHaveBeenCalledWith(
                movies.map(m => m.id),
                userId
            );

            expect(result).toEqual({
                count: 1,
                nextCursor: 'any',
                data: [
                    {
                        id: 1,
                        title: 'movie 1',
                        likeStatus: true
                    },
                    {
                        id: 2,
                        title: 'movie 2',
                        likeStatus: false
                    }
                ]
            });
        });

        it('should return a list of movies without title filter', async () => {
            const movies = [
                {
                    id: 1,
                    title: 'Movie 1'
                }
            ];

            const dto = {} as GetMoviesDto;
            const qb: any = {
                getManyAndCount: jest.fn().mockResolvedValue([movies, 1])
            };

            getMoviesMock.mockResolvedValue(qb);
            jest.spyOn(commonService, 'applyCursorPaginationParamsToQb').mockResolvedValue({
                nextCursor: 'any'
            } as any);

            const result = await movieService.findAll(dto);

            expect(getMoviesMock).toHaveBeenCalled();
            expect(commonService.applyCursorPaginationParamsToQb).toHaveBeenCalledWith(qb, dto);
            expect(qb.getManyAndCount).toHaveBeenCalled();

            expect(result).toEqual({
                count: 1,
                data: movies,
                nextCursor: 'any'
            });
        });
    });

    describe('findOne', () => {
        let findMovieDetailMock: jest.SpyInstance;

        beforeEach(() => {
            findMovieDetailMock = jest.spyOn(movieService, 'findMovieDetail');
        });

        it('should return a movie if found', async () => {
            const movie = { id: 1, title: 'Movie 1' };
            findMovieDetailMock.mockResolvedValue(movie);

            const result = await movieService.findOne(1);
            expect(result).toEqual(movie);
            expect(findMovieDetailMock).toHaveBeenCalledWith(1);
        });

        it('should throw NotFoundException if movie is not found', async () => {
            findMovieDetailMock.mockResolvedValue(null);
            expect(movieService.findOne(1)).rejects.toThrow(NotFoundException);
            expect(findMovieDetailMock).toHaveBeenCalledWith(1);
        });
    });

    describe('create', () => {
        let qr: jest.Mocked<QueryRunner>;
        let createMovieDetailMock: jest.SpyInstance;
        let createMovieMock: jest.SpyInstance;
        let createMovieGenreRelationMock: jest.SpyInstance;
        let renameMovieFileMock: jest.SpyInstance;

        beforeEach(() => {
            qr = {
                manager: {
                    findOne: jest.fn(),
                    find: jest.fn()
                }
            } as any as jest.Mocked<QueryRunner>;
            createMovieDetailMock = jest.spyOn(movieService, 'createMovieDetail');
            createMovieMock = jest.spyOn(movieService, 'createMovie');
            createMovieGenreRelationMock = jest.spyOn(movieService, 'createMovieGenreRelation');
            renameMovieFileMock = jest.spyOn(movieService, 'renameMovieFile');
        });

        it('should createa movie successfully', async () => {
            const dto = { title: 'New Movie', directorId: 1, genreIds: [1, 2], detail: 'detail', movieFileName: 'movie.mp4' };

            const userId = 1;
            const director = { id: 1, name: 'Director1' };
            const genres = [
                { id: 1, name: 'Genre 1' },
                { id: 2, name: 'Genre 2' }
            ];

            const movieDetailInsertResult = { identifiers: [{ id: 1 }] };
            const movieInsertResult = { identifiers: [{ id: 1 }] };

            (qr.manager.findOne as any).mockResolvedValueOnce(director);
            (qr.manager.findOne as any).mockResolvedValue({ ...dto, id: 1 });
            (qr.manager.find as any).mockResolvedValue(genres);

            createMovieDetailMock.mockResolvedValue(movieDetailInsertResult);
            createMovieMock.mockResolvedValue(movieInsertResult);
            createMovieGenreRelationMock.mockResolvedValue(undefined);
            renameMovieFileMock.mockResolvedValue(undefined);

            const result = await movieService.create(dto, userId, qr);

            expect(qr.manager.findOne).toHaveBeenCalledWith(Director, { where: { id: dto.directorId } });
            expect(qr.manager.find).toHaveBeenCalledWith(Genre, { where: { id: In(dto.genreIds) } });

            expect(createMovieDetailMock).toHaveBeenCalledWith(qr, dto.detail);
            expect(createMovieMock).toHaveBeenCalledWith(
                qr,
                userId,
                dto.title,
                movieDetailInsertResult.identifiers[0].id,
                director,
                expect.any(String),
                dto.movieFileName
            );
            expect(createMovieGenreRelationMock).toHaveBeenCalledWith(qr, movieInsertResult.identifiers[0].id, genres);
            expect(renameMovieFileMock).toHaveBeenCalledWith(expect.any(String), dto.movieFileName, expect.any(String));

            expect(result).toEqual({ ...dto, id: 1 });
        });

        it('should throw NotFoundException if director does not exist', async () => {
            const dto = { title: 'New Movie', directorId: 1, genreIds: [1, 2], detail: 'detail', movieFileName: 'movie.mp4' };
            const userId = 1;
            (qr.manager.findOne as any).mockResolvedValueOnce(null);

            await expect(movieService.create(dto, userId, qr)).rejects.toThrow(NotFoundException);
            expect(qr.manager.findOne).toHaveBeenCalledWith(Director, {
                where: { id: dto.directorId }
            });
        });
        it('should throw NotFoundException if some genres do not exist', async () => {
            const dto = { title: 'New Movie', directorId: 1, genreIds: [1, 2], detail: 'detail', movieFileName: 'movie.mp4' };
            const userId = 1;
            const director = { id: 1, name: 'Director1' };

            (qr.manager.findOne as any).mockResolvedValueOnce(director);
            (qr.manager.find as any).mockResolvedValueOnce([
                {
                    id: 1,
                    name: 'Genre 1'
                }
            ]);

            await expect(movieService.create(dto, userId, qr)).rejects.toThrow(NotFoundException);
            expect(qr.manager.findOne).toHaveBeenCalledWith(Director, {
                where: { id: dto.directorId }
            });
            expect(qr.manager.find).toHaveBeenCalledWith(Genre, {
                where: {
                    id: In(dto.genreIds)
                }
            });
        });
    });
});
