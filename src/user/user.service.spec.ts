import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UpdateResult } from 'typeorm';

const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    existsBy: jest.fn()
};

const mockConfigService = {
    get: jest.fn()
};

describe('UserService', () => {
    let userService: UserService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService
                }
            ]
        }).compile();

        userService = module.get<UserService>(UserService);
    });

    // 각 그룹 테스트 후 mock 초기화
    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(userService).toBeDefined();
    });
    describe('findAll', () => {
        it('should return all users', async () => {
            const users = [
                {
                    id: 1,
                    email: 'test@codefactory.ai'
                },
                {
                    id: 2,
                    email: 'abc@codefactory.ai'
                }
            ];

            mockUserRepository.find.mockResolvedValue(users);

            const result = await userService.findAll();

            expect(result).toEqual(users);
            expect(mockUserRepository.find).toHaveBeenCalled();
        });
    });

    describe('findOne', () => {
        it('should return a user by id', async () => {
            const user = {
                id: 1,
                email: 'test@codefactory.ai'
            };

            // mockUserRepository.findOne.mockResolvedValue(user); // 아래와 같은 코드
            jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(user);

            const result = await userService.findOne(1);

            expect(result).toEqual(user);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: 1 }
            });
        });

        it('should throw a NotFoundExpection if user is not found', async () => {
            jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(null);

            expect(userService.findOne(999)).rejects.toThrow(NotFoundException);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 999 } });
        });
    });

    describe('create', () => {
        it('should create a new user and return it', async () => {
            const createUserDto = { email: 'test@codefactory.ai', password: '123123' };
            const hashRounds = 10;
            const hashedPassword = 'hashshashashsahsh';
            const result = {
                id: 1,
                email: createUserDto.email,
                password: hashedPassword
            };

            jest.spyOn(mockUserRepository, 'existsBy').mockResolvedValue(null);
            jest.spyOn(mockConfigService, 'get').mockReturnValue(hashRounds);
            jest.spyOn(bcrypt, 'hash').mockImplementation((password, hashRounds) => hashedPassword);
            jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(result);

            const createdUser = await userService.create(createUserDto);

            expect(createdUser).toEqual(result);
            expect(mockUserRepository.existsBy).toHaveBeenCalledWith({ email: createUserDto.email });
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: createUserDto.email } });
            expect(mockConfigService.get).toHaveBeenCalledWith(expect.anything());
            expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, hashRounds);
            expect(mockUserRepository.save).toHaveBeenCalledWith({ email: createUserDto.email, password: hashedPassword });
        });

        it('should throw a BadRequestException if email already exist', async () => {
            const createUserDto = { email: 'test@codefactory.ai', password: '123123' };
            jest.spyOn(mockUserRepository, 'existsBy').mockResolvedValue({
                id: 1,
                email: createUserDto.email
            });

            expect(userService.create(createUserDto)).rejects.toThrow(BadRequestException);
            expect(mockUserRepository.existsBy).toHaveBeenCalledWith({ email: createUserDto.email });
        });
    });

    describe('update', () => {
        it('should update user by id', async () => {
            const user = { id: 1, email: 'test@codefactory.ai' };
            const updateUserDto = { email: 'abc@codefactory.ai', password: '12341234' };
            const hashRounds = 10;
            const hashedPassword = 'hashashash';

            jest.spyOn(mockUserRepository, 'findOne').mockResolvedValueOnce(user);
            jest.spyOn(mockConfigService, 'get').mockReturnValue(hashRounds);
            jest.spyOn(bcrypt, 'hash').mockImplementation((password, hashRounds) => hashedPassword);
            jest.spyOn(mockUserRepository, 'update').mockResolvedValue(undefined);
            jest.spyOn(mockUserRepository, 'findOne').mockResolvedValueOnce({
                ...user,
                password: hashedPassword
            });

            const updatedUser = await userService.update(1, updateUserDto);
            expect(updatedUser).toEqual({ ...user, password: hashedPassword });

            expect(mockUserRepository.findOne).toHaveBeenNthCalledWith(1, { where: { id: 1 } });
            expect(mockUserRepository.findOne).toHaveBeenNthCalledWith(2, { where: { id: 1 } });
            expect(mockConfigService.get).toHaveBeenCalledWith(expect.anything());
            expect(bcrypt.hash).toHaveBeenCalledWith(updateUserDto.password, hashRounds);
            expect(mockUserRepository.update).toHaveBeenCalledWith(
                {
                    id: user.id
                },
                {
                    ...updateUserDto,
                    password: hashedPassword
                }
            );
        });

        it('should throw a NotFoundException if user to update is not found', () => {
            const updateUserDto = { email: 'test@codefactory.ai', password: '123123' };
            jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(null);

            expect(userService.update(1, updateUserDto)).rejects.toThrow(NotFoundException);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
        });
    });

    describe('remove', () => {
        it('should remove user by id', async () => {
            const user = {
                id: 1,
                email: 'test@codefactory.ai'
            };
            jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(user);
            // jest.spyOn(mockUserRepository, 'delete').mockResolvedValue(1);

            const result = await userService.remove(1);
            expect(result).toEqual(1);

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(mockUserRepository.delete).toHaveBeenCalledWith({ id: 1 });
        });

        it('should throw a NotFoundException if user to delete is not found', () => {
            jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(null);
            expect(userService.remove(999)).rejects.toThrow(NotFoundException);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 999 } });
        });
    });
});
