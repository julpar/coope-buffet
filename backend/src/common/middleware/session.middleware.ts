import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../../modules/core/user.service';

// Factory to create a middleware instance using a provided UserService
export function makeSessionMiddleware(userService: UserService) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const cookie = (req as any).cookies?.session as string | undefined;
    if (cookie && typeof cookie === 'string') {
      try {
        const user = await userService.getUserByToken(cookie);
        if (user) (req as any).user = user;
      } catch {}
    }
    next();
  };
}
