
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
        if (!username.trim() || !email.trim() || !password.trim()) {
            alert("すべての項目を入力してください");
            return;
        }

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
                    <h1 style={{
                        color: '#ffffff',
                        fontSize: '24px',
                        fontWeight: '600',
                        margin: '0 0 8px 0'
                    }}>
                        アカウントを作成
                    </h1>
                    <p style={{
                        color: '#b9bbbe',
                        fontSize: '16px',
                        margin: 0
                    }}>
                        またお会いできて嬉しいです！
                    </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        color: '#b9bbbe',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                        letterSpacing: '0.02em'
                    }}>
                        ユーザー名 <span style={{ color: '#f38ba8' }}>*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="ユーザー名を入力"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{
                            width: '100%',
                            backgroundColor: '#202225',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '12px',
                            color: '#dcddde',
                            fontSize: '16px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.target.style.backgroundColor = '#40444b'}
                        onBlur={(e) => e.target.style.backgroundColor = '#202225'}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        color: '#b9bbbe',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                        letterSpacing: '0.02em'
                    }}>
                        メールアドレス <span style={{ color: '#f38ba8' }}>*</span>
                    </label>
                    <input
                        type="email"
                        placeholder="メールアドレスを入力"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                            width: '100%',
                            backgroundColor: '#202225',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '12px',
                            color: '#dcddde',
                            fontSize: '16px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.target.style.backgroundColor = '#40444b'}
                        onBlur={(e) => e.target.style.backgroundColor = '#202225'}
                    />
                </div>

                <div style={{ marginBottom: '32px' }}>
                    <label style={{
                        display: 'block',
                        color: '#b9bbbe',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                        letterSpacing: '0.02em'
                    }}>
                        パスワード <span style={{ color: '#f38ba8' }}>*</span>
                    </label>
                    <input
                        type="password"
                        placeholder="パスワードを入力"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{
                            width: '100%',
                            backgroundColor: '#202225',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '12px',
                            color: '#dcddde',
                            fontSize: '16px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.target.style.backgroundColor = '#40444b'}
                        onBlur={(e) => e.target.style.backgroundColor = '#202225'}
                    />
                </div>

                <button
                    onClick={handleSignup}
                    style={{
                        width: '100%',
                        backgroundColor: '#5865f2',
                        color: 'white',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '4px',
                        fontSize: '16px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        marginBottom: '8px',
                        transition: 'background-color 0.17s ease'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#4752c4'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#5865f2'}
                >
                    続行
                </button>

                <p style={{
                    textAlign: 'left',
                    color: '#72767d',
                    fontSize: '12px',
                    margin: '20px 0',
                    lineHeight: '16px'
                }}>
                    登録することにより、Discordの{' '}
                    <a href="#" style={{ color: '#00aff4', textDecoration: 'none' }}>
                        利用規約
                    </a>
                    {' '}および{' '}
                    <a href="#" style={{ color: '#00aff4', textDecoration: 'none' }}>
                        プライバシーポリシー
                    </a>
                    に同意したものとみなされます。
                </p>

                <p style={{
                    textAlign: 'left',
                    color: '#72767d',
                    fontSize: '14px',
                    margin: '24px 0 0 0'
                }}>
                    <a
                        href="/login"
                        style={{
                            color: '#00aff4',
                            textDecoration: 'none'
                        }}
                        onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                    >
                        すでにアカウントをお持ちですか？
                    </a>
                </p>
            </div>
        </div>
    );
}
