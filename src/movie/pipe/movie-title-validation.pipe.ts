import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class MovieTitleValidationPipe implements PipeTransform<string, string> {
    transform(value: string, metadata: ArgumentMetadata): string {
        // 타이틀 입력이 없는 경우 그냥 패스
        if (!value) return value;

        // 만약에 글자 길이가 2보다 작으면 에러
        if (value.length <= 2 && metadata.type === 'query') throw new BadRequestException('영화의 제목은 3자 이상이여야 합니다.');

        return value;
    }
}
