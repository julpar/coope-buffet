import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { UserService, type User } from '../../core/user.service';
import { Public } from '../../../common/auth/auth.decorators';

@Controller('/auth')
export class AuthController {
  constructor(private readonly users: UserService) {}

  @Get('status')
  @Public()
  async status(@Res({ passthrough: true }) res: Response) {
    const adminExists = await this.users.adminExists();
    const user = (res.req as any).user as User | undefined;
    return {
      adminExists,
      currentUser: user ? { id: user.id, nickname: user.nickname, roles: user.roles } : null,
    };
  }

  @Post('init-admin')
  @Public()
  async initAdmin(
    @Body() body: { nickname?: string; password?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.users.createAdmin((body?.nickname || '').trim(), (body?.password || '').trim());
    // Set timeless cookie
    this.setSessionCookie(res, user.token);
    return { ok: true, user: { id: user.id, nickname: user.nickname, roles: user.roles } };
  }

  @Get('perm')
  @Public()
  async perm(@Query('token') token: string, @Res() res: Response) {
    // Accept `token` (canonical) and keep `fixef` as backward-compatible alias
    const raw = (token || '').trim();
    if (!raw) return res.status(403).json({ error: 'forbidden' });
    const tok = raw.startsWith('perm:') ? raw : `perm:${raw}`;
    const user = await this.users.getUserByToken(tok);
    if (!user) return res.status(403).json({ error: 'forbidden' });
    this.setSessionCookie(res, user.token);
    return res.json({ ok: true, user: { id: user.id, nickname: user.nickname, roles: user.roles } });
  }

  @Post('logout')
  @Public()
  async logout(@Res() res: Response) {
    // Clear the session cookie by setting an immediate expiration
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('session', '', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      expires: new Date(0),
      path: '/',
    });
    return res.status(204).send();
  }

  private setSessionCookie(res: Response, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('session', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      // 10-year expiry
      maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
