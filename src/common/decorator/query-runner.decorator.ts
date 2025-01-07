import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';

export const QueryRunner = createParamDecorator((data: unknown, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();
    if (!req || !req.queryRunner) throw new InternalServerErrorException(`QueryRunner 객체를 찾을 수 없습니다.`);
    return req.queryRunner;
});
