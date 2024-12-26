import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RBAC } from '../decorator/rbac.decorator';
import { Role } from 'src/user/entities/user.entity';

@Injectable()
export class RBACGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const role = this.reflector.get<Role>(RBAC, context.getHandler());

    // role enum에 해당되는 값이 데코레이터에 들어갔는지 확인
    if (!Object.values(Role).includes(role)) return true;

    const req = context.switchToHttp().getRequest();
    return req.user && req.user.role <= role;
  }
}
