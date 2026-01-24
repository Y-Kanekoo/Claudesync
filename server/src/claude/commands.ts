import { ptyManager } from '../pty/manager.js';

/**
 * Claude Code向けの特殊コマンド
 */

/**
 * Yesを送信（確認プロンプトに応答）
 */
export function sendYes(): void {
  ptyManager.handleInput('y\n');
}

/**
 * Noを送信
 */
export function sendNo(): void {
  ptyManager.handleInput('n\n');
}

/**
 * Enterを送信
 */
export function sendEnter(): void {
  ptyManager.handleInput('\r');
}

/**
 * Ctrl+Cを送信（中断）
 */
export function sendInterrupt(): void {
  ptyManager.handleInput('\x03');
}

/**
 * Ctrl+Dを送信（EOF）
 */
export function sendEof(): void {
  ptyManager.handleInput('\x04');
}

/**
 * Escを送信
 */
export function sendEscape(): void {
  ptyManager.handleInput('\x1b');
}

/**
 * Tabを送信
 */
export function sendTab(): void {
  ptyManager.handleInput('\t');
}

/**
 * 矢印キーを送信
 */
export function sendArrowUp(): void {
  ptyManager.handleInput('\x1b[A');
}

export function sendArrowDown(): void {
  ptyManager.handleInput('\x1b[B');
}

export function sendArrowRight(): void {
  ptyManager.handleInput('\x1b[C');
}

export function sendArrowLeft(): void {
  ptyManager.handleInput('\x1b[D');
}

/**
 * テキストを送信
 */
export function sendText(text: string): void {
  ptyManager.handleInput(text);
}

/**
 * コマンドを実行（テキスト + Enter）
 */
export function runCommand(command: string): void {
  ptyManager.handleInput(command + '\r');
}

/**
 * Claude Codeを起動
 */
export function startClaude(projectPath?: string): void {
  let command = 'claude';
  if (projectPath) {
    command += ` "${projectPath}"`;
  }
  runCommand(command);
}

/**
 * Claude Codeを終了
 */
export function exitClaude(): void {
  // /exitコマンドを送信
  runCommand('/exit');
}

/**
 * クイックアクションのマッピング
 */
export const quickActions: Record<string, () => void> = {
  yes: sendYes,
  no: sendNo,
  enter: sendEnter,
  interrupt: sendInterrupt,
  eof: sendEof,
  escape: sendEscape,
  tab: sendTab,
  arrowUp: sendArrowUp,
  arrowDown: sendArrowDown,
  arrowRight: sendArrowRight,
  arrowLeft: sendArrowLeft,
};

/**
 * クイックアクションを実行
 */
export function executeQuickAction(action: string): boolean {
  const fn = quickActions[action];
  if (fn) {
    fn();
    return true;
  }
  return false;
}
