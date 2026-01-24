import { createServer } from 'http';
import { createApp } from './app.js';
import { config, getTailscaleIP } from './config.js';
import { initDatabase, closeDatabase } from './db/database.js';
import { initWebSocketServer, stopWebSocketServer } from './ws/server.js';
import { broadcastOutput } from './ws/handler.js';
import { ptyManager } from './pty/manager.js';
import { verifyToken } from './auth/token.js';
import { createPairingCode, verifyPairingCode } from './auth/pairing.js';
import { issueToken } from './auth/token.js';
import type { Request, Response } from 'express';

/**
 * ClaudeSyncサーバーを起動
 */
async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('ClaudeSync サーバー起動中...');
  console.log('='.repeat(50));

  // データベース初期化
  initDatabase();

  // Expressアプリ作成
  const app = createApp();

  // ペアリングAPIルートを追加
  app.post('/api/pairing/generate', (_req: Request, res: Response) => {
    try {
      const { code, expiresAt } = createPairingCode();
      res.json({
        success: true,
        data: { code, expiresAt },
        error: null,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : '不明なエラー',
      });
    }
  });

  app.post('/api/pairing/verify', (req: Request, res: Response) => {
    try {
      const { code, deviceName } = req.body as { code: string; deviceName?: string };

      if (!code) {
        res.status(400).json({
          success: false,
          data: null,
          error: 'ペアリングコードが必要です',
        });
        return;
      }

      const token = issueToken(code, deviceName);

      if (!token) {
        res.status(401).json({
          success: false,
          data: null,
          error: '無効または期限切れのペアリングコードです',
        });
        return;
      }

      res.json({
        success: true,
        data: { token },
        error: null,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : '不明なエラー',
      });
    }
  });

  // ステータスAPI
  app.get('/api/status', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        ptyRunning: ptyManager.isRunning(),
        ptySize: ptyManager.getSize(),
        bufferStats: ptyManager.getBufferStats(),
      },
      error: null,
    });
  });

  // HTTPサーバー作成
  const server = createServer(app);

  // PTYを起動
  ptyManager.start({
    cwd: process.env.HOME,
  });

  // PTY出力をWebSocketクライアントにブロードキャスト
  ptyManager.onOutput((seq, data) => {
    broadcastOutput(seq, data);
  });

  // WebSocketサーバー初期化
  initWebSocketServer(server, {
    ptyManager: {
      handleInput: (data) => ptyManager.handleInput(data),
      handleResize: (cols, rows) => ptyManager.handleResize(cols, rows),
      getBufferFrom: (fromSeq) => ptyManager.getBufferFrom(fromSeq),
      getSnapshot: () => ptyManager.getSnapshot(),
      getCurrentSeq: () => ptyManager.getCurrentSeq(),
    },
    verifyToken,
  });

  // サーバー起動
  server.listen(config.port, config.host, () => {
    const tailscaleIP = getTailscaleIP();
    console.log('');
    console.log('サーバー起動完了!');
    console.log(`  ホスト: ${config.host}`);
    console.log(`  ポート: ${config.port}`);
    if (tailscaleIP) {
      console.log(`  Tailscale IP: ${tailscaleIP}`);
      console.log(`  接続URL: ws://${tailscaleIP}:${config.port}`);
    }
    console.log('');
    console.log('ペアリングコードを生成するには:');
    console.log(`  curl -X POST http://localhost:${config.port}/api/pairing/generate`);
    console.log('');
  });

  // シャットダウンハンドリング
  const shutdown = async (): Promise<void> => {
    console.log('\nシャットダウン中...');

    // PTY停止
    ptyManager.stop();

    // WebSocket停止
    await stopWebSocketServer();

    // データベース終了
    closeDatabase();

    // HTTPサーバー終了
    server.close(() => {
      console.log('サーバー終了');
      process.exit(0);
    });

    // 5秒後に強制終了
    setTimeout(() => {
      console.error('強制終了');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// エントリーポイント
main().catch((error) => {
  console.error('サーバー起動エラー:', error);
  process.exit(1);
});
