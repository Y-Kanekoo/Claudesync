# ClaudeSync

スマホからMacのClaude Codeをリアルタイム操作するP2Pリモートターミナルアプリ

## 概要

ClaudeSyncは、iPhoneやAndroidからMacで動作するClaude Codeを遠隔操作できるアプリケーションです。Tailscale VPNを使用したP2P接続により、安全かつ低遅延なリモートターミナル体験を提供します。

## 特徴

- **リアルタイム操作**: WebSocket経由でミリ秒単位の低遅延通信
- **セッション復元**: 切断時もセッションを維持し、再接続時に自動復元
- **Claude特化UI**: 確認待ちやエラー時の通知、クイックアクションボタン
- **ジェスチャー操作**: スワイプでTab/Ctrl+C、ピンチでフォントサイズ変更
- **安全な接続**: Tailscale経由のP2P通信、6桁ペアリングコードによる認証

## アーキテクチャ

```
┌──────────────────┐         ┌──────────────────┐
│   iPhone/Android │         │       Mac        │
│                  │◄───────►│                  │
│  ClaudeSync App  │  WebSocket  │  ClaudeSync Server │
│  (React Native)  │         │  (Node.js + PTY) │
└──────────────────┘         └──────────────────┘
         │                           │
         │      Tailscale VPN        │
         └───────────────────────────┘
```

## ディレクトリ構成

```
claudesync/
├── server/              # Mac側サーバー
│   └── src/
│       ├── ws/          # WebSocket通信
│       ├── pty/         # PTY管理
│       ├── auth/        # 認証
│       └── claude/      # Claude出力解析
│
└── mobile/              # モバイルアプリ
    └── src/
        ├── app/         # 画面（Expo Router）
        ├── components/  # コンポーネント
        ├── hooks/       # カスタムフック
        ├── stores/      # 状態管理（Zustand）
        └── services/    # サービス
```

## セットアップ

### 前提条件

- Node.js 18以上
- npm または pnpm
- Expo CLI
- Tailscale（両デバイスにインストール済み）

### サーバー（Mac）

```bash
cd server
npm install
npm run dev
```

サーバーが起動すると、Tailscale IPにバインドされます:
```
サーバー起動完了!
  ホスト: 100.x.x.x
  ポート: 3847
  接続URL: ws://100.x.x.x:3847
```

### ペアリングコードの生成

```bash
curl -X POST http://localhost:3847/api/pairing/generate
```

レスポンス:
```json
{
  "success": true,
  "data": {
    "code": "123456",
    "expiresAt": 1234567890
  }
}
```

### モバイルアプリ

```bash
cd mobile
npm install
npx expo start
```

## 使い方

1. Mac側でサーバーを起動
2. ペアリングコードを生成
3. モバイルアプリでサーバーURLとペアリングコードを入力
4. ターミナル画面でClaude Codeを操作

## ジェスチャー

| ジェスチャー | アクション |
|------------|-----------|
| 左スワイプ | Tab（補完） |
| 右スワイプ | Backspace |
| 上スワイプ | 履歴を戻る |
| 下スワイプ | 履歴を進む |
| ダブルタップ | Ctrl+C（中断） |
| 2本指タップ | コマンドパレット表示 |
| ピンチ | フォントサイズ変更 |

## 技術スタック

### サーバー
- Node.js + TypeScript
- Express + WebSocket（ws）
- node-pty（ターミナルエミュレーション）

### モバイル
- React Native + Expo
- xterm.js（WebView内で動作）
- Zustand（状態管理）

## ライセンス

MIT

## 作者

ClaudeSyncチーム
