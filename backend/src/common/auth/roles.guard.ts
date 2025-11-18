import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { META_PUBLIC, META_ROLES } from './auth.decorators';
import type { AllowedRoles } from './auth.decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const klass = context.getClass();

    // Public flag can be set at method or class level
    const isPublic =
      this.reflector.get<boolean>(META_PUBLIC, handler) ??
      this.reflector.get<boolean>(META_PUBLIC, klass) ??
      false;
    if (isPublic) return true;

    // Resolve allowed roles from method, then class
    const roles: AllowedRoles | undefined =
      this.reflector.get<AllowedRoles>(META_ROLES, handler) ??
      this.reflector.get<AllowedRoles>(META_ROLES, klass);

    const request = context.switchToHttp().getRequest();
    const user = (request as any).user as { roles?: string[] } | undefined;

    // If no roles metadata is present, deny by default to force explicit Public/Role annotation
    if (!roles || roles.length === 0) {
      return false;
    }

    if (!user || !Array.isArray(user.roles)) return false;
    // Allow if the user has at least one required role
    return roles.some((r) => user.roles!.includes(r));
  }
}
