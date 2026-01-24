/**
 * ストレージサービス
 *
 * AsyncStorageのラッパー
 * 型安全なキー・バリュー保存を提供
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ストレージキーのプレフィックス
const PREFIX = '@claudesync/';

/**
 * ストレージに保存する値の型
 */
type StorageValue = string | number | boolean | object | null;

/**
 * ストレージサービス
 *
 * 使用例:
 * ```typescript
 * // 値を保存
 * await storage.set('token', 'abc123');
 *
 * // 値を取得
 * const token = await storage.get<string>('token');
 *
 * // 値を削除
 * await storage.remove('token');
 * ```
 */
export const storage = {
  /**
   * 値を保存
   *
   * @param key - キー名
   * @param value - 保存する値（JSONシリアライズ可能）
   */
  async set(key: string, value: StorageValue): Promise<void> {
    try {
      const fullKey = PREFIX + key;
      const serialized = JSON.stringify(value);
      await AsyncStorage.setItem(fullKey, serialized);
    } catch (error) {
      console.error(`ストレージ保存エラー [${key}]:`, error);
      throw error;
    }
  },

  /**
   * 値を取得
   *
   * @param key - キー名
   * @returns 保存された値、存在しない場合はnull
   */
  async get<T extends StorageValue>(key: string): Promise<T | null> {
    try {
      const fullKey = PREFIX + key;
      const value = await AsyncStorage.getItem(fullKey);

      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`ストレージ取得エラー [${key}]:`, error);
      return null;
    }
  },

  /**
   * 値を削除
   *
   * @param key - キー名
   */
  async remove(key: string): Promise<void> {
    try {
      const fullKey = PREFIX + key;
      await AsyncStorage.removeItem(fullKey);
    } catch (error) {
      console.error(`ストレージ削除エラー [${key}]:`, error);
    }
  },

  /**
   * 指定したプレフィックスを持つすべてのキーを取得
   *
   * @param keyPrefix - キーのプレフィックス（オプション）
   * @returns キーの配列
   */
  async getAllKeys(keyPrefix?: string): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const prefix = PREFIX + (keyPrefix || '');

      return allKeys
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.slice(PREFIX.length));
    } catch (error) {
      console.error('ストレージキー取得エラー:', error);
      return [];
    }
  },

  /**
   * すべてのClaudeSyncデータを削除
   */
  async clear(): Promise<void> {
    try {
      const keys = await this.getAllKeys();
      const fullKeys = keys.map((key) => PREFIX + key);

      if (fullKeys.length > 0) {
        await AsyncStorage.multiRemove(fullKeys);
      }
    } catch (error) {
      console.error('ストレージクリアエラー:', error);
    }
  },

  /**
   * 複数の値を一括保存
   *
   * @param items - キーと値のオブジェクト
   */
  async setMultiple(items: Record<string, StorageValue>): Promise<void> {
    try {
      const pairs: [string, string][] = Object.entries(items).map(([key, value]) => [
        PREFIX + key,
        JSON.stringify(value),
      ]);

      await AsyncStorage.multiSet(pairs);
    } catch (error) {
      console.error('ストレージ一括保存エラー:', error);
      throw error;
    }
  },

  /**
   * 複数の値を一括取得
   *
   * @param keys - キーの配列
   * @returns キーと値のオブジェクト
   */
  async getMultiple<T extends StorageValue>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      const fullKeys = keys.map((key) => PREFIX + key);
      const pairs = await AsyncStorage.multiGet(fullKeys);

      const result: Record<string, T | null> = {};

      for (const [fullKey, value] of pairs) {
        const key = fullKey.slice(PREFIX.length);
        result[key] = value ? (JSON.parse(value) as T) : null;
      }

      return result;
    } catch (error) {
      console.error('ストレージ一括取得エラー:', error);
      return {};
    }
  },
};
