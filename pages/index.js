import { useEffect, useState, useRef } from "react";
import { collection, addDoc, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "../lib/firebase"; // 自作のfirebase設定ファイルからimport
import { useRouter } from "next/router";

export default function ChatPage() {
  console.log("Loaded index.js");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    // ログイン状態の確認
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push("/login"); // 未ログインならloginへ
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // Firestoreのリアルタイムメッセージ取得
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push(doc.data());
      });
      setMessages(msgs);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    await addDoc(collection(db, "messages"), {
      userId: user.uid,
      userName: user.displayName || "匿名",
      message: input,
      timestamp: new Date(),
    });
    setInput("");
    scrollToBottom();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
