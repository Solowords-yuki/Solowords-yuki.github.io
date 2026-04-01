// Firestoreデータベース管理クラス
class FirebaseDB {
    constructor() {
        this.db = db;
    }

    // ユーザーデータ取得
    async getUserData(uid) {
        try {
            const userRef = this.db.collection('users').doc(uid);
            const doc = await userRef.get();
            
            if (doc.exists) {
                return doc.data();
            }
            return null;
        } catch (error) {
            console.error('❌ ユーザーデータ取得失敗:', error);
            return null;
        }
    }

    // レベルクリア時のスコア保存
    async saveScore(uid, level, time, moves) {
        try {
            // バリデーション
            if (!uid || level === undefined || time <= 0 || moves <= 0) {
                throw new Error('無効なデータ');
            }

            const userRef = this.db.collection('users').doc(uid);
            const userData = await this.getUserData(uid);
            
            if (!userData) {
                throw new Error('ユーザーデータが見つかりません');
            }

            // イベントマップやクリエイトモードの場合は文字列のまま使用
            const levelStr = typeof level === 'string' ? level : `level${level}`;
            let isNewTimeRecord = false;
            let isNewMovesRecord = false;

            // ベストタイム更新チェック
            const currentBestTime = userData.bestTimes?.[levelStr];
            if (!currentBestTime || time < currentBestTime) {
                isNewTimeRecord = true;
            }

            // ベスト手数更新チェック
            const currentBestMoves = userData.bestMoves?.[levelStr];
            if (!currentBestMoves || moves < currentBestMoves) {
                isNewMovesRecord = true;
            }

            // ★新記録時のみFirebaseに書き込み（コスト削減）
            if (isNewTimeRecord || isNewMovesRecord) {
                const updateData = {
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // クリア済みレベルに追加
                if (!userData.clearedLevels || !userData.clearedLevels.includes(levelStr)) {
                    updateData.clearedLevels = firebase.firestore.FieldValue.arrayUnion(levelStr);
                }

                // ベストタイム更新
                if (isNewTimeRecord) {
                    updateData[`bestTimes.${levelStr}`] = time;
                }

                // ベスト手数更新
                if (isNewMovesRecord) {
                    updateData[`bestMoves.${levelStr}`] = moves;
                }

                // ユーザーデータ更新
                await userRef.update(updateData);

                // スコアコレクションに保存（ランキング用）
                await this.db.collection('scores').add({
                    uid: uid,
                    level: levelStr,
                    time: time,
                    moves: moves,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                console.log('✅ 新記録を保存:', { 
                    level: levelStr, 
                    time, 
                    moves, 
                    isNewTimeRecord, 
                    isNewMovesRecord
                });
            } else {
                console.log('ℹ️ 新記録なし（Firebase書き込みスキップ）:', { 
                    level: levelStr, 
                    time, 
                    moves 
                });
            }
            
            return { isNewTimeRecord, isNewMovesRecord };
        } catch (error) {
            console.error('❌ スコア保存失敗:', error);
            throw error;
        }
    }

    // タイムランキング取得
    async getTimeRanking(level, limit = 10) {
        try {
            // イベントマップやクリエイトモードの場合は文字列のまま使用
            const levelStr = typeof level === 'string' ? level : `level${level}`;
            const snapshot = await this.db.collection('scores')
                .where('level', '==', levelStr)
                .orderBy('time', 'asc')
                .limit(limit)
                .get();

            const rankings = [];
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const userData = await this.getUserData(data.uid);
                
                rankings.push({
                    uid: data.uid,
                    nickname: userData?.nickname || 'ゲスト',
                    time: data.time,
                    moves: data.moves,
                    createdAt: data.createdAt
                });
            }

            return rankings;
        } catch (error) {
            console.error('❌ タイムランキング取得失敗:', error);
            return [];
        }
    }

    // 手数ランキング取得
    async getMovesRanking(level, limit = 10) {
        try {
            // イベントマップやクリエイトモードの場合は文字列のまま使用
            const levelStr = typeof level === 'string' ? level : `level${level}`;
            const snapshot = await this.db.collection('scores')
                .where('level', '==', levelStr)
                .orderBy('moves', 'asc')
                .limit(limit)
                .get();

            const rankings = [];
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const userData = await this.getUserData(data.uid);
                
                rankings.push({
                    uid: data.uid,
                    nickname: userData?.nickname || 'ゲスト',
                    time: data.time,
                    moves: data.moves,
                    createdAt: data.createdAt
                });
            }

            return rankings;
        } catch (error) {
            console.error('❌ 手数ランキング取得失敗:', error);
            return [];
        }
    }

    // レベル統計取得
    async getLevelStats(level) {
        try {
            // イベントマップやクリエイトモードの場合は文字列のまま使用
            const levelStr = typeof level === 'string' ? level : `level${level}`;
            const doc = await this.db.collection('levelStats').doc(levelStr).get();
            
            if (doc.exists) {
                return doc.data();
            }
            return null;
        } catch (error) {
            console.error('❌ レベル統計取得失敗:', error);
            return null;
        }
    }

    // 全レベル統計取得
    async getAllLevelStats() {
        try {
            const snapshot = await this.db.collection('levelStats').get();
            const stats = {};
            
            snapshot.forEach(doc => {
                stats[doc.id] = doc.data();
            });
            
            return stats;
        } catch (error) {
            console.error('❌ 全レベル統計取得失敗:', error);
            return {};
        }
    }

    // ユーザーのクリア済みレベル取得
    async getUserClearedLevels(uid) {
        try {
            const userData = await this.getUserData(uid);
            return userData?.clearedLevels || [];
        } catch (error) {
            console.error('❌ クリア済みレベル取得失敗:', error);
            return [];
        }
    }

    // ユーザーのベストスコア取得
    async getUserBestScores(uid) {
        try {
            const userData = await this.getUserData(uid);
            return {
                bestTimes: userData?.bestTimes || {},
                bestMoves: userData?.bestMoves || {}
            };
        } catch (error) {
            console.error('❌ ベストスコア取得失敗:', error);
            return { bestTimes: {}, bestMoves: {} };
        }
    }
}

// グローバルインスタンス
const firebaseDB = new FirebaseDB();
