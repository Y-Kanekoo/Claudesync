import { spawn, execSync } from 'child_process';

const CLAUDESYNC_SESSION_NAME = 'claudesync';

/**
 * tmuxセッション管理クラス
 */
export class TmuxManager {
  private sessionName: string;

  constructor(sessionName: string = CLAUDESYNC_SESSION_NAME) {
    this.sessionName = sessionName;
  }

  /**
   * tmuxがインストールされているか確認
   */
  isInstalled(): boolean {
    try {
      execSync('which tmux', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * セッションが存在するか確認
   */
  sessionExists(): boolean {
    try {
      execSync(`tmux has-session -t ${this.sessionName} 2>/dev/null`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 既存のtmuxセッション一覧を取得
   */
  listSessions(): string[] {
    try {
      const output = execSync('tmux list-sessions -F "#{session_name}"', { encoding: 'utf-8' });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * 新しいセッションを作成
   */
  createSession(options: {
    cwd?: string;
    command?: string;
    cols?: number;
    rows?: number;
  } = {}): boolean {
    try {
      const { cwd, command, cols = 80, rows = 24 } = options;

      let cmd = `tmux new-session -d -s ${this.sessionName} -x ${cols} -y ${rows}`;

      if (cwd) {
        cmd += ` -c "${cwd}"`;
      }

      if (command) {
        cmd += ` "${command}"`;
      }

      execSync(cmd, { stdio: 'ignore' });
      console.log(`tmuxセッション作成: ${this.sessionName}`);
      return true;
    } catch (error) {
      console.error('tmuxセッション作成エラー:', error);
      return false;
    }
  }

  /**
   * セッションを終了
   */
  killSession(): boolean {
    try {
      execSync(`tmux kill-session -t ${this.sessionName}`, { stdio: 'ignore' });
      console.log(`tmuxセッション終了: ${this.sessionName}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 画面スナップショットを取得
   */
  capturePane(options: {
    startLine?: number;
    endLine?: number;
    escapeSequences?: boolean;
  } = {}): string | null {
    if (!this.sessionExists()) {
      return null;
    }

    try {
      const { startLine = '-', endLine = '-', escapeSequences = true } = options;
      const escFlag = escapeSequences ? '-e' : '';
      const cmd = `tmux capture-pane -t ${this.sessionName} ${escFlag} -p -S ${startLine} -E ${endLine}`;

      const output = execSync(cmd, { encoding: 'utf-8' });
      return output;
    } catch (error) {
      console.error('capture-paneエラー:', error);
      return null;
    }
  }

  /**
   * セッションにキー入力を送信
   */
  sendKeys(keys: string, literal: boolean = true): boolean {
    if (!this.sessionExists()) {
      return false;
    }

    try {
      const literalFlag = literal ? '-l' : '';
      // キーをエスケープ
      const escapedKeys = keys.replace(/'/g, "'\\''");
      execSync(`tmux send-keys -t ${this.sessionName} ${literalFlag} '${escapedKeys}'`, { stdio: 'ignore' });
      return true;
    } catch (error) {
      console.error('send-keysエラー:', error);
      return false;
    }
  }

  /**
   * 特殊キーを送信（Enter, Escなど）
   */
  sendSpecialKey(key: 'Enter' | 'Escape' | 'Tab' | 'BSpace' | 'Up' | 'Down' | 'Left' | 'Right' | 'C-c' | 'C-d'): boolean {
    if (!this.sessionExists()) {
      return false;
    }

    try {
      execSync(`tmux send-keys -t ${this.sessionName} ${key}`, { stdio: 'ignore' });
      return true;
    } catch (error) {
      console.error('特殊キー送信エラー:', error);
      return false;
    }
  }

  /**
   * ウィンドウサイズを変更
   */
  resize(cols: number, rows: number): boolean {
    if (!this.sessionExists()) {
      return false;
    }

    try {
      execSync(`tmux resize-window -t ${this.sessionName} -x ${cols} -y ${rows}`, { stdio: 'ignore' });
      return true;
    } catch (error) {
      console.error('リサイズエラー:', error);
      return false;
    }
  }

  /**
   * 現在のウィンドウサイズを取得
   */
  getSize(): { cols: number; rows: number } | null {
    if (!this.sessionExists()) {
      return null;
    }

    try {
      const output = execSync(
        `tmux display-message -t ${this.sessionName} -p '#{window_width}x#{window_height}'`,
        { encoding: 'utf-8' }
      );
      const [cols, rows] = output.trim().split('x').map(Number);
      return { cols, rows };
    } catch {
      return null;
    }
  }

  /**
   * セッション名を取得
   */
  getSessionName(): string {
    return this.sessionName;
  }

  /**
   * セッションにアタッチするコマンドを取得
   */
  getAttachCommand(): string {
    return `tmux attach-session -t ${this.sessionName}`;
  }

  /**
   * 現在のペインのPIDを取得
   */
  getPanePid(): number | null {
    if (!this.sessionExists()) {
      return null;
    }

    try {
      const output = execSync(
        `tmux display-message -t ${this.sessionName} -p '#{pane_pid}'`,
        { encoding: 'utf-8' }
      );
      return parseInt(output.trim(), 10);
    } catch {
      return null;
    }
  }

  /**
   * ペインで実行中のコマンドを取得
   */
  getCurrentCommand(): string | null {
    if (!this.sessionExists()) {
      return null;
    }

    try {
      const output = execSync(
        `tmux display-message -t ${this.sessionName} -p '#{pane_current_command}'`,
        { encoding: 'utf-8' }
      );
      return output.trim();
    } catch {
      return null;
    }
  }
}

// シングルトンインスタンス
export const tmuxManager = new TmuxManager();
