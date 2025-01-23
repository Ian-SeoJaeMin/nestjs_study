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
});
