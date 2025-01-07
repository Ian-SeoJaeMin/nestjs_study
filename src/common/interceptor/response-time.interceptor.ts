import { Injectable, NestInterceptor, ExecutionContext, CallHandler, InternalServerErrorException } from '@nestjs/common';
import { Observable, tap, delay } from 'rxjs';

@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        const req = context.switchToHttp().getRequest();
        const reqTime = Date.now();

        return next.handle().pipe(
            //   delay(1000),
            tap(() => {
                const resTime = Date.now();
                const diffTime = resTime - reqTime;

                if (diffTime > 1000) {
                    console.log(`!!!TIMEOUT!!! [${req.method} ${req.path}] ${diffTime}ms`);
                    throw new InternalServerErrorException(`시간이 너무 오래 걸렸습니다.`);
                } else {
                    console.log(`[${req.method} ${req.path}] ${diffTime}ms`);
                }
            })
        );
    }
}
