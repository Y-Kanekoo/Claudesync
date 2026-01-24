import { FrameType, type MessageTypeName, MessageType } from '../types/index.js';

/**
 * バイナリフレーム形式:
 * ┌─────────┬─────────┬─────────────────────┐
 * │ type    │ seq     │ data                │
 * │ 1byte   │ 4byte   │ 残り                │
 * └─────────┴─────────┴─────────────────────┘
 */

/**
 * ターミナル出力をバイナリフレームにエンコード
 */
export function encodeOutputFrame(seq: number, data: Buffer): Buffer {
  const frame = Buffer.alloc(5 + data.length);
  frame.writeUInt8(FrameType.OUTPUT, 0);
  frame.writeUInt32BE(seq, 1);
  data.copy(frame, 5);
  return frame;
}

/**
 * スナップショットをバイナリフレームにエンコード
 */
export function encodeSnapshotFrame(seq: number, data: Buffer): Buffer {
  const frame = Buffer.alloc(5 + data.length);
  frame.writeUInt8(FrameType.SNAPSHOT, 0);
  frame.writeUInt32BE(seq, 1);
  data.copy(frame, 5);
  return frame;
}

/**
 * バイナリフレームをデコード
 */
export function decodeFrame(buffer: Buffer): { type: number; seq: number; data: Buffer } | null {
  if (buffer.length < 5) {
    return null;
  }

  const type = buffer.readUInt8(0);
  const seq = buffer.readUInt32BE(1);
  const data = buffer.subarray(5);

  return { type, seq, data };
}

/**
 * JSONメッセージをエンコード
 */
export function encodeJsonMessage(message: { type: MessageTypeName; payload?: unknown }): string {
  return JSON.stringify(message);
}

/**
 * JSONメッセージをデコード
 */
export function decodeJsonMessage(data: string): { type: string; payload?: unknown } | null {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * メッセージがバイナリかどうかを判定
 */
export function isBinaryMessage(data: Buffer | string): boolean {
  return Buffer.isBuffer(data);
}

/**
 * 認証成功メッセージを作成
 */
export function createAuthOkMessage(sessionId: string, lastSeq: number): string {
  return encodeJsonMessage({
    type: MessageType.AUTH_OK,
    payload: { sessionId, lastSeq },
  });
}

/**
 * 認証失敗メッセージを作成
 */
export function createAuthFailMessage(reason: string): string {
  return encodeJsonMessage({
    type: MessageType.AUTH_FAIL,
    payload: { reason },
  });
}

/**
 * Pongメッセージを作成
 */
export function createPongMessage(timestamp: number): string {
  return encodeJsonMessage({
    type: MessageType.PONG,
    payload: { timestamp },
  });
}

/**
 * resync要求メッセージを作成
 */
export function createResyncRequiredMessage(reason: string): string {
  return encodeJsonMessage({
    type: MessageType.RESYNC_REQUIRED,
    payload: { reason },
  });
}
