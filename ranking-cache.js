// 統合型ランキングキャッシュクラス
class RankingCache {
    constructor() {
        // ✅ ローカル/本番環境に応じてURLを切り替え
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        this.githubBaseUrl = isLocal 
            ? './ranking-data/'  // ローカル: 相対パス
            : 'https://solowords-yuki.github.io/ranking-data/';  // 本番: GitHub Pages
        
        console.log(`📂 ランキングデータ読み込み元: ${this.githubBaseUrl}`);
        
        // キャッシュの有効期限（ミリ秒）- デフォルト10分
        this.cacheExpiry = 10 * 60 * 1000;
        
        // メモリキャッシュ
        this.cache = {
            allRankings: null,  // 統合ランキングデータ全体
            timestamp: null
        };
    }

    // 統合ランキングデータを取得（全レベル・全タイプ）
    async getAllRankings() {
        // キャッシュチェック
        if (this.isCacheValid()) {
            console.log('📦 キャッシュから統合ランキングを取得');
            return this.cache.allRankings;
        }

        try {
            console.log('🌐 GitHubから統合ランキングを取得');
            const url = `${this.githubBaseUrl}rankings.json`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`データ取得失敗: ${response.status}`);
            }
            
            const data = await response.json();
            
            // キャッシュに保存
            this.cache.allRankings = data;
            this.cache.timestamp = Date.now();
            
            console.log('✅ 統合ランキングデータ読み込み成功');
            return data;
        } catch (error) {
            console.error('❌ GitHubからのデータ取得エラー:', error);
            
            // フォールバック: Firebaseから直接取得
            console.log('🔄 Firebaseから直接取得（フォールバック）');
            return await this.getFallbackFromFirebase();
        }
    }

    // タイムランキング取得
    async getTimeRanking(level, limit = 10) {
        try {
            const allData = await this.getAllRankings();
            // イベントマップやクリエイトモードの場合は文字列のまま使用
            const levelKey = typeof level === 'string' ? level : `level${level}`;
            
            if (allData && allData.levels && allData.levels[levelKey]) {
                const rankings = allData.levels[levelKey].rankings.time || [];
                return rankings.slice(0, limit);
            }
            
            return [];
        } catch (error) {
            console.error('❌ タイムランキング取得エラー:', error);
            return [];
        }
    }

    // 手数ランキング取得
    async getMovesRanking(level, limit = 10) {
        try {
            const allData = await this.getAllRankings();
            // イベントマップやクリエイトモードの場合は文字列のまま使用
            const levelKey = typeof level === 'string' ? level : `level${level}`;
            
            if (allData && allData.levels && allData.levels[levelKey]) {
                const rankings = allData.levels[levelKey].rankings.moves || [];
                return rankings.slice(0, limit);
            }
            
            return [];
        } catch (error) {
            console.error('❌ 手数ランキング取得エラー:', error);
            return [];
        }
    }

    // レベル統計取得
    async getLevelStats(level) {
        try {
            const allData = await this.getAllRankings();
            // イベントマップやクリエイトモードの場合は文字列のまま使用
            const levelKey = typeof level === 'string' ? level : `level${level}`;
            
            if (allData && allData.levels && allData.levels[levelKey]) {
                return {
                    clearCount: allData.levels[levelKey].totalClears || 0,
                    name: allData.levels[levelKey].name || `Level ${level}`
                };
            }
            
            return { clearCount: 0, name: `Level ${level}` };
        } catch (error) {
            console.error('❌ レベル統計取得エラー:', error);
            return { clearCount: 0, name: `Level ${level}` };
        }
    }

    // キャッシュが有効かチェック
    isCacheValid() {
        if (!this.cache.timestamp || !this.cache.allRankings) {
            return false;
        }
        
        const elapsed = Date.now() - this.cache.timestamp;
        return elapsed < this.cacheExpiry;
    }

    // キャッシュをクリア
    clearCache() {
        this.cache.allRankings = null;
        this.cache.timestamp = null;
        console.log('🗑️ キャッシュをクリアしました');
    }

    // フォールバック: Firebaseから直接取得
    async getFallbackFromFirebase() {
        try {
            if (typeof firebaseDB === 'undefined') {
                console.error('❌ Firebase DBが利用できません');
                return null;
            }

            console.log('� Firebaseから全データを取得中...');
            
            // レベル1〜10の全データを取得
            const levels = {};
            for (let i = 1; i <= 10; i++) {
                const levelKey = `level${i}`;
                
                // タイムランキング
                const timeRanking = await firebaseDB.getTimeRanking(i, 100);
                
                // 手数ランキング
                const movesRanking = await firebaseDB.getMovesRanking(i, 100);
                
                levels[levelKey] = {
                    name: `Level ${i}`,
                    totalClears: timeRanking.length,
                    rankings: {
                        time: timeRanking.map((item, index) => ({
                            rank: index + 1,
                            ...item
                        })),
                        moves: movesRanking.map((item, index) => ({
                            rank: index + 1,
                            ...item
                        }))
                    }
                };
            }

            const fallbackData = {
                lastUpdated: new Date().toISOString(),
                levels: levels
            };

            // フォールバックデータもキャッシュ
            this.cache.allRankings = fallbackData;
            this.cache.timestamp = Date.now();

            console.log('✅ Firebaseフォールバックデータ取得成功');
            return fallbackData;
        } catch (error) {
            console.error('❌ Firebaseフォールバックエラー:', error);
            return null;
        }
    }

    // 最終更新日時を取得
    async getLastUpdated() {
        try {
            const allData = await this.getAllRankings();
            return allData ? allData.lastUpdated : null;
        } catch (error) {
            console.error('❌ 最終更新日時取得エラー:', error);
            return null;
        }
    }
}

// グローバルインスタンス
const rankingCache = new RankingCache();
