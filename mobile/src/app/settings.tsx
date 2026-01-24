/**
 * 設定画面
 *
 * アプリの各種設定を変更する画面
 * 表示設定、通知設定、接続設定など
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettingsStore } from '../stores/settingsStore';
import { useConnectionStore } from '../stores/connectionStore';

/**
 * 設定画面コンポーネント
 */
export default function SettingsScreen() {
  const router = useRouter();

  // 設定ストア
  const {
    fontSize,
    theme,
    notifyOnConfirmation,
    notifyOnError,
    notifyOnComplete,
    hapticFeedback,
    serverUrl,
    token,
    updateSettings,
    resetSettings,
  } = useSettingsStore();

  // 接続ストア
  const connectionStatus = useConnectionStore((state) => state.status);
  const resetConnection = useConnectionStore((state) => state.reset);

  /**
   * フォントサイズを変更
   */
  const changeFontSize = (delta: number) => {
    const newSize = Math.max(10, Math.min(24, fontSize + delta));
    updateSettings({ fontSize: newSize });
  };

  /**
   * テーマを切り替え
   */
  const toggleTheme = () => {
    updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' });
  };

  /**
   * 接続をリセット
   */
  const handleResetConnection = () => {
    Alert.alert(
      '接続をリセット',
      'トークンとサーバー情報を削除します。再度ペアリングが必要になります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: () => {
            updateSettings({ token: null, serverUrl: '' });
            resetConnection();
            router.replace('/');
          },
        },
      ]
    );
  };

  /**
   * すべての設定をリセット
   */
  const handleResetAll = () => {
    Alert.alert(
      'すべての設定をリセット',
      'すべての設定をデフォルトに戻します。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: () => {
            resetSettings();
            resetConnection();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="light" />

      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>設定</Text>
      </View>

      {/* 接続情報 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>接続情報</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>ステータス</Text>
          <Text style={styles.infoValue}>{getStatusText(connectionStatus)}</Text>
        </View>

        {serverUrl && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>サーバー</Text>
            <Text style={styles.infoValueMono}>{serverUrl}</Text>
          </View>
        )}

        {token && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>トークン</Text>
            <Text style={styles.infoValueMono}>{token.substring(0, 8)}...</Text>
          </View>
        )}
      </View>

      {/* 表示設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>表示設定</Text>

        {/* フォントサイズ */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>フォントサイズ</Text>
          <View style={styles.fontSizeControls}>
            <TouchableOpacity
              style={styles.fontSizeButton}
              onPress={() => changeFontSize(-1)}
            >
              <Text style={styles.fontSizeButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.fontSizeValue}>{fontSize}</Text>
            <TouchableOpacity
              style={styles.fontSizeButton}
              onPress={() => changeFontSize(1)}
            >
              <Text style={styles.fontSizeButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* テーマ */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>テーマ</Text>
          <TouchableOpacity style={styles.themeButton} onPress={toggleTheme}>
            <Text style={styles.themeButtonText}>
              {theme === 'dark' ? 'ダーク' : 'ライト'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 通知設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>通知設定</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>確認待ち時に通知</Text>
          <Switch
            value={notifyOnConfirmation}
            onValueChange={(value) => updateSettings({ notifyOnConfirmation: value })}
            trackColor={{ false: '#3a3a3c', true: '#30d158' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>エラー時に通知</Text>
          <Switch
            value={notifyOnError}
            onValueChange={(value) => updateSettings({ notifyOnError: value })}
            trackColor={{ false: '#3a3a3c', true: '#30d158' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>完了時に通知</Text>
          <Switch
            value={notifyOnComplete}
            onValueChange={(value) => updateSettings({ notifyOnComplete: value })}
            trackColor={{ false: '#3a3a3c', true: '#30d158' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>触覚フィードバック</Text>
          <Switch
            value={hapticFeedback}
            onValueChange={(value) => updateSettings({ hapticFeedback: value })}
            trackColor={{ false: '#3a3a3c', true: '#30d158' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* 危険なアクション */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>その他</Text>

        <TouchableOpacity style={styles.dangerButton} onPress={handleResetConnection}>
          <Text style={styles.dangerButtonText}>接続をリセット</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={handleResetAll}>
          <Text style={styles.dangerButtonText}>すべての設定をリセット</Text>
        </TouchableOpacity>
      </View>

      {/* バージョン情報 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>ClaudeSync v1.0.0</Text>
      </View>
    </ScrollView>
  );
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
  },
  header: {
    marginTop: 60,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: '#0a84ff',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  infoLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
  infoValue: {
    color: '#8e8e93',
    fontSize: 16,
  },
  infoValueMono: {
    color: '#8e8e93',
    fontSize: 14,
    fontFamily: 'Menlo',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  fontSizeButton: {
    width: 36,
    height: 36,
    backgroundColor: '#404040',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  fontSizeValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'center',
  },
  themeButton: {
    backgroundColor: '#404040',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  themeButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
  dangerButton: {
    backgroundColor: 'rgba(255, 69, 58, 0.2)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  dangerButtonText: {
    color: '#ff453a',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    color: '#8e8e93',
    fontSize: 14,
  },
});
