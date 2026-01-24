/**
 * WebSocket接続フック
 *
 * WebSocketクライアントをReactコンポーネントで使用するためのカスタムフック
 * 接続管理、状態追跡、自動再接続を提供
 */

import { useCallback, useEffect, useRef } from 'react';
import { wsClient, WSClient } from '../services/wsClient';
import { useConnectionStore } from '../stores/connectionStore';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * コールバック型定義
 */
interface UseWebSocketOptions {
  // ターミナル出力を受信したとき
  onOutput?: (seq: number, data: ArrayBuffer) => void;
  // スナップショットを受信したとき
  onSnapshot?: (seq: number, content: string) => void;
  // Claude状態が変化したとき
  onClaudeStatus?: (status: string, message?: string) => void;
  // resyncが必要なとき
  onResyncRequired?: () => void;
}

/**
 * WebSocket接続フック
 *
 * 使用例:
 * ```tsx
 * function TerminalScreen() {
 *   const { isConnected, connect, disconnect, sendInput } = useWebSocket({
 *     onOutput: (seq, data) => {
 *       // ターミナルに出力を表示
 *     },
 *   });
 *
 *   useEffect(() => {
 *     connect();
 *     return () => disconnect();
 *   }, []);
 *
 *   return (
 *     // ターミナルUI
 *   );
 * }
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  // 接続状態
  const status = useConnectionStore((state) => state.status);
  const lastSeq = useConnectionStore((state) => state.lastSeq);
  const error = useConnectionStore((state) => state.error);

  // 設定
  const serverUrl = useSettingsStore((state) => state.serverUrl);
  const token = useSettingsStore((state) => state.token);

  // コールバック参照（再レンダリング時に更新されても接続を維持）
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * コールバックを設定
   */
  useEffect(() => {
    wsClient.setCallbacks({
      onOutput: (seq, data) => {
        optionsRef.current.onOutput?.(seq, data);
      },
      onSnapshot: (seq, content) => {
        optionsRef.current.onSnapshot?.(seq, content);
      },
      onClaudeStatus: (status, message) => {
        optionsRef.current.onClaudeStatus?.(status, message);
      },
      onConnected: (sessionId, lastSeq) => {
        console.log(`接続完了: セッション=${sessionId}, lastSeq=${lastSeq}`);
      },
      onDisconnected: (reason) => {
        console.log(`切断: ${reason}`);
      },
      onError: (error) => {
        console.error(`エラー: ${error}`);
      },
      onResyncRequired: () => {
        optionsRef.current.onResyncRequired?.();
      },
    });
  }, []);

  /**
   * 接続
   */
  const connect = useCallback(async () => {
    if (!serverUrl) {
      console.error('サーバーURLが設定されていません');
      return;
    }

    if (!token) {
      console.error('認証トークンが設定されていません');
      return;
    }

    try {
      await wsClient.connect(serverUrl, token);
    } catch (error) {
      console.error('接続失敗:', error);
    }
  }, [serverUrl, token]);

  /**
   * 切断
   */
  const disconnect = useCallback(() => {
    wsClient.disconnect();
  }, []);

  /**
   * 入力を送信
   */
  const sendInput = useCallback((data: string) => {
    wsClient.sendInput(data);
  }, []);

  /**
   * ウィンドウサイズ変更を送信
   */
  const sendResize = useCallback((cols: number, rows: number) => {
    wsClient.sendResize(cols, rows);
  }, []);

  /**
   * Resume要求を送信
   */
  const sendResume = useCallback((fromSeq: number) => {
    wsClient.sendResume(fromSeq);
  }, []);

  return {
    // 状態
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isReconnecting: status === 'reconnecting',
    lastSeq,
    error,

    // 操作
    connect,
    disconnect,
    sendInput,
    sendResize,
    sendResume,
  };
}
