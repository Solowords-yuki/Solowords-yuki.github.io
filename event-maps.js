// ================================================
// イベントマップ管理ファイル
// ================================================
// 使い方：
// 1. クリエイトモードで共有コードを生成
// 2. 下の配列に追加（idは常に1、titleとcodeを設定）
// 3. 毎月、前月のマップを削除して新しいマップを追加
// 
// 注意：idは常に1で固定。毎月上書きする。
// 
// 例（2026年4月）：
// {
//   id: 1,  // ← 常に1
//   title: "2026/4 event",
//   code: ["共有コード..."]
// }
// 
// 翌月（2026年5月）：
// {
//   id: 1,  // ← また1
//   title: "2026/5 event",
//   code: ["共有コード..."]
// }
// ================================================

const eventMaps = [
   {
     id: 1,  // ← idは常に1で固定
     title: "2026/5 event",
     code: [
       // ここに共有コードを貼り付け
       // 1行の場合：
       // "共有コード全文..."
       
       // 複数行の場合：
       // "共有コード1行目...",
       // "共有コード2行目...",
       // "共有コード3行目..."
        //   "2026/4 event" : "048Α21147998360065034700Α25"
        "041212120002101012000212121"
       
     ]
   },
];

// イベントマップを取得する関数
function getEventMaps() {
  return eventMaps;
}

// 最新のイベントマップを取得する関数
function getLatestEventMap() {
  return eventMaps.length > 0 ? eventMaps[eventMaps.length - 1] : null;
}

// 特定のイベントマップを取得する関数
function getEventMapById(id) {
  return eventMaps.find(map => map.id === id);
}

// 共有コードをデコードする関数（create.jsのSTRING_NUMBERを使用）
function decodeShareCode(code) {
  // STRING_NUMBERを定義（create.jsと同じ）
  const STRING_NUMBER = " 0123456789ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψωАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя○●◎◇◆△▲▽▼□■★☆✦✧✩✪✫✬✭✮✯✰ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎกขคงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภמאבגדהוז";
  
  if (!code || code.length < 2) {
    throw new Error('共有コードが短すぎます');
  }
  
  const modeIndex = STRING_NUMBER.indexOf(code[0]);
  const sizeIndex = STRING_NUMBER.indexOf(code[1]);
  
  if (modeIndex === -1 || sizeIndex === -1) {
    throw new Error('共有コードのヘッダーが不正です');
  }
  
  const colorMode = modeIndex === 1;
  const boardSize = sizeIndex;
  
  if (boardSize < 3 || boardSize > 15) {
    throw new Error('マップサイズが不正です（3〜15のみ対応）');
  }
  
  // 駒データを抽出
  const pieceData = code.substring(2);
  const requiredLength = boardSize * boardSize;
  
  if (pieceData.length < requiredLength) {
    throw new Error(`データ不足: ${pieceData.length}/${requiredLength}`);
  }
  
  // ボードデータをデコード（1次元配列として取得）
  const flatBoard = [];
  for (let i = 0; i < requiredLength; i++) {
    const char = pieceData[i];
    const value = STRING_NUMBER.indexOf(char);
    if (value === -1) {
      throw new Error(`不正な文字: ${char}`);
    }
    flatBoard.push(value);
  }
  
  // 2次元配列に変換（loadCustomPuzzleが期待する形式）
  const board = [];
  for (let y = 0; y < boardSize; y++) {
    board[y] = [];
    for (let x = 0; x < boardSize; x++) {
      const index = y * boardSize + x;
      const cellValue = flatBoard[index];
      
      // cellValue が 1 (空のセル) の場合は null、それ以外は {value: n} の形式
      if (cellValue === 1) {
        board[y][x] = null;
      } else {
        // STRING_NUMBERのインデックスから実際の駒の値に変換
        // インデックス2 → 駒の値1, インデックス3 → 駒の値2, ...
        board[y][x] = { value: cellValue - 1 };
      }
    }
  }
  
  // パズルデータを返す
  return {
    size: boardSize,
    board: board,
    colorMode: colorMode
  };
}
