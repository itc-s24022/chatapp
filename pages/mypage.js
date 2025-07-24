import { useEffect, useState } from "react";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRouter } from "next/router";

export default function MyPage() {
    const [user, setUser] = useState(null);
    const [editing, setEditing] = useState(false); // 編集モードかどうか
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
            setEditing(false); // 編集モード解除
        } catch (error) {
            console.error("更新エラー:", error);
            alert("ユーザー名の更新に失敗しました");
        }
    };

    return (
        <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
            <h2>マイページ</h2>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <strong>ユーザー名：</strong>
                {editing ? (
                    <>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="新しいユーザー名"
                            style={{ flex: 1, padding: 8 }}
                        />
                        <button onClick={handleUpdateName} style={{ marginLeft: 10 }}>
                            更新
                        </button>
                        <button onClick={() => setEditing(false)} style={{ marginLeft: 5 }}>
                            キャンセル
                        </button>
                    </>
                ) : (
                    <>
                        <span style={{ flex: 1 }}>{user.displayName || "匿名"}</span>
                        <button onClick={() => setEditing(true)} style={{ marginLeft: 10 }}>
                            変更
                        </button>
                    </>
                )}
            </div>

            <p><strong>メールアドレス：</strong> {user.email}</p>

            <button onClick={() => router.push("/")}>← チャットへ戻る</button>
        </div>
    );
}
