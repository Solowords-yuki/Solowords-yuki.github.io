// GitHub経由でランキングデータを取得するクラス
class RankingCache {
    constructor() {
        // GitHub PagesのURLを設定（実際のリポジトリURLに置き換えてください）
        this.githubBaseUrl = 'https://github.com/Solowords-yuki/Solowords-yuki.github.io/ranking-data/';
        
        // キャッシュの有効期限（ミリ秒）- デフォルト10分
        this.cacheExpiry = 10 * 60 * 1000;
        
        // メモリキャッシュ
        this.cache = {
            rankings: {},
            levelStats: {},
            timestamps: {}
        };
    }

    // ランキングデータをGitHubから取得
    async getTimeRanking(level, limit = 10) {
        const cacheKey = `time_${level}`;
        
        // キャッシュチェック
        if (this.isCacheValid(cacheKey)) {
            console.log('📦 キャッシュからランキングを取得:', cacheKey);
            return this.cache.rankings[cacheKey] || [];
        }

        try {
            console.log('🌐 GitHubからランキングを取得:', cacheKey);
            const url = `${this.githubBaseUrl}time-ranking-level${level}.json`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('データ取得失敗');
            }
            
            const data = await response.json();
            
            // キャッシュに保存
            this.cache.rankings[cacheKey] = data.rankings || [];
            this.cache.timestamps[cacheKey] = Date.now();
            
            return data.rankings || [];
        } catch (error) {
            console.error('❌ GitHubからのデータ取得エラー:', error);
            
            // フォールバック: Firebaseから直接取得
            console.log('🔄 Firebaseから直接取得（フォールバック）');
            return await this.getFallbackFromFirebase('time', level, limit);
        }
    }

    // 手数ランキングをGitHubから取得
    async getMovesRanking(level, limit = 10) {
        const cacheKey = `moves_${level}`;
        
        // キャッシュチェック
        if (this.isCacheValid(cacheKey)) {
            console.log('📦 キャッシュからランキングを取得:', cacheKey);
            return this.cache.rankings[cacheKey] || [];
        }

        try {
            console.log('🌐 GitHubからランキングを取得:', cacheKey);
            const url = `${this.githubBaseUrl}moves-ranking-level${level}.json`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('データ取得失敗');
            }
            
            const data = await response.json();
            
            // キャッシュに保存
            this.cache.rankings[cacheKey] = data.rankings || [];
            this.cache.timestamps[cacheKey] = Date.now();
            
            return data.rankings || [];
        } catch (error) {
            console.error('❌ GitHubからのデータ取得エラー:', error);
            
            // フォールバック: Firebaseから直接取得
            console.log('🔄 Firebaseから直接取得（フォールバック）');
            return await this.getFallbackFromFirebase('moves', level, limit);
        }
    }

    // レベル統計をGitHubから取得
    async getLevelStats(level) {
        const cacheKey = `stats_${level}`;
        
        // キャッシュチェック
        if (this.isCacheValid(cacheKey)) {
            console.log('📦 キャッシュから統計を取得:', cacheKey);
            return this.cache.levelStats[cacheKey] || null;
        }

        try {
            console.log('🌐 GitHubから統計を取得:', cacheKey);
            const url = `${this.githubBaseUrl}level-stats-level${level}.json`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('データ取得失敗');
            }
            
            const data = await response.json();
            
            // キャッシュに保存
            this.cache.levelStats[cacheKey] = data.stats || null;
            this.cache.timestamps[cacheKey] = Date.now();
            
            return data.stats || null;
        } catch (error) {
            console.error('❌ GitHubからのデータ取得エラー:', error);
            
            // フォールバック: Firebaseから直接取得
            console.log('🔄 Firebaseから直接取得（フォールバック）');
            if (typeof firebaseDB !== 'undefined') {
                return await firebaseDB.getLevelStats(level);
            }
            return null;
        }
    }

    // キャッシュの有効性チェック
    isCacheValid(key) {
        if (!this.cache.timestamps[key]) {
            return false;
        }
        
        const age = Date.now() - this.cache.timestamps[key];
        return age < this.cacheExpiry;
    }

    // Firebaseから直接取得（フォールバック用）
    async getFallbackFromFirebase(type, level, limit) {
        if (typeof firebaseDB === 'undefined') {
            return [];
        }
        
        try {
            if (type === 'time') {
                return await firebaseDB.getTimeRanking(level, limit);
            } else {
                return await firebaseDB.getMovesRanking(level, limit);
            }
        } catch (error) {
            console.error('Firebaseフォールバックエラー:', error);
            return [];
        }
    }

    // キャッシュをクリア
    clearCache() {
        this.cache = {
            rankings: {},
            levelStats: {},
            timestamps: {}
        };
        console.log('🗑️ キャッシュをクリアしました');
    }

    // GitHub URLを設定（リポジトリが決まったら呼び出す）
    setGitHubUrl(username, repo) {
        this.githubBaseUrl = `https://${username}.github.io/${repo}/ranking-data/`;
        console.log('✅ GitHub URL設定:', this.githubBaseUrl);
    }
}

// グローバルインスタンス
const rankingCache = new RankingCache();

