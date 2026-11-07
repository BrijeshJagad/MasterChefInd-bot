import { AdminJwtPayload } from './common';

declare global {
  namespace Express {
    interface Request {
      admin?: AdminJwtPayload;
    }
  }
}
