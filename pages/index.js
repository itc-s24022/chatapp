import { useEffect, useState, useRef } from "react";
import { collection, addDoc, query, orderBy, where, onSnapshot, serverTimestamp ,limit} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "../lib/firebase";
import { useRouter } from "next/router";


export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [user, setUser] = useState(null);
    const messagesEndRef = useRef(null);
    const router = useRouter();

    // 認証チェック
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser(user);
            } else {
                router.push("/login");
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // 自分のログ付きメッセージを取得
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "messages"),
            orderBy("timestamp", "asc"),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = [];
            snapshot.forEach((doc) => {
                msgs.push(doc.data());
            });
            setMessages(msgs);
            scrollToBottom();
        });

        return () => unsubscribe();
    }, [user]); // ← userを依存に含めることで再ログインにも対応


    // メッセージ送信処理
    const sendMessage = async () => {
        if (!input.trim() || !user) return;

        const messageData = {
            userId: user.uid,
            userName: user.displayName || "匿名",
            message: input,
            timestamp: serverTimestamp(),
        };

        await addDoc(collection(db, "messages"), messageData);

        // ログとしても保存
        await addDoc(collection(db, "logs"), {
            ...messageData,
            action: "send_message",
        });

        setInput("");
        scrollToBottom();
    };

    // スクロール
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // サインアウト
    const handleSignOut = async () => {
        await signOut(auth);
        router.push("/login");
    };

    return (
        <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h2>Slack風チャット</h2>
                {user && <button onClick={handleSignOut}>ログアウト</button>}
            </div>

            <div style={{
                height: "400px", overflowY: "scroll", border: "1px solid #ccc",
                padding: "10px", marginBottom: "10px", background: "#f9f9f9"
            }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{ marginBottom: "10px" }}>
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
                style={{ width: "100%", marginBottom: "10px" }}
                placeholder="メッセージを入力..."
            />
            <button onClick={sendMessage} style={{ width: "100%" }}>送信</button>
        </div>
    );
}
