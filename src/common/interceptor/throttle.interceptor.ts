import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { CallHandler, ExecutionContext, ForbiddenException, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { Throttle } from '../decorator/throttle.decorator';

@Injectable()
export class ThrottleInterceptor implements NestInterceptor {
    constructor(
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        private readonly reflector: Reflector // Throttle 태그가 붙은 부분만 적용하기 위해 필요함
    ) {}
    async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
        const req = context.switchToHttp().getRequest();

        /// cache 에 URL_USERID_MINUTE key로 저장
        /// value -> count : 요청 수
        /// 어떤 사용자가 어떤 URL 에 몇분에 몇번 요청했는지 확인하기 위해

        const userId = req?.user?.sub;
        if (!userId) return next.handle();

        const throttleOptions = this.reflector.get<{ count: number; unit: 'minute' }>(Throttle, context.getHandler());
        if (!throttleOptions) return next.handle();

        const date = new Date();
        const minute = date.getMinutes();

        const key = `${req.method}_${req.path}_${userId}_${minute}`;
        const count = await this.cacheManager.get<number>(key);

        console.log(key, count);

        if (count && count >= throttleOptions.count) {
            throw new ForbiddenException('요청 가능 횟수를 넘었습니다.');
        }

        return next.handle().pipe(
            tap(async () => {
                const count = (await this.cacheManager.get<number>(key)) ?? 0;
                this.cacheManager.set(key, count + 1, 60000);
            })
        );
    }
}
