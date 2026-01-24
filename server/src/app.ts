import express, { type Express, type Request, type Response } from 'express';

/**
 * Expressアプリケーションを作成
 */
export function createApp(): Express {
  const app = express();

  // JSONボディパーサー
  app.use(express.json());

  // ヘルスチェック
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // ペアリングAPI（認証システムで実装）
  // POST /api/pairing/generate - 新しいペアリングコードを生成
  // POST /api/pairing/verify   - ペアリングコードを検証してトークンを発行

  return app;
}
