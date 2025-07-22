import { useEffect } from "react";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    // 認証状態が変わったらホームにリダイレクト
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // 成功しても、onAuthStateChangedが処理する
    } catch (error) {
      if (error.code === "auth/operation-not-allowed") {
        alert("Googleログインが許可されていません。Firebaseの認証設定でGoogleログインを有効にしてください。");
      } else {
        alert("ログイン失敗：" + error.message);
      }
    }
  };

  return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h1>ログインページ</h1>
        <button onClick={loginWithGoogle} style={{ padding: "10px 20px", fontSize: "16px" }}>
          Googleでログイン
        </button>
      </div>
  );
}
