/**
 * WebSocketクライアント
 *
 * サーバーとのリアルタイム通信を管理するサービス
 * 自動再接続、Heartbeat、resume機能を提供
 */

import { useConnectionStore } from '../stores/connectionStore';

// メッセージタイプ定義（サーバーと共通）
const MessageType = {
  AUTH: 'auth',
  AUTH_OK: 'auth_ok',
  AUTH_FAIL: 'auth_fail',
  OUTPUT: 'output',
  INPUT: 'input',
  RESIZE: 'resize',
  RESUME: 'resume',
  RESYNC_REQUIRED: 'resync_required',
  SNAPSHOT: 'snapshot',
  PING: 'ping',
  PONG: 'pong',
  CLAUDE_STATUS: 'claude_status',
} as const;

// バイナリフレームタイプ
const FrameType = {
  OUTPUT: 0x01,
  INPUT: 0x02,
  SNAPSHOT: 0x03,
} as const;

/**
 * コールバック型定義
 */
interface WSClientCallbacks {
  // ターミナル出力を受信したとき
  onOutput?: (seq: number, data: ArrayBuffer) => void;
  // スナップショットを受信したとき
  onSnapshot?: (seq: number, content: string) => void;
  // Claude状態が変化したとき
  onClaudeStatus?: (status: string, message?: string) => void;
  // 接続が確立したとき
  onConnected?: (sessionId: string, lastSeq: number) => void;
  // 接続が切断されたとき
  onDisconnected?: (reason: string) => void;
  // エラーが発生したとき
  onError?: (error: string) => void;
  // resyncが必要なとき
  onResyncRequired?: () => void;
}

/**
 * WebSocketクライアントクラス
 *
 * 使用例:
 * ```typescript
 * const client = new WSClient();
 *
 * // コールバックを設定
 * client.setCallbacks({
 *   onOutput: (seq, data) => {
 *     // ターミナルに出力を表示
 *   },
 *   onConnected: (sessionId) => {
 *     console.log('接続完了:', sessionId);
 *   },
 * });
 *
 * // 接続
 * await client.connect('ws://100.x.x.x:3847', 'token123');
 *
 * // 入力を送信
 * client.sendInput('ls -la\n');
 *
 * // 切断
 * client.disconnect();
 * ```
 */
export class WSClient {
  private ws: WebSocket | null = null;
  private callbacks: WSClientCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // ミリ秒
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastPingTime = 0;

  // 接続情報（再接続用）
  private serverUrl: string | null = null;
  private token: string | null = null;

