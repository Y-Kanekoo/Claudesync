// WebSocketメッセージタイプ
export const MessageType = {
  // 認証
  AUTH: 'auth',
  AUTH_OK: 'auth_ok',
  AUTH_FAIL: 'auth_fail',

  // ターミナル
  OUTPUT: 'output',        // サーバー → クライアント: ターミナル出力
  INPUT: 'input',          // クライアント → サーバー: キー入力
  RESIZE: 'resize',        // クライアント → サーバー: ウィンドウリサイズ

  // セッション管理
  RESUME: 'resume',        // クライアント → サーバー: 再接続時のresume要求
  RESYNC_REQUIRED: 'resync_required', // サーバー → クライアント: 完全同期必要
  SNAPSHOT: 'snapshot',    // サーバー → クライアント: 画面スナップショット

  // Heartbeat
  PING: 'ping',
  PONG: 'pong',

  // Claude特化
  CLAUDE_STATUS: 'claude_status',  // 思考中、確認待ちなど
} as const;

export type MessageTypeName = typeof MessageType[keyof typeof MessageType];

// バイナリフレームタイプ（1byte）
export const FrameType = {
  OUTPUT: 0x01,    // ターミナル出力
  INPUT: 0x02,     // キー入力
  SNAPSHOT: 0x03,  // スナップショット
} as const;

// 認証メッセージ
export interface AuthMessage {
  type: typeof MessageType.AUTH;
  payload: {
    token: string;
  };
}

export interface AuthOkMessage {
  type: typeof MessageType.AUTH_OK;
  payload: {
    sessionId: string;
    lastSeq: number;
  };
}

export interface AuthFailMessage {
  type: typeof MessageType.AUTH_FAIL;
  payload: {
    reason: string;
  };
}

// ターミナルメッセージ
export interface OutputMessage {
  type: typeof MessageType.OUTPUT;
  seq: number;
  data: Buffer;
}

export interface InputMessage {
  type: typeof MessageType.INPUT;
  payload: {
    data: string;
  };
}

export interface ResizeMessage {
  type: typeof MessageType.RESIZE;
  payload: {
    cols: number;
    rows: number;
  };
}

// セッション管理
export interface ResumeMessage {
  type: typeof MessageType.RESUME;
  payload: {
    fromSeq: number;
  };
}

export interface ResyncRequiredMessage {
  type: typeof MessageType.RESYNC_REQUIRED;
  payload: {
    reason: string;
  };
}

export interface SnapshotMessage {
  type: typeof MessageType.SNAPSHOT;
  payload: {
    content: string;
    seq: number;
  };
}

// Heartbeat
export interface PingMessage {
  type: typeof MessageType.PING;
  payload: {
    timestamp: number;
  };
}

export interface PongMessage {
  type: typeof MessageType.PONG;
  payload: {
    timestamp: number;
  };
}

// Claude状態
export type ClaudeStatus = 'idle' | 'thinking' | 'waiting_confirmation' | 'error' | 'completed';

export interface ClaudeStatusMessage {
  type: typeof MessageType.CLAUDE_STATUS;
  payload: {
    status: ClaudeStatus;
    message?: string;
  };
}

// すべてのメッセージ型のユニオン
export type WSMessage =
  | AuthMessage
  | AuthOkMessage
  | AuthFailMessage
  | InputMessage
  | ResizeMessage
  | ResumeMessage
  | ResyncRequiredMessage
  | SnapshotMessage
  | PingMessage
  | PongMessage
  | ClaudeStatusMessage;

// クライアント接続情報
export interface ClientConnection {
  id: string;
  ws: import('ws').WebSocket;
  authenticated: boolean;
  token?: string;
  lastSeq: number;
  lastPing: number;
  missedPings: number;
}

// セッション情報
export interface Session {
  id: string;
  token: string;
  createdAt: number;
  lastAccessedAt: number;
}

// ペアリングコード
export interface PairingCode {
  code: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

// 設定
export interface ServerConfig {
  host: string;
  port: number;
  heartbeatInterval: number;  // ミリ秒
  heartbeatTimeout: number;   // 失敗回数
  pairingCodeExpiry: number;  // ミリ秒
  ringBufferSize: number;     // バイト
}
