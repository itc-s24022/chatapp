// components/FriendsList.jsx

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getUserFriends, createDMChannel } from '../lib/firestore';

export default function FriendsList({ user, onDMChannelSelect, currentChannel }) {
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const unsubscribe = getUserFriends(user.uid, (snapshot) => {
            const friendsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setFriends(friendsList);
            setLoading(false);
            console.log('Friends list updated:', friendsList);
        });

        return () => unsubscribe();
    }, [user]);

    const handleStartDM = async (friendId, friendData) => {
        if (!user) return;

        try {
            console.log('DM button clicked for friend:', friendData);
            console.log('Friend ID to be used:', friendId);

            // 現在のユーザー情報を取得
            const currentUserRef = doc(db, 'users', user.uid);
            const currentUserDoc = await getDoc(currentUserRef);
            const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : {};
            console.log('Current user:', user);
            console.log('Current user data:', currentUserData);

            // フレンドの情報を取得
            const friendRef = doc(db, 'users', friendId);
            const friendDoc = await getDoc(friendRef);
            const friendUserData = friendDoc.exists() ? friendDoc.data() : {};
            console.log('Friend data:', friendUserData);

            // ユーザー名を取得（displayNameがなければemailを使用）
            const currentUserName = currentUserData.displayName || user.displayName || user.email || 'ユーザー';
            const friendName = friendUserData.displayName || friendUserData.email || 'ユーザー';

            // DMチャンネルを作成
            const dmChannel = await createDMChannel(
                user.uid,
                friendId,
                currentUserName,
                friendName
            );

            if (dmChannel) {
                // 相手のユーザー情報を追加
                const enhancedDmChannel = {
                    ...dmChannel,
                    otherUserData: {
                        id: friendId,
                        displayName: friendName,
                        email: friendUserData.email,
                        avatar: friendUserData.avatar
                    }
                };

                // 作成したDMチャンネルを選択
                onDMChannelSelect(enhancedDmChannel);
            } else {
                throw new Error('DMチャンネルの作成に失敗しました');
            }
        } catch (error) {
            console.error('DM開始エラー:', error);
            alert('DMの開始に失敗しました: ' + error.message);
        }
    };

    // 相手のユーザーIDを取得
    const getFriendId = (friend) => {
        return friend.senderId === user.uid ? friend.receiverId : friend.senderId;
    };

    // 相手のユーザー情報を取得
    const getFriendData = (friend) => {
        const friendId = getFriendId(friend);
        return {
            id: friendId,
            displayName: friend.senderId === user.uid ? friend.receiverName : friend.senderName
        };
    };

    return (
        <div style={{
            width: '240px',
            backgroundColor: '#2f3136',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #202225',
                color: 'white',
                fontWeight: '600',
                fontSize: '16px'
            }}>
                ダイレクトメッセージ
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ padding: '16px', color: '#b9bbbe', textAlign: 'center' }}>
                        読み込み中...
                    </div>
                ) : friends.length === 0 ? (
                    <div style={{ padding: '16px', color: '#b9bbbe', textAlign: 'center' }}>
                        フレンドがいません
                    </div>
                ) : (
                    friends.map(friend => {
                        const friendId = getFriendId(friend);
                        const friendData = getFriendData(friend);
                        const isActive = currentChannel?.id === friend.id;

                        return (
                            <div
                                key={friend.id}
                                onClick={() => handleStartDM(friendId, friendData)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px 16px',
                                    cursor: 'pointer',
                                    backgroundColor: isActive ? '#5865f2' : 'transparent',
                                    color: isActive ? '#ffffff' : '#dcddde',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.backgroundColor = '#40444b';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: '#5865f2',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '600'
                                }}>
                                    {(friendData.displayName || 'ユーザー').charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        color: 'inherit',
                                        fontSize: '16px',
                                        fontWeight: '500',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {friendData.displayName || 'ユーザー'}
                                    </div>
                                    {/* メールアドレス表示を削除 */}
                                </div>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#3ba55c'
                                }} />
                            </div>
                        );
                    })
                )}
            </div>

            {/* ユーザー情報エリア */}
            {user && (
                <div style={{
                    backgroundColor: '#232428',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#5865f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}>
                        {(user.displayName || "匿").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {user.displayName || "匿名"}
                        </div>
                        <div style={{
                            color: '#b9bbbe',
                            fontSize: '12px'
                        }}>
                            オンライン
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}