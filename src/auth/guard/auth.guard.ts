import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Public } from '../decorator/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}
    canActivate(context: ExecutionContext): boolean {
        // public decorator 가 있으면 모든 로직을 bypass
        const isPublic = this.reflector.get(Public, context.getHandler());
        if (isPublic) return true;

        // 요청에서  user 가 존재한다.
        const req = context.switchToHttp().getRequest();
        return req.user?.type === 'access';
    }
}
