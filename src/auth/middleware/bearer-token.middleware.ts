import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { envVariableKeys } from 'src/common/const/env.const';

const ALLOWED_TOKEN_TYPES = ['refresh', 'access']; // 허용된 토큰 타입

@Injectable()
export class BearerTokenMiddleware implements NestMiddleware {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
    ) {}

    async use(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.header('authorization');

        if (!authHeader) {
            return next();
        }

        const token = this.validateBearerToken(authHeader);
        const blockedToken = await this.cacheManager.get(`BLOCK_TOKEN_${token}`);
        if (blockedToken) throw new UnauthorizedException('차단된 토큰입니다.');

        const tokenKey = `TOKEN_${token}`;

        const cachedPayload = await this.cacheManager.get(tokenKey);

        if (cachedPayload) {
            req.user = cachedPayload;
            return next();
        }
        const decodedPayload = await this.jwtService.decode(token);

        this.validateTokenType(decodedPayload.type);

        try {
            const tokenSecretKey = this.getTokenSecretKey(decodedPayload.type);

            const payload = await this.verifyToken(token, tokenSecretKey);

            /// payload('exp') -> epoch time seconds
            /// exp : 1970년 1월 1일부터 현재까지의 초 단위로 표현된 시간
            const expireDate = +new Date(payload['exp'] * 1000); /// 초단위를 밀리세컨즈로 표현하기 위해 * 1000
            const now = +Date.now(); // 현재시간

            const differenceInSeconds = (expireDate - now) / 1000; // 초단 차이 : 밀리세컨즈니깐 1000 으로 나눠야 초로 계산

            await this.cacheManager.set(tokenKey, payload, Math.max(differenceInSeconds - 30, 1) * 1000); /// 초 차이 동안 ttl 설정, 밀리세컨즈로 변경을 위해 * 1000 ; 안전 마진 30초 ; 음수 대응
            req.user = payload;

            next();
        } catch (error) {
            console.error(error);
            if (error.name === 'TokenExpiredError') throw new UnauthorizedException('토큰이 만료되었습니다.');
            next();
        }
    }

    private getTokenSecretKey(tokenType: string) {
        return tokenType === 'refresh' ? envVariableKeys.refreshTokenSecret : envVariableKeys.accessTokenSecret;
    }

    private verifyToken(token: string, secretKey: string) {
        return this.jwtService.verifyAsync(token, {
            secret: this.configService.get<string>(secretKey)
        });
    }

    validateTokenType(type: string) {
        // const payload = await this.jwtService.decode; // 검증은 안하고 decode만
        if (!ALLOWED_TOKEN_TYPES.includes(type)) {
            throw new UnauthorizedException('유효하지 않은 토큰 타입입니다.');
        }
    }

    validateBearerToken(rawToken: string) {
        /// 1. 토큰을  ' ' 기준으로 스플릿 후 토큰 추출
        const basicSplit = rawToken.split(' ');

        if (basicSplit.length !== 2) throw new BadRequestException('토큰 포맷이 잘못되었습니다.');

        const [bearer, token] = basicSplit;
        if (bearer.toLowerCase() !== 'bearer') throw new BadRequestException('토큰 포맷이 잘못되었습니다.');

        return token;
    }
}
