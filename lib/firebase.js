// lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase 設定（環境変数使用）
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDGIRoQ7XG8SPUwYZI22bM6ahBqHqCESOI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "chat-next-app-75486.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "chat-next-app-75486",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "chat-next-app-75486.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "699078787230",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:699078787230:web:5af28b86d937f5c553bb8f",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-NE519J21D1",
};

// 環境変数の確認（開発時のみ）
if (process.env.NODE_ENV === 'development') {
  console.log('Firebase Config Check:', {
    apiKey: firebaseConfig.apiKey ? 'Set' : 'Missing',
    authDomain: firebaseConfig.authDomain ? 'Set' : 'Missing',
    projectId: firebaseConfig.projectId ? 'Set' : 'Missing',
    storageBucket: firebaseConfig.storageBucket ? 'Set' : 'Missing',
    messagingSenderId: firebaseConfig.messagingSenderId ? 'Set' : 'Missing',
    appId: firebaseConfig.appId ? 'Set' : 'Missing'
  });
}

// アプリ初期化（重複防止）
let app;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

// 認証とDBのインスタンス取得
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };