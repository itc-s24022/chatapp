import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/router";
import Link from "next/link"; // ✅ 必須
import { auth } from "../lib/firebase";

export default function Signup() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSignup = async () => {
        if (!username.trim() || !email.trim() || !password.trim()) {
            alert("すべての項目を入力してください");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: username });
            alert("登録成功！");
            router.push("/login");
        } catch (error) {
            alert("登録エラー：" + error.message);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#36393f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
        }}>
            <div style={{
                backgroundColor: '#2f3136',
                padding: '40px',
                borderRadius: '8px',
                boxShadow: '0 8px 16px rgba(0,0,0,0.24)',
                width: '100%',
                maxWidth: '480px',
                margin: '20px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ color: '#ffffff', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
                        アカウントを作成
                    </h1>
                    <p style={{ color: '#b9bbbe', fontSize: '16px', margin: 0 }}>
                        またお会いできて嬉しいです！
                    </p>
                </div>

                {/* ユーザー名 */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        color: '#b9bbbe', fontSize: '12px', fontWeight: '600',
                        textTransform: 'uppercase', marginBottom: '8px', display: 'block'
                    }}>
                        ユーザー名 <span style={{ color: '#f38ba8' }}>*</span>
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="ユーザー名を入力"
                        style={{
                            width: '100%', backgroundColor: '#202225',
                            border: 'none', borderRadius: '4px', padding: '12px',
                            color: '#dcddde', fontSize: '16px'
                        }}
                    />
                </div>

                {/* メールアドレス */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        color: '#b9bbbe', fontSize: '12px', fontWeight: '600',
                        textTransform: 'uppercase', marginBottom: '8px', display: 'block'
                    }}>
                        メールアドレス <span style={{ color: '#f38ba8' }}>*</span>
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="メールアドレスを入力"
                        style={{
                            width: '100%', backgroundColor: '#202225',
                            border: 'none', borderRadius: '4px', padding: '12px',
                            color: '#dcddde', fontSize: '16px'
                        }}
                    />
                </div>

                {/* パスワード */}
                <div style={{ marginBottom: '32px' }}>
                    <label style={{
                        color: '#b9bbbe', fontSize: '12px', fontWeight: '600',
                        textTransform: 'uppercase', marginBottom: '8px', display: 'block'
                    }}>
                        パスワード <span style={{ color: '#f38ba8' }}>*</span>
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="パスワードを入力"
                        style={{
                            width: '100%', backgroundColor: '#202225',
                            border: 'none', borderRadius: '4px', padding: '12px',
                            color: '#dcddde', fontSize: '16px'
                        }}
                    />
                </div>

                {/* 続行ボタン */}
                <button
                    onClick={handleSignup}
                    style={{
                        width: '100%', backgroundColor: '#5865f2',
                        color: '#fff', padding: '12px', borderRadius: '4px',
                        border: 'none', fontSize: '16px', cursor: 'pointer'
                    }}
                >
                    続行
                </button>

                {/* 利用規約 */}
                <p style={{ color: '#72767d', fontSize: '12px', marginTop: '20px' }}>
                    登録することにより、Discordの{' '}
                    <a href="#" style={{ color: '#00aff4' }}>利用規約</a> および{' '}
                    <a href="#" style={{ color: '#00aff4' }}>プライバシーポリシー</a> に同意したものとみなされます。
                </p>

                {/* ✅ 修正箇所：<Link> を使用 */}
                <p style={{ color: '#72767d', fontSize: '14px', marginTop: '24px' }}>
                    <Link href="/login" legacyBehavior>
                        <a style={{ color: '#00aff4', textDecoration: 'none' }}>
                            すでにアカウントをお持ちですか？
                        </a>
                    </Link>
                </p>
            </div>
        </div>
    );
}
