import { BadRequestException, Injectable } from '@nestjs/common';
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

  async applyCursorPaginationParamsToQb<T>(
    qb: SelectQueryBuilder<T>,
    dto: CursorPaginationDto,
  ) {
    const { cursor, take } = dto;
    let { orders } = dto;

    if (cursor) {
      const decodeCursor = Buffer.from(cursor, 'base64').toString('utf-8');
      const cursorObj = JSON.parse(decodeCursor);

      orders = cursorObj.orders;

      const { values } = cursorObj;

      /// (col1, col2, col3) > (:value1, :value2, :value3)
      const columns = Object.keys(values);
      const comparisonOperator = orders.some((o) => o.endsWith('DESC'))
        ? '<'
        : '>';

      const whereConditions = columns.map((c) => `${qb.alias}.${c}`).join(',');
      const whereParams = columns.map((c) => `:${c}`).join(',');

      qb.where(
        `(${whereConditions}) ${comparisonOperator} (${whereParams})`,
        values,
      );
    }

    for (let i = 0; i < orders.length; i++) {
      const [column, direction] = orders[i].split('_');

      if (direction !== 'ASC' && direction !== 'DESC')
        throw new BadRequestException('Order는 ASC 또는 DESC로 입력해주세요.');

      if (i === 0) {
        qb.orderBy(`${qb.alias}.${column}`, direction);
      } else {
        qb.addOrderBy(`${qb.alias}.${column}`, direction);
      }
    }

    qb.take(take);

    const results = await qb.getMany();

    const nextCursor = this.generateNextCursor(results, orders);
    return { qb, nextCursor };
  }

  generateNextCursor<T>(results: T[], orders: string[]): string | null {
    if (results.length === 0) return null;

    /**
     * {
     * values: {
     *  id: 27
     * },
     * orders: ['id_DESC']
     * }
     */

    const lastResult = results[results.length - 1];

    const values = {};
    orders.forEach((columnOrder) => {
      const [column] = columnOrder.split('_');
      values[column] = lastResult[column];
    });

    const cursorObj = { values, orders };

    return Buffer.from(JSON.stringify(cursorObj)).toString('base64');
  }
}
