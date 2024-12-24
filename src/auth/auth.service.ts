import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  // rawToken : Basic $token
  async register(rawToken: string) {
    const { email, password } = this.parseBasicToken(rawToken);

    if (await this.userRepository.existsBy({ email }))
      throw new BadRequestException('이미 가입한 이메일 주소입니다.');

    const hash = await bcrypt.hash(
      password,
      parseInt(this.configService.get('HASH_ROUNDS')),
    );

    await this.userRepository.save({
      email,
      password: hash,
    });

    return this.userRepository.findOne({
      where: { email },
    });
  }

  async login(rawToken: string) {
    const { email, password } = this.parseBasicToken(rawToken);

    const user = await this.authenticate(email, password);

    const refreshTokenSecret = this.configService.get<string>(
      'REFRESH_TOKEN_SECRET',
    );
    const accessTokenSecret = this.configService.get<string>(
      'ACCESS_TOKEN_SECRET',
    );

    return {
      refreshToken: await this.jwtService.signAsync(
        {
          sub: user.id,
          role: user.role,
          type: 'refresh',
        },
        {
          secret: refreshTokenSecret,
          expiresIn: '24h',
        },
      ),
      accessToken: await this.jwtService.signAsync(
        {
          sub: user.id,
          role: user.role,
          type: 'access',
        },
        {
          secret: accessTokenSecret,
          expiresIn: 300,
        },
      ),
    };
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

    if (basicSplit.length !== 2)
      throw new BadRequestException('토큰 포맷이 잘못되었습니다.');

    const [, token] = basicSplit;

    /// 2. base64 디코드하여 이메일, 비밀번호 추출
    /// email:password
    const decoded = Buffer.from(token, 'base64').toString('utf-8');

    const tokenSplit = decoded.split(':');
    if (tokenSplit.length !== 2)
      throw new BadRequestException('토큰 포맷이 잘못되었습니다.');

    const [email, password] = tokenSplit;
    return { email, password };
  }
}
