import type { WebSocket, RawData } from 'ws';
import { nanoid } from 'nanoid';
import type { ClientConnection } from '../types/index.js';
import { MessageType } from '../types/index.js';
import {
  decodeJsonMessage,
  isBinaryMessage,
  decodeFrame,
  createAuthOkMessage,
  createAuthFailMessage,
  createResyncRequiredMessage,
  encodeOutputFrame,
  encodeSnapshotFrame,
} from './protocol.js';
import { heartbeatManager } from './heartbeat.js';
import { FrameType } from '../types/index.js';

// 接続中のクライアント管理
const clients = new Map<string, ClientConnection>();

// PTYマネージャーへの参照（後で設定）
let ptyManager: {
  handleInput: (data: string) => void;
  handleResize: (cols: number, rows: number) => void;
  getBufferFrom: (fromSeq: number) => { chunks: { seq: number; data: Buffer }[] } | null;
  getSnapshot: () => { content: string; seq: number };
  getCurrentSeq: () => number;
} | null = null;

// 認証検証関数への参照（後で設定）
let verifyToken: ((token: string) => boolean) | null = null;

/**
 * PTYマネージャーを設定
 */
export function setPtyManager(manager: typeof ptyManager): void {
  ptyManager = manager;
}

/**
 * 認証検証関数を設定
 */
export function setVerifyToken(fn: (token: string) => boolean): void {
  verifyToken = fn;
}

/**
 * すべての認証済みクライアントにデータを送信
 */
export function broadcastOutput(seq: number, data: Buffer): void {
  const frame = encodeOutputFrame(seq, data);

  for (const [, client] of clients) {
    if (client.authenticated && client.ws.readyState === 1) {
      try {
        client.ws.send(frame);
        client.lastSeq = seq;
      } catch (error) {
        console.error('ブロードキャストエラー:', error);
      }
    }
  }
}

/**
 * 新しいWebSocket接続を処理
 */
export function handleConnection(ws: WebSocket): void {
  const clientId = nanoid();

  const connection: ClientConnection = {
    id: clientId,
    ws,
    authenticated: false,
    lastSeq: 0,
    lastPing: Date.now(),
    missedPings: 0,
  };

  clients.set(clientId, connection);
  console.log(`新しい接続: ${clientId}`);

  // Pongイベント（WebSocketレベルのpong）
  ws.on('pong', () => {
    heartbeatManager.handlePong(clientId);
  });

  // メッセージ受信
  ws.on('message', (data: RawData) => {
    try {
      handleMessage(clientId, data);
    } catch (error) {
      console.error(`メッセージ処理エラー (${clientId}):`, error);
    }
  });

  // 接続終了
  ws.on('close', (code, reason) => {
    console.log(`接続終了: ${clientId} (code: ${code}, reason: ${reason.toString()})`);
    heartbeatManager.unregister(clientId);
    clients.delete(clientId);
  });

  // エラー
  ws.on('error', (error) => {
    console.error(`WebSocketエラー (${clientId}):`, error);
  });

  // 30秒以内に認証がなければ切断
  setTimeout(() => {
    const client = clients.get(clientId);
    if (client && !client.authenticated) {
      console.log(`認証タイムアウト: ${clientId}`);
      ws.close(4001, 'Authentication timeout');
      clients.delete(clientId);
    }
  }, 30000);
}

/**
 * メッセージを処理
 */
