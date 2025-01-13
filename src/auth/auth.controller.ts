import { Body, ClassSerializerInterceptor, Controller, Get, Headers, Post, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './strategy/local.strategy';
import { JwtAuthGuard } from './strategy/jwt.strategy';
import { Public } from './decorator/public.decorator';
import { ApiBasicAuth, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Authorization } from './decorator/authorization.decorator';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    //authorization: Basic $token
    @Public()
    @ApiBasicAuth()
    @Post('register')
    registerUser(@Authorization() token: string) {
        this.authService.register(token);
    }

    @Public()
    @ApiBasicAuth()
    @Post('login')
    loginUser(@Authorization() token: string) {
        return this.authService.login(token);
    }

    @Post('token/block')
    blockToken(@Body('token') token: string) {
        return this.authService.tokenBlock(token);
    }

    // access token 재발급
    @Post('token/access')
    async rotateAccessToken(@Headers('authorization') token: string) {
        const payload = await this.authService.parseBearerToken(token, true);
        return {
            accessToken: await this.authService.issueToken(payload, false)
        };
    }

    // # Passport 연습
    @UseGuards(LocalAuthGuard)
    @Post('login/passport')
    async loginUserPassport(@Request() req) {
        return {
            refreshToken: await this.authService.issueToken(req.user, true),
            accessToken: await this.authService.issueToken(req.user, false)
        };
    }

    // # Passport 연습
    @UseGuards(JwtAuthGuard)
    @Get('private')
    async private(@Request() req) {
        return req.user;
    }
}