  /**
   * コールバックを設定
   */
  setCallbacks(callbacks: WSClientCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * サーバーに接続
   *
   * @param url - WebSocketサーバーのURL
   * @param token - 認証トークン
   */
  async connect(url: string, token: string): Promise<void> {
    // 既存の接続があれば切断
    if (this.ws) {
      this.disconnect();
    }

    // 接続情報を保存（再接続用）
    this.serverUrl = url;
    this.token = token;

    // 接続状態を更新
    useConnectionStore.getState().setStatus('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        // バイナリデータをArrayBufferで受信
        this.ws.binaryType = 'arraybuffer';

        // 接続成功時
        this.ws.onopen = () => {
          console.log('WebSocket接続成功');
          this.reconnectAttempts = 0;

          // 認証メッセージを送信
          this.sendJson({
            type: MessageType.AUTH,
            payload: { token },
          });

          // Heartbeat開始
          this.startHeartbeat();
        };

        // メッセージ受信時
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        // 切断時
        this.ws.onclose = (event) => {
          console.log('WebSocket切断:', event.code, event.reason);
          this.handleDisconnect(event.reason || '接続が切断されました');
        };

        // エラー時
        this.ws.onerror = (error) => {
          console.error('WebSocketエラー:', error);
          this.callbacks.onError?.('接続エラーが発生しました');
          reject(new Error('接続エラー'));
        };

        // 認証完了を待つ（5秒タイムアウト）
        const timeout = setTimeout(() => {
          reject(new Error('認証タイムアウト'));
        }, 5000);

        // 元のonConnectedを保存
        const originalOnConnected = this.callbacks.onConnected;
        this.callbacks.onConnected = (sessionId, lastSeq) => {
          clearTimeout(timeout);
          originalOnConnected?.(sessionId, lastSeq);
          resolve();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 切断
   */
  disconnect(): void {
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    useConnectionStore.getState().setStatus('disconnected');
  }

  /**
   * 入力を送信
   *
   * @param data - 送信するテキストデータ
   */
  sendInput(data: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket未接続');
      return;
    }

    this.sendJson({
      type: MessageType.INPUT,
      payload: { data },
    });
  }

  /**
   * ウィンドウサイズ変更を送信
   *
   * @param cols - 列数
   * @param rows - 行数
   */
  sendResize(cols: number, rows: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.sendJson({
      type: MessageType.RESIZE,
      payload: { cols, rows },
    });
  }

  /**
   * Resume要求を送信
   *
   * @param fromSeq - 再開するシーケンス番号
   */
  sendResume(fromSeq: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.sendJson({
      type: MessageType.RESUME,
      payload: { fromSeq },
    });
  }

  /**
   * JSONメッセージを送信
   */
  private sendJson(message: { type: string; payload?: unknown }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * メッセージを処理
   */
  private handleMessage(data: string | ArrayBuffer): void {
    // バイナリメッセージ
    if (data instanceof ArrayBuffer) {
      this.handleBinaryMessage(data);
      return;
    }

    // JSONメッセージ
    try {
      const message = JSON.parse(data);
      this.handleJsonMessage(message);
    } catch {
      console.error('無効なJSONメッセージ');
    }
  }

  /**
   * バイナリメッセージを処理
   */
  private handleBinaryMessage(data: ArrayBuffer): void {
    const view = new DataView(data);

    // 最小サイズチェック
    if (data.byteLength < 5) {
      return;
    }

    const type = view.getUint8(0);
    const seq = view.getUint32(1);
    const payload = data.slice(5);

    switch (type) {
      case FrameType.OUTPUT:
        // シーケンス番号を更新
        useConnectionStore.getState().setLastSeq(seq);
        this.callbacks.onOutput?.(seq, payload);
        break;

      case FrameType.SNAPSHOT:
        const decoder = new TextDecoder();
        const content = decoder.decode(payload);
        useConnectionStore.getState().setLastSeq(seq);
        this.callbacks.onSnapshot?.(seq, content);
        break;
    }
  }

  /**
   * JSONメッセージを処理
   */
  private handleJsonMessage(message: { type: string; payload?: unknown }): void {
    switch (message.type) {
      case MessageType.AUTH_OK:
        const { sessionId, lastSeq } = message.payload as { sessionId: string; lastSeq: number };
        useConnectionStore.getState().setStatus('connected');
        useConnectionStore.getState().setLastSeq(lastSeq);
        this.callbacks.onConnected?.(sessionId, lastSeq);
        break;

      case MessageType.AUTH_FAIL:
        const { reason } = message.payload as { reason: string };
        useConnectionStore.getState().setError(reason);
        this.callbacks.onError?.(reason);
        this.disconnect();
        break;

      case MessageType.PONG:
        // Heartbeat応答を受信
        console.log('Pong受信');
        break;

      case MessageType.RESYNC_REQUIRED:
        this.callbacks.onResyncRequired?.();
        break;

      case MessageType.CLAUDE_STATUS:
        const { status, message: msg } = message.payload as { status: string; message?: string };
        this.callbacks.onClaudeStatus?.(status, msg);
        break;
    }
  }

  /**
   * 切断を処理
   */
  private handleDisconnect(reason: string): void {
    this.stopHeartbeat();
    useConnectionStore.getState().setStatus('disconnected');
    this.callbacks.onDisconnected?.(reason);

    // 自動再接続を試行
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.serverUrl && this.token) {
      this.scheduleReconnect();
    }
  }

  /**
   * 再接続をスケジュール
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    useConnectionStore.getState().setStatus('reconnecting');

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`${delay}ms後に再接続を試行 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.serverUrl && this.token) {
        this.connect(this.serverUrl, this.token).catch((error) => {
          console.error('再接続失敗:', error);
        });
      }
    }, delay);
  }

  /**
   * Heartbeatを開始
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        this.sendJson({
          type: MessageType.PING,
          payload: { timestamp: this.lastPingTime },
        });
      }
    }, 15000); // 15秒間隔
  }

  /**
   * Heartbeatを停止
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 接続中かどうか
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// シングルトンインスタンス
export const wsClient = new WSClient();
