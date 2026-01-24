import { networkInterfaces } from 'os';
import type { ServerConfig } from './types/index.js';

/**
 * Tailscale VPNのIPアドレスを取得する
 * Tailscaleは通常100.x.x.x のプライベートIPを使用
 */
export function getTailscaleIP(): string | null {
  const interfaces = networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const netInterface = interfaces[name];
    if (!netInterface) continue;

    for (const addr of netInterface) {
      // IPv4かつ100.x.x.xで始まるアドレス（Tailscaleの範囲）
      if (addr.family === 'IPv4' && addr.address.startsWith('100.')) {
        return addr.address;
      }
    }
  }

  return null;
}

/**
 * サーバー設定を取得
 */
export function getConfig(): ServerConfig {
  const tailscaleIP = getTailscaleIP();

  if (!tailscaleIP) {
    console.warn('警告: Tailscale IPが見つかりません。0.0.0.0にバインドします。');
  }

  return {
    host: tailscaleIP || '0.0.0.0',
    port: parseInt(process.env.PORT || '3847', 10),
    heartbeatInterval: 15000,       // 15秒
    heartbeatTimeout: 3,            // 3回失敗で切断
    pairingCodeExpiry: 5 * 60 * 1000, // 5分
    ringBufferSize: 2 * 1024 * 1024,  // 2MB
  };
}

export const config = getConfig();
