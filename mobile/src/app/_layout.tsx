/**
 * アプリのルートレイアウト
 *
 * Expo Routerを使用したナビゲーションの設定
 * 共通のプロバイダーやテーマを適用
 */

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * ルートレイアウトコンポーネント
 *
 * アプリ全体に適用されるレイアウト
 * 画面遷移のアニメーションや共通スタイルを定義
 */
export default function RootLayout() {
  // 設定を読み込み
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          // ヘッダーを非表示（各画面で独自のヘッダーを使用）
          headerShown: false,
          // 画面遷移アニメーション
          animation: 'slide_from_right',
          // 背景色
          contentStyle: {
            backgroundColor: '#1c1c1e',
          },
        }}
      >
        {/* ホーム画面 */}
        <Stack.Screen name="index" />

        {/* ペアリング画面 */}
        <Stack.Screen
          name="pairing"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />

        {/* ターミナル画面 */}
        <Stack.Screen name="terminal" />

        {/* 設定画面 */}
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </>
  );
}
