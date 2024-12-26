import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // 요청에서  user 가 존재한다.
    const req = context.switchToHttp().getRequest();
    return req.user?.type === 'access';
  }
}
