import type { Session } from '../types/index.js';

/**
 * アクティブセッション管理
 */
class SessionManager {
  private sessions: Map<string, Session> = new Map();

  /**
   * セッションを作成
   */
  create(token: string): Session {
    const now = Date.now();
    const session: Session = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      token,
      createdAt: now,
      lastAccessedAt: now,
    };

    this.sessions.set(session.id, session);
    console.log(`セッション作成: ${session.id}`);

    return session;
  }

  /**
   * セッションを取得
   */
  get(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * トークンでセッションを検索
   */
  getByToken(token: string): Session | undefined {
    for (const session of this.sessions.values()) {
      if (session.token === token) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * セッションを更新
   */
  touch(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccessedAt = Date.now();
    }
  }

  /**
   * セッションを削除
   */
  delete(sessionId: string): boolean {
    const result = this.sessions.delete(sessionId);
    if (result) {
      console.log(`セッション削除: ${sessionId}`);
    }
    return result;
  }

  /**
   * トークンに紐づくセッションをすべて削除
   */
  deleteByToken(token: string): number {
    let count = 0;
    for (const [id, session] of this.sessions) {
      if (session.token === token) {
        this.sessions.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * アクティブなセッション数を取得
   */
  getCount(): number {
    return this.sessions.size;
  }

  /**
   * 古いセッションをクリーンアップ
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAge;
    let count = 0;

    for (const [id, session] of this.sessions) {
      if (session.lastAccessedAt < cutoff) {
        this.sessions.delete(id);
        count++;
      }
    }

    if (count > 0) {
      console.log(`${count}個の古いセッションをクリーンアップ`);
    }

    return count;
  }
}

// シングルトンインスタンス
export const sessionManager = new SessionManager();
