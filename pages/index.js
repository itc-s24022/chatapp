
import { useEffect, useState, useRef } from "react";
import {
    collection, addDoc, query, orderBy, onSnapshot,
    serverTimestamp, limit
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "../lib/firebase";
import { useRouter } from "next/router";

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [user, setUser] = useState(null);
    const messagesEndRef = useRef(null);
    const router = useRouter();

    // 🔐 認証状態チェック
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push("/login");
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    // 💬 メッセージ取得(リアルタイム)
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "messages"),
            orderBy("timestamp", "asc"),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
            scrollToBottom();
        });

        return () => unsubscribe();
    }, [user]);

    // 📨 メッセージ送信処理
    const sendMessage = async () => {
        if (!input.trim() || !user) return;

        const messageData = {
            userId: user.uid,
            userName: user.displayName || "匿名",
            message: input.trim(),
            timestamp: serverTimestamp(),
        };

        try {
            await addDoc(collection(db, "messages"), messageData);
            await addDoc(collection(db, "logs"), {
                ...messageData,
                action: "send_message",
            });
            setInput("");
            scrollToBottom();
        } catch (error) {
            alert("送信エラー: " + error.message);
        }
    };

    // ⬇️ チャット画面最下部へスクロール
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // 🚪 ログアウト処理
    const handleSignOut = async () => {
        await signOut(auth);
        router.push("/login");
    };

    // 時刻フォーマット関数
    const formatTime = (timestamp) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            backgroundColor: '#36393f',
            color: '#dcddde',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button
                        onClick={() => router.push("/mypage")}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: 20,
                            cursor: 'pointer',
                            color: '#b9bbbe',
                            padding: '8px',
                            borderRadius: '4px',
                            transition: 'background-color 0.17s ease'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#40444b'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        aria-label="プロフィールページへ"
                    >
                        👤
                    </button>
                    <h2 style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 600,
                        color: '#ffffff'
                    }}>
                        # 一般
                    </h2>
                </div>
                
                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ 
                            fontSize: 14, 
                            color: '#b9bbbe',
                            fontWeight: 500
                        }}>
                            {user.displayName || "匿名"}
                        </span>
                        <button
                            onClick={handleSignOut}
                            style={{
                                backgroundColor: '#5865f2',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                fontSize: 14,
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'background-color 0.17s ease'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#4752c4'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#5865f2'}
                        >
                            ログアウト
                        </button>
                    </div>
                )}
            </div>

            {/* メッセージエリア */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                {messages.map((msg, index) => {
                    const showAvatar = index === 0 || messages[index - 1].userId !== msg.userId;
                    
                    return (
                        <div key={msg.id} style={{
                            display: 'flex',
                            alignItems: showAvatar ? 'flex-start' : 'center',
                            gap: '16px',
                            padding: showAvatar ? '8px 0' : '2px 0',
                            borderRadius: '4px',
                            transition: 'background-color 0.17s ease'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#32353b'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            {showAvatar ? (
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: '#5865f2',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    fontWeight: '600',
                                    color: 'white',
                                    flexShrink: 0
                                }}>
                                    {(msg.userName || "匿").charAt(0).toUpperCase()}
                                </div>
                            ) : (
                                <div style={{ width: '40px', flexShrink: 0 }}>
                                    <span style={{
                                        fontSize: '11px',
                                        color: '#72767d',
                                        marginLeft: '8px',
                                        opacity: 0
                                    }}>
                                        {formatTime(msg.timestamp)}
                                    </span>
                                </div>
                            )}
                            
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {showAvatar && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        gap: '8px',
                                        marginBottom: '4px'
                                    }}>
                                        <span style={{
                                            fontWeight: '600',
                                            color: '#ffffff',
                                            fontSize: '16px'
                                        }}>
                                            {msg.userName || "匿名"}
                                        </span>
                                        <span style={{
                                            fontSize: '12px',
                                            color: '#72767d',
                                            fontWeight: '400'
                                        }}>
                                            {formatTime(msg.timestamp)}
                                        </span>
                                    </div>
                                )}
                                <div style={{
                                    fontSize: '16px',
                                    lineHeight: '1.375',
                                    color: '#dcddde',
                                    wordWrap: 'break-word',
                                    marginLeft: showAvatar ? '0' : '0'
                                }}>
                                    {msg.message}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* 入力エリア */}
            <div style={{
                padding: '20px',
                backgroundColor: '#36393f',
                borderTop: '1px solid #40444b'
            }}>
                <div style={{
                    backgroundColor: '#40444b',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '12px'
                }}>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder="#一般 にメッセージを送信"
                        style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#dcddde',
                            fontSize: '16px',
                            resize: 'none',
                            outline: 'none',
                            fontFamily: 'inherit',
                            lineHeight: '1.375',
                            minHeight: '24px',
                            maxHeight: '120px'
                        }}
                        rows={1}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim()}
                        style={{
                            backgroundColor: input.trim() ? '#5865f2' : '#4f545c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            width: '32px',
                            height: '32px',
                            cursor: input.trim() ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            transition: 'background-color 0.17s ease',
                            flexShrink: 0
                        }}
                        onMouseOver={(e) => {
                            if (input.trim()) e.target.style.backgroundColor = '#4752c4';
                        }}
                        onMouseOut={(e) => {
                            if (input.trim()) e.target.style.backgroundColor = '#5865f2';
                        }}
                    >
                        ➤
                    </button>
                </div>
            </div>
        </div>
    );
}
