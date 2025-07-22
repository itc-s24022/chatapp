import { useState, useEffect } from 'react';
import { db } from '../firebase'; // Firebase初期化済みのモジュール
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export default function ChatApp() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const auth = getAuth();
    const user = auth.currentUser;

    // Firestoreからチャット履歴取得（リアルタイム）
    useEffect(() => {
        const q = query(collection(db, 'messages'), orderBy('timestamp'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    // メッセージ送信処理
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        await addDoc(collection(db, 'messages'), {
            text: input,
            uid: user.uid,
            displayName: user.displayName || '匿名',
            timestamp: serverTimestamp(),
        });

        setInput('');
    };

    return (
        <div>
            <h1>チャットルーム</h1>
            <div style={{ height: '300px', overflowY: 'scroll', border: '1px solid #ccc' }}>
                {messages.map(msg => (
                    <p key={msg.id}>
                        <strong>{msg.displayName}:</strong> {msg.text}
                    </p>
                ))}
            </div>
            <form onSubmit={sendMessage}>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="メッセージを入力"
                />
                <button type="submit">送信</button>
            </form>
        </div>
    );
}
