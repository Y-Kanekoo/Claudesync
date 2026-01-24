/**
 * ホーム画面
 *
 * アプリのエントリーポイント
 * 接続状態に応じてターミナル画面またはペアリング画面に遷移
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useConnectionStore } from '../stores/connectionStore';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * ホーム画面コンポーネント
 */
export default function HomeScreen() {
  const router = useRouter();

  // 接続状態
  const status = useConnectionStore((state) => state.status);

  // 設定
  const { token, serverUrl, isLoaded, loadSettings } = useSettingsStore();

  /**
   * 設定を読み込み
   */
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /**
   * 接続済みならターミナル画面に遷移
   */
  useEffect(() => {
    if (isLoaded && token && serverUrl) {
      router.replace('/terminal');
    }
  }, [isLoaded, token, serverUrl, router]);

  // 設定読み込み中
  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#0a84ff" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>ClaudeSync</Text>
        <Text style={styles.subtitle}>スマホからMacのClaude Codeを操作</Text>
      </View>

      {/* メインコンテンツ */}
      <View style={styles.content}>
        {/* 接続状態表示 */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
          <Text style={styles.statusText}>{getStatusText(status)}</Text>
        </View>

        {/* サーバー情報 */}
        {serverUrl && (
          <View style={styles.serverInfo}>
            <Text style={styles.serverLabel}>接続先:</Text>
            <Text style={styles.serverUrl}>{serverUrl}</Text>
          </View>
        )}

        {/* アクションボタン */}
        <View style={styles.actions}>
          {!token ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/pairing')}
            >
              <Text style={styles.primaryButtonText}>ペアリングを開始</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/terminal')}
              >
                <Text style={styles.primaryButtonText}>ターミナルを開く</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/pairing')}
              >
                <Text style={styles.secondaryButtonText}>再ペアリング</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* フッター */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Text style={styles.footerLink}>設定</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * 接続状態に応じた色を取得
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'connected':
      return '#30d158'; // 緑
    case 'connecting':
    case 'reconnecting':
      return '#ff9f0a'; // オレンジ
    case 'disconnected':
    default:
      return '#ff453a'; // 赤
  }
}

/**
 * 接続状態のテキストを取得
 */
function getStatusText(status: string): string {
  switch (status) {
    case 'connected':
      return '接続中';
    case 'connecting':
      return '接続しています...';
    case 'reconnecting':
      return '再接続中...';
    case 'disconnected':
    default:
      return '未接続';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    padding: 24,
  },
  loadingText: {
    color: '#8e8e93',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    marginTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
    marginTop: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 18,
  },
  serverInfo: {
    marginBottom: 32,
    alignItems: 'center',
  },
  serverLabel: {
    color: '#8e8e93',
    fontSize: 14,
  },
  serverUrl: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 4,
    fontFamily: 'Menlo',
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#0a84ff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#2c2c2e',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0a84ff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  footerLink: {
    color: '#0a84ff',
    fontSize: 16,
  },
});
