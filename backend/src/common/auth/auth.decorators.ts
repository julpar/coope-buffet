import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../modules/core/user.service';

// Metadata keys (kept local to this module)
export const META_PUBLIC = 'auth:public';
export const META_ROLES = 'auth:roles';

/** Mark a route (or controller) as public (no auth required). */
export const Public = () => SetMetadata(META_PUBLIC, true);

/**
 * Restrict a route (or controller) to the provided roles.
 * If applied at class level, applies to all methods unless overridden.
 */
export const Roles = (...roles: Role[]) => SetMetadata(META_ROLES, roles);

export type AllowedRoles = Role[];
