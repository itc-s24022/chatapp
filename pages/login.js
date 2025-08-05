import { useEffect, useState } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { useRouter } from "next/router";
import Link from "next/link"; // ← 追加
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
            おかえりなさい！
          </h1>
          <p style={{
            color: '#b9bbbe',
            fontSize: '16px',
            margin: 0
          }}>
            またお会いできて嬉しいです！
          </p>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          loginWithEmail();
        }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#b9bbbe',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              marginBottom: '8px',
              letterSpacing: '0.5px'
            }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#40444b',
                border: 'none',
                borderRadius: '4px',
                color: '#dcddde',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              color: '#b9bbbe',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              marginBottom: '8px',
              letterSpacing: '0.5px'
            }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#40444b',
                border: 'none',
                borderRadius: '4px',
                color: '#dcddde',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
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
              marginBottom: '16px',
              transition: 'background-color 0.17s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#4752c4'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#5865f2'}
          >
            ログイン
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          margin: '20px 0',
          position: 'relative'
        }}>
          <div style={{
            height: '1px',
            backgroundColor: '#40444b',
            position: 'relative'
          }}>
            <span style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#2f3136',
              padding: '0 16px',
              color: '#72767d',
              fontSize: '14px'
            }}>
              または
            </span>
          </div>
        </div>

        <button
          onClick={loginWithGoogle}
          style={{
            width: '100%',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background-color 0.17s ease'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#3367d6'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#4285f4'}
        >
          <span style={{ fontSize: '18px' }}>🌐</span>
          Googleでログイン
        </button>

        <p style={{
          textAlign: 'center',
          color: '#72767d',
          fontSize: '14px',
          marginTop: '24px',
          margin: '24px 0 0 0'
        }}>
          アカウントが必要ですか？{' '}
          <Link href="/signup" style={{
            color: '#00aff4',
            textDecoration: 'none'
          }}>
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
