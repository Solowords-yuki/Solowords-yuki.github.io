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
    
    // ★ヘルパー：selectedLevelからレベル識別子を取得
    getLevelIdentifier(selectedLevel) {
        // 文字列の場合（event1, create1など）はそのまま
        if (typeof selectedLevel === 'string') {
            return selectedLevel;
        }
        // 数値の場合はlevel1, level2...に変換（selectedLevel 0 → level 1）
        return `level${selectedLevel + 1}`;
    }
    
    // ★ヘルパー：レベル表示名を取得
    getLevelDisplayName(selectedLevel) {
        if (typeof selectedLevel === 'string') {
            // event1 → イベントマップのタイトルを取得
            if (selectedLevel.startsWith('event')) {
                // event-maps.jsから取得を試みる
                if (typeof getEventMaps === 'function') {
                    const eventId = parseInt(selectedLevel.replace('event', ''));
                    const eventMaps = getEventMaps();
                    const eventMap = eventMaps.find(m => m.id === eventId);
                    return eventMap ? eventMap.title : selectedLevel;
                }
            }
            return selectedLevel;
        }
        // 数値の場合
        return selectedLevel + 1;
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
                // イベントマップやクリエイトモードの場合は文字列のまま保持
                const value = e.target.value;
                if (value.startsWith('event')) {
                    // イベントの場合は現在月を追加（event202604形式）
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    this.currentRankingLevel = `event${year}${month}`;
                } else if (value.startsWith('create')) {
                    this.currentRankingLevel = value;
                } else {
                    this.currentRankingLevel = parseInt(value);
                }
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
        // ログイン選択モーダルを表示
        this.showLoginModal();
    }

    // ログイン選択モーダル表示
    showLoginModal() {
        // 既存のモーダルがあれば削除
        const existingModal = document.getElementById('loginModal');
        if (existingModal) {
            existingModal.remove();
        }

        // モーダルHTML作成
        const modalHTML = `
            <div id="loginModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            ">
                <div style="
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    max-width: 400px;
                    width: 90%;
                ">
                    <h2 style="margin: 0 0 30px 0; text-align: center; color: #333; font-size: 24px;">🔐 ログイン</h2>
                    <button id="loginSignUpBtn" style="
                        width: 100%;
                        padding: 15px;
                        margin-bottom: 15px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        📝 新規登録
                    </button>
                    <button id="loginSignInBtn" style="
                        width: 100%;
                        padding: 15px;
                        margin-bottom: 20px;
                        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        🔑 ログイン
                    </button>
                    <button id="loginCancelBtn" style="
                        width: 100%;
                        padding: 12px;
                        background: #95a5a6;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        キャンセル
                    </button>
                </div>
            </div>
        `;

        // モーダルをDOMに追加
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // イベントリスナー設定
        document.getElementById('loginSignUpBtn').addEventListener('click', () => {
            this.closeLoginModal();
            this.handleEmailSignUp();
        });

        document.getElementById('loginSignInBtn').addEventListener('click', () => {
            this.closeLoginModal();
            this.handleEmailLogin();
        });

        document.getElementById('loginCancelBtn').addEventListener('click', () => {
            this.closeLoginModal();
        });

        // 背景クリックで閉じる
        document.getElementById('loginModal').addEventListener('click', (e) => {
            if (e.target.id === 'loginModal') {
                this.closeLoginModal();
            }
        });
    }

    // ログインモーダルを閉じる
    closeLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.remove();
        }
    }

    // メール/パスワードログイン処理
    async handleEmailLogin() {
        // ログインフォームモーダルを表示
        this.showLoginFormModal();
    }

    // メール/パスワード新規登録処理
    async handleEmailSignUp() {
        // 新規登録フォームモーダルを表示
        this.showSignUpFormModal();
    }

    // ログインフォームモーダル表示
    showLoginFormModal() {
        const modalHTML = `
            <div id="loginFormModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            ">
                <div style="
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    max-width: 400px;
                    width: 90%;
                ">
                    <h2 style="margin: 0 0 20px 0; text-align: center; color: #333; font-size: 24px;">🔑 ログイン</h2>
                    <div style="margin-bottom: 20px; padding: 12px; background: #f0f8ff; border-left: 4px solid #3498db; border-radius: 5px; font-size: 13px; color: #555; line-height: 1.6;">
                        💡 Google Firebase認証を使用しています。<br>
                        メールアドレスは、アカウント管理と不正利用防止のために必要です。<br>
                        <strong>上記以外の利用は一切ありません。</strong>健全なサービス運営にご協力ください。
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #555; font-weight: bold;">📧 メールアドレス</label>
                        <input type="email" id="loginEmail" placeholder="example@email.com" style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #ddd;
                            border-radius: 8px;
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                    </div>
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 8px; color: #555; font-weight: bold;">🔒 パスワード</label>
                        <input type="password" id="loginPassword" placeholder="パスワード" style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #ddd;
                            border-radius: 8px;
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                    </div>
                    <button id="loginFormSubmitBtn" style="
                        width: 100%;
                        padding: 15px;
                        margin-bottom: 10px;
                        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        ログイン
                    </button>
                    <button id="loginFormCancelBtn" style="
                        width: 100%;
                        padding: 12px;
                        background: #95a5a6;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        キャンセル
                    </button>
                    <div style="text-align: center; margin-top: 15px;">
                        <a id="forgotPasswordLink" style="
                            color: #3498db;
                            font-size: 13px;
                            text-decoration: none;
                            cursor: pointer;
                            transition: color 0.2s;
                        " onmouseover="this.style.color='#2980b9'" onmouseout="this.style.color='#3498db'">
                            🔑 パスワードを忘れた場合
                        </a>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // イベントリスナー設定
        document.getElementById('loginFormSubmitBtn').addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            if (!email || !password) {
                alert('❌ メールアドレスとパスワードを入力してください。');
                return;
            }

            try {
                await firebaseAuth.signInWithEmail(email, password);
                this.closeFormModal('loginFormModal');
                alert('✅ ログインに成功しました！');
            } catch (error) {
                console.error('メールログインエラー:', error);
                if (error.code === 'auth/user-not-found') {
                    alert('❌ このメールアドレスは登録されていません。');
                } else if (error.code === 'auth/wrong-password') {
                    alert('❌ パスワードが間違っています。');
                } else if (error.code === 'auth/invalid-email') {
                    alert('❌ メールアドレスの形式が正しくありません。');
                } else {
                    alert('❌ ログインに失敗しました。');
                }
            }
        });

        document.getElementById('loginFormCancelBtn').addEventListener('click', () => {
            this.closeFormModal('loginFormModal');
        });

        // パスワードを忘れた場合のリンク
        document.getElementById('forgotPasswordLink').addEventListener('click', () => {
            this.closeFormModal('loginFormModal');
            this.showPasswordResetModal();
        });

        // 背景クリックで閉じる
        document.getElementById('loginFormModal').addEventListener('click', (e) => {
            if (e.target.id === 'loginFormModal') {
                this.closeFormModal('loginFormModal');
            }
        });
    }

    // 新規登録フォームモーダル表示
    showSignUpFormModal() {
        const modalHTML = `
            <div id="signUpFormModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            ">
                <div style="
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    max-width: 400px;
                    width: 90%;
                ">
                    <h2 style="margin: 0 0 20px 0; text-align: center; color: #333; font-size: 24px;">📝 新規登録</h2>
                    <div style="margin-bottom: 20px; padding: 12px; background: #f0f8ff; border-left: 4px solid #3498db; border-radius: 5px; font-size: 13px; color: #555; line-height: 1.6;">
                        💡 Google Firebase認証を使用しています。<br>
                        メールアドレスは、アカウント管理と不正利用防止のために必要です。<br>
                        <strong>上記以外の利用は一切ありません。</strong>健全なサービス運営にご協力ください。
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #555; font-weight: bold;">📧 メールアドレス</label>
                        <input type="email" id="signUpEmail" placeholder="example@email.com" style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #ddd;
                            border-radius: 8px;
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #555; font-weight: bold;">🔒 パスワード（6文字以上）</label>
                        <input type="password" id="signUpPassword" placeholder="パスワード" style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #ddd;
                            border-radius: 8px;
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                    </div>
                    <button id="signUpFormSubmitBtn" style="
                        width: 100%;
                        padding: 15px;
                        margin-bottom: 10px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        新規登録
                    </button>
                    <button id="signUpFormCancelBtn" style="
                        width: 100%;
                        padding: 12px;
                        background: #95a5a6;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        キャンセル
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // イベントリスナー設定
        document.getElementById('signUpFormSubmitBtn').addEventListener('click', async () => {
            const email = document.getElementById('signUpEmail').value.trim();
            const password = document.getElementById('signUpPassword').value;

            if (!email || !password) {
                alert('❌ すべての項目を入力してください。');
                return;
            }

            if (password.length < 6) {
                alert('❌ パスワードは6文字以上である必要があります。');
                return;
            }

            try {
                await firebaseAuth.signUpWithEmail(email, password);
                this.closeFormModal('signUpFormModal');
                alert('✅ 新規登録が完了しました！ログイン後にニックネームを設定してください。');
            } catch (error) {
                console.error('新規登録エラー:', error);
                if (error.code === 'auth/email-already-in-use') {
                    alert('❌ このメールアドレスは既に使用されています。');
                } else if (error.code === 'auth/invalid-email') {
                    alert('❌ メールアドレスの形式が正しくありません。');
                } else if (error.code === 'auth/weak-password') {
                    alert('❌ パスワードが弱すぎます。6文字以上を入力してください。');
                } else {
                    alert('❌ 新規登録に失敗しました。');
                }
            }
        });

        document.getElementById('signUpFormCancelBtn').addEventListener('click', () => {
            this.closeFormModal('signUpFormModal');
        });

        // 背景クリックで閉じる
        document.getElementById('signUpFormModal').addEventListener('click', (e) => {
            if (e.target.id === 'signUpFormModal') {
                this.closeFormModal('signUpFormModal');
            }
        });
    }

    // パスワードリセットモーダル表示
    showPasswordResetModal() {
        const modalHTML = `
            <div id="passwordResetModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            ">
                <div style="
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    max-width: 400px;
                    width: 90%;
                ">
                    <h2 style="margin: 0 0 20px 0; text-align: center; color: #333; font-size: 24px;">🔑 パスワードリセット</h2>
                    <p style="margin-bottom: 20px; color: #666; font-size: 14px; line-height: 1.6;">
                        登録したメールアドレスを入力してください。<br>
                        パスワード変更用のリンクを送信します。
                    </p>
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 8px; color: #555; font-weight: bold;">📧 メールアドレス</label>
                        <input type="email" id="resetEmail" placeholder="example@email.com" style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #ddd;
                            border-radius: 8px;
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                    </div>
                    <button id="resetPasswordSubmitBtn" style="
                        width: 100%;
                        padding: 15px;
                        margin-bottom: 10px;
                        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        📧 リセットメールを送信
                    </button>
                    <button id="resetPasswordCancelBtn" style="
                        width: 100%;
                        padding: 12px;
                        background: #95a5a6;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        キャンセル
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // イベントリスナー設定
        document.getElementById('resetPasswordSubmitBtn').addEventListener('click', async () => {
            const email = document.getElementById('resetEmail').value.trim();

            if (!email) {
                alert('❌ メールアドレスを入力してください。');
                return;
            }

            try {
                await firebaseAuth.sendPasswordResetEmail(email);
                this.closeFormModal('passwordResetModal');
                alert('✅ パスワード変更用のリンクを送信しました。\n\nメールに記載されたリンクから安全にパスワードを変更できます。\nメールが届かない場合は、迷惑メールフォルダもご確認ください。');
            } catch (error) {
                console.error('パスワードリセットエラー:', error);
                if (error.code === 'auth/user-not-found') {
                    alert('❌ このメールアドレスは登録されていません。');
                } else if (error.code === 'auth/invalid-email') {
                    alert('❌ メールアドレスの形式が正しくありません。');
                } else {
                    alert('❌ メール送信に失敗しました: ' + error.message);
                }
            }
        });

        document.getElementById('resetPasswordCancelBtn').addEventListener('click', () => {
            this.closeFormModal('passwordResetModal');
        });

        // 背景クリックで閉じる
        document.getElementById('passwordResetModal').addEventListener('click', (e) => {
            if (e.target.id === 'passwordResetModal') {
                this.closeFormModal('passwordResetModal');
            }
        });
    }

    // フォームモーダルを閉じる
    closeFormModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
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

    // ランキング読み込み（HTTP API優先、フォールバックあり）
    async loadRanking() {
        try {
            const level = this.currentRankingLevel;

            console.log(`📊 ランキング読み込み: Level ${level} (${this.currentRankingType})`);
            
            // ★ HTTP API経由でランキングを取得（フォールバック付き）
            const timeRankings = await apiClient.getRanking(level, 'time', 10);
            const movesRankings = await apiClient.getRanking(level, 'moves', 10);
            
            // 最速タイムと最小手数を取得（各ランキングの1位から）
            const fastestTime = timeRankings.length > 0 ? timeRankings[0].score || timeRankings[0].time : null;
            const fewestMoves = movesRankings.length > 0 ? movesRankings[0].score || movesRankings[0].moves : null;
            
            // ★ HTTP API経由で統計情報を取得（フォールバック付き）
            const statsResult = await apiClient.getStats(level);
            
            // データ構造を正規化（API形式とGitHub形式の両方に対応）
            const stats = statsResult.stats || statsResult;
            
            // 統計情報を更新
            this.updateLevelStats({
                clearCount: stats.totalClears || stats.clearCount || 0,
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

    // ランキングテーブル更新（API/GitHubキャッシュ両対応）
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
            // ★ API形式(score)とGitHubキャッシュ形式(time/moves)の両方に対応
            const valueCell = row.insertCell(2);
            const time = ranking.time || ranking.score || '-';
            const moves = ranking.moves || ranking.score || '-';
            valueCell.textContent = `${time}秒 / ${moves}手`;
        });
    }

    // ゲームクリア時のスコア保存（Firebase直接書き込み）
    async saveGameScore(level, time, moves) {
        try {
            // ログイン済みの場合のみ自動保存
            if (firebaseAuth.isLoggedIn()) {
                const uid = firebaseAuth.getCurrentUserId();
                
                // ★ Firebase直接書き込みでスコア送信
                const result = await apiClient.submitScore(uid, level, time, moves);
                
                // 記録更新時のみキャッシュクリア
                if (result.isNewTimeRecord || result.isNewMovesRecord) {
                    this.clearCache();
                    apiClient.clearCache(); // ★ APIキャッシュもクリア
                }
                
                // クリア画面のUI更新（NEW表示用）
                this.updateClearScreenRankingUI(firebaseAuth.currentUser, result, level);
                
                return result;
            } else {
                // 未ログインの場合：ログイン促進画面を表示
                this.updateClearScreenRankingUI(null, null, level);
                return { isNewTimeRecord: false, isNewMovesRecord: false };
            }
        } catch (error) {
            console.error('スコア保存エラー:', error);
            // エラーが発生してもUIは更新する
            if (firebaseAuth.isLoggedIn()) {
                this.updateClearScreenRankingUI(firebaseAuth.currentUser, { isNewTimeRecord: false, isNewMovesRecord: false }, level);
            } else {
                this.updateClearScreenRankingUI(null, null, level);
            }
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
                const currentLevel = this.getLevelIdentifier(this.game.selectedLevel);
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
    async updateClearScreenRankingUI(user, result = null, clearedLevel = null) {
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
            
            // ★クリア回数を表示（clearedLevelを優先使用）
            if (clearCountDisplay) {
                let localLevelKey = clearedLevel; // saveGameScoreから渡されたレベルを使用
                
                // clearedLevelがnullの場合は、従来通りselectedLevelから計算
                if (localLevelKey === null && this.game && this.game.selectedLevel !== undefined) {
                    if (typeof this.game.selectedLevel === 'string' && this.game.selectedLevel.startsWith('event')) {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        localLevelKey = `event${year}${month}`;
                    } else if (typeof this.game.selectedLevel === 'number') {
                        localLevelKey = this.game.selectedLevel + 1;
                    }
                }
                
                if (localLevelKey !== null) {
                    const records = JSON.parse(localStorage.getItem('doGameRecords') || '{}');
                    const clearCount = records[localLevelKey]?.clearCount || 0;
                    clearCountDisplay.textContent = clearCount;
                }
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
