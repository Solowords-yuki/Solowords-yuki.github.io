// API Client - HTTPリクエスト処理層
class APIClient {
    constructor() {
        // GitHub Pagesから直接取得
        this.rankingsURL = 'https://solowords-yuki.github.io/ranking-data/rankings.json';
        
        this.cache = {
            rankings: {},
            stats: {}
        };
        this.CACHE_DURATION = 5 * 60 * 1000; // 5分
    }

    // キャッシュチェック
    getCached(key) {
        const cached = this.cache.rankings[key] || this.cache.stats[key];
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
            console.log(`✅ API キャッシュヒット: ${key}`);
            return cached.data;
        }
        return null;
    }

    // キャッシュ保存
    setCached(key, data, type = 'rankings') {
        const cache = type === 'stats' ? this.cache.stats : this.cache.rankings;
        cache[key] = {
            data,
            timestamp: Date.now()
        };
    }

    // ランキング取得
    async getRanking(level, type = 'time', limit = 10) {
        const cacheKey = `ranking:${level}:${type}`;
        
        // キャッシュチェック
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            // ★ GitHub Pagesから直接取得
            const response = await fetch(this.rankingsURL);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const allData = await response.json();
            const levelKey = typeof level === 'string' ? level : `level${level}`;
            const rankings = allData?.levels?.[levelKey]?.rankings?.[type] || [];
            const result = rankings.slice(0, limit);

            // キャッシュ保存
            this.setCached(cacheKey, result, 'rankings');

            console.log(`📡 ランキング取得成功: ${cacheKey} (${result.length}件)`);
            return result;
        } catch (error) {
            console.error('❌ ランキング取得エラー:', error);
            // フォールバック: Firebaseキャッシュを使用
            console.log('🔄 Firebaseキャッシュにフォールバック');
            if (type === 'time') {
                return await rankingCache.getTimeRanking(level, limit);
            } else {
                return await rankingCache.getMovesRanking(level, limit);
            }
        }
    }

    // スコア送信（Firebase直接書き込み）
    async submitScore(uid, level, time, moves) {
        // ★ API未実装のため、直接Firebase書き込みを使用
        // 将来API実装時は、この関数内でHTTP経由に切り替え可能
        try {
            const firebaseDB = new FirebaseDB();
            return await firebaseDB.saveScore(uid, level, time, moves);
        } catch (error) {
            console.error('❌ スコア保存エラー:', error);
            throw error;
        }
    }

    // 統計情報取得
    async getStats(level) {
        const cacheKey = `stats:${level}`;
        
        // キャッシュチェック
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            // ★ GitHub Pagesから直接取得
            const response = await fetch(this.rankingsURL);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const allData = await response.json();
            const levelKey = typeof level === 'string' ? level : `level${level}`;
            const stats = {
                clearCount: allData?.levels?.[levelKey]?.totalClears || 0
            };

            // キャッシュ保存
            this.setCached(cacheKey, stats, 'stats');

            console.log(`📊 統計情報取得成功: Level ${level}`);
            return stats;
        } catch (error) {
            console.error('❌ 統計情報取得エラー:', error);
            // フォールバック: Firebaseキャッシュを使用
            console.log('🔄 Firebaseキャッシュにフォールバック');
            return await rankingCache.getLevelStats(level);
        }
    }

    // キャッシュクリア
    clearCache() {
        this.cache.rankings = {};
        this.cache.stats = {};
        console.log('🗑️ キャッシュをクリアしました');
    }
}

// グローバルインスタンス作成
const apiClient = new APIClient();
console.log('🚀 GitHub Pagesから直接ランキングを取得します');
