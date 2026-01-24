import * as pty from 'node-pty';
import type { IPty } from 'node-pty';
import { RingBuffer } from './ringBuffer.js';

// 出力コールバック型
type OutputCallback = (seq: number, data: Buffer) => void;

/**
 * PTYプロセス管理クラス
 */
export class PtyManager {
  private ptyProcess: IPty | null = null;
  private ringBuffer: RingBuffer;
  private currentSeq = 0;
  private outputCallbacks: OutputCallback[] = [];
  private cols = 80;
  private rows = 24;

  constructor() {
    this.ringBuffer = new RingBuffer();
  }

  /**
   * PTYプロセスを開始
   */
  start(options: {
    shell?: string;
    cwd?: string;
    env?: Record<string, string>;
    cols?: number;
    rows?: number;
  } = {}): void {
    if (this.ptyProcess) {
      console.log('PTYは既に起動中');
      return;
    }

    this.cols = options.cols || 80;
    this.rows = options.rows || 24;

    // シェルを決定
    const shell = options.shell || process.env.SHELL || '/bin/zsh';

    // 環境変数をマージ
    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      ...options.env,
    };

    this.ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: this.cols,
      rows: this.rows,
      cwd: options.cwd || process.env.HOME || '/',
      env: env as Record<string, string>,
    });

    console.log(`PTY開始: PID=${this.ptyProcess.pid}, shell=${shell}`);

    // 出力イベント
    this.ptyProcess.onData((data) => {
      this.handleOutput(data);
    });

    // 終了イベント
    this.ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`PTY終了: exitCode=${exitCode}, signal=${signal}`);
      this.ptyProcess = null;
    });
  }

  /**
   * 出力を処理
   */
  private handleOutput(data: string): void {
    const buffer = Buffer.from(data);
    this.currentSeq++;

    // リングバッファに追加
    this.ringBuffer.push(this.currentSeq, buffer);

    // コールバックを呼び出し
    for (const callback of this.outputCallbacks) {
      try {
        callback(this.currentSeq, buffer);
      } catch (error) {
        console.error('出力コールバックエラー:', error);
      }
    }
  }

  /**
   * 出力コールバックを登録
   */
  onOutput(callback: OutputCallback): () => void {
    this.outputCallbacks.push(callback);

    // 解除関数を返す
    return () => {
      const index = this.outputCallbacks.indexOf(callback);
      if (index !== -1) {
        this.outputCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 入力を送信
   */
  handleInput(data: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }

  /**
   * ウィンドウサイズを変更
   */
  handleResize(cols: number, rows: number): void {
    if (this.ptyProcess && cols > 0 && rows > 0) {
      this.cols = cols;
      this.rows = rows;
      this.ptyProcess.resize(cols, rows);
    }
  }

  /**
   * 指定シーケンス番号以降のバッファデータを取得
   */
  getBufferFrom(fromSeq: number): { chunks: { seq: number; data: Buffer }[] } | null {
    const chunks = this.ringBuffer.getFrom(fromSeq);
    if (chunks === null) {
      return null;
    }
    return { chunks };
  }

  /**
   * 現在の画面スナップショットを取得
   * tmux使用時はtmux capture-paneを使用
   */
  getSnapshot(): { content: string; seq: number } {
    // 簡易実装: リングバッファの全データを返す
    // 実際のアプリではtmux capture-paneを使用するのがベター
    const allData = this.ringBuffer.getAllData();
    return {
      content: allData.toString(),
      seq: this.currentSeq,
    };
  }

  /**
   * 現在のシーケンス番号を取得
   */
  getCurrentSeq(): number {
    return this.currentSeq;
  }

  /**
   * PTYプロセスを停止
   */
  stop(): void {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
      console.log('PTY停止');
    }
  }

  /**
   * PTYが起動中かどうか
   */
  isRunning(): boolean {
    return this.ptyProcess !== null;
  }

  /**
   * 現在のウィンドウサイズを取得
   */
  getSize(): { cols: number; rows: number } {
    return { cols: this.cols, rows: this.rows };
  }

  /**
   * バッファ統計情報を取得
   */
  getBufferStats(): { chunks: number; bytes: number; oldestSeq: number | null; latestSeq: number } {
    return this.ringBuffer.getStats();
  }
}

// シングルトンインスタンス
export const ptyManager = new PtyManager();
