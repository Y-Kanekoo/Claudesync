import { config } from '../config.js';

interface BufferChunk {
  seq: number;
  data: Buffer;
}

/**
 * 2MBリングバッファ
 * シーケンス番号付きのチャンクを保持し、再接続時のresume用
 */
export class RingBuffer {
  private chunks: BufferChunk[] = [];
  private totalBytes = 0;
  private readonly maxBytes: number;

  constructor(maxBytes: number = config.ringBufferSize) {
    this.maxBytes = maxBytes;
  }

  /**
   * データを追加
   */
  push(seq: number, data: Buffer): void {
    this.chunks.push({ seq, data });
    this.totalBytes += data.length;

    // 最大サイズを超えたら古いチャンクを削除
    while (this.totalBytes > this.maxBytes && this.chunks.length > 1) {
      const removed = this.chunks.shift()!;
      this.totalBytes -= removed.data.length;
    }
  }

  /**
   * 指定シーケンス番号以降のチャンクを取得
   */
  getFrom(fromSeq: number): BufferChunk[] | null {
    // バッファが空の場合
    if (this.chunks.length === 0) {
      return null;
    }

    // 最も古いシーケンス番号より前を要求された場合
    const oldestSeq = this.chunks[0].seq;
    if (fromSeq < oldestSeq) {
      return null; // resync必要
    }

    // 該当するチャンクをフィルタ
    const result = this.chunks.filter(chunk => chunk.seq >= fromSeq);

    if (result.length === 0) {
      return []; // 差分なし（最新の状態）
    }

    return result;
  }

  /**
   * 最新のシーケンス番号を取得
   */
  getLatestSeq(): number {
    if (this.chunks.length === 0) {
      return 0;
    }
    return this.chunks[this.chunks.length - 1].seq;
  }

  /**
   * 最も古いシーケンス番号を取得
   */
  getOldestSeq(): number | null {
    if (this.chunks.length === 0) {
      return null;
    }
    return this.chunks[0].seq;
  }

  /**
   * バッファをクリア
   */
  clear(): void {
    this.chunks = [];
    this.totalBytes = 0;
  }

  /**
   * 現在のバッファサイズを取得（バイト）
   */
  getSize(): number {
    return this.totalBytes;
  }

  /**
   * チャンク数を取得
   */
  getChunkCount(): number {
    return this.chunks.length;
  }

  /**
   * すべてのデータを結合して取得
   */
  getAllData(): Buffer {
    if (this.chunks.length === 0) {
      return Buffer.alloc(0);
    }
    return Buffer.concat(this.chunks.map(c => c.data));
  }

  /**
   * 直近N件のチャンクを取得
   */
  getRecent(count: number): BufferChunk[] {
    return this.chunks.slice(-count);
  }

  /**
   * デバッグ用情報
   */
  getStats(): { chunks: number; bytes: number; oldestSeq: number | null; latestSeq: number } {
    return {
      chunks: this.chunks.length,
      bytes: this.totalBytes,
      oldestSeq: this.getOldestSeq(),
      latestSeq: this.getLatestSeq(),
    };
  }
}
