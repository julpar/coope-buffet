import { Body, Controller, Delete, Get, Param, Patch, Post, BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService, type Role } from '../../core/user.service';
import { API_PREFIX } from '../../../common/constants';
import { Roles } from '../../../common/auth/auth.decorators';

// Routes under /v1/staff/users (versioned prefix is set globally)
@Controller('staff/users')
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: UserService) {}

  @Get()
  async list() {
    const us = await this.users.listUsers();
    // Hide token
    return us.map((u) => ({ id: u.id, nickname: u.nickname, roles: u.roles }));
  }

  @Post()
  async create(
    @Body() body: { nickname?: string; roles?: Role[] },
  ) {
    const nickname = (body?.nickname || '').trim();
    const roles = (body?.roles || []) as Role[];
    if (!nickname) throw new BadRequestException('nickname required');
    if (!Array.isArray(roles) || roles.length === 0) {
      throw new BadRequestException('at least one role is required');
    }
    // Optional: validate role values
    const allowed: Role[] = ['ADMIN', 'STOCK', 'CASHIER', 'ORDER_FULFILLER'];
    for (const r of roles) {
      if (!allowed.includes(r)) {
        throw new BadRequestException(`invalid role: ${r}`);
      }
    }
    const user = await this.users.createUser(nickname, roles);
    // Build both variants depending on environment variables
    // Prefer STAFF_BASE_URL when present to generate a URL that lands on the staff SPA
    // which will then call /auth/perm via AJAX and set the cookie seamlessly.
    const staffBase = (process.env.STAFF_BASE_URL || '').trim();
    const baseUrl = (process.env.BASE_URL || '').trim();
    const permToken = user.token.startsWith('perm:') ? user.token.slice(5) : user.token;
    let permUrl: string;
    if (staffBase) {
      // Direct to SPA root with query param; SPA will consume and authenticate
      const sb = staffBase.replace(/\/$/, '');
      permUrl = `${sb}/?token=${encodeURIComponent(permToken)}`;
    } else {
      // Fallback: direct backend endpoint; the response is JSON and still sets cookie
      const prefix = baseUrl ? baseUrl.replace(/\/$/, '') : '';
      permUrl = `${prefix}/auth/perm?token=${encodeURIComponent(permToken)}`;
    }
    return { user: { id: user.id, nickname: user.nickname, roles: user.roles }, permUrl };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() patch: { nickname?: string; roles?: Role[] }) {
    const nickname = patch?.nickname?.trim();
    if (patch && 'roles' in patch) {
      const roles = (patch?.roles || []) as Role[];
      if (!Array.isArray(roles) || roles.length === 0) {
        throw new BadRequestException('at least one role is required');
      }
      const allowed: Role[] = ['ADMIN', 'STOCK', 'CASHIER', 'ORDER_FULFILLER'];
      for (const r of roles) {
        if (!allowed.includes(r)) {
          throw new BadRequestException(`invalid role: ${r}`);
        }
      }
    }
    const u = await this.users.updateUser(id, { nickname, roles: patch?.roles });
    if (!u) throw new Error('not found');
    return { id: u.id, nickname: u.nickname, roles: u.roles };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const ok = await this.users.revokeUser(id);
    if (!ok) throw new Error('not found');
    return { ok: true };
  }

  // Return the permanent login URL for an existing user so ADMIN can reshare/scan the QR again
  @Get(':id/perm-url')
  async getPermUrl(@Param('id') id: string) {
    const user = await this.users.getUserById(id);
    if (!user) throw new NotFoundException('user not found');
    // Build URL same way as in create()
    const staffBase = (process.env.STAFF_BASE_URL || '').trim();
    const baseUrl = (process.env.BASE_URL || '').trim();
    const permToken = user.token.startsWith('perm:') ? user.token.slice(5) : user.token;
    let permUrl: string;
    if (staffBase) {
      const sb = staffBase.replace(/\/$/, '');
      permUrl = `${sb}/?token=${encodeURIComponent(permToken)}`;
    } else {
      const prefix = baseUrl ? baseUrl.replace(/\/$/, '') : '';
      permUrl = `${prefix}/auth/perm?token=${encodeURIComponent(permToken)}`;
    }
    return { permUrl };
  }
}
