import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { envVariableKeys } from 'src/common/const/env.const';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        private readonly configService: ConfigService
    ) {}

    findAll() {
        return this.userRepository.find();
    }

    async findOne(id: number) {
        const user = await this.userRepository.findOne({
            where: { id }
        });

        if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

        return user;
    }

    async create(createUserDto: CreateUserDto) {
        const { email, password } = createUserDto;

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

    async update(id: number, updateUserDto: UpdateUserDto) {
        const { password } = updateUserDto;
        const user = await this.userRepository.findOne({
            where: { id }
        });
        if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

        const hash = await bcrypt.hash(password, this.configService.get<number>(envVariableKeys.hashRounds));
        await this.userRepository.update(
            { id },
            {
                ...updateUserDto,
                password: hash
            }
        );

        return this.userRepository.findOne({ where: { id } });
    }

    async remove(id: number) {
        const user = await this.userRepository.findOne({
            where: { id }
        });
        if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

        await this.userRepository.delete({ id });
        return id;
    }
}
