/**
 * ペアリング画面
 *
 * Macサーバーとのペアリングを行う画面
 * サーバーURLを入力し、ペアリングコードを使って認証
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * ペアリング画面コンポーネント
 */
export default function PairingScreen() {
  const router = useRouter();

  // 設定ストア
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  // フォーム状態
  const [serverUrl, setServerUrl] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * ペアリングを実行
   */
  const handlePairing = async () => {
    // バリデーション
    if (!serverUrl.trim()) {
      setError('サーバーURLを入力してください');
      return;
    }

    if (!pairingCode.trim() || pairingCode.length !== 6) {
      setError('6桁のペアリングコードを入力してください');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // HTTPSかHTTPのURLを構築
      const httpUrl = serverUrl.startsWith('ws://')
        ? serverUrl.replace('ws://', 'http://')
        : serverUrl.startsWith('wss://')
        ? serverUrl.replace('wss://', 'https://')
        : serverUrl.startsWith('http')
        ? serverUrl
        : `http://${serverUrl}`;

      // ペアリングAPIを呼び出し
      const response = await fetch(`${httpUrl}/api/pairing/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: pairingCode,
          deviceName: Platform.OS === 'ios' ? 'iPhone' : 'Android',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'ペアリングに失敗しました');
      }

      // トークンを保存
      const wsUrl = httpUrl.replace('http://', 'ws://').replace('https://', 'wss://');
      updateSettings({
        serverUrl: wsUrl,
        token: data.data.token,
      });

      // 成功メッセージ
      Alert.alert('ペアリング成功', 'Macとの接続が完了しました', [
        {
          text: 'OK',
          onPress: () => router.replace('/terminal'),
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ペアリングに失敗しました';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />

      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ペアリング</Text>
      </View>

      {/* 説明 */}
      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>Mac側の設定</Text>
        <Text style={styles.instructionText}>
          1. Macでサーバーを起動{'\n'}
          2. ペアリングコードを生成:{'\n'}
          {'   '}curl -X POST http://localhost:3847/api/pairing/generate{'\n'}
          3. 表示されたコードを入力
        </Text>
      </View>

      {/* フォーム */}
      <View style={styles.form}>
        {/* サーバーURL */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>サーバーURL</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="100.x.x.x:3847"
            placeholderTextColor="#8e8e93"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        {/* ペアリングコード */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>ペアリングコード（6桁）</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={pairingCode}
            onChangeText={(text) => setPairingCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="000000"
            placeholderTextColor="#8e8e93"
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        {/* エラーメッセージ */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ペアリングボタン */}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handlePairing}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>ペアリング</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    padding: 24,
  },
  header: {
    marginTop: 60,
    marginBottom: 24,
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
  instructions: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  instructionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionText: {
    color: '#8e8e93',
    fontSize: 14,
    fontFamily: 'Menlo',
    lineHeight: 22,
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    color: '#8e8e93',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Menlo',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 69, 58, 0.2)',
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: '#ff453a',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#0a84ff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