function handleMessage(clientId: string, rawData: RawData): void {
  const client = clients.get(clientId);
  if (!client) return;

  // バイナリメッセージ（入力データ）
  if (Buffer.isBuffer(rawData)) {
    handleBinaryMessage(client, rawData);
    return;
  }

  // JSONメッセージ
  const dataStr = rawData.toString();
  const message = decodeJsonMessage(dataStr);
  if (!message) {
    console.warn(`無効なJSONメッセージ (${clientId})`);
    return;
  }

  switch (message.type) {
    case MessageType.AUTH:
      handleAuth(client, message.payload as { token: string });
      break;

    case MessageType.INPUT:
      if (!client.authenticated) return;
      handleInput(client, message.payload as { data: string });
      break;

    case MessageType.RESIZE:
      if (!client.authenticated) return;
      handleResize(client, message.payload as { cols: number; rows: number });
      break;

    case MessageType.RESUME:
      if (!client.authenticated) return;
      handleResume(client, message.payload as { fromSeq: number });
      break;

    case MessageType.PING:
      handlePing(client, message.payload as { timestamp: number });
      break;

    default:
      console.warn(`未知のメッセージタイプ: ${message.type}`);
  }
}

/**
 * バイナリメッセージを処理
 */
function handleBinaryMessage(client: ClientConnection, data: Buffer): void {
  const frame = decodeFrame(data);
  if (!frame) return;

  if (frame.type === FrameType.INPUT && client.authenticated) {
    ptyManager?.handleInput(frame.data.toString());
  }
}

/**
 * 認証を処理
 */
function handleAuth(client: ClientConnection, payload: { token: string }): void {
  if (!verifyToken || !verifyToken(payload.token)) {
    client.ws.send(createAuthFailMessage('無効なトークン'));
    client.ws.close(4002, 'Authentication failed');
    clients.delete(client.id);
    return;
  }

  client.authenticated = true;
  client.token = payload.token;

  // Heartbeat登録
  heartbeatManager.register(client.id, client);

  // 現在のシーケンス番号を取得
  const currentSeq = ptyManager?.getCurrentSeq() ?? 0;
  client.lastSeq = currentSeq;

  client.ws.send(createAuthOkMessage(client.id, currentSeq));
  console.log(`認証成功: ${client.id}`);
}

/**
 * 入力を処理
 */
function handleInput(_client: ClientConnection, payload: { data: string }): void {
  ptyManager?.handleInput(payload.data);
}

/**
 * リサイズを処理
 */
function handleResize(_client: ClientConnection, payload: { cols: number; rows: number }): void {
  ptyManager?.handleResize(payload.cols, payload.rows);
}

/**
 * Resume要求を処理
 */
function handleResume(client: ClientConnection, payload: { fromSeq: number }): void {
  if (!ptyManager) {
    client.ws.send(createResyncRequiredMessage('PTYが初期化されていません'));
    return;
  }

  const bufferData = ptyManager.getBufferFrom(payload.fromSeq);

  if (!bufferData) {
    // バッファにデータがない場合はスナップショットを送信
    const snapshot = ptyManager.getSnapshot();
    const snapshotFrame = encodeSnapshotFrame(snapshot.seq, Buffer.from(snapshot.content));
    client.ws.send(snapshotFrame);
    client.lastSeq = snapshot.seq;
    console.log(`スナップショット送信 (${client.id}): seq=${snapshot.seq}`);
    return;
  }

  // 差分データを送信
  for (const chunk of bufferData.chunks) {
    const frame = encodeOutputFrame(chunk.seq, chunk.data);
    client.ws.send(frame);
    client.lastSeq = chunk.seq;
  }

  console.log(`Resume完了 (${client.id}): ${bufferData.chunks.length}チャンク送信`);
}

/**
 * Pingを処理（アプリケーションレベル）
 */
function handlePing(client: ClientConnection, payload: { timestamp: number }): void {
  heartbeatManager.handlePing(client.id, payload.timestamp);
}

/**
 * クライアント切断コールバック
 */
export function handleDisconnect(clientId: string, _reason: string): void {
  const client = clients.get(clientId);
  if (client) {
    try {
      client.ws.close();
    } catch {
      // 無視
    }
    clients.delete(clientId);
  }
}

/**
 * 接続中のクライアント数を取得
 */
export function getClientCount(): number {
  return clients.size;
}

/**
 * 認証済みクライアント数を取得
 */
export function getAuthenticatedClientCount(): number {
  let count = 0;
  for (const [, client] of clients) {
    if (client.authenticated) count++;
  }
  return count;
}
