import { WebSocketServer, type WebSocket } from 'ws';
import type { Server } from 'http';
import { handleConnection, handleDisconnect, setPtyManager, setVerifyToken } from './handler.js';
import { heartbeatManager } from './heartbeat.js';

let wss: WebSocketServer | null = null;

/**
 * WebSocketサーバーを初期化
 */
export function initWebSocketServer(
  server: Server,
  options: {
    ptyManager?: {
      handleInput: (data: string) => void;
      handleResize: (cols: number, rows: number) => void;
      getBufferFrom: (fromSeq: number) => { chunks: { seq: number; data: Buffer }[] } | null;
      getSnapshot: () => { content: string; seq: number };
      getCurrentSeq: () => number;
    };
    verifyToken?: (token: string) => boolean;
  } = {}
): WebSocketServer {
  wss = new WebSocketServer({ server });

  // PTYマネージャーを設定
  if (options.ptyManager) {
    setPtyManager(options.ptyManager);
  }

  // 認証検証関数を設定
  if (options.verifyToken) {
    setVerifyToken(options.verifyToken);
  }

  // 接続イベント
  wss.on('connection', (ws: WebSocket) => {
    handleConnection(ws);
  });

  // エラーイベント
  wss.on('error', (error) => {
    console.error('WebSocketサーバーエラー:', error);
  });

  // Heartbeat開始
  heartbeatManager.start(handleDisconnect);

  console.log('WebSocketサーバー初期化完了');

  return wss;
}

/**
 * WebSocketサーバーを停止
 */
export function stopWebSocketServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    heartbeatManager.stop();

    if (wss) {
      wss.close((error) => {
        if (error) {
          reject(error);
        } else {
          console.log('WebSocketサーバー停止');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

/**
 * WebSocketサーバーインスタンスを取得
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}
