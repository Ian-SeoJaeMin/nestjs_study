import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateMovieDto {
    @IsNotEmpty()
    @IsString()
    @ApiProperty({
        description: '영화의 제목',
        example: '더 글로리'
    })
    title: string;

    @IsNotEmpty()
    @IsNumber({}, { each: true })
    @Type(() => Number)
    @ArrayNotEmpty()
    @ApiProperty({
        description: '장르 아이디',
        example: [1, 2]
    })
    genreIds: number[];

    @IsNotEmpty()
    @IsString()
    @ApiProperty({
        description: '영화의 설명',
        example: '꾸울잼'
    })
    detail: string;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty({
        description: '영화 감독 아이디',
        example: 1
    })
    directorId: number;

    @IsNotEmpty()
    @IsString()
    @ApiProperty({
        description: '영화 파일 이름',
        example: 'aaa-bbb-ccc-ddd.mp4'
    })
    movieFileName: string;
}
