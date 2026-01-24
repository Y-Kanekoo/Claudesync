/**
 * 設定ストア
 *
 * アプリケーションの設定を管理するZustandストア
 * ユーザーの好み設定やサーバー接続情報を永続化
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ストレージキー
const STORAGE_KEY = '@claudesync/settings';

/**
 * 設定の型定義
 */
interface Settings {
  // サーバー接続設定
  serverUrl: string;       // WebSocketサーバーのURL（例: ws://100.x.x.x:3847）
  token: string | null;    // 認証トークン

  // 表示設定
  fontSize: number;        // ターミナルのフォントサイズ
  theme: 'dark' | 'light'; // テーマ

  // 通知設定
  notifyOnConfirmation: boolean;  // 確認待ち時に通知
  notifyOnError: boolean;         // エラー時に通知
  notifyOnComplete: boolean;      // 完了時に通知

  // 触覚フィードバック
  hapticFeedback: boolean;
}

/**
 * ストアの状態と操作
 */
interface SettingsState extends Settings {
  // 設定の読み込み状態
  isLoaded: boolean;

  // 設定の更新
  updateSettings: (updates: Partial<Settings>) => void;

  // 設定の読み込み（アプリ起動時に呼び出す）
  loadSettings: () => Promise<void>;

  // 設定のリセット
  resetSettings: () => void;
}

/**
 * デフォルト設定
 */
const defaultSettings: Settings = {
  serverUrl: '',
  token: null,
  fontSize: 14,
  theme: 'dark',
  notifyOnConfirmation: true,
  notifyOnError: true,
  notifyOnComplete: false,
  hapticFeedback: true,
};

/**
 * 設定ストア
 *
 * 使用例:
 * ```tsx
 * const { fontSize, updateSettings } = useSettingsStore();
 *
 * // フォントサイズを変更
 * updateSettings({ fontSize: 16 });
 * ```
 */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaultSettings,
  isLoaded: false,

  /**
   * 設定を更新して永続化
   */
  updateSettings: async (updates) => {
    // 状態を更新
    set(updates);

    // AsyncStorageに保存
    try {
      const currentState = get();
      const settingsToSave: Settings = {
        serverUrl: currentState.serverUrl,
        token: currentState.token,
        fontSize: currentState.fontSize,
        theme: currentState.theme,
        notifyOnConfirmation: currentState.notifyOnConfirmation,
        notifyOnError: currentState.notifyOnError,
        notifyOnComplete: currentState.notifyOnComplete,
        hapticFeedback: currentState.hapticFeedback,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('設定の保存に失敗:', error);
    }
  },

  /**
   * AsyncStorageから設定を読み込み
   */
  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Settings>;
        set({ ...parsed, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error('設定の読み込みに失敗:', error);
      set({ isLoaded: true });
    }
  },

  /**
   * 設定をデフォルトにリセット
   */
  resetSettings: () => {
    set(defaultSettings);
    AsyncStorage.removeItem(STORAGE_KEY).catch(console.error);
  },
}));
