/**
 * ターミナルビューコンポーネント
 *
 * xterm.jsをWebViewで表示するターミナルコンポーネント
 * React NativeとWebView間でメッセージをやり取りして
 * 入力の送信と出力の表示を行う
 */

import React, { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSettingsStore } from '../../stores/settingsStore';

// xterm.htmlの内容（バンドル時にインライン化）
const XTERM_HTML = require('../../assets/xterm/xterm.html');

/**
 * ターミナルビューのプロパティ
 */
interface TerminalViewProps {
  // 入力データが送信されたときのコールバック
  onInput?: (data: string) => void;
  // ターミナルサイズが変更されたときのコールバック
  onResize?: (cols: number, rows: number) => void;
  // ターミナルが準備完了したときのコールバック
  onReady?: (cols: number, rows: number) => void;
}

/**
 * ターミナルビューの公開メソッド
 */
export interface TerminalViewRef {
  // ターミナルに出力を書き込む
  write: (data: string | ArrayBuffer) => void;
  // ターミナルをクリア
  clear: () => void;
  // ターミナルをリセット
  reset: () => void;
  // フォーカスを設定
  focus: () => void;
  // フォーカスを解除
  blur: () => void;
}

/**
 * ターミナルビューコンポーネント
 *
 * 使用例:
 * ```tsx
 * function TerminalScreen() {
 *   const terminalRef = useRef<TerminalViewRef>(null);
 *
 *   const handleOutput = (data: ArrayBuffer) => {
 *     const text = new TextDecoder().decode(data);
 *     terminalRef.current?.write(text);
 *   };
 *
 *   return (
 *     <TerminalView
 *       ref={terminalRef}
 *       onInput={(data) => sendToServer(data)}
 *       onResize={(cols, rows) => sendResizeToServer(cols, rows)}
 *     />
 *   );
 * }
 * ```
 */
export const TerminalView = forwardRef<TerminalViewRef, TerminalViewProps>(
  ({ onInput, onResize, onReady }, ref) => {
    // WebViewの参照
    const webViewRef = useRef<WebView>(null);

    // 設定を取得
    const fontSize = useSettingsStore((state) => state.fontSize);
    const theme = useSettingsStore((state) => state.theme);

    /**
     * WebViewにメッセージを送信
     */
    const sendToWebView = useCallback((type: string, payload?: unknown) => {
      const message = JSON.stringify({ type, payload });
      webViewRef.current?.injectJavaScript(`
        window.postMessage(${JSON.stringify(message)}, '*');
        true;
      `);
    }, []);

    /**
     * 公開メソッドを定義
     */
    useImperativeHandle(ref, () => ({
      write: (data: string | ArrayBuffer) => {
        let text: string;
        if (data instanceof ArrayBuffer) {
          text = new TextDecoder().decode(data);
        } else {
          text = data;
        }
        sendToWebView('write', { data: text });
      },
      clear: () => {
        sendToWebView('clear');
      },
      reset: () => {
        sendToWebView('reset');
      },
      focus: () => {
        sendToWebView('focus');
      },
      blur: () => {
        sendToWebView('blur');
      },
    }), [sendToWebView]);

    /**
     * 設定が変更されたらWebViewに通知
     */
    useEffect(() => {
      sendToWebView('config', { fontSize, theme });
    }, [fontSize, theme, sendToWebView]);

    /**
     * WebViewからのメッセージを処理
     */
    const handleMessage = useCallback((event: WebViewMessageEvent) => {
      try {
        const message = JSON.parse(event.nativeEvent.data);
        const { type, payload } = message;

        switch (type) {
          case 'input':
            // ユーザーの入力をコールバックに渡す
            onInput?.(payload.data);
            break;

          case 'resize':
            // サイズ変更をコールバックに渡す
            onResize?.(payload.cols, payload.rows);
            break;

          case 'ready':
            // 準備完了をコールバックに渡す
            onReady?.(payload.cols, payload.rows);
            break;
        }
      } catch (error) {
        console.error('WebViewメッセージ処理エラー:', error);
      }
    }, [onInput, onResize, onReady]);

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={XTERM_HTML}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleMessage}
          // キーボード表示時にスクロールしない
          scrollEnabled={false}
          // バウンスを無効化
          bounces={false}
          // ズームを無効化
          scalesPageToFit={false}
          // セキュリティ設定
          allowFileAccess={false}
          allowUniversalAccessFromFileURLs={false}
        />
      </View>
    );
  }
);

TerminalView.displayName = 'TerminalView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
