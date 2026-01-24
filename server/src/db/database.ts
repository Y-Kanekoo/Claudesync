import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// データ構造
interface TokenRecord {
  token: string;
  deviceName: string | null;
  createdAt: number;
  lastUsedAt: number;
  isActive: boolean;
}

interface PairingCodeRecord {
  code: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedByToken: string | null;
}

interface DatabaseData {
  tokens: TokenRecord[];
  pairingCodes: PairingCodeRecord[];
}

let data: DatabaseData = {
  tokens: [],
  pairingCodes: [],
};

let dbPath: string | null = null;

/**
 * データベースを初期化
 */
export function initDatabase(path?: string): void {
  dbPath = path || join(__dirname, '../../data/claudesync.json');

  // ディレクトリがなければ作成
  const dataDir = dirname(dbPath);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // 既存データを読み込み
  if (existsSync(dbPath)) {
    try {
      const content = readFileSync(dbPath, 'utf-8');
      data = JSON.parse(content);
      console.log(`データベース読み込み完了: ${dbPath}`);
    } catch (error) {
      console.warn('データベース読み込みエラー、初期化します:', error);
      data = { tokens: [], pairingCodes: [] };
    }
  } else {
    console.log(`新規データベース作成: ${dbPath}`);
  }
}

/**
 * データを永続化
 */
function save(): void {
  if (dbPath) {
    writeFileSync(dbPath, JSON.stringify(data, null, 2));
  }
}

// ===== トークン操作 =====

export function insertToken(token: string, deviceName: string | null): void {
  const now = Date.now();
  data.tokens.push({
    token,
    deviceName,
    createdAt: now,
    lastUsedAt: now,
    isActive: true,
  });
  save();
}

export function findToken(token: string): TokenRecord | undefined {
  return data.tokens.find(t => t.token === token && t.isActive);
}

export function updateTokenLastUsed(token: string): void {
  const record = data.tokens.find(t => t.token === token);
  if (record) {
    record.lastUsedAt = Date.now();
    save();
  }
}

export function deactivateToken(token: string): boolean {
  const record = data.tokens.find(t => t.token === token);
  if (record) {
    record.isActive = false;
    save();
    return true;
  }
  return false;
}

export function deactivateAllTokens(): number {
  let count = 0;
  for (const record of data.tokens) {
    if (record.isActive) {
      record.isActive = false;
      count++;
    }
  }
  save();
  return count;
}

export function getActiveTokens(): TokenRecord[] {
  return data.tokens.filter(t => t.isActive);
}

// ===== ペアリングコード操作 =====

export function insertPairingCode(code: string, expiresAt: number): void {
  data.pairingCodes.push({
    code,
    createdAt: Date.now(),
    expiresAt,
    used: false,
    usedByToken: null,
  });
  save();
}

export function findPairingCode(code: string): PairingCodeRecord | undefined {
  const now = Date.now();
  return data.pairingCodes.find(
    p => p.code === code && p.expiresAt > now && !p.used
  );
}

export function markPairingCodeUsed(code: string, token: string): boolean {
  const record = data.pairingCodes.find(p => p.code === code);
  if (record && !record.used) {
    record.used = true;
    record.usedByToken = token;
    save();
    return true;
  }
  return false;
}

export function cleanupExpiredPairingCodes(): number {
  const now = Date.now();
  const before = data.pairingCodes.length;
  data.pairingCodes = data.pairingCodes.filter(p => p.expiresAt > now || p.used);
  const removed = before - data.pairingCodes.length;
  if (removed > 0) {
    save();
  }
  return removed;
}

export function getActivePairingCodeCount(): number {
  const now = Date.now();
  return data.pairingCodes.filter(p => p.expiresAt > now && !p.used).length;
}

// ===== その他 =====

export function closeDatabase(): void {
  if (dbPath) {
    save();
    console.log('データベース保存完了');
  }
}

export function clearDatabase(): void {
  data = { tokens: [], pairingCodes: [] };
  save();
}
