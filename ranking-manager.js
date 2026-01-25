// ランキング機能統合スクリプト
class RankingManager {
    constructor(game) {
        this.game = game;
        this.currentRankingLevel = 1;
        this.currentRankingType = 'time'; // 'time' or 'moves'
        
        // ★キャッシュ機能追加
        this.cache = {
            rankings: {}, // { 'level1-time': { data: [], timestamp: 123456789 } }
            stats: {}, // { 'level1': { data: {}, timestamp: 123456789 } }
        };
        this.CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュ
        
        // ★自動更新タイマー
        this.autoUpdateInterval = null;
        this.AUTO_UPDATE_DURATION = 30 * 60 * 1000; // 30分ごとに更新
        
        this.setupEventListeners();
        this.startAutoUpdate();
    }

    setupEventListeners() {
        // タブ切り替え
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // ログインボタン（記録画面）
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.addEventListener('click', () => this.handleLogin());
        }

        // ログアウトボタン
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }

        // ニックネーム保存
        const saveNicknameButton = document.getElementById('saveNicknameButton');
        if (saveNicknameButton) {
            saveNicknameButton.addEventListener('click', () => this.saveNickname());
        }

        // ランキングレベル選択
        const rankingLevelSelect = document.getElementById('rankingLevelSelect');
        if (rankingLevelSelect) {
            rankingLevelSelect.addEventListener('change', (e) => {
                this.currentRankingLevel = parseInt(e.target.value);
                this.loadRanking();
            });
        }

        // ランキングタイプ切り替え
        document.querySelectorAll('.ranking-type-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchRankingType(e.target.dataset.type);
            });
        });

        // クリア画面のログインボタン
        const clearLoginButton = document.getElementById('clearLoginButton');
        if (clearLoginButton) {
            clearLoginButton.addEventListener('click', () => this.handleLoginFromClearScreen());
        }

        // クリア画面のランキング表示ボタン
        const viewRankingButton = document.getElementById('viewRankingButton');
        const viewRankingButton2 = document.getElementById('viewRankingButton2');
        if (viewRankingButton) {
            viewRankingButton.addEventListener('click', () => this.showRankingFromClearScreen());
        }
        if (viewRankingButton2) {
            viewRankingButton2.addEventListener('click', () => this.showRankingFromClearScreen());
        }

        // 認証状態変更時の処理
        firebaseAuth.onAuthChanged((user) => {
            this.updateLoginStatus(user);
            this.updateClearScreenRankingUI(user);
        });
    }

    // タブ切り替え
    switchTab(tabName) {
        // タブボタンの切り替え
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // タブコンテンツの切り替え
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        if (tabName === 'local') {
            document.getElementById('localRecordsTab').classList.add('active');
        } else if (tabName === 'ranking') {
            document.getElementById('rankingTab').classList.add('active');
            // ★ランキングタブを開いた時にログイン状態を確実に更新
            setTimeout(() => {
                const currentUser = firebaseAuth?.currentUser || null;
                this.updateLoginStatus(currentUser);
            }, 100);
            this.loadRanking();
        }
    }

    // ログイン処理
    async handleLogin() {
        try {
            // 匿名ログインまたはGoogleログイン選択ダイアログ
            const choice = confirm('Googleアカウントでログインしますか？\n\nOK: Googleログイン\nキャンセル: 匿名ログイン（端末変更時にデータ消失）');

            if (choice) {
                // Googleログイン
                await firebaseAuth.signInWithGoogle();
                alert('✅ Googleログインに成功しました！');
            } else {
                // 匿名ログイン
                await firebaseAuth.signInAnonymously();
                alert('✅ 匿名ログインしました。端末変更時にデータが消失する点にご注意ください。');
            }
        } catch (error) {
            console.error('ログインエラー:', error);
            alert('❌ ログインに失敗しました。もう一度お試しください。');
        }
    }

    // ログアウト処理
    async handleLogout() {
        try {
            if (confirm('ログアウトしますか？')) {
                await firebaseAuth.signOut();
                alert('✅ ログアウトしました。');
            }
        } catch (error) {
            console.error('ログアウトエラー:', error);
            alert('❌ ログアウトに失敗しました。');
        }
    }

    // ニックネーム保存
    async saveNickname() {
        const nicknameInput = document.getElementById('nicknameInput');
        const nickname = nicknameInput.value.trim();

        if (!nickname) {
            alert('ニックネームを入力してください。');
            return;
        }

        try {
            await firebaseAuth.updateNickname(nickname);
            alert('✅ ニックネームを更新しました！');
            this.updateLoginStatus(firebaseAuth.currentUser);
        } catch (error) {
            console.error('ニックネーム更新エラー:', error);
            alert('❌ ニックネームの更新に失敗しました。');
        }
    }

    // ログイン状態表示更新
    updateLoginStatus(user) {
        const userNicknameDisplay = document.getElementById('userNicknameDisplay');
        const loginButton = document.getElementById('loginButton');
        const logoutButton = document.getElementById('logoutButton');
        const nicknameEdit = document.getElementById('nicknameEdit');
        const nicknameInput = document.getElementById('nicknameInput');

        if (user) {
            // ログイン済み
            const nickname = firebaseAuth.getNickname();
            const anonymousLabel = firebaseAuth.isAnonymous() ? ' (匿名)' : '';
            userNicknameDisplay.textContent = `👤 ${nickname}${anonymousLabel} - ログイン中`;
            loginButton.style.display = 'none';
            logoutButton.style.display = 'inline-block';
            nicknameEdit.style.display = 'flex';
            
            // ニックネーム入力欄に現在のニックネームを設定
            if (nicknameInput) {
                nicknameInput.value = nickname;
                nicknameInput.placeholder = 'ニックネームを入力';
            }
        } else {
            // 未ログイン
            userNicknameDisplay.textContent = '未ログイン';
            loginButton.style.display = 'inline-block';
            logoutButton.style.display = 'none';
            nicknameEdit.style.display = 'none';
        }
    }

    // ランキングタイプ切り替え
    switchRankingType(type) {
        this.currentRankingType = type;

        // ボタンの切り替え
        document.querySelectorAll('.ranking-type-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');

        // ヘッダーテキスト変更（タイム/手数 形式）
        const header = document.getElementById('rankingValueHeader');
        header.textContent = 'タイム / 手数';

        // ランキング再読み込み
        this.loadRanking();
    }

    // キャッシュチェック
    getCachedData(cacheKey, cacheType) {
        const cache = cacheType === 'stats' ? this.cache.stats : this.cache.rankings;
        const cached = cache[cacheKey];
        
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
            console.log(`✅ キャッシュヒット: ${cacheKey} (${Math.floor((Date.now() - cached.timestamp) / 1000)}秒前)`);
            return cached.data;
        }
        
        return null;
    }

    // キャッシュ保存
    setCachedData(cacheKey, data, cacheType) {
        const cache = cacheType === 'stats' ? this.cache.stats : this.cache.rankings;
        cache[cacheKey] = {
            data: data,
            timestamp: Date.now()
        };
        console.log(`💾 キャッシュ保存: ${cacheKey}`);
    }

    // キャッシュクリア
    clearCache() {
        this.cache.rankings = {};
        this.cache.stats = {};
        console.log('🗑️ キャッシュをクリアしました');
    }

    // 自動更新開始
    startAutoUpdate() {
        // 既存のタイマーをクリア
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
        }
        
        // 30分ごとに更新
        this.autoUpdateInterval = setInterval(() => {
            console.log('🔄 ランキング自動更新を実行');
            // GitHubキャッシュをクリアして再取得
            if (typeof rankingCache !== 'undefined') {
                rankingCache.clearCache();
            }
            this.clearCache();
            
            // 現在ランキングタブが表示されている場合のみ再読み込み
            const rankingTab = document.getElementById('rankingTab');
            if (rankingTab && rankingTab.classList.contains('active')) {
                this.loadRanking();
            }
        }, this.AUTO_UPDATE_DURATION);
        
        console.log(`✅ 自動更新タイマー開始 (${this.AUTO_UPDATE_DURATION / 60000}分ごと)`);
    }

    // 自動更新停止
    stopAutoUpdate() {
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
            this.autoUpdateInterval = null;
            console.log('⏹️ 自動更新タイマー停止');
        }
    }

    // 更新時間を表示
    updateLastUpdateTime(timestamp) {
        const lastUpdateEl = document.getElementById('rankingLastUpdate');
        if (!lastUpdateEl) return;
        
        if (!timestamp) {
            lastUpdateEl.textContent = '📅 最終更新: 不明';
            return;
        }
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / 60000);
        
        let timeText;
        if (diffMinutes < 1) {
            timeText = 'たった今';
        } else if (diffMinutes < 60) {
            timeText = `${diffMinutes}分前`;
        } else {
            const diffHours = Math.floor(diffMinutes / 60);
            timeText = `${diffHours}時間前`;
        }
        
        const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        lastUpdateEl.textContent = `📅 最終更新: ${dateStr} (${timeText})`;
    }

    // ランキング読み込み（GitHubキャッシュ優先）
    async loadRanking() {
        try {
            const level = this.currentRankingLevel;

            // レベル統計読み込み（GitHubキャッシュ経由）
            console.log(`📊 ランキング読み込み: Level ${level} (${this.currentRankingType})`);
            
            // タイムランキングと手数ランキングの両方を取得
            const timeRankings = await rankingCache.getTimeRanking(level, 10);
            const movesRankings = await rankingCache.getMovesRanking(level, 10);
            
            // 最速タイムと最小手数を取得（各ランキングの1位から）
            const fastestTime = timeRankings.length > 0 ? timeRankings[0].time : null;
            const fewestMoves = movesRankings.length > 0 ? movesRankings[0].moves : null;
            
            // クリア回数を取得
            const stats = await rankingCache.getLevelStats(level);
            
            // 統計情報を更新
            this.updateLevelStats({
                clearCount: stats.clearCount,
                fastestTime: fastestTime,
                fewestMoves: fewestMoves
            });

            // ランキング読み込み（現在選択されているタイプに応じて）
            let rankings;
            if (this.currentRankingType === 'time') {
                rankings = timeRankings;
            } else {
                rankings = movesRankings;
            }

            this.updateRankingTable(rankings);
            
            // 更新時間を表示
            const lastUpdated = await rankingCache.getLastUpdated();
            this.updateLastUpdateTime(lastUpdated);
        } catch (error) {
            console.error('ランキング読み込みエラー:', error);
            this.updateLastUpdateTime(null);
        }
    }

    // レベル統計更新
    updateLevelStats(stats) {
        const clearCountEl = document.getElementById('levelClearCount');
        const fastestTimeEl = document.getElementById('levelFastestTime');
        const fewestMovesEl = document.getElementById('levelFewestMoves');

        if (stats) {
            clearCountEl.textContent = `${stats.clearCount || 0}回`;
            fastestTimeEl.textContent = stats.fastestTime ? `${stats.fastestTime}秒` : '-';
            fewestMovesEl.textContent = stats.fewestMoves ? `${stats.fewestMoves}手` : '-';
        } else {
            clearCountEl.textContent = '0回';
            fastestTimeEl.textContent = '-';
            fewestMovesEl.textContent = '-';
        }
    }

    // ランキングテーブル更新
    updateRankingTable(rankings) {
        const tbody = document.getElementById('rankingTableBody');
        tbody.innerHTML = '';

        if (rankings.length === 0) {
            const row = tbody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 3;
            cell.textContent = 'まだ記録がありません';
            cell.style.textAlign = 'center';
            cell.style.padding = '20px';
            cell.style.color = '#999';
            return;
        }

        rankings.forEach((ranking, index) => {
            const row = tbody.insertRow();

            // 順位
            const rankCell = row.insertCell(0);
            let rankIcon = '';
            if (index === 0) rankIcon = '🥇';
            else if (index === 1) rankIcon = '🥈';
            else if (index === 2) rankIcon = '🥉';
            rankCell.textContent = `${rankIcon} ${index + 1}位`;

            // プレイヤー名
            const playerCell = row.insertCell(1);
            playerCell.textContent = ranking.nickname;

            // スコア（タイム/手数 形式で表示）
            const valueCell = row.insertCell(2);
            const time = ranking.time || '-';
            const moves = ranking.moves || '-';
            valueCell.textContent = `${time}秒 / ${moves}手`;
        });
    }

    // ゲームクリア時のスコア保存（自動・サイレント）
    async saveGameScore(level, time, moves) {
        try {
            // ログイン済みの場合のみ自動保存
            if (firebaseAuth.isLoggedIn()) {
                const uid = firebaseAuth.getCurrentUserId();
                const result = await firebaseDB.saveScore(uid, level, time, moves);
                
                // 記録更新時のみキャッシュクリア
                if (result.isNewTimeRecord || result.isNewMovesRecord) {
                    this.clearCache();
                }
                
                // クリア画面のUI更新（NEW表示用）
                this.updateClearScreenRankingUI(firebaseAuth.currentUser, result);
                
                return result;
            }
            
            // 未ログインの場合は何もしない（クリア画面でログインを促す）
            return { isNewTimeRecord: false, isNewMovesRecord: false };
        } catch (error) {
            console.error('スコア保存エラー:', error);
            return { isNewTimeRecord: false, isNewMovesRecord: false };
        }
    }

    // クリア画面からのログイン処理
    async handleLoginFromClearScreen() {
        try {
            // Googleログインまたは匿名ログイン選択ダイアログ
            const choice = confirm('Googleアカウントでログインしますか？\n\nOK: Googleログイン（端末変更時もデータ保持）\nキャンセル: 匿名ログイン（この端末のみ）');

            if (choice) {
                // Googleログイン
                await firebaseAuth.signInWithGoogle();
                alert('✅ Googleログインに成功しました！\n記録を保存しています...');
            } else {
                // 匿名ログイン
                await firebaseAuth.signInAnonymously();
                alert('✅ ログインしました！記録を保存しています...');
            }
            
            // ログイン成功後、スコアを保存
            if (this.game && firebaseAuth.isLoggedIn()) {
                const currentLevel = this.game.selectedLevel + 1;
                const time = this.game.clearTimeSeconds || 0;
                const moves = this.game.moveCount || 0;
                
                await this.saveGameScore(currentLevel, time, moves);
            }
            
        } catch (error) {
            console.error('ログインエラー:', error);
            alert('❌ ログインに失敗しました。もう一度お試しください。');
        }
    }

    // クリア画面からランキング表示
    showRankingFromClearScreen() {
        // ゲーム画面をリセットしてメニューに戻る
        if (this.game) {
            this.game.showMainMenu();
        }
        
        // 記録画面を表示
        setTimeout(() => {
            if (this.game) {
                this.game.showRecords();
                // ランキングタブに切り替え
                this.switchTab('ranking');
            }
        }, 100);
    }

    // クリア画面のランキングUI更新
    async updateClearScreenRankingUI(user, result = null) {
        const rankingPrompt = document.getElementById('rankingPrompt');
        const rankingSaved = document.getElementById('rankingSaved');
        const savedUserNickname = document.getElementById('savedUserNickname');
        const newRecordBadge = document.getElementById('newRecordBadge');
        const clearCountDisplay = document.getElementById('clearCountDisplay');

        if (!rankingPrompt || !rankingSaved) return;

        if (user && firebaseAuth.isLoggedIn()) {
            // ログイン済み：保存完了メッセージを表示
            rankingPrompt.style.display = 'none';
            rankingSaved.style.display = 'block';
            
            // ニックネーム表示
            if (savedUserNickname) {
                savedUserNickname.textContent = firebaseAuth.getNickname();
            }
            
            // NEW表記を追加
            if (newRecordBadge) {
                if (result && (result.isNewTimeRecord || result.isNewMovesRecord)) {
                    newRecordBadge.innerHTML = ' <span style="color: #ff6b6b; font-weight: bold; margin-left: 8px;">NEW</span>';
                } else {
                    newRecordBadge.innerHTML = '';
                }
            }
            
            // クリア回数を表示
            if (clearCountDisplay && this.game.selectedLevel) {
                const uid = firebaseAuth.getCurrentUserId();
                const userData = await firebaseDB.getUserData(uid);
                const levelStr = `level${this.game.selectedLevel}`;
                const clearCount = userData?.clearCounts?.[levelStr] || 0;
                clearCountDisplay.textContent = clearCount;
            }
        } else {
            // 未ログイン：ログイン促進メッセージを表示
            rankingPrompt.style.display = 'block';
            rankingSaved.style.display = 'none';
        }
    }
}

// グローバル変数
let rankingManager = null;

// DOMContentLoaded時の初期化処理を拡張
document.addEventListener('DOMContentLoaded', () => {
    // Firebase初期化待ち
    const checkFirebaseInit = setInterval(() => {
        if (typeof firebaseAuth !== 'undefined' && typeof firebaseDB !== 'undefined') {
            clearInterval(checkFirebaseInit);
            
            // Firebase認証初期化
            firebaseAuth.init();
            
            // ランキングマネージャー初期化（DOGameインスタンス作成後）
            setTimeout(() => {
                if (window.game) {
                    rankingManager = new RankingManager(window.game);
                    console.log('✅ ランキングマネージャー初期化完了');
                }
            }, 1000);
        }
    }, 100);
});
