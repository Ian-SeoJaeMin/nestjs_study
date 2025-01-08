import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Role, User } from 'src/user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { envVariableKeys } from 'src/common/const/env.const';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
    ) {}

    // rawToken : Basic $token
    async register(rawToken: string) {
        const { email, password } = this.parseBasicToken(rawToken);

        if (await this.userRepository.existsBy({ email })) throw new BadRequestException('이미 가입한 이메일 주소입니다.');

        const hash = await bcrypt.hash(password, parseInt(this.configService.get(envVariableKeys.hashRounds)));

        await this.userRepository.save({
            email,
            password: hash
        });

        return this.userRepository.findOne({
            where: { email }
        });
    }

    async login(rawToken: string) {
        const { email, password } = this.parseBasicToken(rawToken);

        const user = await this.authenticate(email, password);

        return {
            refreshToken: await this.issueToken(user, true),
            accessToken: await this.issueToken(user, false)
        };
    }

    async issueToken(user: { id: number; role: Role }, isRefreshToken: boolean) {
        const refreshTokenSecret = this.configService.get<string>(envVariableKeys.refreshTokenSecret);
        const accessTokenSecret = this.configService.get<string>(envVariableKeys.accessTokenSecret);

        return this.jwtService.signAsync(
            {
                sub: user.id,
                role: user.role,
                type: isRefreshToken ? 'refresh' : 'access'
            },
            {
                secret: isRefreshToken ? refreshTokenSecret : accessTokenSecret,
                expiresIn: isRefreshToken ? '24h' : 300
            }
        );
    }

    async authenticate(email: string, password: string) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) throw new BadRequestException('잘못된 로그인 정보입니다.');

        const passOk = await bcrypt.compare(password, user.password);
        if (!passOk) throw new BadRequestException('잘못된 로그인 정보입니다.');

        return user;
    }

    parseBasicToken(rawToken: string) {
        /// 1. 토큰을  ' ' 기준으로 스플릿 후 토큰 추출
        const basicSplit = rawToken.split(' ');

        if (basicSplit.length !== 2) throw new BadRequestException('토큰 포맷이 잘못되었습니다.');

        const [basic, token] = basicSplit;

        if (basic.toLowerCase() !== 'basic') {
            throw new BadRequestException('토큰 포맷이 잘못되었습니다.');
        }

        /// 2. base64 디코드하여 이메일, 비밀번호 추출
        /// email:password
        const decoded = Buffer.from(token, 'base64').toString('utf-8');

        const tokenSplit = decoded.split(':');
        if (tokenSplit.length !== 2) throw new BadRequestException('토큰 포맷이 잘못되었습니다.');

        const [email, password] = tokenSplit;
        return { email, password };
    }

    async parseBearerToken(rawToken: string, isRefreshToken: boolean) {
        /// 1. 토큰을  ' ' 기준으로 스플릿 후 토큰 추출
        const basicSplit = rawToken.split(' ');

        if (basicSplit.length !== 2) throw new BadRequestException('토큰 포맷이 잘못되었습니다.');

        const [bearer, token] = basicSplit;
        if (bearer.toLowerCase() !== 'bearer') throw new BadRequestException('토큰 포맷이 잘못되었습니다.');

        // const payload = await this.jwtService.decode; // 검증은 안하고 decode만
        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get<string>(
                    isRefreshToken ? envVariableKeys.refreshTokenSecret : envVariableKeys.accessTokenSecret
                )
            });

            if (isRefreshToken) {
                if (payload.type !== 'refresh') throw new BadRequestException('Refresh 토큰을 입력해주세요.');
            } else {
                if (payload.type !== 'access') throw new BadRequestException('Access 토큰을 입력해주세요.');
            }

            return payload;
        } catch (error) {
            console.error(error);
            throw new BadRequestException('토큰이 만료되었습니다.');
        }
    }

    async tokenBlock(token: string) {
        const payload = this.jwtService.decode(token);

        const expireDate = +new Date(payload['exp'] * 1000); /// 초단위를 밀리세컨즈로 표현하기 위해 * 1000
        const now = +Date.now(); // 현재시간

        const differenceInSeconds = (expireDate - now) / 1000; // 초단 차이 : 밀리세컨즈니깐 1000 으로 나눠야 초로 계산

        await this.cacheManager.set(`BLOCK_TOKEN_${token}`, payload, Math.max(differenceInSeconds, 1) * 1000); /// 초 차이 동안 ttl 설정, 밀리세컨즈로 변경을 위해 * 1000 ;  음수 대응
        return true;
    }
}
