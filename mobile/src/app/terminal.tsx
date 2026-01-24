/**
 * ターミナル画面
 *
 * xterm.jsを使用したターミナルエミュレータ画面
 * WebSocket経由でMacサーバーと通信
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TerminalView, TerminalViewRef } from '../components/terminal/TerminalView';
import { CommandPalette } from '../components/terminal/CommandPalette';
import { GestureHandler, gestureToInput, GestureType } from '../components/terminal/GestureHandler';
import { useWebSocket } from '../hooks/useWebSocket';
import { useNotification } from '../hooks/useNotification';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * ターミナル画面コンポーネント
 */
export default function TerminalScreen() {
  const router = useRouter();

  // ターミナルビューの参照
  const terminalRef = useRef<TerminalViewRef>(null);

  // 設定
  const { fontSize, updateSettings } = useSettingsStore();

  // コマンドパレットの表示状態
  const [showPalette, setShowPalette] = useState(false);

  // 通知
  const { notifyConfirmation, notifyError, notifyCompleted, requestPermission } = useNotification();

  // WebSocket接続
  const {
    isConnected,
    isConnecting,
    isReconnecting,
    connect,
    disconnect,
    sendInput,
    sendResize,
    sendResume,
    lastSeq,
  } = useWebSocket({
    // ターミナル出力を受信
    onOutput: (seq, data) => {
      terminalRef.current?.write(data);
    },

    // スナップショットを受信（resync時）
    onSnapshot: (seq, content) => {
      terminalRef.current?.reset();
      terminalRef.current?.write(content);
    },

    // Claude状態が変化
    onClaudeStatus: (status, message) => {
      switch (status) {
        case 'waiting_confirmation':
          notifyConfirmation(message || '確認が必要です');
          break;
        case 'error':
          notifyError(message || 'エラーが発生しました');
          break;
        case 'completed':
          notifyCompleted(message || '処理が完了しました');
          break;
      }
    },

    // resyncが必要
    onResyncRequired: () => {
      terminalRef.current?.reset();
      sendResume(0);
    },
  });

  /**
   * 初期化
   */
  useEffect(() => {
    // 通知権限をリクエスト
    requestPermission();

    // 接続を開始
    connect();

    // クリーンアップ
    return () => {
      disconnect();
    };
  }, [connect, disconnect, requestPermission]);

  /**
   * ターミナルが準備完了
   */
  const handleReady = useCallback(
    (cols: number, rows: number) => {
      sendResize(cols, rows);

      // 既存のセッションがあればresume
      if (lastSeq > 0) {
        sendResume(lastSeq);
      }
    },
    [sendResize, sendResume, lastSeq]
  );

  /**
   * ターミナルからの入力
   */
  const handleInput = useCallback(
    (data: string) => {
      sendInput(data);
    },
    [sendInput]
  );

  /**
   * ターミナルのリサイズ
   */
  const handleResize = useCallback(
    (cols: number, rows: number) => {
      sendResize(cols, rows);
    },
    [sendResize]
  );

  /**
   * ジェスチャーの処理
   */
  const handleGesture = useCallback(
    (gesture: GestureType) => {
      // 2本指タップでコマンドパレットを表示
      if (gesture === 'two_finger_tap') {
        setShowPalette((prev) => !prev);
        return;
      }

      // その他のジェスチャーをキー入力に変換
      const input = gestureToInput(gesture);
      if (input) {
        sendInput(input);
      }
    },
    [sendInput]
  );

  /**
   * フォントサイズ変更
   */
  const handleFontSizeChange = useCallback(
    (delta: number) => {
      const newSize = Math.max(10, Math.min(24, fontSize + delta));
      updateSettings({ fontSize: newSize });
    },
    [fontSize, updateSettings]
  );

  /**
   * コマンドパレットからのコマンド
   */
  const handleCommand = useCallback(
    (data: string) => {
      sendInput(data);
    },
    [sendInput]
  );

  /**
   * 接続状態に応じたステータスバーの色
   */
  const getStatusBarColor = () => {
    if (isConnected) return '#30d158';
    if (isConnecting || isReconnecting) return '#ff9f0a';
    return '#ff453a';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusBarColor() }]} />
          <Text style={styles.statusText}>
            {isConnected
              ? '接続中'
              : isConnecting
              ? '接続中...'
              : isReconnecting
              ? '再接続中...'
              : '未接続'}
          </Text>
        </View>

        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsButton}>
          <Text style={styles.settingsButtonText}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* ターミナル */}
      <View style={styles.terminalContainer}>
        <GestureHandler
          onGesture={handleGesture}
          onFontSizeChange={handleFontSizeChange}
        >
          <TerminalView
            ref={terminalRef}
            onInput={handleInput}
            onResize={handleResize}
            onReady={handleReady}
          />
        </GestureHandler>
      </View>

      {/* コマンドパレット */}
      {showPalette && (
        <CommandPalette
          onCommand={handleCommand}
          onClose={() => setShowPalette(false)}
          commandSet="all"
        />
      )}

      {/* ツールバー（コマンドパレットが非表示の場合） */}
      {!showPalette && (
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => setShowPalette(true)}
          >
            <Text style={styles.toolbarButtonText}>コマンド</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => Keyboard.dismiss()}
          >
            <Text style={styles.toolbarButtonText}>キーボードを閉じる</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#0a84ff',
    fontSize: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    color: '#8e8e93',
    fontSize: 20,
  },
  terminalContainer: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    backgroundColor: '#2d2d2d',
    borderTopWidth: 1,
    borderTopColor: '#404040',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 16,
  },
  toolbarButton: {
    backgroundColor: '#404040',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  toolbarButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
});
