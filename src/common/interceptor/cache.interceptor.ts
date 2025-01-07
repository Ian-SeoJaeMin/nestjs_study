import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of, tap } from 'rxjs';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
    private cache = new Map<string, any>();

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> | Promise<Observable<any>> {
        const req = context.switchToHttp().getRequest();

        const key = `${req.method}-${req.path}`;

        if (this.cache.has(key)) {
            return of(this.cache.get(key)); // 일반 변수를 Observable로 반환하기 위해서 of 사용
        }

        return next.handle().pipe(
            tap(response => {
                this.cache.set(key, response);
            })
        );
    }
}
