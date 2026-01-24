import { nanoid } from 'nanoid';
import {
  insertToken,
  findToken,
  updateTokenLastUsed,
  deactivateToken,
  deactivateAllTokens,
  getActiveTokens as dbGetActiveTokens,
} from '../db/database.js';
import { verifyPairingCode, markPairingCodeUsed } from './pairing.js';

/**
 * トークン情報
 */
export interface TokenInfo {
  token: string;
  deviceName: string | null;
  createdAt: number;
  lastUsedAt: number;
  isActive: boolean;
}

/**
 * 新しいトークンを生成
 */
export function generateToken(): string {
  // nanoidで安全なランダムトークンを生成（32文字）
  return nanoid(32);
}

/**
 * ペアリングコードを使用してトークンを発行
 */
export function issueToken(pairingCode: string, deviceName?: string): string | null {
  // ペアリングコードを検証
  if (!verifyPairingCode(pairingCode)) {
    return null;
  }

  const token = generateToken();

  // トークンを保存
  insertToken(token, deviceName || null);

  // ペアリングコードを使用済みにする
  markPairingCodeUsed(pairingCode, token);

  console.log(`トークン発行: ${token.substring(0, 8)}... (デバイス: ${deviceName || '不明'})`);

  return token;
}

/**
 * トークンを検証
 */
export function verifyToken(token: string): boolean {
  const record = findToken(token);

  if (record) {
    // 最終使用日時を更新
    updateTokenLastUsed(token);
    return true;
  }

  return false;
}

/**
 * トークン情報を取得
 */
export function getTokenInfo(token: string): TokenInfo | null {
  const record = findToken(token);

  if (!record) {
    return null;
  }

  return {
    token: record.token,
    deviceName: record.deviceName,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
    isActive: record.isActive,
  };
}

/**
 * トークンを無効化
 */
export function revokeToken(token: string): boolean {
  const result = deactivateToken(token);
  if (result) {
    console.log(`トークン無効化: ${token.substring(0, 8)}...`);
  }
  return result;
}

/**
 * すべてのトークンを無効化
 */
export function revokeAllTokens(): number {
  const count = deactivateAllTokens();
  console.log(`${count}個のトークンを無効化`);
  return count;
}

/**
 * アクティブなトークン一覧を取得
 */
export function getActiveTokens(): TokenInfo[] {
  return dbGetActiveTokens().map(r => ({
    token: r.token,
    deviceName: r.deviceName,
    createdAt: r.createdAt,
    lastUsedAt: r.lastUsedAt,
    isActive: r.isActive,
  }));
}
