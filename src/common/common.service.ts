import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { PagePaginationDto } from './dto/page-pagination';
import { CursorPaginationDto } from './dto/cursor-pagination';

@Injectable()
export class CommonService {
  constructor() {}

  applyPagePaginationParamsToQb<T>(
    qb: SelectQueryBuilder<T>,
    dto: PagePaginationDto,
  ) {
    const { page, take } = dto;

    qb.take(take);
    qb.skip((page - 1) * take);
  }

  applyCursorPaginationParamsToQb<T>(
    qb: SelectQueryBuilder<T>,
    dto: CursorPaginationDto,
  ) {
    const { order, id, take } = dto;

    if (id) {
      const direction = order === 'ASC' ? '>' : '<';

      // order -> ASC : movie.id > :id
      qb.where(`${qb.alias}.id ${direction} :id`, { id });
    }

    qb.orderBy(`${qb.alias}.id`, order); // movie.id ${ASC | DESC}

    qb.take(take);
  }
}
