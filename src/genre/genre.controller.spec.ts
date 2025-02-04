import { Test, TestingModule } from '@nestjs/testing';
import { GenreController } from './genre.controller';
import { GenreService } from './genre.service';
import { Genre } from './entities/genre.entity';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';

const mockGenreService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
};

describe('GenreController', () => {
    let genreController: GenreController;
    let genreService: GenreService;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [GenreController],
            providers: [{ provide: GenreService, useValue: mockGenreService }]
        }).compile();
        genreController = module.get<GenreController>(GenreController);
        genreService = module.get<GenreService>(GenreService);
    });

    it('should be defined', () => {
        expect(genreController).toBeDefined();
    });

    describe('findAll', () => {
        it('should return an array of genres', async () => {
            const genres = [new Genre(), new Genre()];
            jest.spyOn(genreService, 'findAll').mockResolvedValue(genres);
            const result = await genreController.findAll();
            expect(result).toEqual(genres);
            expect(genreService.findAll).toHaveBeenCalled();
        });
    });

    describe('findOne', () => {
        it('should return a genre by id', async () => {
            const genre = new Genre();
            jest.spyOn(genreService, 'findOne').mockResolvedValue(genre);
            const result = await genreController.findOne(1);
            expect(result).toEqual(genre);
            expect(genreService.findOne).toHaveBeenCalledWith(1);
        });
    });

    describe('create', () => {
        it('should create a new genre', async () => {
            const createGenreDto = { name: 'Action' };
            jest.spyOn(genreService, 'create').mockResolvedValue(createGenreDto as Genre);
            const result = await genreController.create(createGenreDto as CreateGenreDto);
            expect(result).toEqual(createGenreDto);
            expect(genreService.create).toHaveBeenCalledWith(createGenreDto);
        });
    });

    describe('update', () => {
        it('should update a genre', async () => {
            const updateGenreDto = { name: 'Action' };
            jest.spyOn(genreService, 'update').mockResolvedValue(updateGenreDto as Genre);
            const result = await genreController.update(1, updateGenreDto as UpdateGenreDto);
            expect(result).toEqual(updateGenreDto);
            expect(genreService.update).toHaveBeenCalledWith(1, updateGenreDto);
        });
    });

    describe('remove', () => {
        it('should remove a genre', async () => {
            jest.spyOn(genreService, 'remove').mockResolvedValue(1);
            const result = await genreController.remove(1);
            expect(result).toEqual(1);
            expect(genreService.remove).toHaveBeenCalledWith(1);
        });
    });
});
