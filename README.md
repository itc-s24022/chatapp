# チャットアプリケーション

Discordライクなチャットアプリケーションです。Firebaseを使用したリアルタイムチャット、ボイスチャンネル、サーバー管理機能を提供します。

## 機能

- 🔥 **リアルタイムチャット**: Firebase Firestoreを使用したリアルタイムメッセージング
- 🎤 **ボイスチャンネル**: WebRTCを使用したピアツーピア音声通信
- 👥 **サーバー管理**: サーバーの作成、削除、メンバー招待
- 🎭 **ロール管理**: 権限ベースのアクセス制御
- 📷 **画像アップロード**: 画像のアップロードと表示
- 👤 **ユーザー管理**: プロフィール管理、フレンド機能

## ボイスチャンネル機能

### 使用方法

1. **ボイスチャンネルの作成**:
   - サーバー内で「ボイスチャンネル」セクションの「+」ボタンをクリック
   - チャンネルタイプで「ボイス」を選択
   - チャンネル名を入力して作成

2. **ボイスチャンネルへの参加**:
   - ボイスチャンネルをクリックすると自動的に参加
   - マイクへのアクセス許可を求められます

3. **ボイスチャンネル内での操作**:
   - 🎤 **ミュート/ミュート解除**: 自分の音声をオン/オフ
   - 🔊 **デフ/デフ解除**: 他の参加者の音声をオン/オフ
   - ❌ **退出**: ボイスチャンネルから退出

### 技術仕様

- **WebRTC**: ピアツーピア音声通信
- **Socket.IO**: シグナリングサーバー
- **STUNサーバー**: GoogleのパブリックSTUNサーバーを使用

## セットアップ

### 必要な環境

- Node.js 16以上
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
# .env.localファイルを作成し、Firebase設定を追加
```

### Firebase設定

`.env.local`ファイルに以下の設定を追加してください：

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 起動方法

1. **Socket.IOサーバーの起動**:
```bash
cd server
node index.js
```

2. **Next.jsアプリケーションの起動**:
```bash
npm run dev
```

3. ブラウザで [http://localhost:3000](http://localhost:3000) にアクセス

## 使用技術

- **フロントエンド**: Next.js, React
- **バックエンド**: Node.js, Socket.IO
- **データベース**: Firebase Firestore
- **認証**: Firebase Authentication
- **ストレージ**: Firebase Storage
- **音声通信**: WebRTC

## ライセンス

MIT License
