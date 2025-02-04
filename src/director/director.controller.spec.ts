import { Test, TestingModule } from '@nestjs/testing';
import { DirectorController } from './director.controller';
import { DirectorService } from './director.service';
import { Director } from './entity/director.entity';
import { CreateDirectorDto } from './dto/create-director.dto';
import { UpdateDirectorDto } from './dto/update-director.dto';

const mockDirectorService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
};

describe('DirectorController', () => {
    let directorController: DirectorController;
    let directorService: DirectorService;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DirectorController],
            providers: [
                {
                    provide: DirectorService,
                    useValue: mockDirectorService
                }
            ]
        }).compile();
        directorController = module.get<DirectorController>(DirectorController);
        directorService = module.get<DirectorService>(DirectorService);
    });

    it('should be defined', () => {
        expect(directorController).toBeDefined();
    });

    describe('findAll', () => {
        it('should return an array of directors', async () => {
            const directors = [
                { id: 1, name: 'John Doe' },
                { id: 2, name: 'Jane Doe' }
            ];
            jest.spyOn(directorService, 'findAll').mockResolvedValue(directors as Director[]);
            const result = await directorController.findAll();
            expect(result).toEqual(directors);
            expect(directorService.findAll).toHaveBeenCalled();
        });
    });

    describe('findOne', () => {
        it('should return a director by id', async () => {
            const director = { id: 1, name: 'John Doe' };
            jest.spyOn(directorService, 'findOne').mockResolvedValue(director as Director);
            const result = await directorController.findOne('1');
            expect(result).toEqual(director);
            expect(directorService.findOne).toHaveBeenCalledWith(1);
        });
    });

    describe('create', () => {
        it('should create a new director', async () => {
            const createDirectorDto = { name: 'John Doe' };
            jest.spyOn(directorService, 'create').mockResolvedValue(createDirectorDto as Director);
            const result = await directorController.create(createDirectorDto as CreateDirectorDto);
            expect(result).toEqual(createDirectorDto);
            expect(directorService.create).toHaveBeenCalledWith(createDirectorDto);
        });
    });

    describe('update', () => {
        it('should update a director', async () => {
            const updateDirectorDto = { name: 'Jane Doe' };
            jest.spyOn(directorService, 'update').mockResolvedValue(updateDirectorDto as Director);
            const result = await directorController.update('1', updateDirectorDto as UpdateDirectorDto);
            expect(result).toEqual(updateDirectorDto);
            expect(directorService.update).toHaveBeenCalledWith(1, updateDirectorDto);
        });
    });

    describe('remove', () => {
        it('should remove a director', async () => {
            jest.spyOn(directorService, 'remove').mockResolvedValue(1);
            const result = await directorController.remove('1');
            expect(result).toEqual(1);
            expect(directorService.remove).toHaveBeenCalledWith(1);
        });
    });
});
