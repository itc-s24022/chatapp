import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function UserProfile({ user, onClose, onSendFriendRequest, onCreateDM, isFriend }) {
    const [loading, setLoading] = useState(false);

    const handleFriendRequest = async () => {
        setLoading(true);
        await onSendFriendRequest(user);
        setLoading(false);
    };

    const handleCreateDM = async () => {
        setLoading(true);
        try {
            // ユーザー情報を取得
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            const userData = userDoc.exists() ? userDoc.data() : {};

            // ユーザー名を取得（displayNameがなければemailを使用）
            const userName = userData.displayName || user.displayName || user.email || 'ユーザー';

            // DMを作成
            await onCreateDM(user.uid, userName);
        } catch (error) {
            console.error('DM作成エラー:', error);
            alert('DMの作成に失敗しました: ' + error.message);
        }
        setLoading(false);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: '#36393f',
                borderRadius: '8px',
                padding: '24px',
                width: '400px',
                maxWidth: '90vw'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <h2 style={{
                        color: '#ffffff',
                        fontSize: '20px',
                        fontWeight: '600',
                        margin: 0
                    }}>
                        ユーザープロフィール
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#b9bbbe',
                            cursor: 'pointer',
                            fontSize: '18px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: '#5865f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: '600',
                        color: 'white'
                    }}>
                        {(user.displayName || user.email || "ユーザー").charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 style={{
                            color: '#ffffff',
                            fontSize: '18px',
                            fontWeight: '600',
                            margin: '0 0 4px 0'
                        }}>
                            {user.displayName || user.email || "ユーザー"}
                        </h3>
                        <p style={{
                            color: '#b9bbbe',
                            fontSize: '14px',
                            margin: 0
                        }}>
                            {user.email}
                        </p>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end'
                }}>
                    {isFriend ? (
                        <button
                            onClick={handleCreateDM}
                            disabled={loading}
                            style={{
                                backgroundColor: '#3ba55c',
                                color: 'white',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '4px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            {loading ? '処理中...' : 'メッセージを送る'}
                        </button>
                    ) : (
                        <button
                            onClick={handleFriendRequest}
                            disabled={loading}
                            style={{
                                backgroundColor: '#5865f2',
                                color: 'white',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '4px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            {loading ? '送信中...' : 'フレンド申請'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}