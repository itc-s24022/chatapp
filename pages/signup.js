import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase";

export default function Signup() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSignup = async () => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, {
                displayName: username,
            });
            alert("登録成功！");
            router.push("/login");
        } catch (error) {
            alert("登録エラー：" + error.message);
        }
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>新規登録</h1>

            <input
                type="text"
                placeholder="ユーザー名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ padding: "8px", margin: "5px", width: "250px" }}
            />
            <br />
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
            <button onClick={handleSignup} style={{ padding: "10px 20px", fontSize: "16px", marginTop: "10px" }}>
                登録
            </button>

            <p style={{ marginTop: "20px" }}>
                既にアカウントがある方は <a href="/login">ログイン</a>
            </p>
        </div>
    );
}
