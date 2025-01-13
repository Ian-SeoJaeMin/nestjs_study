import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CursorPaginationDto {
    @IsString()
    @IsOptional()
    @ApiProperty({
        description: '페이지네이션 커서',
        example: 'eyJ2YWx1ZXMiOnsiaWQiOjF9LCJvcmRlcnMiOlsiaWRfREVTQyJdfQ=='
    })
    // id_52, likeCount_20
    cursor?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    @ApiProperty({
        description: '내림/오름차순 정렬',
        example: ['id_DESC']
    })
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
    // id_ASC id_DESC
    // [id_DESC, likeCount_DESC]
    orders: string[] = ['id_DESC'];

    @IsInt()
    @IsOptional()
    @ApiProperty({
        description: '가져올 데이터 수',
        example: 5
    })
    take: number = 5;
}
