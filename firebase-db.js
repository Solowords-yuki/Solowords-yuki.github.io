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

            const levelStr = `level${level}`;
            let isNewRecord = false;
            let updateData = {
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // クリア済みレベルに追加
            if (!userData.clearedLevels || !userData.clearedLevels.includes(levelStr)) {
                updateData.clearedLevels = firebase.firestore.FieldValue.arrayUnion(levelStr);
            }

            // ベストタイム更新チェック
            const currentBestTime = userData.bestTimes?.[levelStr];
            if (!currentBestTime || time < currentBestTime) {
                updateData[`bestTimes.${levelStr}`] = time;
                isNewRecord = true;
            }

            // ベスト手数更新チェック
            const currentBestMoves = userData.bestMoves?.[levelStr];
            if (!currentBestMoves || moves < currentBestMoves) {
                updateData[`bestMoves.${levelStr}`] = moves;
                isNewRecord = true;
            }

            // ユーザーデータ更新
            await userRef.update(updateData);

            // スコアコレクションに保存
            await this.db.collection('scores').add({
                uid: uid,
                level: levelStr,
                time: time,
                moves: moves,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // レベル統計更新
            await this.updateLevelStats(levelStr, time, moves);

            console.log('✅ スコア保存成功:', { level: levelStr, time, moves, isNewRecord });
            return isNewRecord;
        } catch (error) {
            console.error('❌ スコア保存失敗:', error);
            throw error;
        }
    }

    // レベル統計更新
    async updateLevelStats(level, time, moves) {
        try {
            const statsRef = this.db.collection('levelStats').doc(level);
            const doc = await statsRef.get();

            if (doc.exists) {
                const data = doc.data();
                const updateData = {
                    clearCount: firebase.firestore.FieldValue.increment(1),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // 最速タイム更新
                if (!data.fastestTime || time < data.fastestTime) {
                    updateData.fastestTime = time;
                }

                // 最少手数更新
                if (!data.fewestMoves || moves < data.fewestMoves) {
                    updateData.fewestMoves = moves;
                }

                await statsRef.update(updateData);
            } else {
                // 初回データ作成
                await statsRef.set({
                    clearCount: 1,
                    fastestTime: time,
                    fewestMoves: moves,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('❌ レベル統計更新失敗:', error);
        }
    }

    // タイムランキング取得
    async getTimeRanking(level, limit = 10) {
        try {
            const levelStr = `level${level}`;
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
            const levelStr = `level${level}`;
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
            const levelStr = `level${level}`;
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
