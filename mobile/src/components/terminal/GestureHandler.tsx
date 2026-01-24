/**
 * ジェスチャーハンドラーコンポーネント
 *
 * ターミナル操作のためのジェスチャーを処理
 * スワイプ、ピンチ、タップなどのジェスチャーをサポート
 */

import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../../stores/settingsStore';

/**
 * ジェスチャーの種類
 */
export type GestureType =
  | 'swipe_left'    // 左スワイプ → Tab
  | 'swipe_right'   // 右スワイプ → Backspace
  | 'swipe_up'      // 上スワイプ → ↑
  | 'swipe_down'    // 下スワイプ → ↓
  | 'double_tap'    // ダブルタップ → Ctrl+C
  | 'two_finger_tap' // 2本指タップ → コマンドパレット
  | 'pinch_in'      // ピンチイン → フォントサイズ縮小
  | 'pinch_out';    // ピンチアウト → フォントサイズ拡大

/**
 * ジェスチャーハンドラーのプロパティ
 */
interface GestureHandlerProps {
  children: React.ReactNode;
  // ジェスチャーが検出されたときのコールバック
  onGesture: (gesture: GestureType) => void;
  // フォントサイズ変更時のコールバック
  onFontSizeChange?: (delta: number) => void;
  // ジェスチャーを有効にするかどうか
  enabled?: boolean;
}

// ジェスチャー検出の閾値
const SWIPE_THRESHOLD = 50;  // スワイプの最小距離
const SWIPE_VELOCITY = 0.3;  // スワイプの最小速度
const DOUBLE_TAP_DELAY = 300; // ダブルタップの最大間隔（ミリ秒）

/**
 * ジェスチャーハンドラーコンポーネント
 *
 * 使用例:
 * ```tsx
 * <GestureHandler
 *   onGesture={(gesture) => {
 *     if (gesture === 'swipe_left') {
 *       sendInput('\t'); // Tab
 *     } else if (gesture === 'double_tap') {
 *       sendInput('\x03'); // Ctrl+C
 *     }
 *   }}
 *   onFontSizeChange={(delta) => {
 *     setFontSize(prev => prev + delta);
 *   }}
 * >
 *   <TerminalView />
 * </GestureHandler>
 * ```
 */
export function GestureHandler({
  children,
  onGesture,
  onFontSizeChange,
  enabled = true,
}: GestureHandlerProps) {
  // 設定を取得
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);

  // 最後のタップ時刻（ダブルタップ検出用）
  const lastTapTime = useRef(0);
  // タッチ開始位置
  const startPosition = useRef({ x: 0, y: 0 });
  // ピンチ開始距離
  const initialPinchDistance = useRef(0);

  /**
   * 触覚フィードバックを実行
   */
  const triggerHaptic = useCallback(async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [hapticFeedback]);

  /**
   * 2点間の距離を計算
   */
  const getDistance = (touches: { pageX: number; pageY: number }[]) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  /**
   * PanResponderを作成
   */
  const panResponder = useRef(
    PanResponder.create({
      // タッチを開始するかどうか
      onStartShouldSetPanResponder: () => enabled,
      onMoveShouldSetPanResponder: () => enabled,

      // タッチ開始
      onPanResponderGrant: (event: GestureResponderEvent) => {
        const { pageX, pageY } = event.nativeEvent;
        startPosition.current = { x: pageX, y: pageY };

        // 2本指タップの検出
        if (event.nativeEvent.touches.length === 2) {
          const touches = Array.from(event.nativeEvent.touches);
          initialPinchDistance.current = getDistance(touches);
          triggerHaptic();
          onGesture('two_finger_tap');
          return;
        }

        // ダブルタップの検出
        const now = Date.now();
        if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
          triggerHaptic();
          onGesture('double_tap');
          lastTapTime.current = 0; // リセット
        } else {
          lastTapTime.current = now;
        }
      },

      // タッチ移動
      onPanResponderMove: (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        // ピンチジェスチャーの検出
        if (event.nativeEvent.touches.length === 2) {
          const touches = Array.from(event.nativeEvent.touches);
          const currentDistance = getDistance(touches);
          const delta = currentDistance - initialPinchDistance.current;

          if (Math.abs(delta) > 20) {
            if (delta > 0) {
              onFontSizeChange?.(1);
            } else {
              onFontSizeChange?.(-1);
            }
            initialPinchDistance.current = currentDistance;
            triggerHaptic();
          }
        }
      },

      // タッチ終了
      onPanResponderRelease: (
        _event: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const { dx, dy, vx, vy } = gestureState;

        // スワイプの検出
        const isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);

        if (isHorizontalSwipe) {
          // 水平スワイプ
          if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(vx) > SWIPE_VELOCITY) {
            if (dx > 0) {
              triggerHaptic();
              onGesture('swipe_right');
            } else {
              triggerHaptic();
              onGesture('swipe_left');
            }
          }
        } else {
          // 垂直スワイプ
          if (Math.abs(dy) > SWIPE_THRESHOLD && Math.abs(vy) > SWIPE_VELOCITY) {
            if (dy > 0) {
              triggerHaptic();
              onGesture('swipe_down');
            } else {
              triggerHaptic();
              onGesture('swipe_up');
            }
          }
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

/**
 * ジェスチャーをキー入力にマッピング
 */
export function gestureToInput(gesture: GestureType): string | null {
  switch (gesture) {
    case 'swipe_left':
      return '\t'; // Tab
    case 'swipe_right':
      return '\x7f'; // Backspace
    case 'swipe_up':
      return '\x1b[A'; // ↑
    case 'swipe_down':
      return '\x1b[B'; // ↓
    case 'double_tap':
      return '\x03'; // Ctrl+C
    default:
      return null;
  }
}
