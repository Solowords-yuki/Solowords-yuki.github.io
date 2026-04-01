// API Client - HTTPリクエスト処理層
class APIClient {
    constructor() {
        // 環境に応じてAPIのベースURLを設定
        this.baseURL = window.location.hostname === 'localhost' 
            ? 'http://localhost:8787'
            : 'https://solowords-ranking-api.yu-yamasaki.workers.dev';
        
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
            const response = await fetch(
                `${this.baseURL}/api/ranking/${level}/${type}?limit=${limit}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            const rankings = result.data;

            // キャッシュ保存
            this.setCached(cacheKey, rankings, 'rankings');

            console.log(`📡 API取得成功: ${cacheKey} (${rankings.length}件)`);
            return rankings;
        } catch (error) {
            console.error('❌ API取得エラー:', error);
            // フォールバック: GitHubキャッシュを使用
            console.log('🔄 GitHubキャッシュにフォールバック');
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
            const response = await fetch(`${this.baseURL}/api/stats/${level}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            const stats = result.data;

            // キャッシュ保存
            this.setCached(cacheKey, stats, 'stats');

            console.log(`📊 統計情報取得成功: Level ${level}`);
            return stats;
        } catch (error) {
            console.error('❌ 統計情報取得エラー:', error);
            // フォールバック: GitHubキャッシュを使用
            console.log('🔄 GitHubキャッシュにフォールバック');
            return await rankingCache.getLevelStats(level);
        }
    }

    // キャッシュクリア
    clearCache() {
        this.cache.rankings = {};
        this.cache.stats = {};
        console.log('🗑️ APIキャッシュをクリアしました');
    }

    // ヘルスチェック
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ APIサーバー正常:', data);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ APIサーバー接続失敗:', error);
            return false;
        }
    }
}

// グローバルインスタンス作成
const apiClient = new APIClient();

// 起動時にヘルスチェック
window.addEventListener('load', () => {
    apiClient.healthCheck().then(isHealthy => {
        if (isHealthy) {
            console.log('🚀 HTTPサーバー接続成功 - API経由でランキング取得します');
        } else {
            console.log('⚠️ HTTPサーバー未接続 - GitHubキャッシュを使用します');
        }
    });
});
