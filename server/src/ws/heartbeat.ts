import type { WebSocket } from 'ws';
import { config } from '../config.js';
import type { ClientConnection } from '../types/index.js';
import { createPongMessage } from './protocol.js';

/**
 * Heartbeat管理クラス
 * 15秒間隔でping/pongを行い、3回連続失敗で切断
 */
export class HeartbeatManager {
  private clients: Map<string, ClientConnection> = new Map();
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * クライアントを登録
   */
  register(clientId: string, connection: ClientConnection): void {
    connection.lastPing = Date.now();
    connection.missedPings = 0;
    this.clients.set(clientId, connection);
  }

  /**
   * クライアントを登録解除
   */
  unregister(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Pongを受信したときの処理
   */
  handlePong(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.missedPings = 0;
      client.lastPing = Date.now();
    }
  }

  /**
   * Pingを受信したときの処理（クライアントからのping）
   */
  handlePing(clientId: string, timestamp: number): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === 1) { // WebSocket.OPEN
      client.ws.send(createPongMessage(timestamp));
    }
  }

  /**
   * Heartbeatループを開始
   */
  start(onDisconnect: (clientId: string, reason: string) => void): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      const now = Date.now();

      for (const [clientId, client] of this.clients) {
        // 認証されていないクライアントはスキップ
        if (!client.authenticated) {
          continue;
        }

        // WebSocketが開いていない場合はスキップ
        if (client.ws.readyState !== 1) { // WebSocket.OPEN
          continue;
        }

        // Pingを送信
        try {
          client.ws.ping();
          client.missedPings++;

          // タイムアウトチェック
          if (client.missedPings >= config.heartbeatTimeout) {
            console.log(`クライアント ${clientId} がHeartbeatタイムアウト`);
            onDisconnect(clientId, 'heartbeat_timeout');
            client.ws.close(4000, 'Heartbeat timeout');
            this.unregister(clientId);
          }
        } catch (error) {
          console.error(`Ping送信エラー (${clientId}):`, error);
        }
      }
    }, config.heartbeatInterval);

    console.log(`Heartbeat開始 (間隔: ${config.heartbeatInterval}ms)`);
  }

  /**
   * Heartbeatループを停止
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Heartbeat停止');
    }
  }

  /**
   * 接続中のクライアント数を取得
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

// シングルトンインスタンス
export const heartbeatManager = new HeartbeatManager();
