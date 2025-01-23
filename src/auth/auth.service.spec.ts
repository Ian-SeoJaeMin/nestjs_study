import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role, User } from 'src/user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';

const mockUserRepository = {
    findOne: jest.fn()
};

const mockConfigService = {
    get: jest.fn()
};

const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn()
};

const mockCacheManager = {
    set: jest.fn()
};

const mockUserService = {
    create: jest.fn()
};

describe('AuthService', () => {
    let authService: AuthService;
    let userService: UserService;
    let configService: ConfigService;
    let jwtService: JwtService;
    let cacheManager: Cache;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: mockCacheManager
                },
                {
                    provide: UserService,
                    useValue: mockUserService
                }
            ]
        }).compile();

        authService = module.get<AuthService>(AuthService);
        userService = module.get<UserService>(UserService);
        configService = module.get<ConfigService>(ConfigService);
        jwtService = module.get<JwtService>(JwtService);
        cacheManager = module.get<Cache>(CACHE_MANAGER);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(authService).toBeDefined();
    });

    describe('tokenBlock', () => {
        it('should block a token', async () => {
            const token = 'Bearer token';
            const payload = { type: 'access' };

            jest.spyOn(jwtService, 'decode').mockReturnValue(payload);

            await authService.tokenBlock(token);

            expect(jwtService.decode).toHaveBeenCalledWith(token);
            expect(mockCacheManager.set).toHaveBeenCalledWith(`BLOCK_TOKEN_${token}`, payload, expect.any(Number));
        });
    });

    describe('parseBasicToken', () => {
        it('should return parsed basic token', () => {
            const rawToken = 'Basic dGVzdEBjb2RlZmFjdG9yeS5haToxMjM0NTY=';
            const decode = { email: 'test@codefactory.ai', password: '123456' };
            const result = authService.parseBasicToken(rawToken);

            expect(result).toEqual(decode);
        });
        it('should throw an error for invalid token format', () => {
            const rawToken = 'InvalidTokenFormat';
            expect(() => authService.parseBasicToken(rawToken)).toThrow(BadRequestException);
        });

        it('should throw an error for invalid Basic token format', () => {
            const rawToken = 'Bearer InvalidTokenFormat';
            expect(() => authService.parseBasicToken(rawToken)).toThrow(BadRequestException);
        });

        it('should throw an error for invalid Basic token format', () => {
            const rawToken = 'basic a';
            expect(() => authService.parseBasicToken(rawToken)).toThrow(BadRequestException);
        });
    });

    describe('parseBearerToken', () => {
        it('should return parse bearer token', async () => {
            const rawToken = 'Bearer token';
            const payload = { type: 'access' };

            jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);
            jest.spyOn(configService, 'get').mockReturnValue('secret');

            const result = await authService.parseBearerToken(rawToken, false);
            expect(jwtService.verifyAsync).toHaveBeenCalledWith('token', {
                secret: 'secret'
            });
            expect(result).toEqual(payload);
        });
        it('should throw a BadRequestException for invalid Bearer token format', () => {
            const rawToken = 'a';
            expect(authService.parseBearerToken(rawToken, false)).rejects.toThrow(BadRequestException);
        });

        it('should throw a BadRequestException for token not starting with Bearer', () => {
            const rawToken = 'Basic a';
            expect(authService.parseBearerToken(rawToken, false)).rejects.toThrow(BadRequestException);
        });

        it('should throw a UnauthorizedException if payload.type is not refresh but isRefreshToken parameter is true', () => {
            const rawToken = 'Bearer a';

            jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
                type: 'refresh'
            });

            expect(authService.parseBearerToken(rawToken, false)).rejects.toThrow(UnauthorizedException);
        });

        it('should throw a BadRequestException if payload.type is not refresh but isRefreshToken parameter is true', () => {
            const rawToken = 'Bearer a';

            jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
                type: 'access'
            });

            expect(authService.parseBearerToken(rawToken, true)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('authenticate', () => {
        it('should autehtnicate a user with correct credentials', async () => {
            const email = 'test@codefactory.ai';
            const password = '123123';
            const user = { email, password: 'hashedpassword' };

            jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(user);
            jest.spyOn(bcrypt, 'compare').mockImplementation((encryptedPassword, password) => true);

            const result = await authService.authenticate(email, password);
            expect(result).toEqual(user);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email } });
            expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hashedpassword');
        });

        it('should throw a BadRequestExpection if user is not found', async () => {
            const email = 'test@codefactory.ai';
            const password = '123123';

            jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(null);

            expect(authService.authenticate(email, password)).rejects.toThrow(BadRequestException);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email } });
        });

        it('shoud throw a BadRequestExceiption if password is not correct', async () => {
            const email = 'test@codefactory.ai';
            const password = '123123';

            const user = { email, password: 'hashedpassword' };

            jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(user);
            jest.spyOn(bcrypt, 'compare').mockImplementation((encryptedPassword, password) => false);

            expect(authService.authenticate(email, password)).rejects.toThrow(BadRequestException);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email } });
        });
    });

    describe('register', () => {
        it('should return created user', async () => {
            const rawToken = 'Basic asdfasdf';
            const user = { email: 'test@codefactory.ai', password: '123456' };

            jest.spyOn(mockUserService, 'create').mockResolvedValue(user);
            jest.spyOn(authService, 'parseBasicToken').mockReturnValue(user);

            const createdUser = await authService.register(rawToken);
            expect(authService.parseBasicToken).toHaveBeenCalledWith(rawToken);
            expect(userService.create).toHaveBeenCalledWith(user);

            expect(createdUser).toEqual(user);
        });
    });

    describe('issueToken', () => {
        const user = { id: 1, role: Role.user };
        const token = 'mock.token';

        beforeEach(() => {
            jest.spyOn(configService, 'get').mockReturnValue('mock.secretKey');
            jest.spyOn(jwtService, 'signAsync').mockResolvedValue(token);
        });

        it('should return jwt access token', async () => {
            const accessTokenResult = await authService.issueToken(user, false);
            expect(jwtService.signAsync).toHaveBeenCalledWith(
                {
                    sub: user.id,
                    role: user.role,
                    type: 'access'
                },
                {
                    secret: 'mock.secretKey',
                    expiresIn: 300
                }
            );
            expect(accessTokenResult).toEqual(token);
        });

        it('should return jwt refresh token', async () => {
            const refreshTokenResult = await authService.issueToken(user, true);
            expect(jwtService.signAsync).toHaveBeenCalledWith(
                {
                    sub: user.id,
                    role: user.role,
                    type: 'refresh'
                },
                {
                    secret: 'mock.secretKey',
                    expiresIn: '24h'
                }
            );
            expect(refreshTokenResult).toEqual(token);
        });
    });

    describe('login', () => {
        it('should login user and return tokens', async () => {
            const rawToken = 'Basic asdfasdf';
            const user = { email: 'test@codefactory.ai', password: '123456' };
            jest.spyOn(authService, 'parseBasicToken').mockReturnValue(user);
            jest.spyOn(authService, 'authenticate').mockResolvedValue(user as User);
            jest.spyOn(authService, 'issueToken').mockResolvedValue('mock.token');

            const result = await authService.login(rawToken);

            expect(authService.parseBasicToken).toHaveBeenCalledWith(rawToken);
            expect(authService.authenticate).toHaveBeenCalledWith(user.email, user.password);
            expect(authService.issueToken).toHaveBeenCalledTimes(2);
            expect(result).toEqual({
                refreshToken: 'mock.token',
                accessToken: 'mock.token'
            });
        });
    });
});
