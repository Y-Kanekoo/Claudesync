import type { Request, Response, NextFunction } from 'express';
import { verifyToken as checkToken } from './token.js';

// 認証済みリクエスト型
export interface AuthenticatedRequest extends Request {
  token?: string;
}

/**
 * トークン認証ミドルウェア
 * Authorizationヘッダーからトークンを取得して検証
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      data: null,
      error: '認証ヘッダーがありません',
    });
    return;
  }

  // Bearer トークンを取得
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      success: false,
      data: null,
      error: '無効な認証ヘッダー形式です',
    });
    return;
  }

  const token = parts[1];

  // トークンを検証
  if (!checkToken(token)) {
    res.status(401).json({
      success: false,
      data: null,
      error: '無効なトークンです',
    });
    return;
  }

  // リクエストにトークンを追加
  req.token = token;
  next();
}

/**
 * オプショナル認証ミドルウェア
 * トークンがあれば検証、なくても通過
 */
export function optionalAuthMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      if (checkToken(token)) {
        req.token = token;
      }
    }
  }

  next();
}
