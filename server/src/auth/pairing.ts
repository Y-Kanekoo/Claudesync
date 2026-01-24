import {
  insertPairingCode,
  findPairingCode,
  markPairingCodeUsed as dbMarkPairingCodeUsed,
  cleanupExpiredPairingCodes,
  getActivePairingCodeCount,
} from '../db/database.js';
import { config } from '../config.js';

/**
 * 6桁のペアリングコードを生成
 */
function generateCode(): string {
  // 0〜9の数字で6桁
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * ペアリングコードを作成
 */
export function createPairingCode(): { code: string; expiresAt: number } {
  const now = Date.now();

  // 期限切れのコードをクリーンアップ
  cleanupExpiredPairingCodes();

  // 新しいコードを生成（重複しないまでリトライ）
  let code = generateCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    if (!findPairingCode(code)) {
      break;
    }
    code = generateCode();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error('ペアリングコード生成に失敗しました');
  }

  const expiresAt = now + config.pairingCodeExpiry;
  insertPairingCode(code, expiresAt);

  console.log(`ペアリングコード生成: ${code} (有効期限: ${new Date(expiresAt).toLocaleString()})`);

  return { code, expiresAt };
}

/**
 * ペアリングコードを検証
 */
export function verifyPairingCode(code: string): boolean {
  return !!findPairingCode(code);
}

/**
 * ペアリングコードを使用済みにする
 */
export function markPairingCodeUsed(code: string, token: string): boolean {
  return dbMarkPairingCodeUsed(code, token);
}

/**
 * 期限切れのペアリングコードを削除
 */
export { cleanupExpiredPairingCodes as cleanupExpiredCodes };

/**
 * アクティブなペアリングコード数を取得
 */
export { getActivePairingCodeCount };
