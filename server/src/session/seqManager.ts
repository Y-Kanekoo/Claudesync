/**
 * シーケンス番号管理
 * 各クライアントの最後に受信したシーケンス番号を追跡
 */
class SeqManager {
  private clientSeqs: Map<string, number> = new Map();

  /**
   * クライアントの最終シーケンス番号を設定
   */
  set(clientId: string, seq: number): void {
    this.clientSeqs.set(clientId, seq);
  }

  /**
   * クライアントの最終シーケンス番号を取得
   */
  get(clientId: string): number {
    return this.clientSeqs.get(clientId) ?? 0;
  }

  /**
   * クライアントを削除
   */
  delete(clientId: string): void {
    this.clientSeqs.delete(clientId);
  }

  /**
   * すべてのクライアントの最小シーケンス番号を取得
   * リングバッファのクリーンアップに使用
   */
  getMinSeq(): number {
    if (this.clientSeqs.size === 0) {
      return 0;
    }

    let min = Infinity;
    for (const seq of this.clientSeqs.values()) {
      if (seq < min) {
        min = seq;
      }
    }

    return min === Infinity ? 0 : min;
  }

  /**
   * 登録クライアント数を取得
   */
  getCount(): number {
    return this.clientSeqs.size;
  }

  /**
   * デバッグ用: 全クライアントのシーケンス情報を取得
   */
  getAll(): Array<{ clientId: string; seq: number }> {
    const result: Array<{ clientId: string; seq: number }> = [];
    for (const [clientId, seq] of this.clientSeqs) {
      result.push({ clientId, seq });
    }
    return result;
  }
}

// シングルトンインスタンス
export const seqManager = new SeqManager();
