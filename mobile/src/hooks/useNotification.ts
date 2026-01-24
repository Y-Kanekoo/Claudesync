/**
 * 通知フック
 *
 * ローカル通知とプッシュ通知を管理するカスタムフック
 * Claude Codeの状態変化（確認待ち、エラー、完了など）をユーザーに通知
 */

import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../stores/settingsStore';

// 通知の設定（アプリがフォアグラウンドでも表示）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * 通知の種類
 */
export type NotificationType = 'confirmation' | 'error' | 'completed' | 'info';

/**
 * 通知オプション
 */
interface NotificationOptions {
  title: string;      // 通知タイトル
  body: string;       // 通知本文
  type: NotificationType;
  data?: Record<string, unknown>;  // 追加データ
}

/**
 * 通知フック
 *
 * 使用例:
 * ```tsx
 * function App() {
 *   const { notify, requestPermission } = useNotification();
 *
 *   useEffect(() => {
 *     requestPermission();
 *   }, []);
 *
 *   const handleConfirmation = () => {
 *     notify({
 *       title: '確認が必要です',
 *       body: 'ファイルを削除しますか？',
 *       type: 'confirmation',
 *     });
 *   };
 * }
 * ```
 */
export function useNotification() {
  // 設定を取得
  const {
    notifyOnConfirmation,
    notifyOnError,
    notifyOnComplete,
    hapticFeedback,
  } = useSettingsStore();

  // 通知権限の状態
  const hasPermission = useRef(false);

  /**
   * 通知権限をリクエスト
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      hasPermission.current = true;
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    hasPermission.current = status === 'granted';

    return hasPermission.current;
  }, []);

  /**
   * ローカル通知を送信
   */
  const notify = useCallback(
    async (options: NotificationOptions) => {
      const { title, body, type, data } = options;

      // 設定に基づいて通知をスキップ
      if (type === 'confirmation' && !notifyOnConfirmation) return;
      if (type === 'error' && !notifyOnError) return;
      if (type === 'completed' && !notifyOnComplete) return;

      // 触覚フィードバック
      if (hapticFeedback) {
        switch (type) {
          case 'confirmation':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
          case 'error':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
          case 'completed':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          default:
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }

      // 通知を送信
      if (hasPermission.current) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { ...data, type },
            sound: true,
          },
          trigger: null, // 即時送信
        });
      }
    },
    [notifyOnConfirmation, notifyOnError, notifyOnComplete, hapticFeedback]
  );

  /**
   * 確認待ち通知を送信
   */
  const notifyConfirmation = useCallback(
    (message: string) => {
      notify({
        title: '確認が必要です',
        body: message,
        type: 'confirmation',
      });
    },
    [notify]
  );

  /**
   * エラー通知を送信
   */
  const notifyError = useCallback(
    (message: string) => {
      notify({
        title: 'エラーが発生しました',
        body: message,
        type: 'error',
      });
    },
    [notify]
  );

  /**
   * 完了通知を送信
   */
  const notifyCompleted = useCallback(
    (message: string) => {
      notify({
        title: '処理が完了しました',
        body: message,
        type: 'completed',
      });
    },
    [notify]
  );

  /**
   * 情報通知を送信
   */
  const notifyInfo = useCallback(
    (title: string, message: string) => {
      notify({
        title,
        body: message,
        type: 'info',
      });
    },
    [notify]
  );

  /**
   * 保留中の通知をすべてキャンセル
   */
  const cancelAll = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }, []);

  return {
    // 操作
    requestPermission,
    notify,
    notifyConfirmation,
    notifyError,
    notifyCompleted,
    notifyInfo,
    cancelAll,
  };
}
