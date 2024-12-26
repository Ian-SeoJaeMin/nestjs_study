import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
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
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.header('authorization');

      if (!authHeader) {
        return next();
      }

      const token = this.validateBearerToken(authHeader);
      const decodedPayload = await this.jwtService.decode(token);

      this.validateTokenType(decodedPayload.type);

      const tokenSecretKey = this.getTokenSecretKey(decodedPayload.type);

      const payload = await this.verifyToken(token, tokenSecretKey);
      req.user = payload;

      next();
    } catch (error) {
      console.error(error);
      if (error.name === 'TokenExpiredError')
        throw new UnauthorizedException('토큰이 만료되었습니다.');
      next();
    }
  }

  private getTokenSecretKey(tokenType: string) {
    return tokenType === 'refresh'
      ? envVariableKeys.refreshTokenSecret
      : envVariableKeys.accessTokenSecret;
  }

  private verifyToken(token: string, secretKey: string) {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>(secretKey),
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

    if (basicSplit.length !== 2)
      throw new BadRequestException('토큰 포맷이 잘못되었습니다.');

    const [bearer, token] = basicSplit;
    if (bearer.toLowerCase() !== 'bearer')
      throw new BadRequestException('토큰 포맷이 잘못되었습니다.');

    return token;
  }
}
