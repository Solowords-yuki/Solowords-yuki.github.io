#!/usr/bin/env node

/**
 * 統合型Firebaseランキングデータエクスポートスクリプト
 * 
 * このスクリプトは以下を実行します:
 * 1. Firebaseから全スコアデータを取得
 * 2. レベル別・タイプ別にランキング生成
 * 3. 1つのJSONファイル(rankings.json)に統合
 * 4. GitHubリポジトリにコミット
 */

const admin = require('firebase-admin');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

// 設定
const LEVELS = 10; // レベル数
const TOP_COUNT = 100; // 各ランキングのTOP表示数

// Firebase Admin SDK初期化
// サービスアカウントキーは環境変数またはファイルから読み込み
function initializeFirebase() {
    try {
        // 環境変数から設定を読み込み
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else if (fs.existsSync('./firebase-service-account.json')) {
            // ローカルファイルから読み込み(開発環境用)
            const serviceAccount = require('./firebase-service-account.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            console.error('❌ Firebase認証情報が見つかりません');
            console.error('環境変数 FIREBASE_SERVICE_ACCOUNT を設定するか、');
            console.error('firebase-service-account.json ファイルを配置してください');
            process.exit(1);
        }
        
        console.log('✅ Firebase Admin SDK初期化成功');
        return admin.firestore();
    } catch (error) {
        console.error('❌ Firebase初期化エラー:', error);
        process.exit(1);
    }
}

// 全スコアを取得してレベル別・タイプ別にランキング生成
async function generateRankings(db) {
    try {
        console.log('📊 全スコアデータを取得中...');
        
        // ユーザー情報を先に全件取得（効率化）
        const usersSnapshot = await db.collection('users').get();
        const usersMap = {};
        usersSnapshot.forEach(doc => {
            usersMap[doc.id] = doc.data();
        });
        console.log(`✅ ユーザー情報取得: ${Object.keys(usersMap).length}件`);

        // 全スコアを取得
        const scoresSnapshot = await db.collection('scores').get();
        console.log(`✅ スコアデータ取得: ${scoresSnapshot.size}件`);

        // レベル別にスコアを分類
        const levelScores = {};
        for (let i = 1; i <= LEVELS; i++) {
            levelScores[`level${i}`] = [];
        }

        scoresSnapshot.forEach(doc => {
            const data = doc.data();
            const level = data.level;
            
            if (levelScores[level]) {
                const userData = usersMap[data.uid] || {};
                levelScores[level].push({
                    // UID を公開しない（セキュリティ向上）
                    // uid: data.uid,  // ← 削除
                    nickname: userData.nickname || 'ゲスト',
                    time: data.time,
                    moves: data.moves,
                    timestamp: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()
                });
            }
        });

        // 統合データ構造を作成
        const rankings = {
            lastUpdated: new Date().toISOString(),
            levels: {}
        };

        // レベルごとにランキング生成
        for (let i = 1; i <= LEVELS; i++) {
            const levelKey = `level${i}`;
            const scores = levelScores[levelKey];
            
            console.log(`📈 Level ${i} ランキング生成中... (${scores.length}件)`);

            // タイムランキング（昇順）
            const timeRanking = [...scores]
                .sort((a, b) => a.time - b.time)
                .slice(0, TOP_COUNT)
                .map((score, index) => ({
                    rank: index + 1,
                    ...score
                }));

            // 手数ランキング（昇順）
            const movesRanking = [...scores]
                .sort((a, b) => a.moves - b.moves)
                .slice(0, TOP_COUNT)
                .map((score, index) => ({
                    rank: index + 1,
                    ...score
                }));

            rankings.levels[levelKey] = {
                name: `Level ${i}`,
                totalClears: scores.length,
                rankings: {
                    time: timeRanking,
                    moves: movesRanking
                }
            };

            console.log(`✅ Level ${i} 完了 (タイム: ${timeRanking.length}件, 手数: ${movesRanking.length}件)`);
        }

        return rankings;
    } catch (error) {
        console.error('❌ ランキング生成エラー:', error);
        throw error;
    }
}

// JSONファイルに保存
async function saveToFile(filename, data) {
    try {
        const dir = path.join(__dirname, 'ranking-data');
        
        // ディレクトリが存在しない場合は作成
        try {
            await fsPromises.access(dir);
        } catch {
            await fsPromises.mkdir(dir, { recursive: true });
            console.log(`✅ ディレクトリ作成: ${dir}`);
        }
        
        const filepath = path.join(dir, filename);
        await fsPromises.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
        
        const sizeKB = (JSON.stringify(data).length / 1024).toFixed(2);
        console.log(`✅ 保存成功: ${filename} (${sizeKB} KB)`);
    } catch (error) {
        console.error(`❌ 保存失敗 (${filename}):`, error);
        throw error;
    }
}

// メイン処理
async function main() {
    console.log('🚀 統合型ランキングデータエクスポート開始');
    console.log('📅 実行時刻:', new Date().toISOString());
    console.log('📊 対象レベル数:', LEVELS);
    console.log('🏆 各ランキングTOP:', TOP_COUNT);
    console.log('');

    const db = initializeFirebase();
    
    // 統合ランキングデータを生成
    const rankings = await generateRankings(db);
    
    // 1つのJSONファイルに保存
    console.log('');
    console.log('💾 統合ランキングファイルを保存中...');
    await saveToFile('rankings.json', rankings);
    
    console.log('');
    console.log('🎉 エクスポート完了！');
    console.log('📂 データ保存先: ./ranking-data/rankings.json');
    console.log('🌐 公開URL: https://solowords-yuki.github.io/ranking-data/rankings.json');
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
    console.error('❌ 未処理のエラー:', error);
    process.exit(1);
});

// 実行
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('❌ エクスポート失敗:', error);
            process.exit(1);
        });
}
