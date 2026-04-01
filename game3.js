class DOGame {
    constructor() {
        this.selectedLevel = 0; // ★デフォルトレベル1（HTML value="0"）
        this.mapData = [];
        this.mouseRuRu = [];
        this.boardSize = 0;
        this.tileSize = 70;
        this.tiles = [];
        this.startTime = 0;
        this.sumMouseRuRu = 0;
        this.colorMode = true;
        this.heldTile = null;
        this.heldTileMousePos = null;
        this.selectedTileValue = null;
        this.isCleared = false;
        this.clearButtonRect = null;
        // 手数管理を追加
        this.moveCount = 0;
        this.timerElement = null;
        this.moveCountElement = null; // 手数表示用
        
        // ★リタイア回数カウンター
        this.retireCount = 0;
        
        // ★年齢層管理を追加
        this.ageGroup = null; // 'adult', 'senior-child'
        this.adsEnabled = false; // 広告表示フラグ
        
        // ★タイマー設定管理を追加
        this.timerEnabled = true; // タイマーON/OFF設定
        this.gameTimer = null; // タイマーのインターバルID
        this.isTimerRunning = false; // タイマー動作状態
        
        // 動的クリア条件管理を追加
        this.requiredGroups = null; // 必要な隣接グループ数
        this.pieceTypeCleared = {}; // 駒の種類ごとのクリア状況 {1: 0, 2: 0, 3: 1} みたいな感じ
        this.totalPieceTypes = 0; // 配置されている駒の種類数
        this.fixedTiles = []; // マップと対応した固定状況管理配列
        
        this.initializeElements();
        this.setupEventListeners();
        
        // ★即座に年齢選択を初期化（DOM要素の初期状態を保持）
        this.initializeAgeSelection();
    }
    
    // ★年齢選択の初期化
    initializeAgeSelection() {
        // console.log('年齢選択初期化開始');
        
        // 要素の存在確認
        const ageSelectScreen = document.getElementById('ageSelectScreen');
        const mainMenuScreen = document.getElementById('mainMenu');
        
        if (!ageSelectScreen || !mainMenuScreen) {
            console.error('年齢選択画面またはメインメニュー画面が見つかりません');
            return;
        }
        
        // ローカルストレージから設定を読み込み
        const savedAgeGroup = localStorage.getItem('gameAgeGroup');
        const savedTimerEnabled = localStorage.getItem('gameTimerEnabled');

        // console.log('保存された年齢層設定:', savedAgeGroup);
        // console.log('保存されたタイマー設定:', savedTimerEnabled);

        // タイマー設定を復元
        if (savedTimerEnabled !== null) {
            this.timerEnabled = savedTimerEnabled === 'true';
            if (this.elements.timerEnabled) {
                this.elements.timerEnabled.checked = this.timerEnabled;
            }
        }
        
        if (savedAgeGroup) {
            this.setAgeGroup(savedAgeGroup);
            // console.log('保存された設定でメインメニューへ');
            // ★少し遅延させてから画面切り替え
            setTimeout(() => {
                this.showMainMenu();
            }, 50);
        } else {
            // console.log('初回訪問: 年齢選択画面を維持');
            // ★初回訪問時は現在のHTML状態（年齢選択画面がactive）を維持
            // フッターを年齢選択画面用に初期化
            this.updateFooter('ageSelect');
        }
    }
    
    // ★年齢層を設定
    setAgeGroup(ageGroup) {
        this.ageGroup = ageGroup;
        this.adsEnabled = (ageGroup === 'adult');
        
        // ローカルストレージに保存
        localStorage.setItem('gameAgeGroup', ageGroup);
        
        // 広告の表示/非表示を制御
        this.controlAdDisplay();

        // console.log(`年齢層設定: ${ageGroup}, 広告表示: ${this.adsEnabled}`);
    }
    
    // ★カスタムレベル判定（create1-3, event1-N）
    isCustomLevel(level) {
        if (typeof level === 'string') {
            return level.startsWith('create') || level.startsWith('event');
        }
        return false;
    }
    
    // ★イベントマップ取得
    getEventMapData(eventId) {
        if (typeof getEventMapById === 'function') {
            return getEventMapById(parseInt(eventId));
        }
        return null;
    }
    
    // ★デバッグ用：年齢設定をリセット
    resetAgeSelection() {
        localStorage.removeItem('gameAgeGroup');
        localStorage.removeItem('gameTimerEnabled');
        this.ageGroup = null;
        this.adsEnabled = false;
        this.timerEnabled = true;
        // console.log('年齢設定をリセットしました');
        location.reload(); // ページをリロード
    }
    
    // ★タイマー設定を変更
    setTimerEnabled(enabled) {
        this.timerEnabled = enabled;
        localStorage.setItem('gameTimerEnabled', enabled.toString());
        // console.log(`タイマー設定: ${enabled ? 'ON' : 'OFF'}`);

        // ゲーム中の場合、タイマー表示を即座に更新
        if (this.screens.game.classList.contains('active')) {
            this.updateTimerDisplay();
        }
    }
    
    // ★広告の表示制御
    controlAdDisplay() {
        const adContainers = document.querySelectorAll('.ad-container');
        
        adContainers.forEach(container => {
            if (this.adsEnabled) {
                container.style.display = 'flex';
                container.style.visibility = 'visible';
            } else {
                container.style.display = 'none';
                container.style.visibility = 'hidden';
            }
        });
    }
    
    // ★年齢選択画面を表示
    showAgeSelection() {
        // console.log('年齢選択画面を表示');
        this.showScreen('ageSelect');
    }
    
    // ★メインメニューを表示
    showMainMenu() {
        this.showScreen('mainMenu');
    }
    
    initializeElements() {
        this.screens = {
            ageSelect: document.getElementById('ageSelectScreen'), // ★追加
            mainMenu: document.getElementById('mainMenu'),
            rules: document.getElementById('rulesScreen'),
            game: document.getElementById('gameScreen'),
            end: document.getElementById('endScreen'),
            retireConfirm: document.getElementById('retireConfirmScreen'),
            stuckConfirm: document.getElementById('stuckConfirmScreen'),
            records: document.getElementById('recordsScreen'), // ★追加
            accountSettings: document.getElementById('accountSettingsScreen') // ★アカウント設定画面
        };
        
        this.elements = {
            // ★年齢選択関連の要素
            seniorChildButton: document.getElementById('seniorChildButton'),
            adultButton: document.getElementById('adultButton'),
            settingsButton: document.getElementById('settingsButton'),
            
            // ★タイマー設定の要素
            timerEnabled: document.getElementById('timerEnabled'),
            
            // ★アカウント設定の要素
            accountInfo: document.getElementById('accountInfo'),
            logoutButton: document.getElementById('logoutButton'),
            
            levelSelect: document.getElementById('levelSelect'),
            playButton: document.getElementById('playButton'),
            createButton: document.getElementById('createButton'),
            rulesButton: document.getElementById('rulesButton'),
            closeRulesButton: document.getElementById('closeRulesButton'),
            gameRulesButton: document.getElementById('gameRulesButton'),
            retireButton: document.getElementById('retireButton'),
            backToMenuButton: document.getElementById('backToMenuButton'),
            timer: document.getElementById('timer'),
            clearTime: document.getElementById('clearTime'),
            clearMoves: document.getElementById('clearMoves'),
            levelClearInfo: document.getElementById('levelClearInfo'),
            colorMode: document.getElementById('colorMode'),
            confirmRetireYes: document.getElementById('confirmRetireYes'),
            confirmRetireNo: document.getElementById('confirmRetireNo'),
            confirmStuckYes: document.getElementById('confirmStuckYes'),
            confirmStuckNo: document.getElementById('confirmStuckNo'),
            // ★記録関連を追加
            recordsButton: document.getElementById('recordsButton'),
            backToMenuFromRecords: document.getElementById('backToMenuFromRecords'),
            clearRecordsButton: document.getElementById('clearRecordsButton'),
            recordsTableBody: document.getElementById('recordsTableBody'),
            // ★年齢選択ボタンを追加
            ageAdult: document.getElementById('ageAdult'),
            ageSenior: document.getElementById('ageSenior'),
            ageChild: document.getElementById('ageChild')
        };
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.timerElement = document.getElementById('timer');
        
        // 手数表示要素を作成（タイマーの隣に表示）
        if (this.timerElement && !this.moveCountElement) {
            this.moveCountElement = document.createElement('div');
            this.moveCountElement.id = 'moveCounter';
            this.moveCountElement.textContent = 'Moves: 0';
            this.moveCountElement.style.cssText = `
                background: linear-gradient(135deg, #3498db, #2980b9);
                color: white;
                font-size: 20px;
                font-weight: bold;
                padding: 12px 24px;
                border-radius: 25px;
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
                box-shadow: 
                    0 4px 15px rgba(52, 152, 219, 0.3),
                    inset 0 1px 3px rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.2);
                margin-left: 20px;
                min-width: 140px;
                text-align: center;
            `;
            this.timerElement.parentElement.appendChild(this.moveCountElement);
        }
    }
    
    setupEventListeners() {
        // ★年齢選択のイベントリスナー
        this.elements.seniorChildButton.addEventListener('click', () => {
            this.setAgeGroup('senior-child');
            this.showMainMenu();
        });
        
        this.elements.adultButton.addEventListener('click', () => {
            this.setAgeGroup('adult');
            this.showMainMenu();
        });
        
        this.elements.settingsButton.addEventListener('click', () => {
            this.updateAccountDisplay();
            this.showAgeSelection();
        });
        
        // ★タイマー設定のイベントリスナー
        this.elements.timerEnabled.addEventListener('change', (e) => {
            this.setTimerEnabled(e.target.checked);
        });
        
        // ★ログアウトボタンのイベントリスナー
        this.elements.logoutButton.addEventListener('click', async () => {
            if (confirm('ログアウトしますか？\n※匿名アカウントでログアウトすると、データが失われる可能性があります。')) {
                try {
                    await firebaseAuth.signOut();
                    this.updateAccountDisplay();
                    alert('✅ ログアウトしました');
                } catch (error) {
                    console.error('ログアウトエラー:', error);
                    alert('❌ ログアウトに失敗しました');
                }
            }
        });
        
        this.elements.playButton.addEventListener('click', () => this.startGame());
        this.elements.createButton.addEventListener('click', () => this.openCreatePage());
        this.elements.rulesButton.addEventListener('click', () => this.showRules());
        this.elements.closeRulesButton.addEventListener('click', () => this.showMainMenu());
        this.elements.gameRulesButton.addEventListener('click', () => openGameRulesModal());
        this.elements.retireButton.addEventListener('click', () => this.showRetireConfirm());
        this.elements.backToMenuButton.addEventListener('click', () => this.showMainMenu());
        
        // フッター「メニューに戻る」ボタン
        const footerBackToMenu = document.getElementById('footerBackToMenu');
        if (footerBackToMenu) {
            footerBackToMenu.addEventListener('click', () => {
                this.showMainMenu();
            });
        }
        
        // フッター「ゲームをプレイ」ボタン
        const footerPlayButton = document.getElementById('footerPlayButton');
        if (footerPlayButton) {
            footerPlayButton.addEventListener('click', () => {
                // ユーザー層が選択済みかチェック
                if (this.ageGroup) {
                    // 既に選択済みの場合はメインメニューへ直行
                    this.showMainMenu();
                } else {
                    // 未選択の場合はユーザー層選択画面へ誘導
                    this.showScreen('ageSelect');
                    // スクロールしてユーザー層選択セクションへ
                    setTimeout(() => {
                        const ageSelectContent = document.querySelector('.age-select-content');
                        if (ageSelectContent) {
                            ageSelectContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 100);
                }
            });
        }
        
        this.elements.levelSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === 'custom') {
                this.selectedLevel = 'custom';
            } else if(value.startsWith('create') || value.startsWith('event')) {
                this.selectedLevel = value; // create1-3, event1-Nをそのまま設定
            } else {
                this.selectedLevel = parseInt(value); // HTMLの値をそのまま保存（0, 1, 2, ...）
            }
            // console.log('レベル選択されました:', this.selectedLevel);
        });
        this.elements.colorMode.addEventListener('change', (e) => {
            this.colorMode = e.target.checked;
            if (this.screens.game.classList.contains('active')) {
                this.drawGame();
            }
        });
        this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
        
        // スマホでのタッチ操作を改善（スクロール・ズーム対応）
        let touchStartTime = 0;
        let touchStartPos = null;
        let touchMoved = false;
        
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            touchStartPos = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
            touchMoved = false;
            
            // 複数指の場合（ピンチズーム）は何もしない
            if (e.touches.length > 1) {
                return;
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            if (!touchStartPos) return;
            
            const currentTouch = e.touches[0];
            const deltaX = Math.abs(currentTouch.clientX - touchStartPos.x);
            const deltaY = Math.abs(currentTouch.clientY - touchStartPos.y);
            
            // 一定以上動いた場合はスクロールと判定
            if (deltaX > 10 || deltaY > 10) {
                touchMoved = true;
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - touchStartTime;
            
            // 短時間のタップでかつ移動が少ない場合のみゲーム操作として処理
            if (!touchMoved && touchDuration < 500 && touchStartPos) {
                e.preventDefault(); // この場合のみpreventDefault
                
                const mouseEvent = new MouseEvent('click', {
                    clientX: touchStartPos.x,
                    clientY: touchStartPos.y
                });
                this.canvas.dispatchEvent(mouseEvent);
            }
            
            // リセット
            touchStartTime = 0;
            touchStartPos = null;
            touchMoved = false;
        });
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // リタイヤ確認画面のボタンイベント
        this.elements.confirmRetireYes.addEventListener('click', () => this.showStuckConfirm());
        this.elements.confirmRetireNo.addEventListener('click', () => this.showGame());

        // 詰んだ確認画面のボタンイベント
        this.elements.confirmStuckYes.addEventListener('click', () => this.showMainMenu());
        this.elements.confirmStuckNo.addEventListener('click', () => this.showGame());

        // ★新たに追加
        this.elements.recordsButton.addEventListener('click', () => this.showRecords());
        this.elements.backToMenuFromRecords.addEventListener('click', () => this.showMainMenu());
        this.elements.clearRecordsButton.addEventListener('click', () => this.clearAllRecords());
        
        // ★アカウント設定関連
        const accountSettingsButton = document.getElementById('accountSettingsButton');
        const backToMenuFromSettings = document.getElementById('backToMenuFromSettings');
        const sendResetEmailButton = document.getElementById('sendResetEmailButton');
        
        if (accountSettingsButton) {
            accountSettingsButton.addEventListener('click', () => this.showAccountSettings());
        }
        
        if (backToMenuFromSettings) {
            backToMenuFromSettings.addEventListener('click', () => this.showMainMenu());
        }
        
        if (sendResetEmailButton) {
            sendResetEmailButton.addEventListener('click', () => this.sendPasswordResetEmail());
        }
    }
    
    showScreen(screenName) {
        // console.log('画面切り替え:', screenName);

        Object.values(this.screens).forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
            }
        });
        
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            // console.log('画面表示成功:', screenName);
        } else {
            console.error('画面が見つかりません:', screenName, 'Available screens:', Object.keys(this.screens));
        }
        
        if (screenName !== 'game' && this.canvas && this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // ★画面切り替え時にスクロールを一番上にリセット
        window.scrollTo(0, 0);
        
        // ★画面切り替え時に広告制御を実行（年齢選択画面以外）
        if (this.ageGroup && screenName !== 'ageSelect') {
            this.controlAdDisplay();
        }
        
        // フッター表示制御
        this.updateFooter(screenName);
    }
    
    // ★メインメニューを表示（年齢選択後）
    showMainMenu() { 
        this.showScreen('mainMenu'); 
        this.resetGame(); 
    }
    
    showRules() { 
        this.showScreen('rules'); 
    }

    showGame() {
        this.showScreen('game');
        // ゲーム画面に戻る際に描画を再開
        if (this.tiles.length > 0) {
            this.drawGame();
        }
    }

    showRetireConfirm() {
        this.showScreen('retireConfirm');
    }

    showStuckConfirm() {
        // ★リタイア回数をカウント
        this.retireCount++;
        
        // ★メッセージを交互に表示
        const stuckTitle = document.querySelector('#stuckConfirmScreen h2');
        if (stuckTitle) {
            if (this.retireCount % 2 === 1) {
                stuckTitle.textContent = 'え、詰んだのw？？';
            } else {
                stuckTitle.textContent = 'あ、また会えたねｗ';
            }
        }
        
        this.showScreen('stuckConfirm');
    }

    // ★新たに追加
    showRecords() {
        this.updateRecordsTable();
        this.showScreen('records');
    }

    // フッター表示制御
    updateFooter(screenName) {
        const footer = document.getElementById('globalFooter');
        const backButton = document.getElementById('footerBackToMenu');
        const guideLink = document.getElementById('footerGuide');
        const playButton = document.getElementById('footerPlayButton');
        
        if (!footer) {
            console.warn('グローバルフッターが見つかりません');
            return;
        }
        
        // ゲーム画面、リタイア確認、詰んだ確認では非表示
        if (screenName === 'game' || screenName === 'retireConfirm' || screenName === 'stuckConfirm') {
            footer.style.display = 'none';
        } else {
            // それ以外の画面では常に表示（基本形）
            footer.style.display = 'block';
            
            // 年齢選択画面でのみ「ゲームをプレイ」ボタンを表示
            if (playButton) {
                playButton.style.display = screenName === 'ageSelect' ? 'block' : 'none';
            }
            
            // メインメニューと年齢選択画面では「遊び方ガイド」を表示、「メニューに戻る」は非表示
            if (screenName === 'mainMenu' || screenName === 'ageSelect') {
                if (backButton) backButton.style.display = 'none';
                if (guideLink) guideLink.style.display = 'flex';
            } else {
                // その他の画面では「メニューに戻る」を表示、「遊び方ガイド」は非表示
                if (backButton) backButton.style.display = 'flex';
                if (guideLink) guideLink.style.display = 'none';
            }
        }
    }

    startGame() {
        //console.log('startGame開始 - 選択されたレベル:', this.selectedLevel);
        
        // Createレベルの場合、カスタムパズルの確認
        if (typeof this.selectedLevel === 'string' && this.selectedLevel.startsWith('create')) {
            //console.log('Createレベルが選択されました:', this.selectedLevel);
            const customPuzzleData = localStorage.getItem(this.selectedLevel);
            //console.log('保存されたデータ:', customPuzzleData);
            if (!customPuzzleData) {
                console.error(`${this.selectedLevel}のデータが見つかりません`);
                alert(`${this.selectedLevel.toUpperCase()}に保存されたパズルが見つかりません。先にクリエイトでパズルを作成してください。`);
                return;
            } else {
                console.log('createマップデータが見つかりました、ゲームを開始します');
            }
        }
        
        // イベントマップの場合、データの確認
        if (typeof this.selectedLevel === 'string' && this.selectedLevel.startsWith('event')) {
            const eventId = parseInt(this.selectedLevel.replace('event', ''));
            const eventMap = this.getEventMapData(eventId);
            if (!eventMap || !eventMap.code || eventMap.code.length === 0) {
                console.error(`${this.selectedLevel}のデータが見つかりません`);
                alert(`イベントマップのデータが見つかりません。`);
                return;
            }
        }
        
        //console.log('ゲーム画面を表示します');
        this.showScreen('game');
        //console.log('ゲームを初期化します');
        this.initializeGame();
        //console.log('タイマーを開始します');
        this.startTimer();
        
        // レベル1の場合のみルールボタンを表示
        if (!this.isCustomLevel(this.selectedLevel)) {
            const currentLevel = parseInt(this.selectedLevel) + 1;
            if (currentLevel === 1) {
                this.elements.gameRulesButton.style.display = 'inline-block';
            } else {
                this.elements.gameRulesButton.style.display = 'none';
            }
        } else {
            // Createレベル・イベントマップの場合はルールボタンを非表示
            this.elements.gameRulesButton.style.display = 'none';
        }
        
        // 手数をリセット
        this.resetMoveCount();
    }
    
    initializeGame() {
        // Createレベルまたはカスタムパズルの確認
        const useCustomPuzzle = localStorage.getItem('useCustomPuzzle') === 'true';
        let customPuzzleData = null;
        
        //console.log('ゲーム初期化開始 - レベル:', this.selectedLevel, 'カスタムパズル使用:', useCustomPuzzle);
        
        if (typeof this.selectedLevel === 'string' && this.selectedLevel.startsWith('create')) {
            //console.log('Createレベルが選択されました:', this.selectedLevel);
            customPuzzleData = localStorage.getItem(this.selectedLevel);
            //console.log(`${this.selectedLevel}データ:`, customPuzzleData);
            if (!customPuzzleData) {
                console.error(`${this.selectedLevel}のデータが見つかりません`);
            } else {
                //console.log('createマップデータが見つかりました、解析中...');
                try {
                    const parsedData = JSON.parse(customPuzzleData);
                    //console.log('解析されたデータ:', parsedData);
                    //console.log('データのサイズ:', parsedData.size);
                    //console.log('データのボード:', parsedData.board);
                    customPuzzleData = parsedData; // 解析済みデータを設定
                } catch (error) {
                    console.error('データの解析に失敗:', error);
                    customPuzzleData = null;
                }
            }
        } else if (typeof this.selectedLevel === 'string' && this.selectedLevel.startsWith('event')) {
            console.log('✅ イベントマップが選択されました:', this.selectedLevel);
            const eventId = parseInt(this.selectedLevel.replace('event', ''));
            console.log('✅ イベントID:', eventId);
            const eventMap = this.getEventMapData(eventId);
            console.log('✅ 取得したイベントマップ:', eventMap);
            if (eventMap && eventMap.code && eventMap.code.length > 0) {
                // 共有コードをデコード
                const shareCode = eventMap.code.join(''); // 複数行の場合は結合
                console.log('✅ 共有コード:', shareCode);
                if (typeof decodeShareCode === 'function') {
                    try {
                        customPuzzleData = decodeShareCode(shareCode);
                        console.log('✅ イベントマップのデコード成功:', customPuzzleData);
                    } catch (error) {
                        console.error('❌ イベントマップのデコードに失敗:', error);
                        customPuzzleData = null;
                    }
                } else {
                    console.error('❌ decodeShareCode関数が見つかりません');
                }
            } else {
                console.error(`❌ イベントマップ${eventId}のデータが見つかりません`);
            }
        } else if (useCustomPuzzle) {
            customPuzzleData = localStorage.getItem('customPuzzle');
            //console.log('カスタムパズルデータ:', customPuzzleData);
        }
        
        if (customPuzzleData) {
            //console.log('カスタムパズルデータを読み込みます');
            // customPuzzleDataがすでにオブジェクトの場合はそのまま使用、文字列の場合はパース
            const puzzleDataToLoad = typeof customPuzzleData === 'string' ? JSON.parse(customPuzzleData) : customPuzzleData;
            this.loadCustomPuzzle(puzzleDataToLoad);
            // カスタムパズル使用後はフラグをクリア
            localStorage.removeItem('useCustomPuzzle');
        } else if (typeof this.selectedLevel === 'string' && (this.selectedLevel.startsWith('create') || this.selectedLevel.startsWith('event'))) {
            console.error(`${this.selectedLevel}のパズルデータが見つかりません`);
            alert(`${this.selectedLevel.toUpperCase()}のパズルデータが見つかりません。`);
            return;
        } else {
            //console.log('通常のレベル', this.selectedLevel, 'でゲームを開始');
            this.boardSize = parseInt(this.selectedLevel) + 3; // レベル0→3、レベル1→4、etc.
            this.generateDiamondMap();
            
            // ★通常レベルでは固定配列システムを無効化
            this.fixedArray = null;
            this.pieceTypeCleared = {}; // カスタムパズル判定用配列をクリア
            //console.log('通常レベル: 固定配列システムを無効化');
        }
        
        this.setupCanvas();
        this.drawGame();
        this.updateTimerDisplay(); // タイマー表示を更新
        
        // ★通常レベル（数値）のみ隣接チェックを実行（カスタムとイベントは除外）
        if (typeof this.selectedLevel === 'number') {
            setTimeout(() => {
                this.performInitialAdjacencyCheckAndFix();
            }, 100);
        }
    }
    
    generateDiamondMap() {
        let N = this.boardSize;
        
        // boardSizeの値をチェック
        if (!N || N <= 0 || isNaN(N)) {
            console.error('無効なboardSize:', N);
            this.boardSize = 3; // デフォルト値を設定
            N = this.boardSize;
        }
        
        //console.log('ダイヤモンドマップを生成中、サイズ:', N);
        this.mapData = Array(N).fill().map(() => Array(N).fill(999));
        this.mouseRuRu = Array(N).fill().map(() => Array(N).fill(0));
        this.tiles = [];
        let upperPos = [], lowerPos = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            if (x + y < N - 1) upperPos.push([x, y]);
            else if (x + y > N - 1) lowerPos.push([x, y]);
        }
        let upperVals = [];
        for (let i = 1; i <= upperPos.length; i++) upperVals.push(i);
        upperVals = upperVals.sort(() => Math.random() - 0.5);
        let lowerVals = [];
        for (let i = 1; i <= lowerPos.length; i++) lowerVals.push(i);
        lowerVals = lowerVals.sort(() => Math.random() - 0.5);
        upperPos.forEach(([x, y], idx) => { this.mapData[y][x] = upperVals[idx]; });
        lowerPos.forEach(([x, y], idx) => { this.mapData[y][x] = lowerVals[idx]; });
        
        // ★Level 2のコンテスト問題回避処理
        if (this.selectedLevel === 1 && N === 4) { // Level 2 (selectedLevel=1, サイズ4)
            if (this.isContestPuzzle()) {
                console.log('⚠️ コンテスト問題と同じ配置を検出。位置5と6を入れ替えます。');
                this.swapPositions5and6();
            }
        }
        
        // ★countPieceを設定
        this.countPiece = upperPos.length + lowerPos.length;
        //console.log('通常レベルのピース数を設定:', this.countPiece);
    }
    
    // ★コンテスト問題と同じ配置かチェック
    isContestPuzzle() {
        // コンテストの配置パターン（日本パズル連盟コンテスト応募の為、除外）
        // 行1: 1, 3, 6, 999 (999=空)
        // 行2: 2, 5, 999, 6
        // 行3: 4, 999, 5, 3
        // 行4: 999, 4, 2, 1
        const contestPattern = [
            [1, 3, 6, 999],
            [2, 5, 999, 6],
            [4, 999, 5, 3],
            [999, 4, 2, 1]
        ];
        
        // 現在のマップと比較
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                if (this.mapData[y][x] !== contestPattern[y][x]) {
                    return false; // 一致しない
                }
            }
        }
        
        return true; // 完全一致
    }
    
    // ★位置5と6を入れ替える
    swapPositions5and6() {
        // マップ全体から5と6の位置を探して入れ替え
        let pos5 = null;
        let pos6 = null;
        
        for (let y = 0; y < this.mapData.length; y++) {
            for (let x = 0; x < this.mapData[y].length; x++) {
                if (this.mapData[y][x] === 5) {
                    pos5 = { x, y };
                } else if (this.mapData[y][x] === 6) {
                    pos6 = { x, y };
                }
            }
        }
        
        // 入れ替え
        if (pos5 && pos6) {
            this.mapData[pos5.y][pos5.x] = 6;
            this.mapData[pos6.y][pos6.x] = 5;
            console.log(`✅ 位置を入れ替えました: (${pos5.x},${pos5.y})の5 ⇔ (${pos6.x},${pos6.y})の6`);
        }
    }
    
    loadCustomPuzzle(puzzleData) {
        //console.log('loadCustomPuzzle開始 - カスタムパズルを読み込み:', puzzleData);

        this.boardSize = puzzleData.size;
        //console.log('ボードサイズ設定:', this.boardSize);

        this.mapData = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(999));
        this.mouseRuRu = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
        this.tiles = [];

        //console.log('マップデータ初期化完了');
        
        let pieceCount = 0;
        // カスタムパズルのボードデータを変換
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (puzzleData.board[y] && puzzleData.board[y][x]) {
                    this.mapData[y][x] = puzzleData.board[y][x].value;
                    pieceCount++;
                    //console.log(`駒配置: (${x}, ${y}) = ${puzzleData.board[y][x].value}`);
                } else {
                    this.mapData[y][x] = 999; // 空のセル
                }
            }
        }

        //console.log(`駒の配置完了 - 配置された駒数: ${pieceCount}`);

        // ★countPieceを設定
        this.countPiece = pieceCount;
        //console.log('カスタムパズルのピース数を設定:', this.countPiece);
        
        // 色モードの設定
        this.colorMode = puzzleData.colorMode !== false;
        
        // 動的クリア条件の設定
        this.requiredGroups = puzzleData.requiredGroups || null;
        //console.log('動的クリア条件設定:', this.requiredGroups);
        
        // カスタムパズル判定用の配列初期化（クリア判定の識別のみに使用）
        this.pieceTypeCleared = {};
        this.totalPieceTypes = 0;
        
        // ★新しい固定配列の初期化（マップと同じサイズ）
        this.fixedArray = [];
        for (let y = 0; y < this.boardSize; y++) {
            this.fixedArray[y] = [];
            for (let x = 0; x < this.boardSize; x++) {
                this.fixedArray[y][x] = 0; // 初期状態では全て0
            }
        }
        //console.log('固定配列初期化完了:', this.fixedArray);
        
        // 配置された駒の種類を調べて配列を初期化
        const pieceTypes = new Set();
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.mapData[y][x] < 999) {
                    pieceTypes.add(this.mapData[y][x]);
                }
            }
        }
        
        // カスタムパズル判定用として各駒種類を記録（値は使用しない）
        pieceTypes.forEach(pieceType => {
            this.pieceTypeCleared[pieceType] = 0; // 値は無意味、存在チェックのみ
        });
        
        this.totalPieceTypes = pieceTypes.size;
        //console.log('カスタムパズル判定用配列初期化:', Object.keys(this.pieceTypeCleared), '駒種類数:', this.totalPieceTypes);
        
        //console.log('カスタムパズル読み込み完了 - サイズ:', this.boardSize, '色モード:', this.colorMode, '必要グループ数:', this.requiredGroups);
        
        // ★カスタムパズル読み込み後に隣接チェックを実行
        setTimeout(() => {
            this.performInitialAdjacencyCheckAndFix();
        }, 100);
    }
    
    setupCanvas() {
        const N = this.boardSize, s = this.tileSize, margin = s;
        const TOP_MARGIN = 120;

        const boardHeight = (N - 1) * s + s;
        const canvasW = ((N - 1) * s) + s * 2 + margin * 2;
        const canvasH = boardHeight + TOP_MARGIN + margin * 2;

        this.canvas.width = canvasW;
        this.canvas.height = canvasH;

        this.centerX = Math.floor(canvasW / 2);
        this.centerY = TOP_MARGIN;

        this.ms = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
            this.ms.push({
                x, y,
                screenX: this.centerX + (x - y) * s / 2,
                screenY: this.centerY + (x + y) * s / 2,
                value: this.mapData[y][x]
            });
        
        // ★既存のtilesのisFixed状態を保持
        const oldTiles = this.tiles || [];
        this.tiles = this.ms.filter(cell => cell.value < 999);
        
        // 既存のisFixed状態を新しいtilesに復元
        this.tiles.forEach(newTile => {
            const oldTile = oldTiles.find(old => old.x === newTile.x && old.y === newTile.y);
            if (oldTile && oldTile.isFixed) {
                newTile.isFixed = true;
            }
        });

        if (this.canvasScale === undefined) {
            // スマホでの拡大を考慮したスケーリング処理
            const maxW = window.innerWidth;
            const maxH = window.innerHeight - 150; // UI要素分の余白を確保
            
            // スマホの場合はより柔軟なスケーリングを適用
            const isMobile = window.innerWidth <= 768;
            
            if (isMobile) {
                // スマホの場合：最小スケールを設定して、拡大時に横スクロール可能にする
                const minScale = Math.max(0.5, Math.min(maxW / canvasW, maxH / canvasH));
                this.canvasScale = Math.min(1, minScale);
                
                // キャンバスのスタイルを設定
                this.canvas.style.width = (canvasW * this.canvasScale) + 'px';
                this.canvas.style.height = (canvasH * this.canvasScale) + 'px';
                
                // スマホでの拡大対応：最小幅を保証
                this.canvas.style.minWidth = (canvasW * 0.5) + 'px';
                this.canvas.style.minHeight = (canvasH * 0.5) + 'px';
                
                // 親要素に横スクロールを許可
                const gameScreen = document.getElementById('gameScreen');
                if (gameScreen) {
                    gameScreen.style.overflowX = 'auto';
                    gameScreen.style.overflowY = 'auto';
                }
            } else {
                // PC の場合：従来通り
                this.canvasScale = Math.min(1, maxW / canvasW, maxH / canvasH);
                this.canvas.style.width = (canvasW * this.canvasScale) + 'px';
                this.canvas.style.height = (canvasH * this.canvasScale) + 'px';
            }
        }
    }
    
    drawGrid() {
        const s = this.tileSize;
        this.ctx.save();
        this.ctx.strokeStyle = '#888';
        this.ctx.lineWidth = 2;
        for (const cell of this.ms) {
            const cx = cell.screenX, cy = cell.screenY;
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy - s / 2);
            this.ctx.lineTo(cx + s / 2, cy);
            this.ctx.lineTo(cx, cy + s / 2);
            this.ctx.lineTo(cx - s / 2, cy);
            this.ctx.closePath();
            this.ctx.stroke();
        }
        this.ctx.restore();
    }
    
    drawGame() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // ★豪華なゲーム背景
        this.ctx.save();

        // ベースのグラデーション
        const baseGradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        baseGradient.addColorStop(0, '#f8f9fa');
        baseGradient.addColorStop(0.3, '#e9ecef');
        baseGradient.addColorStop(0.7, '#dee2e6');
        baseGradient.addColorStop(1, '#ced4da');
        this.ctx.fillStyle = baseGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 放射状のグラデーション（中央の光）
        const centerGradient = this.ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, this.boardSize * this.tileSize * 1.5
        );
        centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        centerGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
        centerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        this.ctx.fillStyle = centerGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 装飾的な円
        this.ctx.globalAlpha = 0.1;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = this.boardSize * this.tileSize * 0.8;
            const x = this.centerX + Math.cos(angle) * radius;
            const y = this.centerY + Math.sin(angle) * radius;

            const circleGradient = this.ctx.createRadialGradient(x, y, 0, x, y, 50);
            circleGradient.addColorStop(0, '#40CFFF');
            circleGradient.addColorStop(1, 'rgba(64, 207, 255, 0)');
            this.ctx.fillStyle = circleGradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 50, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;

        // 波紋効果
        this.ctx.globalAlpha = 0.08;
        for (let i = 0; i < 5; i++) {
            const waveRadius = (this.boardSize * this.tileSize * 0.3) + (i * 20);
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, waveRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#40CFFF';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        this.ctx.globalAlpha = 1;

        // 四隅の装飾
        this.ctx.globalAlpha = 0.15;
        const corners = [
            {x: 0, y: 0}, {x: this.canvas.width, y: 0},
            {x: 0, y: this.canvas.height}, {x: this.canvas.width, y: this.canvas.height}
        ];
        corners.forEach(corner => {
            const cornerGradient = this.ctx.createRadialGradient(
                corner.x, corner.y, 0,
                corner.x, corner.y, 100
            );
            cornerGradient.addColorStop(0, '#5555FF');
            cornerGradient.addColorStop(1, 'rgba(85, 85, 255, 0)');
            this.ctx.fillStyle = cornerGradient;
            this.ctx.beginPath();
            this.ctx.arc(corner.x, corner.y, 100, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;

        this.ctx.restore();

        this.drawGrid();
        
        // ★移動可能位置のハイライト表示
        if (this.heldTile) {
            this.drawValidMoves(this.heldTile);
        }
        
        this.tiles.forEach(tile => {
            if (this.heldTile && tile.x === this.heldTile.x && tile.y === this.heldTile.y) return;
            this.drawDiamondTile(tile, this.selectedTileValue !== null && tile.value === this.selectedTileValue);
        });
        if (this.heldTile) {
            this.drawDiamondTile({
                ...this.heldTile,
                screenX: this.heldTileMousePos ? this.heldTileMousePos[0] : this.heldTile.screenX,
                screenY: this.heldTileMousePos ? this.heldTileMousePos[1] : this.heldTile.screenY,
                isHeld: true
            }, true);
        }

        // ★著作権表示
        this.ctx.save();
        this.ctx.font = "11px Arial";
        this.ctx.fillStyle = "rgba(102, 102, 102, 0.5)";
        this.ctx.textAlign = "left";
        this.ctx.fillText("このゲームをパクらないで", 10, this.canvas.height - 50);
        this.ctx.fillText("作成日: 2025/7/29", 10, this.canvas.height - 35);
        this.ctx.fillText("クリエイター: Yuki", 10, this.canvas.height - 20);
        this.ctx.restore();

        // ★クリア時の表示（上部に配置）
        if (this.isCleared) {
            this.ctx.save();
            this.ctx.font = "bold 32px Arial";
            this.ctx.fillStyle = "#40CFFF";
            this.ctx.strokeStyle = "#fff";
            this.ctx.lineWidth = 2;
            this.ctx.textAlign = "center";
            this.ctx.shadowColor = "rgba(64, 207, 255, 0.5)";
            this.ctx.shadowBlur = 20;
            this.ctx.strokeText("🎉 CLEAR! 🎉", this.canvas.width / 2, 50);
            this.ctx.fillText("🎉 CLEAR! 🎉", this.canvas.width / 2, 50);
            this.ctx.restore();

            // 次へボタン（右上に配置）
            const btnX = this.canvas.width - 100;
            const btnY = 80;
            const btnW = 160, btnH = 50;

            this.ctx.save();
            const buttonGradient = this.ctx.createLinearGradient(btnX - btnW/2, btnY - btnH/2, btnX + btnW/2, btnY + btnH/2);
            buttonGradient.addColorStop(0, '#40CFFF');
            buttonGradient.addColorStop(1, '#5555FF');

            // ★roundRectの代わりに手動で角丸四角形を描画
            this.drawRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 15);
            this.ctx.fillStyle = buttonGradient;
            this.ctx.shadowColor = "rgba(64, 207, 255, 0.4)";
            this.ctx.shadowBlur = 15;
            this.ctx.fill();
            this.ctx.strokeStyle = "#fff";
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.font = "bold 18px Arial";
            this.ctx.fillStyle = "#fff";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText("✨ 次へ ✨", btnX, btnY);
            this.ctx.restore();
            
            this.clearButtonRect = { x: btnX - btnW / 2, y: btnY - btnH / 2, w: btnW, h: btnH };
        } else {
            this.clearButtonRect = null;
        }
    }
    
    // ★移動可能位置をハイライトする関数
    drawValidMoves(tile) {
        const validMoves = this.getValidMoves(tile.x, tile.y);
        
        this.ctx.save();
        validMoves.forEach(move => {
            const cell = this.ms.find(c => c.x === move.x && c.y === move.y);
            if (cell) {
                const s = this.tileSize * 0.8;
                const cx = cell.screenX;
                const cy = cell.screenY;
                
                // 移動可能な位置を青く光らせる
                this.ctx.globalAlpha = 0.4;
                this.ctx.fillStyle = '#40CFFF';
                this.ctx.beginPath();
                this.ctx.moveTo(cx, cy - s / 2);
                this.ctx.lineTo(cx + s / 2, cy);
                this.ctx.lineTo(cx, cy + s / 2);
                this.ctx.lineTo(cx - s / 2, cy);
                this.ctx.closePath();
                this.ctx.fill();
                
                // 枠線も追加
                this.ctx.globalAlpha = 0.8;
                this.ctx.strokeStyle = '#40CFFF';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            }
        });
        this.ctx.restore();
    }
    
    // ★移動可能な位置を取得する関数（直線上の空きマスを全て検索）
    getValidMoves(startX, startY) {
        const validMoves = [];
        // UI上の斜め方向（移動可能方向）= 配列上の上下左右
        const directions = [
            { dx: -1, dy: 0 }, // 上
            { dx: 1, dy: 0 },  // 下
            { dx: 0, dy: -1 }, // 左
            { dx: 0, dy: 1 }   // 右
        ];
        
        directions.forEach(dir => {
            let x = startX + dir.dx;
            let y = startY + dir.dy;
            
            // 各方向に対して連続した空きマスを探す
            while (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize) {
                if (this.mapData[y][x] >= 999) {
                    // 空きマスが見つかった場合、移動可能位置として追加
                    validMoves.push({ x, y });
                } else {
                    // タイルがある場合は、その方向への移動を停止
                    break;
                }
                x += dir.dx;
                y += dir.dy;
            }
        });
        
        return validMoves;
    }
    
    // ★手動で角丸四角形を描画する関数
    drawRoundedRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }
    
    drawDiamondTile(tile, highlight = false) {
        const s = this.tileSize * 0.8, cx = tile.screenX, cy = tile.screenY;
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#E95D72', '#66B933', '#A575F5', '#FF9D32'];
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - s / 2);
        this.ctx.lineTo(cx + s / 2, cy);
        this.ctx.lineTo(cx, cy + s / 2);
        this.ctx.lineTo(cx - s / 2, cy);
        this.ctx.closePath();
        this.ctx.fillStyle = this.colorMode ? colors[(tile.value - 1) % colors.length] : '#E0E0E0';
        this.ctx.globalAlpha = tile.isHeld ? 0.7 : 1;
        this.ctx.fill(); this.ctx.globalAlpha = 1;
        
        // ★固定駒の金色光るエフェクト（前回の方式）
        if (tile.isFixed) {
            this.ctx.save();
            const time = Date.now() / 400;
            const opacity = (Math.sin(time) + 1) / 2 * 0.6 + 0.4;
            this.ctx.strokeStyle = `rgba(255, 215, 0, ${opacity})`;
            this.ctx.lineWidth = 8;
            this.ctx.shadowColor = `rgba(255, 215, 0, ${opacity})`;
            this.ctx.shadowBlur = 20;
            this.ctx.stroke();
            this.ctx.restore();
        }
        
        if (highlight) {
            this.ctx.save();
            
            // ★すべての駒で濃い青色のエフェクトを使用（視認性向上）
            this.ctx.strokeStyle = "#4080FF";
            this.ctx.lineWidth = 6;
            this.ctx.shadowColor = "#4080FF";
            this.ctx.shadowBlur = 15;
            this.ctx.stroke();
            this.ctx.restore();
        }
        
        // 通常の枠線描画（固定駒以外）
        if (!tile.isFixed) {
            if (this.mouseRuRu[tile.y][tile.x] === 1) { this.ctx.strokeStyle = '#FFD700'; this.ctx.lineWidth = 3; }
            else if (tile.isHeld) { this.ctx.strokeStyle = '#FF3333'; this.ctx.lineWidth = 4; }
            else { this.ctx.strokeStyle = '#333'; this.ctx.lineWidth = 2; }
            this.ctx.stroke();
        }
        
        this.ctx.fillStyle = this.colorMode ? "#222" : "#333";
        this.ctx.font = `bold ${this.tileSize / 2.3}px Arial`;
        this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
        this.ctx.fillText(tile.value, cx, cy);
        this.ctx.restore();
    }
    
    // ゲーム開始後の隣接チェックと固定処理
    performInitialAdjacencyCheckAndFix() {
        if (!this.mapData) {
            console.log('mapDataが存在しません');
            return;
        }
        
        const adjacentPairs = this.findAdjacentSameValues();
        
        if (adjacentPairs.length > 0) {
            alert('固定駒があります。');
            
            // 隣接する駒を固定する（独自のisFixedシステム使用）
            this.fixAdjacentPieces(adjacentPairs);
        }
    }
    
    // 隣接する駒を固定する処理
    fixAdjacentPieces(adjacentPairs) {
        //console.log('固定対象のペア:', adjacentPairs);
        adjacentPairs.forEach(pair => {
            // 両方の位置の駒を固定状態にする
            this.fixTileAt(pair.pos1.x, pair.pos1.y);
            this.fixTileAt(pair.pos2.x, pair.pos2.y);
            //console.log(`ペア固定: (${pair.pos1.x},${pair.pos1.y}) と (${pair.pos2.x},${pair.pos2.y}) 値:${pair.value}`);
            
            // ★カスタムパズルの場合、初期配置の固定駒も固定配列に1を設定
            if (this.fixedArray) {
                if (this.fixedArray[pair.pos1.y]) {
                    this.fixedArray[pair.pos1.y][pair.pos1.x] = 1;
                    //console.log(`初期固定配列: 位置(${pair.pos1.x},${pair.pos1.y})に1を設定`);
                }
                if (this.fixedArray[pair.pos2.y]) {
                    this.fixedArray[pair.pos2.y][pair.pos2.x] = 1;
                    //console.log(`初期固定配列: 位置(${pair.pos2.x},${pair.pos2.y})に1を設定`);
                }
            }
        });
        
        // 画面を再描画
        this.drawGame();
    }
    
    // 指定位置の駒を固定する
    fixTileAt(x, y) {
        if (this.tiles) {
            const tile = this.tiles.find(t => t.x === x && t.y === y);
            if (tile) {
                tile.isFixed = true;
                //console.log(`駒を固定: 位置(${x},${y}) 値:${tile.value}`);
            } else {
                //console.log(`固定対象の駒が見つかりません: 位置(${x},${y})`);
            }
        } else {
            console.log('tilesが初期化されていません');
        }
    }

    // 手数をリセット
    // 初期配置の隣接チェック機能（警告のみ）
    performInitialAdjacencyCheck() {
        if (!this.mapData) {
            //console.log('mapDataが存在しません');
            return;
        }
        
        const adjacentPairs = this.findAdjacentSameValues();
        
        if (adjacentPairs.length > 0) {
            const pairStrings = adjacentPairs.map(pair => 
                `位置(${pair.pos1.x},${pair.pos1.y})と(${pair.pos2.x},${pair.pos2.y})の数字${pair.value}`
            ).join('\n');
            
            const message = `⚠️ 同じ数字が隣接している箇所があります:\n\n${pairStrings}\n\nこれらの駒は最初から固定状態になっています。`;
            
            alert(message);
        }
    }
    
    // 隣接する同じ値のペアを検索（UI上の斜め方向のみ = 配列上の上下左右）
    findAdjacentSameValues() {
        const adjacentPairs = [];
        // ★UI上の斜め方向（移動可能方向）= 配列上の上下左右
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ];
        
        for (let y = 0; y < this.mapData.length; y++) {
            for (let x = 0; x < this.mapData[y].length; x++) {
                const currentValue = this.mapData[y][x];
                if (currentValue >= 999) continue; // 空のセルをスキップ
                
                // 各方向をチェック
                for (const [dx, dy] of directions) {
                    const newX = x + dx;
                    const newY = y + dy;
                    
                    // 境界チェック
                    if (newY >= 0 && newY < this.mapData.length && 
                        newX >= 0 && newX < this.mapData[newY].length) {
                        
                        const adjacentValue = this.mapData[newY][newX];
                        
                        // 同じ値で、まだペアとして記録されていない場合
                        if (currentValue === adjacentValue && currentValue < 999) {
                            // 重複チェック（既に逆方向でペアが記録されていないか）
                            const alreadyExists = adjacentPairs.some(pair => 
                                (pair.pos1.x === newX && pair.pos1.y === newY && 
                                 pair.pos2.x === x && pair.pos2.y === y) ||
                                (pair.pos1.x === x && pair.pos1.y === y && 
                                 pair.pos2.x === newX && pair.pos2.y === newY)
                            );
                            
                            if (!alreadyExists) {
                                adjacentPairs.push({
                                    value: currentValue,
                                    pos1: { x, y },
                                    pos2: { x: newX, y: newY }
                                });
                            }
                        }
                    }
                }
            }
        }
        
        return adjacentPairs;
    }

    resetMoveCount() {
        this.moveCount = 0;
        this.updateMoveDisplay();
    }
    
    // 手数を増加
    incrementMoveCount() {
        this.moveCount++;
        this.updateMoveDisplay();
        //console.log(`手数: ${this.moveCount}`);
    }
    
    // 手数表示を更新
    updateMoveDisplay() {
        if (this.moveCountElement) {
            this.moveCountElement.textContent = `Moves: ${this.moveCount}`;
        }
    }
    
    onCanvasClick(event) {
        const [cx, cy] = this.getCanvasXY(event);
        
        if (this.isCleared && this.clearButtonRect) {
            const r = this.clearButtonRect;
            if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
                this.isCleared = false;
                this.clearButtonRect = null;
                this.endGame();
                return;
            }
        }
        
        if (!this.heldTile) {
            const tile = this.getTileAt(cx, cy, false, true);
            if (tile) {
                // ★固定されている駒（isFixedシステム）は選択できない
                if (tile.isFixed) {
                    //console.log(`固定された駒は動かせません: 位置(${tile.x},${tile.y}) 値:${tile.value}`);
                    return;
                }
                
                this.heldTile = { ...tile };
                this.heldTileMousePos = [cx, cy];
                this.selectedTileValue = tile.value;
                this.drawGame();
            } else {
                this.selectedTileValue = null;
                this.drawGame();
            }
        } else {
            const emptyTile = this.getTileAt(cx, cy, true);
            if (emptyTile && this.mapData[emptyTile.y][emptyTile.x] >= 999) {
                const validMoves = this.getValidMoves(this.heldTile.x, this.heldTile.y);
                const isValidMove = validMoves.some(move => move.x === emptyTile.x && move.y === emptyTile.y);
                
                if (isValidMove) {
                    const sx = this.heldTile.x, sy = this.heldTile.y;
                    
                    // ★手数カウント（常にカウント、移動しなくても）
                    this.incrementMoveCount();
                    
                    this.mapData[emptyTile.y][emptyTile.x] = this.heldTile.value;
                    this.mapData[sy][sx] = 999;
                    this.updateMouseRuRuAfterMove(emptyTile.x, emptyTile.y);
                    this.updateMouseRuRuAfterMove(sx, sy);
                    this.setupCanvas();
                    
                    if (this.checkWin()) {
                        this.isCleared = true;
                        this.stopTimer();
                        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                        this.clearTimeSeconds = elapsed;
                        this.heldTile = null;
                        this.heldTileMousePos = null;
                        this.selectedTileValue = null;
                        this.drawGame();
                        return;
                    }
                } else {
                    // ★移動できない場所でも手数カウント
                    this.incrementMoveCount();
                }
            } else {
                // ★空きマス以外をクリックした場合も手数カウント
                this.incrementMoveCount();
            }
            
            this.heldTile = null;
            this.heldTileMousePos = null;
            this.selectedTileValue = null;
            this.drawGame();
        }
        
        // クリア時の処理部分で記録を保存
        if (this.sumMouseRuRu === this.tiles.length) {
            this.isCleared = true;
            this.stopTimer();
            
            // ★記録を保存
            const currentLevel = this.selectedLevel - 2;
            const clearTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.saveRecord(currentLevel, clearTime, this.moveCount);
            
            // 既存のコード...
        }
    }
    
    onMouseMove(event) {
        if (this.isCleared) return;
        
        if (this.heldTile) {
            this.heldTileMousePos = this.getCanvasXY(event);
            this.drawGame();
        }
    }
    
    getCanvasXY(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return [
            (event.clientX - rect.left) * scaleX,
            (event.clientY - rect.top) * scaleY
        ];
    }
    
    getTileAt(x, y, emptyOnly = false, movableOnly = false) {
        const s = this.tileSize * 0.8;
        let res = null;
        for (const cell of this.ms) {
            if (emptyOnly && this.mapData[cell.y][cell.x] < 999) continue;
            if (!emptyOnly && this.mapData[cell.y][cell.x] >= 999) continue;
            if (movableOnly && this.mouseRuRu[cell.y][cell.x] === 1) continue;
            const dx = Math.abs(x - cell.screenX), dy = Math.abs(y - cell.screenY);
            if (dx / (s / 2) + dy / (s / 2) <= 1) { res = cell; break; }
        }
        return res;
    }
    
    updateMouseRuRuAfterMove(x, y) {
        if (this.mapData[y][x] >= 999) return;
        
        const currentValue = this.mapData[y][x];
        let hasAdjacent = false;
        
        //console.log(`updateMouseRuRuAfterMove: 位置(${x},${y}) 値:${currentValue}`);
        
        // ★ダイヤモンド型ボードでは、UI上の斜め方向（移動可能方向）= 配列上の上下左右
        const dirs = [
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
        ];
        
        for (const dir of dirs) {
            const nx = x + dir.dx, ny = y + dir.dy;
            if (
                ny >= 0 && ny < this.mapData.length &&
                nx >= 0 && nx < this.mapData.length &&
                this.mapData[ny][nx] < 999 &&
                this.mapData[y][x] === this.mapData[ny][nx]
            ) {
                hasAdjacent = true;
                //console.log(`隣接発見: (${x},${y})=${currentValue} <-> (${nx},${ny})=${this.mapData[ny][nx]}`);
                
                // ★isFixedで固定されている駒はmouseRuRuシステムの対象外にする
                const currentTile = this.tiles.find(t => t.x === x && t.y === y);
                const adjacentTile = this.tiles.find(t => t.x === nx && t.y === ny);
                
                if (!currentTile?.isFixed && this.mouseRuRu[y][x] === 0) { 
                    this.mouseRuRu[y][x] = 1; 
                    this.sumMouseRuRu++; 
                    //console.log(`位置(${x},${y})をmouseRuRu=1に設定, 合計:${this.sumMouseRuRu}`);
                    
                    // ★カスタムパズルの場合、固定配列に1を設定
                    if (this.fixedArray && this.fixedArray[y]) {
                        this.fixedArray[y][x] = 1;
                        //console.log(`固定配列: 位置(${x},${y})に1を設定`);
                    }
                }
                if (!adjacentTile?.isFixed && this.mouseRuRu[ny][nx] === 0) { 
                    this.mouseRuRu[ny][nx] = 1; 
                    this.sumMouseRuRu++; 
                    //console.log(`位置(${nx},${ny})をmouseRuRu=1に設定, 合計:${this.sumMouseRuRu}`);
                    
                    // ★カスタムパズルの場合、固定配列に1を設定
                    if (this.fixedArray && this.fixedArray[ny]) {
                        this.fixedArray[ny][nx] = 1;
                        //console.log(`固定配列: 位置(${nx},${ny})に1を設定`);
                    }
                }
            }
        }
        
        // ★動的クリア条件用の古いシステムは削除
        // 新しい 固定配列システム を使用するため不要
    }
    
    checkWin() {
        // ★カスタムパズル（新しい固定駒システム）の場合
        if (this.pieceTypeCleared && Object.keys(this.pieceTypeCleared).length > 0) {
            //console.log('カスタムパズル - 固定駒システムでチェック');
            
            // 固定配列の1の合計を計算
            let fixedCount = 0;
            for (let y = 0; y < this.boardSize; y++) {
                for (let x = 0; x < this.boardSize; x++) {
                    if (this.fixedArray && this.fixedArray[y] && this.fixedArray[y][x] === 1) {
                        fixedCount++;
                    }
                }
            }
            
            // 駒の総数を計算
            let totalPieces = 0;
            for (let y = 0; y < this.boardSize; y++) {
                for (let x = 0; x < this.boardSize; x++) {
                    if (this.mapData[y][x] < 999) {
                        totalPieces++;
                    }
                }
            }
            
            //console.log(`固定駒数: ${fixedCount}, 総駒数: ${totalPieces}`);
            return fixedCount === totalPieces;
        }
        
        // ★通常レベルの場合：mouseRuRuシステムを使用
        //console.log(`通常レベル - mouseRuRu判定: ${this.sumMouseRuRu}/${this.countPiece}`);
        //console.log('mouseRuRu配列の状態:', this.mouseRuRu);
        return this.sumMouseRuRu === this.countPiece;
    }

    startTimer() {
        if (!this.timerEnabled) {
            this.updateTimerDisplay();
            return;
        }
        this.startTime = Date.now();
        this.elements.timer.textContent = `Time: 0s`;
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.elements.timer.textContent = `Time: ${elapsed}s`;
        }, 1000);
    }
    
    stopTimer() { 
        if (this.timerInterval) clearInterval(this.timerInterval); 
    }
    
    updateTimerDisplay() {
        if (this.elements.timer) {
            this.elements.timer.style.display = this.timerEnabled ? 'block' : 'none';
        }
    }
    
    endGame() {
        // クリア時間を設定
        if (this.clearTimeSeconds !== undefined) {
            this.elements.clearTime.textContent = `Time: ${this.clearTimeSeconds}s`;
        }
        
        // ★手数を設定
        if (this.elements.clearMoves) {
            this.elements.clearMoves.textContent = `Moves: ${this.moveCount}`;
        }
        
        // ★レベル判定：イベントマップか通常レベルか
        let currentLevel;
        let levelDisplayName;
        if (typeof this.selectedLevel === 'string' && this.selectedLevel.startsWith('event')) {
            // イベントマップの場合（年月形式で保存: event202604）
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0'); // 0-11 → 01-12
            currentLevel = `event${year}${month}`;
            levelDisplayName = 'event';
        } else if (typeof this.selectedLevel === 'number') {
            // 通常レベルの場合
            currentLevel = this.selectedLevel + 1; // selectedLevel=0はレベル1なので+1
            levelDisplayName = `Level ${currentLevel}`;
        } else {
            // カスタムレベルなど
            currentLevel = null;
            levelDisplayName = 'Custom';
        }
        
        this.elements.levelClearInfo.textContent = `${levelDisplayName} クリア！`;
        
        // ★記録を保存（ローカル）- イベントと通常レベルのみ
        if (currentLevel !== null) {
            const isNewRecord = this.saveRecord(currentLevel, this.clearTimeSeconds || 0, this.moveCount);
            if (isNewRecord) {
                // 新記録アニメーション（オプション）
               // console.log('🎉 新記録達成！');
            }
        }
        
        // ★オンラインランキングに保存（通常レベルとイベントマップ）
        if (currentLevel !== null && typeof rankingManager !== 'undefined' && rankingManager) {
            // 非同期でランキングに保存（エラーが出ても続行）
            rankingManager.saveGameScore(currentLevel, this.clearTimeSeconds || 0, this.moveCount)
                .catch(err => console.log('ランキング保存スキップ:', err));
            
            // クリア画面のランキングUI更新
            setTimeout(() => {
                if (typeof firebaseAuth !== 'undefined') {
                    rankingManager.updateClearScreenRankingUI(firebaseAuth.currentUser, null, currentLevel);
                }
            }, 100);
        }
        
        // 自動レベルアップ（通常レベルのみ）
        if (typeof this.selectedLevel === 'number' && currentLevel < 10) { // レベル10まであるので、10未満の場合のみ繰り上げ
            const nextSelectedLevel = this.selectedLevel + 1; // selectedLevelを1つ上げる（0→1, 1→2）
            this.elements.levelSelect.selectedIndex = nextSelectedLevel + 4; // イベント1個 + Create3個 = 4個オフセット
            this.selectedLevel = nextSelectedLevel; // 次のselectedLevelを設定
            //console.log(`レベル繰り上げ: Level${currentLevel} → Level${currentLevel+1} (selectedLevel: ${this.selectedLevel})`);
        }
        
        this.showScreen('end');
    }
    
    resetGame() {
        this.stopTimer();
        this.mapData = [];
        this.tiles = [];
        this.heldTile = null;
        this.heldTileMousePos = null;
        this.sumMouseRuRu = 0;
        this.mouseRuRu = [];
        this.canvasScale = undefined;
        this.isCleared = false;
        this.clearButtonRect = null;
        this.clearTimeSeconds = undefined;
        
        // ★動的クリア条件をリセット
        this.pieceTypeCleared = {};
        this.totalPieceTypes = 0;
        this.requiredGroups = null;
        this.countPiece = undefined;
        
        this.resetMoveCount();
        
        if (this.canvas && this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        this.elements.timer.textContent = 'Time: 0s';
    }
    
    // ★新たに追加
    updateRecordsTable() {
        const tbody = this.elements.recordsTableBody;
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // 通常レベル（1-10）
        for (let level = 1; level <= 10; level++) {
            const record = this.getRecord(level);
            const row = tbody.insertRow();
            
            // レベル列
            const levelCell = row.insertCell(0);
            levelCell.textContent = `Level ${level}`;
            levelCell.className = 'level-cell';
            
            // クリア回数列
            const clearCountCell = row.insertCell(1);
            if (record.cleared) {
                clearCountCell.textContent = `${record.clearCount || 1}回`;
                clearCountCell.className = 'cleared-cell';
            } else {
                clearCountCell.textContent = '未クリア';
                clearCountCell.className = 'not-cleared-cell';
            }
            
            // ベストタイム/手数列
            const recordCell = row.insertCell(2);
            if (record.cleared) {
                recordCell.textContent = `${record.bestTime}s / ${record.bestMoves}手`;
                recordCell.className = 'record-cell';
                
                // 最高記録にハイライト
                if (this.isBestRecord(level, record)) {
                    recordCell.classList.add('best-record');
                }
            } else {
                recordCell.textContent = '---';
                recordCell.className = 'not-cleared-cell';
            }
        }
        
        // イベントレベル（現在月のデータを表示）
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const currentEventKey = `event${year}${month}`;
        const eventRecord = this.getRecord(currentEventKey);
        const eventRow = tbody.insertRow();
        
        // レベル列
        const eventLevelCell = eventRow.insertCell(0);
        eventLevelCell.textContent = 'イベント';
        eventLevelCell.className = 'level-cell';
        
        // クリア回数列
        const eventClearCountCell = eventRow.insertCell(1);
        if (eventRecord.cleared) {
            eventClearCountCell.textContent = `${eventRecord.clearCount || 1}回`;
            eventClearCountCell.className = 'cleared-cell';
        } else {
            eventClearCountCell.textContent = '未クリア';
            eventClearCountCell.className = 'not-cleared-cell';
        }
        
        // ベストタイム/手数列
        const eventRecordCell = eventRow.insertCell(2);
        if (eventRecord.cleared) {
            eventRecordCell.textContent = `${eventRecord.bestTime}s / ${eventRecord.bestMoves}手`;
            eventRecordCell.className = 'record-cell';
            
            if (this.isBestRecord(currentEventKey, eventRecord)) {
                eventRecordCell.classList.add('best-record');
            }
        } else {
            eventRecordCell.textContent = '---';
            eventRecordCell.className = 'not-cleared-cell';
        }
    }

    getRecord(level) {
        const records = JSON.parse(localStorage.getItem('doGameRecords') || '{}');
        return records[level] || { cleared: false, bestTime: 999, bestMoves: 999, clearCount: 0 };
    }

    saveRecord(level, time, moves) {
        const records = JSON.parse(localStorage.getItem('doGameRecords') || '{}');
        
        // 既存のクリア回数を取得（なければ0）
        const currentClearCount = records[level] ? (records[level].clearCount || 0) : 0;
        
        if (!records[level] || time < records[level].bestTime || 
            (time === records[level].bestTime && moves < records[level].bestMoves)) {
            records[level] = {
                cleared: true,
                bestTime: time,
                bestMoves: moves,
                clearDate: new Date().toISOString().split('T')[0],
                clearCount: currentClearCount + 1  // クリア回数をインクリメント
            };
            localStorage.setItem('doGameRecords', JSON.stringify(records));
            // console.log(`新記録! Level ${level}: ${time}s / ${moves}手`);
            return true; // 新記録
        } else {
            // 新記録でなくてもクリア回数をインクリメント
            if (records[level]) {
                records[level].clearCount = currentClearCount + 1;
                localStorage.setItem('doGameRecords', JSON.stringify(records));
            }
        }
        return false; // 既存記録以下
    }

    isBestRecord(level, record) {
        return record.cleared;
    }

    clearAllRecords() {
        if (confirm('本当に全ての記録を削除しますか？')) {
            localStorage.removeItem('doGameRecords');
            this.updateRecordsTable();
            alert('記録を削除しました！');
        }
    }

    // クリエイトページを開く
    openCreatePage() {
        window.location.href = 'create.html';
    }
    
    // ★アカウント表示を更新
    updateAccountDisplay() {
        if (!this.elements.accountInfo || !this.elements.logoutButton) return;
        
        if (typeof firebaseAuth !== 'undefined' && firebaseAuth.currentUser) {
            const user = firebaseAuth.currentUser;
            const isAnonymous = user.isAnonymous;
            const displayName = firebaseAuth.userNickname || user.displayName || `ユーザー${user.uid.substring(0, 6)}`;
            
            // アカウント情報を表示
            this.elements.accountInfo.innerHTML = `
                <p class="account-status logged-in">
                    ${isAnonymous ? '🎭 匿名ログイン中' : '✅ Googleアカウント連携中'}
                </p>
                <p class="account-status">
                    ニックネーム: ${displayName}
                </p>
                <p class="account-status" style="font-size: 0.8rem; opacity: 0.7;">
                    UID: ${user.uid.substring(0, 10)}...
                </p>
            `;
            
            // ログアウトボタンを表示
            this.elements.logoutButton.style.display = 'block';
        } else {
            // ログインしていない場合
            this.elements.accountInfo.innerHTML = `
                <p class="account-status">ログインしていません</p>
                <p class="account-status" style="font-size: 0.9rem; opacity: 0.7;">
                    ランキングに参加するにはログインしてください
                </p>
            `;
            
            // ログアウトボタンを非表示
            this.elements.logoutButton.style.display = 'none';
            
            // アカウント設定ボタンも非表示
            const accountSettingsButton = document.getElementById('accountSettingsButton');
            if (accountSettingsButton) {
                accountSettingsButton.style.display = 'none';
            }
        }
        
        // アカウント設定ボタンの表示/非表示
        const accountSettingsButton = document.getElementById('accountSettingsButton');
        if (accountSettingsButton) {
            if (firebaseAuth.currentUser && !firebaseAuth.currentUser.isAnonymous) {
                accountSettingsButton.style.display = 'block';
            } else {
                accountSettingsButton.style.display = 'none';
            }
        }
    }
    
    // ★アカウント設定画面を表示
    showAccountSettings() {
        if (!firebaseAuth.currentUser) {
            alert('ログインが必要です');
            return;
        }
        
        const user = firebaseAuth.currentUser;
        const isAnonymous = user.isAnonymous;
        
        // 現在のアカウント情報を表示
        const currentEmail = document.getElementById('currentEmail');
        const currentNickname = document.getElementById('currentNickname');
        const loginMethod = document.getElementById('loginMethod');
        
        if (currentEmail) {
            currentEmail.textContent = user.email || '未設定';
        }
        
        if (currentNickname) {
            currentNickname.textContent = firebaseAuth.getNickname();
        }
        
        if (loginMethod) {
            if (isAnonymous) {
                loginMethod.textContent = '匿名ログイン';
            } else if (user.providerData && user.providerData.length > 0) {
                const provider = user.providerData[0].providerId;
                if (provider === 'google.com') {
                    loginMethod.textContent = 'Google';
                } else if (provider === 'password') {
                    loginMethod.textContent = 'メール/パスワード';
                } else {
                    loginMethod.textContent = provider;
                }
            } else {
                loginMethod.textContent = '不明';
            }
        }
        
        // メール/パスワードログインの場合のみパスワード変更を表示
        const passwordResetSection = document.getElementById('passwordResetSection');
        const isEmailPasswordUser = user.providerData && 
                                     user.providerData.some(p => p.providerId === 'password');
        
        if (passwordResetSection) {
            passwordResetSection.style.display = isEmailPasswordUser ? 'block' : 'none';
        }
        
        this.showScreen('accountSettings');
    }
    
    // ★パスワード変更リンク送信
    async sendPasswordResetEmail() {
        const user = firebaseAuth.currentUser;
        
        if (!user || !user.email) {
            alert('メールアドレスが登録されていません');
            return;
        }
        
        if (!confirm(`${user.email} にパスワード変更用のリンクを送信しますか？`)) {
            return;
        }
        
        try {
            await firebaseAuth.sendPasswordResetEmail(user.email);
            alert('✅ パスワード変更リンクを送信しました。\n\nメールに記載されたリンクから安全にパスワードを変更できます。\nメールが届かない場合は、迷惑メールフォルダもご確認ください。');
        } catch (error) {
            console.error('パスワード変更リンク送信エラー:', error);
            alert('❌ メール送信に失敗しました: ' + error.message);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => { 
    const game = new DOGame();
    
    // ★グローバルに公開（ランキングマネージャーから参照するため）
    window.game = game;
    
    // カスタムパズルまたはCreateレベルが選択された場合
    const selectedLevel = localStorage.getItem('selectedLevel');
    const customPuzzleData = localStorage.getItem('customPuzzle');
    
    if (selectedLevel === 'custom' && customPuzzleData) {
        // console.log('Createレベルが検出されました。直接ゲームを開始します。');

        // レベル選択をCreateに設定
        game.elements.levelSelect.value = 'custom';
        game.selectedLevel = 'custom';
        
        // 年齢選択をスキップしてゲームを開始
        game.ageGroup = 'adult'; // デフォルトで成人に設定
        game.adsEnabled = true;
        game.timerEnabled = true;
        
        // 年齢選択画面を非表示にしてゲームを開始
        game.showScreen('game');
        game.initializeGame();
        game.startTimer();
        game.resetMoveCount();
        
        // 使用後はフラグをクリア
        localStorage.removeItem('selectedLevel');
    }
});



