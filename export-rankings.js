#!/usr/bin/env node

/**
 * Firebaseランキングデータエクスポートスクリプト
 * 
 * このスクリプトは以下を実行します:
 * 1. Firebaseからランキングデータを取得
 * 2. JSON形式でファイルに保存
 * 3. GitHubリポジトリにコミット（GitHub Actionsと連携）
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

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
            // ローカルファイルから読み込み（開発環境用）
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

// タイムランキングを取得
async function getTimeRanking(db, level, limit = 10) {
    try {
        const levelStr = `level${level}`;
        const snapshot = await db.collection('scores')
            .where('level', '==', levelStr)
            .orderBy('time', 'asc')
            .limit(limit)
            .get();

        const rankings = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // ユーザー情報を取得
            const userDoc = await db.collection('users').doc(data.uid).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            
            rankings.push({
                uid: data.uid,
                nickname: userData.nickname || 'ゲスト',
                time: data.time,
                moves: data.moves,
                createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
            });
        }

        return rankings;
    } catch (error) {
        console.error(`❌ Level ${level} タイムランキング取得エラー:`, error);
        return [];
    }
}

// 手数ランキングを取得
async function getMovesRanking(db, level, limit = 10) {
    try {
        const levelStr = `level${level}`;
        const snapshot = await db.collection('scores')
            .where('level', '==', levelStr)
            .orderBy('moves', 'asc')
            .limit(limit)
            .get();

        const rankings = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // ユーザー情報を取得
            const userDoc = await db.collection('users').doc(data.uid).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            
            rankings.push({
                uid: data.uid,
                nickname: userData.nickname || 'ゲスト',
                time: data.time,
                moves: data.moves,
                createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
            });
        }

        return rankings;
    } catch (error) {
        console.error(`❌ Level ${level} 手数ランキング取得エラー:`, error);
        return [];
    }
}

// レベル統計を取得
async function getLevelStats(db, level) {
    try {
        const levelStr = `level${level}`;
        const doc = await db.collection('levelStats').doc(levelStr).get();
        
        if (doc.exists) {
            const data = doc.data();
            return {
                clearCount: data.clearCount || 0,
                fastestTime: data.fastestTime || null,
                fewestMoves: data.fewestMoves || null,
                updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null
            };
        }
        
        return null;
    } catch (error) {
        console.error(`❌ Level ${level} 統計取得エラー:`, error);
        return null;
    }
}

// JSONファイルに保存
async function saveToFile(filename, data) {
    try {
        const dir = path.join(__dirname, 'ranking-data');
        
        // ディレクトリが存在しない場合は作成
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
        
        const filepath = path.join(dir, filename);
        await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
        
        console.log(`✅ 保存成功: ${filename}`);
    } catch (error) {
        console.error(`❌ 保存失敗 (${filename}):`, error);
    }
}

// メイン処理
async function main() {
    console.log('🚀 ランキングデータエクスポート開始');
    console.log('📅 実行時刻:', new Date().toISOString());
    console.log('');

    const db = initializeFirebase();
    
    // レベル1〜10までのデータを取得
    for (let level = 1; level <= 10; level++) {
        console.log(`📊 Level ${level} 処理中...`);
        
        // タイムランキング
        const timeRanking = await getTimeRanking(db, level);
        await saveToFile(`time-ranking-level${level}.json`, {
            level: level,
            type: 'time',
            rankings: timeRanking,
            exportedAt: new Date().toISOString()
        });
        
        // 手数ランキング
        const movesRanking = await getMovesRanking(db, level);
        await saveToFile(`moves-ranking-level${level}.json`, {
            level: level,
            type: 'moves',
            rankings: movesRanking,
            exportedAt: new Date().toISOString()
        });
        
        // レベル統計
        const stats = await getLevelStats(db, level);
        await saveToFile(`level-stats-level${level}.json`, {
            level: level,
            stats: stats,
            exportedAt: new Date().toISOString()
        });
        
        console.log(`✅ Level ${level} 完了\n`);
    }
    
    // 全体統計を作成
    console.log('📈 全体統計を作成中...');
    const summary = {
        totalLevels: 10,
        exportedAt: new Date().toISOString(),
        levels: []
    };
    
    for (let level = 1; level <= 10; level++) {
        const stats = await getLevelStats(db, level);
        summary.levels.push({
            level: level,
            stats: stats
        });
    }
    
    await saveToFile('summary.json', summary);
    
    console.log('');
    console.log('🎉 エクスポート完了！');
    console.log('📂 データ保存先: ./ranking-data/');
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

module.exports = { main, getTimeRanking, getMovesRanking, getLevelStats };
