import { Test, TestingModule } from '@nestjs/testing';
import { GenreService } from './genre.service';
import { Repository } from 'typeorm';
import { Genre } from './entities/genre.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { NotFoundException } from '@nestjs/common';

const mockGenreRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
};

describe('GenreService', () => {
    let genreService: GenreService;
    let genreRepository: Repository<Genre>;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GenreService,
                {
                    provide: getRepositoryToken(Genre),
                    useValue: mockGenreRepository
                }
            ]
        }).compile();
        genreService = module.get<GenreService>(GenreService);
        genreRepository = module.get<Repository<Genre>>(getRepositoryToken(Genre));
    });

    it('should be defined', () => {
        expect(genreService).toBeDefined();
    });

    describe('findAll', () => {
        it('should return an array of genres', async () => {
            const genres = [new Genre(), new Genre()];
            jest.spyOn(genreRepository, 'find').mockResolvedValue(genres);
            const result = await genreService.findAll();
            expect(result).toEqual(genres);
            expect(genreRepository.find).toHaveBeenCalled();
        });
    });

    describe('findOne', () => {
        it('should return a genre by id', async () => {
            const genre = new Genre();
            jest.spyOn(genreRepository, 'findOne').mockResolvedValue(genre as Genre);
            const result = await genreService.findOne(1);
            expect(result).toEqual(genre);
            expect(genreRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
        });
    });

    describe('create', () => {
        it('should create a new genre', async () => {
            const createGenreDto = { name: 'Action' };
            jest.spyOn(genreRepository, 'save').mockResolvedValue(createGenreDto as Genre);
            const result = await genreService.create(createGenreDto as CreateGenreDto);
            expect(result).toEqual(createGenreDto);
            expect(genreRepository.save).toHaveBeenCalledWith(createGenreDto);
        });
    });

    describe('update', () => {
        it('should update a genre', async () => {
            const updateGenreDto = { name: 'Action' };
            const existingGenre = { id: 1, name: 'Fantasy' };
            const updatedGenre = { id: 1, name: 'Action' };
            jest.spyOn(genreRepository, 'findOne').mockResolvedValueOnce(existingGenre as Genre);
            jest.spyOn(genreRepository, 'findOne').mockResolvedValueOnce(updatedGenre as Genre);
            const result = await genreService.update(1, updateGenreDto as UpdateGenreDto);
            expect(result).toEqual(updatedGenre);
            expect(genreRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(genreRepository.update).toHaveBeenCalledWith({ id: 1 }, updateGenreDto);
        });
        it('should throw NotFoundException if genre is not found', async () => {
            const updateGenreDto = { name: 'Action' };
            jest.spyOn(genreRepository, 'findOne').mockResolvedValue(null);
            await expect(genreService.update(1, updateGenreDto as UpdateGenreDto)).rejects.toThrow(NotFoundException);
        });
    });

    describe('remove', () => {
        it('should delete a genre', async () => {
            const existingGenre = { id: 1, name: 'Fantasy' };
            jest.spyOn(genreRepository, 'findOne').mockResolvedValueOnce(existingGenre as Genre);
            const result = await genreService.remove(1);
            expect(result).toEqual(1);
            expect(genreRepository.delete).toHaveBeenCalledWith({ id: 1 });
        });
        it('should throw NotFoundException if genre is not found', async () => {
            jest.spyOn(genreRepository, 'findOne').mockResolvedValue(null);
            await expect(genreService.remove(1)).rejects.toThrow(NotFoundException);
        });
    });
});
