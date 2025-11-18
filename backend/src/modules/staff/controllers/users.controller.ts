import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
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
    if (!nickname) throw new Error('nickname required');
    const user = await this.users.createUser(nickname, roles);
    // base URL cannot be derived from req without @Req; use env BASE_URL for generating QR/login URL
    const baseUrl = process.env.BASE_URL || '';
    const permToken = user.token.startsWith('perm:') ? user.token.slice(5) : user.token;
    // Use canonical `token` param; if BASE_URL not set, return relative path
    const prefix = baseUrl ? baseUrl.replace(/\/$/, '') : '';
    const permUrl = `${prefix}/auth/perm?token=${encodeURIComponent(permToken)}`;
    return { user: { id: user.id, nickname: user.nickname, roles: user.roles }, permUrl };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() patch: { nickname?: string; roles?: Role[] }) {
    const u = await this.users.updateUser(id, { nickname: patch?.nickname, roles: patch?.roles });
    if (!u) throw new Error('not found');
    return { id: u.id, nickname: u.nickname, roles: u.roles };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const ok = await this.users.revokeUser(id);
    if (!ok) throw new Error('not found');
    return { ok: true };
  }
}
