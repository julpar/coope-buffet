import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { UserService, type User } from '../../core/user.service';

@Controller('/auth')
export class AuthController {
  constructor(private readonly users: UserService) {}

  @Get('status')
  async status(@Res({ passthrough: true }) res: Response) {
    const adminExists = await this.users.adminExists();
    const user = (res.req as any).user as User | undefined;
    return {
      adminExists,
      currentUser: user ? { id: user.id, nickname: user.nickname, roles: user.roles } : null,
    };
  }

  @Post('init-admin')
  async initAdmin(@Body() body: { nickname?: string }, @Res({ passthrough: true }) res: Response) {
    const user = await this.users.createAdmin((body?.nickname || '').trim());
    // Set timeless cookie
    this.setSessionCookie(res, user.token);
    return { ok: true, user: { id: user.id, nickname: user.nickname, roles: user.roles } };
  }

  @Get('perm')
  async perm(@Query('token') token: string, @Res() res: Response) {
    if (!token) return res.status(400).json({ error: 'token required' });
    const tok = token.startsWith('perm:') ? token : `perm:${token}`;
    const user = await this.users.getUserByToken(tok);
    if (!user) return res.status(400).json({ error: 'invalid token' });
    this.setSessionCookie(res, user.token);
    // Lightweight redirect page to /staff
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!doctype html><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Autenticado</title><p>Acceso concedido. Redirigiendo…</p><script>location.href='/staff';</script>`);
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
