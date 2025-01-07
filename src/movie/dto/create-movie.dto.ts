import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateMovieDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsNumber({}, { each: true })
    @Type(() => Number)
    @ArrayNotEmpty()
    genreIds: number[];

    @IsNotEmpty()
    @IsString()
    detail: string;

    @IsNotEmpty()
    @IsNumber()
    directorId: number;

    @IsNotEmpty()
    @IsString()
    movieFileName: string;
}
