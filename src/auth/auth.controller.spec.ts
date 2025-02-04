import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from 'src/user/entities/user.entity';

const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    tokenBlock: jest.fn(),
    parseBearerToken: jest.fn(),
    issueToken: jest.fn()
};

describe('AuthController', () => {
    let authController: AuthController;
    let authService: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService
                }
            ]
        }).compile();

        authController = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(authController).toBeDefined();
    });

    describe('registerUser', () => {
        it('should register a new user', async () => {
            const token = 'token';
            const user = { id: 1, email: 'test@codefactory.ai', password: 'hashedpassword' };

            jest.spyOn(authService, 'register').mockResolvedValue(user as User);

            const result = await authController.registerUser(token);
            expect(authService.register).toHaveBeenCalledWith(token);
            expect(result).toEqual(user);
        });
    });

    describe('loginUser', () => {
        it('should login a user', async () => {
            const token = 'token';
            const user = { id: 1, email: 'test@codefactory.ai', password: 'hashedpassword' };
            const tokenResponse = { accessToken: '1234', refreshToken: '1234' };
            jest.spyOn(authService, 'login').mockResolvedValue(tokenResponse);

            const result = await authController.loginUser(token);
            expect(authService.login).toHaveBeenCalledWith(token);
            expect(result).toEqual(tokenResponse);
        });
    });

    describe('blockToken', () => {
        it('should block a token', async () => {
            const token = 'token';
            await authController.blockToken(token);
            expect(authService.tokenBlock).toHaveBeenCalledWith(token);
        });
    });

    describe('rotateAccessToken', () => {
        it('should rotate an access token', async () => {
            const token = 'token';
            const payload = { id: 1, email: 'test@codefactory.ai' };
            const accessToken = 'accessToken';
            jest.spyOn(authService, 'parseBearerToken').mockResolvedValue(payload);
            jest.spyOn(authService, 'issueToken').mockResolvedValue(accessToken);

            const result = await authController.rotateAccessToken(token);
            expect(authService.parseBearerToken).toHaveBeenCalledWith(token, true);
            expect(authService.issueToken).toHaveBeenCalledWith(payload, false);
            expect(result).toEqual({ accessToken });
        });
    });
});
