import { Test, TestingModule } from '@nestjs/testing';
import { DirectorService } from './director.service';
import { Repository } from 'typeorm';
import { Director } from './entity/director.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateDirectorDto } from './dto/create-director.dto';
import { NotFoundException } from '@nestjs/common';

const mockDirectorRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
};

describe('DirectorService', () => {
    let directorService: DirectorService;
    let directorRepository: Repository<Director>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DirectorService,
                {
                    provide: getRepositoryToken(Director),
                    useValue: mockDirectorRepository
                }
            ]
        }).compile();
        directorService = module.get<DirectorService>(DirectorService);
        directorRepository = module.get<Repository<Director>>(getRepositoryToken(Director));
    });

    beforeAll(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(directorService).toBeDefined();
    });

    describe('findAll', () => {
        it('should return an array of directors', async () => {
            const directors = [
                { id: 1, name: 'John Doe' },
                { id: 2, name: 'Jane Doe' }
            ];

            jest.spyOn(directorRepository, 'find').mockResolvedValue(directors as Director[]);
            const result = await directorService.findAll();
            expect(result).toEqual(directors);
            expect(directorRepository.find).toHaveBeenCalled();
        });
    });

    describe('findOne', () => {
        it('should return a director by id', async () => {
            const director = { id: 1, name: 'John Doe' };
            jest.spyOn(directorRepository, 'findOne').mockResolvedValue(director as Director);
            const result = await directorService.findOne(1);
            expect(result).toEqual(director);
            expect(directorRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
        });
    });

    describe('create', () => {
        it('should create a new director', async () => {
            const createDirectorDto = { name: 'John Doe' };

            jest.spyOn(directorRepository, 'save').mockResolvedValue(createDirectorDto as Director);

            const result = await directorService.create(createDirectorDto as CreateDirectorDto);

            expect(result).toEqual(createDirectorDto);
            expect(mockDirectorRepository.save).toHaveBeenCalledWith(createDirectorDto);
        });
    });

    describe('update', () => {
        it('should update a director', async () => {
            const updateDirectorDto = { name: 'Jane Doe' };
            const existingDirector = { id: 1, name: 'John Doe' };
            const updatedDirector = { id: 1, name: 'Jane Doe' };
            jest.spyOn(directorRepository, 'findOne').mockResolvedValueOnce(existingDirector as Director);
            jest.spyOn(directorRepository, 'findOne').mockResolvedValueOnce(updatedDirector as Director);
            const result = await directorService.update(1, updateDirectorDto);
            expect(result).toEqual(updatedDirector);
            expect(directorRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(directorRepository.update).toHaveBeenCalledWith({ id: 1 }, updateDirectorDto);
        });

        it('should throw NotFoundException if director is not found', async () => {
            jest.spyOn(directorRepository, 'findOne').mockResolvedValueOnce(null);
            await expect(directorService.update(1, { name: 'Jane Doe' })).rejects.toThrow(NotFoundException);
        });
    });

    describe('remove', () => {
        it('should remove a director', async () => {
            const director = { id: 1, name: 'John Doe' };
            jest.spyOn(directorRepository, 'findOne').mockResolvedValue(director as Director);
            const result = await directorService.remove(1);
            expect(result).toEqual(1);
            expect(mockDirectorRepository.delete).toHaveBeenCalledWith({ id: 1 });
        });

        it('should throw NotFoundException if director is not found', async () => {
            jest.spyOn(directorRepository, 'findOne').mockResolvedValueOnce(null);
            await expect(directorService.remove(1)).rejects.toThrow(NotFoundException);
        });
    });
});
