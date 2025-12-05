// Augment Express Request with custom fields used in the app
import 'express-serve-static-core';
import type { User } from '../modules/core/user.service';

declare module 'express-serve-static-core' {
  interface Request {
    // set by request-id middleware
    id?: string;
    // provided by cookie-parser
    cookies?: Record<string, string>;
    // set by session middleware after looking up the session cookie
    user?: User;
  }
}
