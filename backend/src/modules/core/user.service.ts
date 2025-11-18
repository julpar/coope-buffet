import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import crypto from 'crypto';

export type Role = 'ADMIN' | 'STOCK' | 'CASHIER' | 'ORDER_FULFILLER';

export type User = {
  id: string; // slug key id e.g., admin or maria-cocina
  nickname: string;
  roles: Role[];
  token: string; // perm:<random>
};

@Injectable()
export class UserService {
  constructor(private readonly redisSvc: RedisService) {}

  private userKey(id: string) { return `user:${id}`; }
  private permKey(token: string) { return `permanent_token:${token}`; }

  slugify(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'user';
  }

  private genToken(): string {
    return 'perm:' + crypto.randomBytes(24).toString('hex');
  }

  async adminExists(): Promise<boolean> {
    return (await this.redisSvc.redis.exists(this.userKey('admin'))) > 0;
  }

  async getUserById(id: string): Promise<User | null> {
    const raw = await this.redisSvc.redis.hgetall(this.userKey(id));
    if (!raw || Object.keys(raw).length === 0) return null;
    return {
      id,
      nickname: raw.nickname,
      roles: (raw.roles || '').split(',').filter(Boolean) as Role[],
      token: raw.token,
    };
  }

  async getUserByToken(tokenWithPrefix: string): Promise<User | null> {
    const token = tokenWithPrefix.startsWith('perm:') ? tokenWithPrefix.slice(5) : tokenWithPrefix;
    const userId = await this.redisSvc.redis.get(this.permKey(token));
    if (!userId) return null;
    return this.getUserById(userId);
  }

  async createAdmin(nickname: string): Promise<User> {
    const exists = await this.adminExists();
    if (exists) throw new Error('admin already exists');
    const token = this.genToken();
    const user: User = { id: 'admin', nickname: nickname || 'Admin', roles: ['ADMIN'], token };
    await this.redisSvc.redis.hmset(this.userKey(user.id), {
      nickname: user.nickname,
      roles: user.roles.join(','),
      token: user.token,
    });
    await this.redisSvc.redis.set(this.permKey(token.replace('perm:', '')), user.id);
    return user;
  }

  async createUser(nickname: string, roles: Role[]): Promise<User> {
    const base = this.slugify(nickname);
    // Ensure uniqueness by suffixing if needed
    let id = base;
    let idx = 1;
    while (await this.redisSvc.redis.exists(this.userKey(id))) {
      idx += 1;
      id = `${base}-${idx}`;
    }
    const token = this.genToken();
    const user: User = { id, nickname, roles: roles && roles.length ? roles : [], token };
    await this.redisSvc.redis.hmset(this.userKey(user.id), {
      nickname: user.nickname,
      roles: user.roles.join(','),
      token: user.token,
    });
    await this.redisSvc.redis.set(this.permKey(token.replace('perm:', '')), user.id);
    return user;
  }

  async listUsers(): Promise<User[]> {
    const keys = await this.redisSvc.redis.keys('user:*');
    const users: User[] = [];
    for (const key of keys) {
      const id = key.split(':')[1];
      const u = await this.getUserById(id);
      if (u) users.push(u);
    }
    return users;
  }

  async updateUser(id: string, patch: Partial<Pick<User, 'nickname' | 'roles'>>): Promise<User | null> {
    const u = await this.getUserById(id);
    if (!u) return null;
    const next: User = {
      ...u,
      nickname: patch.nickname ?? u.nickname,
      roles: (patch.roles ?? u.roles) as Role[],
    };
    await this.redisSvc.redis.hmset(this.userKey(id), {
      nickname: next.nickname,
      roles: next.roles.join(','),
      token: next.token,
    });
    return next;
  }

  async revokeUser(id: string): Promise<boolean> {
    const u = await this.getUserById(id);
    if (!u) return false;
    // delete user and token mapping
    await this.redisSvc.redis.del(this.userKey(id));
    const token = u.token.startsWith('perm:') ? u.token.slice(5) : u.token;
    await this.redisSvc.redis.del(this.permKey(token));
    return true;
  }
}
