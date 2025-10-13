// Firebase設定ファイル
// TODO: Firebaseコンソールから取得した設定情報を記入してください

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Firebase初期化
let app, auth, db;

function initializeFirebase() {
    try {
        // Firebase App初期化
        app = firebase.initializeApp(firebaseConfig);
        
        // Firebase Authentication初期化
        auth = firebase.auth();
        
        // Firestore初期化
        db = firebase.firestore();
        
        console.log('✅ Firebase初期化成功');
        return true;
    } catch (error) {
        console.error('❌ Firebase初期化エラー:', error);
        return false;
    }
}

// Firebase SDKが読み込まれたら自動的に初期化
if (typeof firebase !== 'undefined') {
    initializeFirebase();
}
