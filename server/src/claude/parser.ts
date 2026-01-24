import type { ClaudeStatus } from '../types/index.js';

// Claude Codeの出力パターン
const PATTERNS = {
  // 思考中のスピナー（⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏など）
  THINKING_SPINNER: /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/,

  // 確認待ち（y/n）
  CONFIRMATION: /\b(y\/n|yes\/no|\[y\]|\[n\]|confirm|approve|allow)\b/i,

  // 完了メッセージ
  COMPLETED: /\b(completed|done|finished|success|✓|✔️)\b/i,

  // エラーメッセージ
  ERROR: /\b(error|failed|failure|exception|エラー|失敗)\b/i,

  // プロンプト（入力待ち）
  PROMPT: /[$>❯]\s*$/,

  // ファイル編集中
  EDITING: /\b(editing|writing|modifying|saving)\b/i,

  // コマンド実行中
  RUNNING_COMMAND: /\b(running|executing)\b.*\.\.\./i,
};

/**
 * ターミナル出力からClaude Codeの状態を解析
 */
export function parseClaudeOutput(output: string): {
  status: ClaudeStatus;
  message?: string;
} {
  // 直近の出力から状態を判定
  const lines = output.split('\n');
  const recentOutput = lines.slice(-10).join('\n'); // 最後の10行を見る

  // スピナーが含まれている場合は思考中
  if (PATTERNS.THINKING_SPINNER.test(recentOutput)) {
    return {
      status: 'thinking',
      message: '思考中...',
    };
  }

  // 確認待ち
  if (PATTERNS.CONFIRMATION.test(recentOutput)) {
    return {
      status: 'waiting_confirmation',
      message: '確認が必要です',
    };
  }

  // エラー
  if (PATTERNS.ERROR.test(recentOutput)) {
    return {
      status: 'error',
      message: 'エラーが発生しました',
    };
  }

  // 完了
  if (PATTERNS.COMPLETED.test(recentOutput)) {
    return {
      status: 'completed',
      message: '完了しました',
    };
  }

  // プロンプト（アイドル状態）
  if (PATTERNS.PROMPT.test(recentOutput)) {
    return {
      status: 'idle',
    };
  }

  // デフォルト: アイドル
  return {
    status: 'idle',
  };
}

/**
 * 確認待ちのタイプを詳細に解析
 */
export function parseConfirmationType(output: string): {
  type: 'yes_no' | 'approve' | 'allow' | 'unknown';
  question?: string;
} {
  const lines = output.split('\n');

  // 直近の行から確認内容を探す
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
    const line = lines[i].toLowerCase();

    if (line.includes('approve')) {
      return { type: 'approve', question: lines[i] };
    }
    if (line.includes('allow')) {
      return { type: 'allow', question: lines[i] };
    }
    if (line.includes('y/n') || line.includes('yes/no')) {
      return { type: 'yes_no', question: lines[i] };
    }
  }

  return { type: 'unknown' };
}

/**
 * 進行状況を抽出（パーセンテージなど）
 */
export function parseProgress(output: string): {
  hasProgress: boolean;
  percentage?: number;
  current?: number;
  total?: number;
} {
  // パーセンテージパターン
  const percentMatch = output.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) {
    return {
      hasProgress: true,
      percentage: parseFloat(percentMatch[1]),
    };
  }

  // n/m パターン（例: 3/10）
  const fractionMatch = output.match(/(\d+)\s*\/\s*(\d+)/);
  if (fractionMatch) {
    const current = parseInt(fractionMatch[1], 10);
    const total = parseInt(fractionMatch[2], 10);
    return {
      hasProgress: true,
      current,
      total,
      percentage: total > 0 ? (current / total) * 100 : undefined,
    };
  }

  return { hasProgress: false };
}

/**
 * 出力からANSIエスケープシーケンスを除去
 */
export function stripAnsi(text: string): string {
  // ANSI エスケープシーケンスを除去
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

/**
 * 出力が重要な通知を含むかどうかを判定
 */
export function shouldNotify(output: string): {
  shouldNotify: boolean;
  reason?: 'confirmation' | 'error' | 'completed';
} {
  const strippedOutput = stripAnsi(output);

  if (PATTERNS.CONFIRMATION.test(strippedOutput)) {
    return { shouldNotify: true, reason: 'confirmation' };
  }

  if (PATTERNS.ERROR.test(strippedOutput)) {
    return { shouldNotify: true, reason: 'error' };
  }

  if (PATTERNS.COMPLETED.test(strippedOutput)) {
    return { shouldNotify: true, reason: 'completed' };
  }

  return { shouldNotify: false };
}
