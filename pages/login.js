import { useEffect } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";  // ←ここで初期化済みのauthをimport
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    if (!auth) return; // サーバーサイド時は何もしない

  const unsubscribe = auth.onAuthStateChanged(user => {
    // ログインチェックなど
  });
  return () => unsubscribe();
}, [auth]);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (error) {
      alert("ログイン失敗：" + error.message);
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
