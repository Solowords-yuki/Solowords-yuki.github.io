// Firebase設定ファイル
// Firebaseコンソールから取得した設定情報

const firebaseConfig = {
    apiKey: "AIzaSyCE7ADGJ8wrZuQTOVAlXaX4fj-acXKb1kA",
    authDomain: "solowords-yuki.firebaseapp.com",
    projectId: "solowords-yuki",
    storageBucket: "solowords-yuki.firebasestorage.app",
    messagingSenderId: "926674538415",
    appId: "1:926674538415:web:80ae88094485078f63e95a",
    measurementId: "G-GSBH2P2ZW1"
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
