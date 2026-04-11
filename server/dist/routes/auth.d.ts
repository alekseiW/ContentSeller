import { Request, Response, NextFunction } from "express";
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email?: string;
                role?: string;
            };
        }
    }
}
export declare function generateToken(userId: string): string;
export declare function verifyToken(token: string): {
    sub: string;
} | null;
export declare function hashPassword(password: string): Promise<string>;
export declare function comparePasswords(password: string, hash: string): Promise<boolean>;
declare const router: import("express-serve-static-core").Router;
export default router;
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * Optional auth — attaches user if token is valid, but does not block.
 */
export declare function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void;
