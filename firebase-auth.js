// Firebase認証管理クラス
class FirebaseAuth {
    constructor() {
        this.currentUser = null;
        this.userNickname = '';
        this.onAuthStateChangedCallbacks = [];
    }

    // 認証状態の変更を監視
    init() {
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            
            if (user) {
                console.log('✅ ユーザーログイン:', user.uid);
                this.loadUserProfile(user.uid);
            } else {
                console.log('⚠️ ユーザー未ログイン');
            }
            
            // コールバック実行
            this.onAuthStateChangedCallbacks.forEach(callback => callback(user));
        });
    }

    // 認証状態変更時のコールバック登録
    onAuthChanged(callback) {
        this.onAuthStateChangedCallbacks.push(callback);
    }

    // 匿名認証
    async signInAnonymously() {
        try {
            const result = await auth.signInAnonymously();
            console.log('✅ 匿名ログイン成功:', result.user.uid);
            
            // 初回ログイン時にユーザードキュメント作成
            await this.createUserDocument(result.user.uid, true);
            
            return result.user;
        } catch (error) {
            console.error('❌ 匿名ログイン失敗:', error);
            throw error;
        }
    }

    // Googleログイン
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            console.log('✅ Googleログイン成功:', result.user.uid);
            
            // Googleログイン時にユーザードキュメント作成
            await this.createUserDocument(result.user.uid, false);
            
            return result.user;
        } catch (error) {
            console.error('❌ Googleログイン失敗:', error);
            throw error;
        }
    }

    // 匿名→Googleへアップグレード
    async upgradeAnonymousToGoogle() {
        try {
            if (!this.currentUser || !this.currentUser.isAnonymous) {
                throw new Error('匿名ユーザーではありません');
            }

            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await this.currentUser.linkWithPopup(provider);
            console.log('✅ アカウントアップグレード成功:', result.user.uid);
            
            return result.user;
        } catch (error) {
            console.error('❌ アカウントアップグレード失敗:', error);
            throw error;
        }
    }

    // ログアウト
    async signOut() {
        try {
            await auth.signOut();
            this.currentUser = null;
            this.userNickname = '';
            console.log('✅ ログアウト成功');
        } catch (error) {
            console.error('❌ ログアウト失敗:', error);
            throw error;
        }
    }

    // ユーザードキュメント作成
    async createUserDocument(uid, isAnonymous) {
        try {
            const userRef = db.collection('users').doc(uid);
            const doc = await userRef.get();
            
            if (!doc.exists) {
                const defaultNickname = isAnonymous ? `ゲスト${uid.substring(0, 6)}` : (this.currentUser.displayName || `ユーザー${uid.substring(0, 6)}`);
                
                await userRef.set({
                    nickname: defaultNickname,
                    clearedLevels: [],
                    bestTimes: {},
                    bestMoves: {},
                    isAnonymous: isAnonymous,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log('✅ ユーザードキュメント作成:', uid);
            }
        } catch (error) {
            console.error('❌ ユーザードキュメント作成失敗:', error);
        }
    }

    // ユーザープロファイル読み込み
    async loadUserProfile(uid) {
        try {
            const userRef = db.collection('users').doc(uid);
            const doc = await userRef.get();
            
            if (doc.exists) {
                const data = doc.data();
                this.userNickname = data.nickname || '';
                console.log('✅ プロファイル読み込み:', this.userNickname);
                return data;
            }
            
            return null;
        } catch (error) {
            console.error('❌ プロファイル読み込み失敗:', error);
            return null;
        }
    }

    // ニックネーム更新
    async updateNickname(nickname) {
        try {
            if (!this.currentUser) {
                throw new Error('ログインしていません');
            }
            
            const userRef = db.collection('users').doc(this.currentUser.uid);
            await userRef.update({
                nickname: nickname,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            this.userNickname = nickname;
            console.log('✅ ニックネーム更新:', nickname);
        } catch (error) {
            console.error('❌ ニックネーム更新失敗:', error);
            throw error;
        }
    }

    // 現在のユーザーID取得
    getCurrentUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }

    // 現在のニックネーム取得
    getNickname() {
        return this.userNickname || (this.currentUser && this.currentUser.displayName) || 'ゲスト';
    }

    // ログイン状態確認
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // 匿名ユーザーか確認
    isAnonymous() {
        return this.currentUser && this.currentUser.isAnonymous;
    }
}

// グローバルインスタンス
const firebaseAuth = new FirebaseAuth();
