import { seqManager } from './seqManager.js';

export interface ResumeResult {
  success: boolean;
  reason?: string;
  chunks?: Array<{ seq: number; data: Buffer }>;
  snapshot?: { content: string; seq: number };
}

/**
 * Resume要求を処理
 */
export function handleResumeRequest(
  clientId: string,
  fromSeq: number,
  getBufferFrom: (seq: number) => { chunks: Array<{ seq: number; data: Buffer }> } | null,
  getSnapshot: () => { content: string; seq: number }
): ResumeResult {
  // 現在のクライアントのシーケンス番号を取得
  const currentSeq = seqManager.get(clientId);

  // 要求されたシーケンス番号が現在より新しい場合はエラー
  if (fromSeq > currentSeq && currentSeq > 0) {
    return {
      success: false,
      reason: '無効なシーケンス番号です',
    };
  }

  // バッファから差分を取得
  const bufferData = getBufferFrom(fromSeq);

  if (bufferData === null) {
    // バッファにデータがない場合はスナップショットを返す
    const snapshot = getSnapshot();
    seqManager.set(clientId, snapshot.seq);

    return {
      success: true,
      snapshot,
    };
  }

  // 差分データを返す
  if (bufferData.chunks.length > 0) {
    const lastChunk = bufferData.chunks[bufferData.chunks.length - 1];
    seqManager.set(clientId, lastChunk.seq);
  }

  return {
    success: true,
    chunks: bufferData.chunks,
  };
}

/**
 * クライアントのシーケンス番号を更新
 */
export function updateClientSeq(clientId: string, seq: number): void {
  seqManager.set(clientId, seq);
}

/**
 * クライアントを削除
 */
export function removeClient(clientId: string): void {
  seqManager.delete(clientId);
}

/**
 * resyncが必要かどうかを判定
 */
export function needsResync(
  requestedSeq: number,
  oldestBufferSeq: number | null
): boolean {
  // バッファが空の場合はresync必要
  if (oldestBufferSeq === null) {
    return true;
  }

  // 要求されたシーケンスがバッファの最古より古い場合はresync必要
  return requestedSeq < oldestBufferSeq;
}
