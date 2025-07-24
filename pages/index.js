import { useEffect, useState, useRef } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "../lib/firebase";
import { useRouter } from "next/router";

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [user, setUser] = useState(null);
    const messagesEndRef = useRef(null);
    const router = useRouter();

    // 認証状態チェック
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

    // メッセージ取得(リアルタイム)
    useEffect(() => {
        if (!user) return;

        // メッセージをtimestamp昇順で100件取得
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

    // メッセージ送信
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

    // チャット画面最下部へスクロール
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // サインアウト
    const handleSignOut = async () => {
        await signOut(auth);
        router.push("/login");
    };

    return (
        <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2>Slack風チャット</h2>
                {user && <button onClick={handleSignOut}>ログアウト</button>}
            </div>

            <div style={{
                height: 400,
                overflowY: "auto",
                border: "1px solid #ccc",
                padding: 10,
                marginBottom: 10,
                backgroundColor: "#f9f9f9",
            }}>
                {messages.map((msg) => (
                    <div key={msg.id} style={{ marginBottom: 10 }}>
                        <strong>{msg.userName}</strong><br />
                        <span>{msg.message}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                    }
                }}
                rows={2}
                style={{ width: "100%", marginBottom: 10 }}
                placeholder="メッセージを入力..."
            />
            <button onClick={sendMessage} style={{ width: "100%" }}>
                送信
            </button>
        </div>
    );
}
