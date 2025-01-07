import { IsOptional, IsString } from 'class-validator';
import { CursorPaginationDto } from 'src/common/dto/cursor-pagination';
// import { PagePaginationDto } from 'src/common/dto/page-pagination';

export class GetMoviesDto extends CursorPaginationDto {
    @IsString()
    @IsOptional()
    title?: string;
}
