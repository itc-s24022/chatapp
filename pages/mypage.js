// pages/mypage.js
import { useEffect, useState } from "react";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRouter } from "next/router";
import TagManager from "../components/TagManager";

export default function MyPage() {
    const [user, setUser] = useState(null);
    const [editing, setEditing] = useState(false);
    const [newName, setNewName] = useState("");
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setNewName(currentUser.displayName || "");
            } else {
                router.push("/login");
            }
        });
        return () => unsubscribe();
    }, [router]);

    if (!user) return null;

    const handleUpdateName = async () => {
        if (!newName.trim()) {
            alert("ユーザー名を入力してください");
            return;
        }
        try {
            await updateProfile(auth.currentUser, {
                displayName: newName.trim(),
            });
            alert("ユーザー名を更新しました！");
            setUser({ ...user, displayName: newName.trim() });
            setEditing(false);
        } catch (error) {
            console.error("更新エラー:", error);
            alert("ユーザー名の更新に失敗しました");
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#36393f',
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
        }}>
            {/* ヘッダー */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                backgroundColor: '#2f3136',
                borderBottom: '1px solid #202225',
                boxShadow: '0 1px 0 rgba(4,4,5,0.2), 0 1.5px 0 rgba(6,6,7,0.05), 0 2px 0 rgba(4,4,5,0.05)'
            }}>
                <h2 style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#ffffff'
                }}>
                    🛠️ プロフィール設定
                </h2>
                <button
                    onClick={() => router.push("/")}
                    style={{
                        backgroundColor: '#40444b',
                        color: '#dcddde',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'background-color 0.17s ease'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#4f545c'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#40444b'}
                >
                    ← チャットへ戻る
                </button>
            </div>

            {/* メインコンテンツ */}
            <div style={{
                padding: '40px 20px',
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                {/* プロフィールカード */}
                <div style={{
                    backgroundColor: '#2f3136',
                    borderRadius: '8px',
                    padding: '32px',
                    marginBottom: '24px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        marginBottom: '32px'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            backgroundColor: '#5865f2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px',
                            fontWeight: '600',
                            color: 'white'
                        }}>
                            {(user.displayName || "匿").charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 style={{
                                margin: '0 0 4px 0',
                                fontSize: '24px',
                                fontWeight: '600',
                                color: '#ffffff'
                            }}>
                                {user.displayName || "匿名"}
                            </h3>
                            <p style={{
                                margin: 0,
                                fontSize: '16px',
                                color: '#b9bbbe'
                            }}>
                                {user.email}
                            </p>
                        </div>
                    </div>

                    {/* ユーザー名編集 */}
                    <div style={{
                        backgroundColor: '#40444b',
                        borderRadius: '8px',
                        padding: '20px'
                    }}>
                        <label style={{
                            display: 'block',
                            color: '#b9bbbe',
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            marginBottom: '8px',
                            letterSpacing: '0.5px'
                        }}>
                            表示名
                        </label>

                        {editing ? (
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                alignItems: 'flex-end'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="新しいユーザー名"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: '#36393f',
                                            border: '1px solid #72767d',
                                            borderRadius: '4px',
                                            color: '#dcddde',
                                            fontSize: '16px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleUpdateName}
                                    style={{
                                        backgroundColor: '#3ba55c',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 20px',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.17s ease'
                                    }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = '#2d7d32'}
                                    onMouseOut={(e) => e.target.style.backgroundColor = '#3ba55c'}
                                >
                                    保存
                                </button>
                                <button
                                    onClick={() => {
                                        setEditing(false);
                                        setNewName(user.displayName || "");
                                    }}
                                    style={{
                                        backgroundColor: '#747f8d',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 20px',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.17s ease'
                                    }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = '#5c6269'}
                                    onMouseOut={(e) => e.target.style.backgroundColor = '#747f8d'}
                                >
                                    キャンセル
                                </button>
                            </div>
                        ) : (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{
                                    fontSize: '16px',
                                    color: '#dcddde',
                                    padding: '12px 0'
                                }}>
                                    {user.displayName || "匿名"}
                                </span>
                                <button
                                    onClick={() => setEditing(true)}
                                    style={{
                                        backgroundColor: '#5865f2',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.17s ease'
                                    }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = '#4752c4'}
                                    onMouseOut={(e) => e.target.style.backgroundColor = '#5865f2'}
                                >
                                    編集
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* タグ管理セクション */}
                <div style={{
                    backgroundColor: '#2f3136',
                    borderRadius: '8px',
                    padding: '24px',
                    marginBottom: '24px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}>
                    <h3 style={{
                        margin: '0 0 16px 0',
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#ffffff'
                    }}>
                        🏷️ タグ管理
                    </h3>
                    <TagManager user={user} isProfilePage={true} />
                </div>

                {/* アカウント情報 */}
                <div style={{
                    backgroundColor: '#2f3136',
                    borderRadius: '8px',
                    padding: '24px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}>
                    <h3 style={{
                        margin: '0 0 16px 0',
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#ffffff'
                    }}>
                        アカウント情報
                    </h3>
                    <div style={{
                        padding: '16px',
                        backgroundColor: '#40444b',
                        borderRadius: '4px'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '8px'
                        }}>
                            <span style={{
                                color: '#b9bbbe',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                メールアドレス
                            </span>
                        </div>
                        <span style={{
                            color: '#dcddde',
                            fontSize: '16px'
                        }}>
                            {user.email}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}