import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'qr_restaurant_secure_jwt_secret_dev_2026';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  restaurant_id?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    // Query database to ensure user still exists, is active, and fetch their restaurant association
    const stmt = db.prepare('SELECT id, name, email, role, status, restaurant_id FROM users WHERE id = ?');
    const user = stmt.get(decoded.userId) as AuthenticatedUser | undefined;

    if (!user || user.status !== 'active') {
      res.status(401).json({ error: 'User session invalid or inactive.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}
