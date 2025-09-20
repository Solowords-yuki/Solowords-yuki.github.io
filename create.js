document.addEventListener('DOMContentLoaded', () => {
    console.log('create.js loaded - DOMContentLoaded fired');
    console.log('Document ready state:', document.readyState);
    
    // 少し待ってから初期化を実行
    setTimeout(() => {
        console.log('setTimeout実行開始');
    
    // DOM要素の取得
    const inputSize = document.getElementById('inputSize');
    const inputColorRandom = document.getElementById('inputColorRandom');
    const pieceList = document.getElementById('pieceList');
    const colorList = document.getElementById('colorList');
    const colorModeBtn = document.getElementById('colorModeBtn');
    const moveModeBtn = document.getElementById('moveModeBtn');
    const addPieceBtn = document.getElementById('addPieceBtn');
    const checkIsolatedBtn = document.getElementById('checkIsolatedBtn');
    const mainMap = document.getElementById('mainMap');
    const backToGameButton = document.getElementById('backToGameButton');
    const saveButton = document.getElementById('saveButton');
    
    console.log('DOM要素取得結果:', {
        inputSize: !!inputSize,
        mainMap: !!mainMap,
        pieceList: !!pieceList,
        colorList: !!colorList,
        saveButton: !!saveButton,
        backToGameButton: !!backToGameButton
    });
    
    // 要素の存在確認
    if (!inputSize || !mainMap) {
        console.error('必要なDOM要素が見つかりません', {
            inputSize: !!inputSize,
            mainMap: !!mainMap
        });
        return;
    }
    
    // 基本変数
    let size = parseInt(inputSize.value, 10) || 5;
    let board = Array.from({ length: size }, () => Array(size).fill(null));
    let selectedPieceValue = null;
    let selectedColorIndex = null;
    let isColorMode = false;
    let isMoveMode = false;
    
    // 駒移動用の変数
    let draggedPiece = null;
    let dragStartPos = null;
    
    // 駒配置モード用の変数
    let isFollowing = false; // 駒がマウスに追従しているかどうか
    let mousePos = { x: 0, y: 0 };

    // 孤立駒チェック用の変数
    let isolatedPieces = [];
    let showingIsolated = false;

    // 色配列の設定
    const colorPalette = [
        '#cccccc', // グレー
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'
    ];

    // HTMLのモード表示を更新する関数
    function updateModeDisplay() {
        const modeDisplay = document.getElementById('modeDisplay');
        if (!modeDisplay) return;
        
        if (isMoveMode) {
            modeDisplay.textContent = '🔄 駒入れ替えモード';
            modeDisplay.style.background = 'linear-gradient(135deg, #9b59b6, #8e44ad)';
            modeDisplay.style.boxShadow = '0 3px 10px rgba(155, 89, 182, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)';
        } else if (isColorMode) {
            modeDisplay.textContent = '🎨 色変更モード';
            modeDisplay.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
            modeDisplay.style.boxShadow = '0 3px 10px rgba(231, 76, 60, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)';
        } else {
            modeDisplay.textContent = '🎯 駒配置モード';
            modeDisplay.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
            modeDisplay.style.boxShadow = '0 3px 10px rgba(46, 204, 113, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)';
        }
    }

    // ボタンのスタイル更新
    function updateButtonStyles() {
        if (colorModeBtn) {
            if (isColorMode) {
                colorModeBtn.style.background = '#e74c3c';
                colorModeBtn.style.color = 'white';
                colorModeBtn.style.boxShadow = '0 0 15px rgba(231, 76, 60, 0.5)';
                colorModeBtn.textContent = '🎯 駒選択モード';
            } else {
                colorModeBtn.style.background = '#ecf0f1';
                colorModeBtn.style.color = '#2c3e50';
                colorModeBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                colorModeBtn.textContent = '🎨 色変更モード';
            }
        }

        if (moveModeBtn) {
            if (isMoveMode) {
                moveModeBtn.style.background = '#8e44ad';
                moveModeBtn.style.color = 'white';
                moveModeBtn.style.boxShadow = '0 0 15px rgba(142, 68, 173, 0.5)';
                moveModeBtn.textContent = '🎯 駒選択モード';
            } else {
                moveModeBtn.style.background = '#9b59b6';
                moveModeBtn.style.color = 'white';
                moveModeBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                moveModeBtn.textContent = '🔄 駒入れ替えモード';
            }
        }

        // 駒リストの表示制御を追加
        updatePieceListVisibility();
        updateModeDisplay();
    }

    // 駒リストの表示制御
    function updatePieceListVisibility() {
        if (pieceList) {
            // 駒配置モード（色変更・駒入れ替えモードではない）の時のみ表示
            if (!isColorMode && !isMoveMode) {
                pieceList.style.display = 'block';
                if (addPieceBtn) addPieceBtn.style.display = 'block';
            } else {
                pieceList.style.display = 'none';
                if (addPieceBtn) addPieceBtn.style.display = 'none';
            }
        }
        
        // 色リストの表示制御
        if (colorList) {
            if (isColorMode) {
                colorList.style.display = 'block';
                colorList.classList.remove('hidden');
            } else {
                colorList.style.display = 'none';
                colorList.classList.add('hidden');
            }
        }
    }

    // キャンバスサイズ更新
    function updateCanvasSize() {
        console.log('updateCanvasSize開始');
        if (!mainMap) {
            console.error('mainMapが見つかりません - updateCanvasSize');
            return;
        }
        
        const baseSize = 400;
        const scaleFactor = Math.max(1, size / 5);
        const newSize = Math.floor(baseSize * scaleFactor);
        
        console.log('サイズ計算:', {
            baseSize,
            scaleFactor,
            newSize,
            currentSize: size
        });
        
        mainMap.width = newSize;
        mainMap.height = newSize;
        
        console.log(`Canvas size updated: ${newSize}x${newSize} for size ${size}`);
    }

    // メイン描画関数
    function drawDiamondMap() {
        console.log('drawDiamondMap開始');
        if (!mainMap) {
            console.error('mainMapが見つかりません');
            return;
        }
        
        const ctx = mainMap.getContext('2d');
        const canvas = mainMap;
        
        console.log('キャンバス情報:', {
            width: canvas.width,
            height: canvas.height,
            clientWidth: canvas.clientWidth,
            clientHeight: canvas.clientHeight
        });
        
        // キャンバスクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 背景描画
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#f8f9fa');
        gradient.addColorStop(1, '#e9ecef');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Before_createと同じ位置計算方法を使用
        const s = 70; // 固定サイズ
        const TOP_MARGIN = 60; // 上部マージン
        const centerX = Math.floor(canvas.width / 2);
        const centerY = TOP_MARGIN; // 上部から開始
        
        // ダイヤモンド型マップを描画
        console.log('マップ描画開始 - サイズ:', size);
        
        let cellCount = 0;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (x + y > (size - 1) * 2) continue;
                
                cellCount++;
                const px = centerX + (x - y) * s / 2;
                const py = centerY + (x + y) * s / 2;
                
                // ダイヤモンド型セルを描画
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(px, py - s / 2);
                ctx.lineTo(px + s / 2, py);
                ctx.lineTo(px, py + s / 2);
                ctx.lineTo(px - s / 2, py);
                ctx.closePath();
                
                if (board[y] && board[y][x]) {
                    // 駒がある場合
                    const piece = board[y][x];
                    ctx.fillStyle = colorPalette[piece.colorIndex] || colorPalette[0];
                    ctx.fill();
                    
                    ctx.strokeStyle = '#333';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    // 数字を描画
                    ctx.fillStyle = '#000';
                    ctx.font = `bold ${s/3}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(piece.value, px, py);
                } else {
                    // 空のセル
                    ctx.fillStyle = '#fff';
                    ctx.fill();
                    ctx.strokeStyle = '#666';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                
                ctx.restore();
            }
        }
        
        console.log(`マップ描画完了 - 描画したセル数: ${cellCount}`);
        
        // ハイライト処理を追加
        if (showingIsolated) {
            highlightIsolatedPieces(ctx, s, centerX, centerY);
        } else if (isColorMode && selectedColorIndex !== null) {
            highlightColorPieces(ctx, selectedColorIndex, s, centerX, centerY);
        } else if (!isColorMode && !isMoveMode && selectedPieceValue !== null) {
            highlightMapPieces(ctx, selectedPieceValue, s, centerX, centerY);
        }
        
        // 追従中の駒を描画
        if (isFollowing && (selectedPieceValue !== null || draggedPiece !== null)) {
            drawFollowingPiece(ctx, s);
        }
    }

    // 追従中の駒を描画（駒配置モード用）
    function drawFollowingPiece(ctx, s) {
        if (!isFollowing) return;
        
        let pieceValue, pieceColorIndex;
        
        if (draggedPiece) {
            // 駒入れ替えモード
            pieceValue = draggedPiece.value;
            pieceColorIndex = draggedPiece.colorIndex;
        } else if (selectedPieceValue !== null) {
            // 駒配置モード
            pieceValue = selectedPieceValue;
            if (inputColorRandom && inputColorRandom.checked) {
                pieceColorIndex = 0; // グレー
            } else {
                pieceColorIndex = ((selectedPieceValue - 1) % (colorPalette.length - 1)) + 1; // グレーを除く
            }
        } else {
            return;
        }
        
        const cx = mousePos.x;
        const cy = mousePos.y;
        
        ctx.save();
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s / 2);
        ctx.lineTo(cx + s / 2, cy);
        ctx.lineTo(cx, cy + s / 2);
        ctx.lineTo(cx - s / 2, cy);
        ctx.closePath();
        
        ctx.fillStyle = colorPalette[pieceColorIndex];
        ctx.fill();
        
        ctx.shadowColor = '#27ae60';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = "#222";
        ctx.font = `bold ${s / 2}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pieceValue, cx, cy);
        
        ctx.restore();
    }

    // 駒のハイライト表示（色変更モード用）
    function highlightColorPieces(ctx, colorIndex, s, centerX, centerY) {
        const time = Date.now() / 400;
        const opacity = (Math.sin(time) + 1) / 2 * 0.6 + 0.4;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (board[y] && board[y][x] && board[y][x].colorIndex === colorIndex) {
                    const px = centerX + (x - y) * s / 2;
                    const py = centerY + (x + y) * s / 2;

                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(px, py - s / 2);
                    ctx.lineTo(px + s / 2, py);
                    ctx.lineTo(px, py + s / 2);
                    ctx.lineTo(px - s / 2, py);
                    ctx.closePath();
                    ctx.strokeStyle = `rgba(255, 0, 0, ${opacity})`;
                    ctx.lineWidth = 5;
                    ctx.shadowColor = `rgba(255, 0, 0, ${opacity})`;
                    ctx.shadowBlur = 15;
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
    }

    // 駒のハイライト表示（駒選択モード用）
    function highlightMapPieces(ctx, value, s, centerX, centerY) {
        const time = Date.now() / 400;
        const opacity = (Math.sin(time) + 1) / 2 * 0.6 + 0.4;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (board[y] && board[y][x] && board[y][x].value === value) {
                    const px = centerX + (x - y) * s / 2;
                    const py = centerY + (x + y) * s / 2;

                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(px, py - s / 2);
                    ctx.lineTo(px + s / 2, py);
                    ctx.lineTo(px, py + s / 2);
                    ctx.lineTo(px - s / 2, py);
                    ctx.closePath();
                    ctx.strokeStyle = `rgba(243, 156, 18, ${opacity})`;
                    ctx.lineWidth = 5;
                    ctx.shadowColor = `rgba(243, 156, 18, ${opacity})`;
                    ctx.shadowBlur = 15;
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
    }

    // 駒リスト表示
    function renderPieceList() {
        if (!pieceList) return;
        
        pieceList.innerHTML = '';
        
        // 全体で使用する駒の数を計算（偶数倍も可能に）
        const pieceCount = Math.floor(size * (size - 1) / 2);
        
        // 1番からpieceCount番まで表示（偶数倍配置可能）
        for (let i = 1; i <= pieceCount; i++) {
            const piece = document.createElement('div');
            piece.className = 'piece';
            piece.textContent = i;
            
            // 現在のマップ上での駒の数をカウント
            let currentCount = 0;
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    if (board[y] && board[y][x] && board[y][x].value === i) {
                        currentCount++;
                    }
                }
            }
            
            // 駒の数を表示（2個以上ある場合のみ個数表示）
            if (currentCount > 1) {
                // 二桁の数字の場合はフォントサイズを調整
                const numberFontSize = i >= 10 ? '14px' : '18px';
                const countFontSize = i >= 10 ? '10px' : '12px';
                piece.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; line-height: 1;">
                    <span style="font-size: ${numberFontSize}; font-weight: bold;">${i}</span>
                    <span style="font-size: ${countFontSize};">×${currentCount}</span>
                </div>`;
            } else {
                const numberFontSize = i >= 10 ? '14px' : '18px';
                piece.innerHTML = `<span style="font-size: ${numberFontSize}; font-weight: bold;">${i}</span>`;
            }
            
            if (inputColorRandom && inputColorRandom.checked) {
                piece.style.background = colorPalette[0]; // グレー
            } else {
                const colorIndex = ((i - 1) % (colorPalette.length - 1)) + 1;
                piece.style.background = colorPalette[colorIndex];
            }
            
            piece.style.color = '#000';
            piece.style.cursor = 'pointer';
            
            // 選択状態の表示
            if (selectedPieceValue === i) {
                piece.style.border = "3px solid #FFD700";
                piece.style.boxShadow = "0 0 15px rgba(255, 215, 0, 0.7), inset 0 0 10px rgba(255, 215, 0, 0.3)";
                piece.style.transform = "scale(1.1)";
            } else {
                piece.style.border = "2px solid #333";
                piece.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.3)";
                piece.style.transform = "scale(1)";
            }
            
            piece.addEventListener('click', () => {
                if (!isColorMode && !isMoveMode) {
                    selectedPieceValue = i;
                    isFollowing = true; // マウス追従を開始
                    draggedPiece = null; // ドラッグ状態をリセット
                    dragStartPos = null;
                    renderPieceList();
                    console.log(`駒${i}を選択、追従開始`);
                } else if (isMoveMode) {
                    console.log('駒入れ替えモードでは駒リストから選択できません');
                }
            });
            
            pieceList.appendChild(piece);
        }
    }

    // 色リスト表示
    function renderColorList() {
        if (!colorList) return;
        
        colorList.innerHTML = '';
        
        for (let i = 0; i < colorPalette.length; i++) {
            const colorDiv = document.createElement('div');
            colorDiv.className = 'color-option';
            colorDiv.style.cssText = `
                width: 40px;
                height: 40px;
                background: ${colorPalette[i]};
                border: 2px solid #333;
                border-radius: 8px;
                cursor: pointer;
                margin: 3px;
                display: inline-block;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                transition: all 0.2s ease;
            `;
            
            if (selectedColorIndex === i) {
                colorDiv.style.border = '3px solid #FFD700';
                colorDiv.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
            }
            
            colorDiv.addEventListener('click', () => {
                if (isColorMode) {
                    selectedColorIndex = i;
                    renderColorList();
                }
            });
            
            colorList.appendChild(colorDiv);
        }
    }

    // マップクリック処理
    function handleMapClick(e) {
        if (!mainMap) return;
        
        const rect = mainMap.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Before_createと同じ位置計算方法を使用
        const s = 70; // 固定サイズ
        const TOP_MARGIN = 60; // 上部マージン
        const centerX = Math.floor(mainMap.width / 2);
        const centerY = TOP_MARGIN; // 上部から開始
        
        // クリック位置からマップ座標を計算
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (x + y > (size - 1) * 2) continue;
                
                const px = centerX + (x - y) * s / 2;
                const py = centerY + (x + y) * s / 2;
                
                const dx = Math.abs(clickX - px);
                const dy = Math.abs(clickY - py);
                
                if (dx / (s / 2) + dy / (s / 2) <= 1) {
                    if (isMoveMode) {
                        // 駒入れ替えモード
                        if (!draggedPiece) {
                            // 駒を選択
                            if (board[y] && board[y][x]) {
                                draggedPiece = { ...board[y][x] };
                                dragStartPos = { row: y, col: x };
                                board[y][x] = null;
                                isFollowing = true; // マウス追従を開始
                                selectedPieceValue = draggedPiece.value; // 追従用に値を設定
                                drawDiamondMap();
                                console.log('駒を選択:', draggedPiece);
                            }
                        } else {
                            // 駒を配置または入れ替え
                            if (board[y] && board[y][x]) {
                                // 既に駒がある場合は入れ替え
                                const tempPiece = board[y][x];
                                board[y][x] = draggedPiece;
                                if (dragStartPos) {
                                    board[dragStartPos.row][dragStartPos.col] = tempPiece;
                                }
                                console.log('駒を入れ替え');
                            } else {
                                // 空いている場所に配置
                                board[y][x] = draggedPiece;
                                console.log('駒を配置');
                            }
                            draggedPiece = null;
                            dragStartPos = null;
                            isFollowing = false;
                            selectedPieceValue = null;
                            drawDiamondMap();
                        }
                    } else if (isColorMode && selectedColorIndex !== null && board[y] && board[y][x]) {
                        // 色変更モード
                        board[y][x].colorIndex = selectedColorIndex;
                        drawDiamondMap();
                    } else if (!isColorMode && selectedPieceValue !== null) {
                        // 駒配置モード
                        if (!board[y][x]) {
                            let colorIndex;
                            if (inputColorRandom && inputColorRandom.checked) {
                                colorIndex = 0; // グレー
                            } else {
                                colorIndex = (selectedPieceValue - 1) % (colorPalette.length - 1) + 1;
                            }
                            
                            board[y][x] = {
                                value: selectedPieceValue,
                                colorIndex: colorIndex
                            };
                            console.log(`駒${selectedPieceValue}を配置（追従継続）`);
                            // Before_createと同様、選択状態と追従を継続
                        } else {
                            // 駒を削除
                            board[y][x] = null;
                            console.log('駒を削除');
                        }
                        
                        // 追従状態は継続（Before_createと同じ動作）
                        // isFollowing = false; ← この行を削除
                        // selectedPieceValue = null; ← この行も削除
                        // renderPieceList(); ← この行も削除
                    }
                    drawDiamondMap();
                    return;
                }
            }
        }
    }

    // ランダム配置
    function randomPlacePieces() {
        console.log('ランダム配置開始');
        
        board = Array.from({ length: size }, () => Array(size).fill(null));
        
        // ダイヤモンド型のルールに従って位置を分類
        const upperPos = [];
        const lowerPos = [];
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (x + y < size - 1) {
                    upperPos.push([x, y]);
                } else if (x + y > size - 1) {
                    lowerPos.push([x, y]);
                }
                // x + y === size - 1 は中央の空きマス
            }
        }
        
        console.log(`上半分の位置数: ${upperPos.length}, 下半分の位置数: ${lowerPos.length}`);
        
        // 全体で使用する駒の数を計算
        const pieceCount = Math.floor(size * (size - 1) / 2);
        const totalPositions = upperPos.length + lowerPos.length;
        const usePieceCount = Math.min(pieceCount, totalPositions);
        
        let pieceValues = [];
        for (let i = 1; i <= usePieceCount; i++) {
            pieceValues.push(i);
        }
        
        // ペアで配置できる数（上下両方に配置）
        let pairCount = Math.min(upperPos.length, lowerPos.length);
        let usedValues = [];
        
        for (let i = 0; i < pairCount && i < pieceValues.length; i++) {
            usedValues.push(pieceValues[i]);
        }
        
        // 残りの駒（単独配置）
        let remainingValues = [];
        for (let i = pairCount; i < pieceValues.length; i++) {
            remainingValues.push(pieceValues[i]);
        }
        
        // 位置をシャッフル
        for (let i = upperPos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [upperPos[i], upperPos[j]] = [upperPos[j], upperPos[i]];
        }
        
        for (let i = lowerPos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [lowerPos[i], lowerPos[j]] = [lowerPos[j], lowerPos[i]];
        }
        
        // ペア駒を配置（上下に同じ数字）
        for (let i = 0; i < usedValues.length; i++) {
            const value = usedValues[i];
            let colorIndex;
            
            if (inputColorRandom && inputColorRandom.checked) {
                colorIndex = 0; // グレー
            } else {
                colorIndex = ((value - 1) % (colorPalette.length - 1)) + 1;
            }
            
            // 上半分に配置
            if (i < upperPos.length) {
                const [x, y] = upperPos[i];
                board[y][x] = { value: value, colorIndex: colorIndex };
            }
            
            // 下半分に配置
            if (i < lowerPos.length) {
                const [x, y] = lowerPos[i];
                board[y][x] = { value: value, colorIndex: colorIndex };
            }
        }
        
        // 残り駒配置（単独配置）
        let remainingPositions = [];
        for (let i = usedValues.length; i < upperPos.length; i++) {
            remainingPositions.push(upperPos[i]);
        }
        for (let i = usedValues.length; i < lowerPos.length; i++) {
            remainingPositions.push(lowerPos[i]);
        }
        
        // 残り位置をシャッフル
        for (let i = remainingPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remainingPositions[i], remainingPositions[j]] = [remainingPositions[j], remainingPositions[i]];
        }
        
        // 残り駒を配置
        for (let i = 0; i < remainingValues.length && i < remainingPositions.length; i++) {
            const value = remainingValues[i];
            let colorIndex;
            
            if (inputColorRandom && inputColorRandom.checked) {
                colorIndex = 0; // グレー
            } else {
                colorIndex = ((value - 1) % (colorPalette.length - 1)) + 1;
            }
            
            const [x, y] = remainingPositions[i];
            board[y][x] = { value: value, colorIndex: colorIndex };
        }
        
        drawDiamondMap();
        renderPieceList();
        
        console.log('ランダム配置完了 - ペア数:', usedValues.length, '単独駒:', remainingValues.length);
    }

    // 孤立駒チェック機能
    function checkIsolatedPieces() {
        console.log('孤立駒チェック開始');
        
        // 選択状態をリセット
        selectedPieceValue = null;
        isFollowing = false;
        draggedPiece = null;
        dragStartPos = null;
        
        isolatedPieces = findIsolatedPieces();
        
        if (isolatedPieces.length > 0) {
            alert(`孤立駒があります: ${isolatedPieces.map(p => p.value).join(', ')}\n孤立駒が光って表示されます。`);
            showingIsolated = true;
        } else {
            alert('孤立駒は見つかりませんでした。');
            showingIsolated = false;
        }
        
        renderPieceList();
        drawDiamondMap();
    }

    function findIsolatedPieces() {
        const isolated = [];
        const valueCounts = {};
        
        // 各駒の値の出現回数をカウント
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (board[y] && board[y][x]) {
                    const value = board[y][x].value;
                    if (!valueCounts[value]) {
                        valueCounts[value] = [];
                    }
                    valueCounts[value].push({ x, y, value, colorIndex: board[y][x].colorIndex });
                }
            }
        }
        
        // 1個しかない駒を孤立駒として判定
        for (const value in valueCounts) {
            if (valueCounts[value].length === 1) {
                isolated.push(valueCounts[value][0]);
            }
        }
        
        return isolated;
    }

    // 孤立駒のハイライト表示
    function highlightIsolatedPieces(ctx, s, centerX, centerY) {
        const time = Date.now() / 400;
        const opacity = (Math.sin(time) + 1) / 2 * 0.6 + 0.4;

        isolatedPieces.forEach(piece => {
            const px = centerX + (piece.x - piece.y) * s / 2;
            const py = centerY + (piece.x + piece.y) * s / 2;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(px, py - s / 2);
            ctx.lineTo(px + s / 2, py);
            ctx.lineTo(px, py + s / 2);
            ctx.lineTo(px - s / 2, py);
            ctx.closePath();
            ctx.strokeStyle = `rgba(255, 0, 0, ${opacity})`;
            ctx.lineWidth = 5;
            ctx.shadowColor = `rgba(255, 0, 0, ${opacity})`;
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.restore();
        });
    }

    // 作成したパズルを保存
    function savePuzzle() {
        console.log('保存ボタンがクリックされました');
        
        const saveSlot = document.getElementById('saveSlot');
        if (!saveSlot) {
            console.error('saveSlot要素が見つかりません');
            alert('保存エラー: 保存先選択要素が見つかりません');
            return;
        }
        
        console.log('saveSlot要素の値:', saveSlot.value);
        
        let hasAnyPiece = false;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (board[y] && board[y][x]) {
                    hasAnyPiece = true;
                    break;
                }
            }
            if (hasAnyPiece) break;
        }
        
        console.log('駒が配置されているか:', hasAnyPiece);
        
        if (!hasAnyPiece) {
            alert('まず駒を配置してください！');
            return;
        }
        
        const saveSlotValue = saveSlot.value;
        const slotDisplayName = saveSlotValue === 'create1' ? 'Create1' : 
                               saveSlotValue === 'create2' ? 'Create2' : 'Create3';
        
        // 保存確認ダイアログ
        const confirmSave = confirm(`パズルを ${slotDisplayName} に保存しますか？\n\n既存のデータがある場合は上書きされます。`);
        
        console.log('保存確認ダイアログの結果:', confirmSave);
        
        if (!confirmSave) {
            return;
        }
        
        // 実際に配置された駒の種類と数を計算
        const pieceTypes = new Set();
        const pieceCounts = {};
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (board[y] && board[y][x]) {
                    const pieceValue = board[y][x].value;
                    pieceTypes.add(pieceValue);
                    pieceCounts[pieceValue] = (pieceCounts[pieceValue] || 0) + 1;
                }
            }
        }
        
        // クリア条件を動的に設定（配置された駒の種類数 = 必要な隣接グループ数）
        const requiredGroups = pieceTypes.size;
        
        console.log('配置された駒の種類:', Array.from(pieceTypes));
        console.log('各駒の数:', pieceCounts);
        console.log('必要な隣接グループ数:', requiredGroups);

        const puzzleData = {
            size: size,
            board: board,
            colorMode: !inputColorRandom.checked,
            requiredGroups: requiredGroups, // 動的クリア条件を追加
            pieceCounts: pieceCounts // 駒の数も保存
        };
        
        console.log('保存するパズルデータ:', puzzleData);
        
        // 選択されたスロットに保存
        localStorage.setItem(saveSlotValue, JSON.stringify(puzzleData));
        
        console.log(`カスタムパズルを${saveSlotValue}に保存:`, puzzleData);
        alert(`パズルが ${slotDisplayName} に保存されました！`);
    }

    // サイズ変更時の処理
    function handleSizeChange() {
        const newSize = parseInt(inputSize.value, 10) || 5;
        if (newSize !== size && newSize >= 3 && newSize <= 15) {
            size = newSize;
            board = Array.from({ length: size }, () => Array(size).fill(null));
            selectedPieceValue = null;
            updateCanvasSize();
            renderPieceList();
            drawDiamondMap();
            console.log(`サイズを${size}に変更`);
        }
    }

    // イベントリスナー設定
    if (inputSize) {
        inputSize.addEventListener('change', handleSizeChange);
    }

    if (mainMap) {
        // タッチジェスチャー検出用の変数
        let touchStartTime = 0;
        let initialTouchDistance = 0;
        let lastTouchX = 0;
        let lastTouchY = 0;
        
        mainMap.addEventListener('click', handleMapClick);
        mainMap.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            const touch = e.touches[0];
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            
            // 複数の指の場合はピンチズーム
            if (e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                initialTouchDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                return; // ピンチズームは妨げない
            }
        });
        
        mainMap.addEventListener('touchmove', (e) => {
            // 複数の指の場合はピンチズームを許可
            if (e.touches.length === 2) {
                return; // ピンチズームは妨げない
            }
            
            const touch = e.touches[0];
            const moveDistance = Math.sqrt(
                Math.pow(touch.clientX - lastTouchX, 2) +
                Math.pow(touch.clientY - lastTouchY, 2)
            );
            
            // 大きな移動はスクロールとして扱う
            if (moveDistance > 10) {
                return; // スクロールを妨げない
            }
        });
        
        mainMap.addEventListener('touchend', (e) => {
            // 複数の指の場合はピンチズーム
            if (e.changedTouches.length > 1) {
                return; // ピンチズームは妨げない
            }
            
            const touchDuration = Date.now() - touchStartTime;
            const touch = e.changedTouches[0];
            const moveDistance = Math.sqrt(
                Math.pow(touch.clientX - lastTouchX, 2) +
                Math.pow(touch.clientY - lastTouchY, 2)
            );
            
            // 短時間で小さな移動の場合のみタップとして扱う
            if (touchDuration < 500 && moveDistance < 10) {
                e.preventDefault();
                const rect = mainMap.getBoundingClientRect();
                const mouseEvent = {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                };
                handleMapClick(mouseEvent);
            }
        });
        
        // マウス位置追跡
        mainMap.addEventListener('mousemove', (e) => {
            const rect = mainMap.getBoundingClientRect();
            mousePos.x = e.clientX - rect.left;
            mousePos.y = e.clientY - rect.top;
            
            // 追従中の場合は再描画
            if (isFollowing) {
                drawDiamondMap();
            }
        });
        
        // タッチ移動処理（駒追従用）
        mainMap.addEventListener('touchmove', (e) => {
            // 単一タッチで追従中の場合のみ処理
            if (e.touches.length === 1 && isFollowing) {
                const touch = e.touches[0];
                const rect = mainMap.getBoundingClientRect();
                mousePos.x = touch.clientX - rect.left;
                mousePos.y = touch.clientY - rect.top;
                
                drawDiamondMap();
                
                // 小さな移動の場合のみpreventDefault
                const moveDistance = Math.sqrt(
                    Math.pow(touch.clientX - lastTouchX, 2) +
                    Math.pow(touch.clientY - lastTouchY, 2)
                );
                if (moveDistance < 10) {
                    e.preventDefault();
                }
            }
        });
        
        // マウスが離れた時の処理
        mainMap.addEventListener('mouseleave', () => {
            if (isFollowing) {
                drawDiamondMap();
                console.log('マウスがキャンバスを離れました');
            }
        });
    }

    if (addPieceBtn) {
        addPieceBtn.addEventListener('click', randomPlacePieces);
    }

    if (checkIsolatedBtn) {
        checkIsolatedBtn.addEventListener('click', checkIsolatedPieces);
    }

    if (colorModeBtn) {
        colorModeBtn.addEventListener('click', () => {
            isColorMode = !isColorMode;
            if (isColorMode) {
                isMoveMode = false;
                selectedPieceValue = null;
                isFollowing = false; // 追従停止
                draggedPiece = null;
                dragStartPos = null;
                renderColorList();
            } else {
                selectedColorIndex = null;
            }
            updateButtonStyles();
            updateModeDisplay();
            renderPieceList();
            drawDiamondMap(); // 再描画
        });
    }

    if (moveModeBtn) {
        moveModeBtn.addEventListener('click', () => {
            isMoveMode = !isMoveMode;
            if (isMoveMode) {
                isColorMode = false;
                selectedPieceValue = null;
                isFollowing = false; // 追従停止
                selectedColorIndex = null;
                draggedPiece = null;
                dragStartPos = null;
            }
            updateButtonStyles();
            updateModeDisplay();
            renderPieceList();
            drawDiamondMap(); // 再描画
        });
    }

    if (backToGameButton) {
        backToGameButton.addEventListener('click', () => {
            window.location.href = 'index.html'; // メインメニュー画面に戻る
        });
    }

    if (saveButton) {
        saveButton.addEventListener('click', savePuzzle);
    }

    if (inputColorRandom) {
        inputColorRandom.addEventListener('change', () => {
            console.log('色なしモードが変更されました:', inputColorRandom.checked);
            // 既存の駒の色を更新
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    if (board[y][x]) {
                        if (inputColorRandom.checked) {
                            board[y][x].colorIndex = 0; // グレー
                        } else {
                            board[y][x].colorIndex = (board[y][x].value - 1) % (colorPalette.length - 1) + 1;
                        }
                    }
                }
            }
            renderPieceList();
            drawDiamondMap();
        });
    }

    // アニメーションループ（光る効果のため）
    function animationLoop() {
        if (showingIsolated || 
            (selectedPieceValue !== null && !isColorMode && !isMoveMode) || 
            (isColorMode && selectedColorIndex !== null) ||
            (isMoveMode && isFollowing && draggedPiece !== null)) {
            drawDiamondMap();
        }
        requestAnimationFrame(animationLoop);
    }

    // マップ読み込み機能
    function loadSelectedMap() {
        const saveSlot = document.getElementById('saveSlot').value;
        const savedData = localStorage.getItem(saveSlot);
        
        if (savedData) {
            try {
                const puzzleData = JSON.parse(savedData);
                
                // サイズを更新
                size = puzzleData.size;
                document.getElementById('inputSize').value = size;
                
                // ボードを更新
                board = puzzleData.board;
                
                // 色モードを更新
                document.getElementById('inputColorRandom').checked = !puzzleData.colorMode;
                
                // 選択状態をリセット
                selectedPieceValue = null;
                selectedColorIndex = null;
                isColorMode = false;
                isMoveMode = false;
                
                // 表示を更新
                updateCanvasSize();
                renderPieceList();
                renderColorList();
                updateButtonStyles();
                drawDiamondMap();
                
                alert(`${saveSlot}からマップを読み込みました！`);
                console.log(`${saveSlot}からマップを読み込み:`, puzzleData);
            } catch (error) {
                alert(`${saveSlot}のデータが破損しています。`);
                console.error('マップ読み込みエラー:', error);
            }
        } else {
            alert(`${saveSlot}に保存されたマップがありません。`);
        }
    }

    // 初期化
    console.log('初期化開始...');
    updateCanvasSize();
    console.log('キャンバスサイズ更新完了');
    renderPieceList();
    console.log('駒リスト描画完了');
    renderColorList();
    console.log('色リスト描画完了');
    updateButtonStyles();
    console.log('ボタンスタイル更新完了');
    updateModeDisplay(); // モード表示を初期化
    console.log('モード表示更新完了');
    drawDiamondMap();
    console.log('ダイヤモンドマップ描画完了');
    
    console.log('初期マップを表示しました - サイズ:', size);
    
    // マップ読み込みボタンのイベントリスナー
    document.getElementById('loadMapBtn').addEventListener('click', loadSelectedMap);
    
    // アニメーションループを開始
    animationLoop();
    
    console.log('create.js initialized successfully');
    }, 100); // setTimeout終了
});
