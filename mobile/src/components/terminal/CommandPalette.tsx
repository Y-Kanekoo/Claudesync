/**
 * コマンドパレットコンポーネント
 *
 * よく使うコマンドやショートカットをクイックアクセスできるパレット
 * ターミナル画面の下部に表示
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../../stores/settingsStore';

/**
 * コマンド定義
 */
interface Command {
  id: string;          // 一意のID
  label: string;       // 表示ラベル
  icon?: string;       // アイコン（オプション）
  data: string;        // 送信するデータ
  description?: string; // 説明（オプション）
}

/**
 * 定義済みコマンド
 */
const QUICK_COMMANDS: Command[] = [
  { id: 'yes', label: 'Yes', data: 'y\n', description: '確認に「はい」で応答' },
  { id: 'no', label: 'No', data: 'n\n', description: '確認に「いいえ」で応答' },
  { id: 'enter', label: '⏎', data: '\r', description: 'Enterキー' },
  { id: 'tab', label: 'Tab', data: '\t', description: 'Tabキー（補完）' },
  { id: 'ctrlc', label: '^C', data: '\x03', description: '中断（Ctrl+C）' },
  { id: 'ctrld', label: '^D', data: '\x04', description: 'EOF（Ctrl+D）' },
  { id: 'esc', label: 'Esc', data: '\x1b', description: 'Escapeキー' },
  { id: 'up', label: '↑', data: '\x1b[A', description: '履歴を戻る' },
  { id: 'down', label: '↓', data: '\x1b[B', description: '履歴を進む' },
];

/**
 * Claude Code用コマンド
 */
const CLAUDE_COMMANDS: Command[] = [
  { id: 'exit', label: '/exit', data: '/exit\r', description: 'Claude Codeを終了' },
  { id: 'help', label: '/help', data: '/help\r', description: 'ヘルプを表示' },
  { id: 'clear', label: '/clear', data: '/clear\r', description: '画面をクリア' },
  { id: 'status', label: '/status', data: '/status\r', description: 'ステータスを表示' },
];

/**
 * コマンドパレットのプロパティ
 */
interface CommandPaletteProps {
  // コマンドが選択されたときのコールバック
  onCommand: (data: string) => void;
  // パレットを閉じるときのコールバック
  onClose?: () => void;
  // 表示するコマンドセット
  commandSet?: 'quick' | 'claude' | 'all';
}

/**
 * コマンドパレットコンポーネント
 *
 * 使用例:
 * ```tsx
 * <CommandPalette
 *   onCommand={(data) => sendInput(data)}
 *   commandSet="all"
 * />
 * ```
 */
export function CommandPalette({
  onCommand,
  onClose,
  commandSet = 'all',
}: CommandPaletteProps) {
  // 設定を取得
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);

  // 表示するコマンドを決定
  const commands = React.useMemo(() => {
    switch (commandSet) {
      case 'quick':
        return QUICK_COMMANDS;
      case 'claude':
        return CLAUDE_COMMANDS;
      case 'all':
      default:
        return [...QUICK_COMMANDS, ...CLAUDE_COMMANDS];
    }
  }, [commandSet]);

  /**
   * コマンドを実行
   */
  const handleCommand = async (command: Command) => {
    // 触覚フィードバック
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // コマンドを送信
    onCommand(command.data);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {commands.map((command) => (
          <TouchableOpacity
            key={command.id}
            style={styles.button}
            onPress={() => handleCommand(command)}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>{command.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    borderTopWidth: 1,
    borderTopColor: '#404040',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  button: {
    backgroundColor: '#404040',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 48,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Menlo',
  },
  closeButton: {
    padding: 8,
    marginLeft: 4,
  },
  closeButtonText: {
    color: '#888888',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
