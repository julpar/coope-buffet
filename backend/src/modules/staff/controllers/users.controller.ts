import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { UserService, type Role } from '../../core/user.service';
import { API_PREFIX } from '../../../common/constants';

// Routes under /v1/staff/users (versioned prefix is set globally)
@Controller('staff/users')
export class UsersController {
  constructor(private readonly users: UserService) {}

  private requireAdmin(req: Request) {
    const u = (req as any).user as { roles?: string[] } | undefined;
    if (!u || !Array.isArray(u.roles) || !u.roles.includes('ADMIN')) {
      const err = new Error('forbidden');
      // @ts-ignore
      err.status = 403;
      throw err;
    }
  }

  @Get()
  async list(@Req() req: Request) {
    this.requireAdmin(req);
    const us = await this.users.listUsers();
    // Hide token
    return us.map((u) => ({ id: u.id, nickname: u.nickname, roles: u.roles }));
  }

  @Post()
  async create(
    @Body() body: { nickname?: string; roles?: Role[] },
    @Req() req: Request,
  ) {
    this.requireAdmin(req);
    const nickname = (body?.nickname || '').trim();
    const roles = (body?.roles || []) as Role[];
    if (!nickname) throw new Error('nickname required');
    const user = await this.users.createUser(nickname, roles);
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host') || ''}`;
    const permToken = user.token.startsWith('perm:') ? user.token.slice(5) : user.token;
    // Use canonical `token` param; frontend will handle AJAX-based login
    const permUrl = `${baseUrl}/auth/perm?token=${encodeURIComponent(permToken)}`;
    return { user: { id: user.id, nickname: user.nickname, roles: user.roles }, permUrl };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() patch: { nickname?: string; roles?: Role[] }, @Req() req: Request) {
    this.requireAdmin(req);
    const u = await this.users.updateUser(id, { nickname: patch?.nickname, roles: patch?.roles });
    if (!u) throw new Error('not found');
    return { id: u.id, nickname: u.nickname, roles: u.roles };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    this.requireAdmin(req);
    const ok = await this.users.revokeUser(id);
    if (!ok) throw new Error('not found');
    return { ok: true };
  }
}
