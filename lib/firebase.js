import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyDGIRoQ7XG8SPUwYZI22bM6ahBqHqCESOI",
  authDomain: "chat-next-app-75486.firebaseapp.com",
  projectId: "chat-next-app-75486",
  storageBucket: "chat-next-app-75486.appspot.com",
  messagingSenderId: "699078787230",
  appId: "1:699078787230:web:5af28b86d937f5c553bb8f",
  measurementId: "G-NE519J21D1",
};

// アプリ初期化（重複防止）
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// 認証とDBのインスタンス取得
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
