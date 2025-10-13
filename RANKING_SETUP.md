# ソロワーズ ランキング機能 セットアップガイド

## 📋 概要

このプロジェクトは、Webパズルゲーム「ソロワーズ」にオンラインランキング機能を追加したものです。

## 🚀 実装された機能

### 1. Firebase認証
- **匿名認証**: 端末固有のIDで記録を保存（端末変更時にリセット）
- **Googleログイン**: Googleアカウントで記録を永続化（どの端末でも復元可能）
- **アカウントアップグレード**: 匿名→Googleへの移行が可能

### 2. オンラインランキング
- **タイムランキング**: レベルごとの最速クリアタイムTOP10
- **手数ランキング**: レベルごとの最少手数TOP10
- **レベル統計**: クリア人数、最速タイム、最少手数を表示

### 3. ユーザーデータ管理
- ニックネーム設定
- クリア済みレベル記録
- ベストタイム・ベスト手数の保存

### 4. セキュリティ
- Firestoreセキュリティルール実装
- 基本的なバリデーション（タイム・手数の範囲チェック）

## 📦 実装ファイル

| ファイル名 | 説明 |
|-----------|------|
| `firebase-config.js` | Firebase初期化設定 |
| `firebase-auth.js` | 認証管理クラス |
| `firebase-db.js` | Firestoreデータベース管理クラス |
| `ranking-manager.js` | ランキング機能の統合スクリプト |
| `firestore.rules` | Firestoreセキュリティルール |
| `index.html` | ランキング画面のUI追加 |
| `style.css` | ランキング機能のスタイル追加 |
| `game3.js` | ゲームロジックへの統合 |

## 🔧 セットアップ手順

### ステップ1: Firebaseプロジェクト作成

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: solowords-ranking）
4. Googleアナリティクスは任意で設定

### ステップ2: Firebase Authentication設定

1. Firebase Consoleで「Authentication」を選択
2. 「始める」をクリック
3. **匿名認証を有効化**:
   - 「Sign-in method」タブを開く
   - 「匿名」を選択して有効化
4. **Googleログインを有効化**:
   - 「Sign-in method」タブで「Google」を選択
   - トグルを有効にして保存

### ステップ3: Cloud Firestore設定

1. Firebase Consoleで「Firestore Database」を選択
2. 「データベースの作成」をクリック
3. **本番環境モード**を選択
4. リージョンを選択（例: asia-northeast1）

### ステップ4: Firebase Web SDK設定を取得

1. Firebase Consoleのプロジェクト設定（⚙️アイコン）を開く
2. 「マイアプリ」セクションで「ウェブアプリを追加」をクリック
3. アプリのニックネームを入力
4. 表示された設定情報をコピー

### ステップ5: firebase-config.jsを更新

`firebase-config.js`ファイルを開き、取得した設定情報を貼り付けます:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### ステップ6: Firestoreセキュリティルールのデプロイ

#### 方法1: Firebase Consoleから設定（推奨）

1. Firebase Consoleで「Firestore Database」を開く
2. 「ルール」タブを選択
3. `firestore.rules`ファイルの内容をコピー＆ペースト
4. 「公開」ボタンをクリック

#### 方法2: Firebase CLIを使用

```bash
# Firebase CLIをインストール（初回のみ）
npm install -g firebase-tools

# Firebaseにログイン
firebase login

# プロジェクトを初期化
firebase init firestore

# ルールをデプロイ
firebase deploy --only firestore:rules
```

### ステップ7: Firestoreインデックス作成

ランキング機能を正常に動作させるために、以下のインデックスを作成します:

1. Firebase Consoleで「Firestore Database」→「インデックス」タブを開く
2. 以下のインデックスを追加:

**scoresコレクション用インデックス1（タイムランキング用）**
- コレクションID: `scores`
- フィールド1: `level` (昇順)
- フィールド2: `time` (昇順)
- クエリスコープ: コレクション

**scoresコレクション用インデックス2（手数ランキング用）**
- コレクションID: `scores`
- フィールド1: `level` (昇順)
- フィールド2: `moves` (昇順)
- クエリスコープ: コレクション

> **注**: インデックスは自動的に作成されることもあります。エラーメッセージにリンクが表示された場合は、そのリンクから自動作成できます。

### ステップ8: 動作確認

1. Webサーバーでアプリケーションを起動
2. メインメニューから「📊 記録」を選択
3. 「オンラインランキング」タブに切り替え
4. 「ログイン」ボタンをクリックして認証をテスト
5. ゲームをプレイしてクリア後、ランキングに反映されることを確認

## 📊 データ構造

### users/{uid}
```javascript
{
  nickname: "ユーザー名",
  clearedLevels: ["level1", "level2"],
  bestTimes: {
    "level1": 45,
    "level2": 120
  },
  bestMoves: {
    "level1": 20,
    "level2": 35
  },
  isAnonymous: true,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### scores/{autoId}
```javascript
{
  uid: "ユーザーID",
  level: "level1",
  time: 45,
  moves: 20,
  createdAt: Timestamp
}
```

### levelStats/{levelId}
```javascript
{
  clearCount: 100,
  fastestTime: 30,
  fewestMoves: 15,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## 🔐 セキュリティ対策

### 現在実装されている対策

1. **認証チェック**: 
   - スコア保存は認証済みユーザーのみ可能
   - ユーザーデータの更新は本人のみ可能

2. **バリデーション**:
   - タイムの範囲チェック（0秒 < time < 24時間）
   - 手数の範囲チェック（0手 < moves < 10000手）
   - ニックネームの長さ制限（最大20文字）

3. **データ整合性**:
   - スコアデータは作成後の更新・削除不可
   - 必須フィールドのチェック

### 将来的な強化案

1. **Cloud Functions実装**:
   - 不自然なスコアの自動検出
   - レート制限（短時間での大量投稿防止）
   - スコアの統計的検証

2. **クライアント側の追加検証**:
   - ゲームプレイ時間の記録
   - 操作ログの保存

## 🐛 トラブルシューティング

### ランキングが表示されない

**原因**: Firestoreインデックスが未作成
**解決方法**: ステップ7を確認してインデックスを作成

### ログインできない

**原因**: Firebase Authenticationが有効化されていない
**解決方法**: ステップ2を確認して匿名認証とGoogleログインを有効化

### スコアが保存されない

**原因**: Firestoreセキュリティルールが正しく設定されていない
**解決方法**: ステップ6を確認してセキュリティルールをデプロイ

### Firebase初期化エラー

**原因**: `firebase-config.js`の設定が正しくない
**解決方法**: ステップ4-5を確認して設定情報を再度取得・設定

## 📝 使い方

### プレイヤー向け

1. **ゲームを開始**: メインメニューから「プレイ」を選択
2. **クリア後**: 自動的にローカル記録が保存されます
3. **ランキング参加**: 「ログイン」してオンラインランキングに参加
4. **記録確認**: メインメニュー→「📊 記録」でランキングを確認

### 開発者向け

- **ローカルテスト**: `firebase emulators:start`でエミュレーター起動
- **ログ確認**: ブラウザのデベロッパーツールでコンソールを確認
- **データ確認**: Firebase Consoleで直接データを確認可能

## 📞 サポート

問題が発生した場合は、以下を確認してください:

1. ブラウザのコンソールログ
2. Firebase Consoleのログ
3. セキュリティルールの設定
4. インデックスの作成状況

## 🎉 完了！

これでランキング機能が使えるようになりました。ゲームをプレイして、友達とスコアを競い合いましょう！
