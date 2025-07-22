import { useEffect, useState } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) router.push("/");
    });
    return () => unsubscribe();
  }, [router]);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert("ログイン失敗：" + error.message);
    }
  };

  const loginWithEmail = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("メールログイン失敗：" + error.message);
    }
  };

  return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h1>ログインページ</h1>

        <div>
          <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: "8px", margin: "5px", width: "250px" }}
          />
          <br />
          <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: "8px", margin: "5px", width: "250px" }}
          />
          <br />
          <button onClick={loginWithEmail} style={{ padding: "10px 20px", fontSize: "16px", marginTop: "10px" }}>
            メールでログイン
          </button>
        </div>

        <hr style={{ width: "200px", margin: "20px auto" }} />

        <button onClick={loginWithGoogle} style={{ padding: "10px 20px", fontSize: "16px" }}>
          Googleでログイン
        </button>

        <p style={{ marginTop: "20px" }}>
          アカウントがない方は <a href="/signup">新規登録</a>
        </p>
      </div>
  );
}
