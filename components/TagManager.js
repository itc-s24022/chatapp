import { useState, useEffect } from 'react';
import {
    updateUserTags,
    getAllTags,
    searchUsersByTag,
    inviteUsersByTag,
    getUserById // ← 新しくFirestoreからユーザーを取得する関数
} from '../lib/firestore';

export default function TagManager({ user, currentServer }) {
    const [userTags, setUserTags] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [newTag, setNewTag] = useState('');
    const [tagSearch, setTagSearch] = useState('');
    const [tagUsers, setTagUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteTag, setInviteTag] = useState('');

    useEffect(() => {
        if (!user) return;
        const fetchUserTags = async () => {
            try {
                const userData = await getUserById(user.uid); // Firestore から取得
                setUserTags(userData.tags || []);
            } catch (error) {
                console.error('ユーザータグ取得エラー:', error);
            }
        };
        fetchUserTags();
    }, [user]);

    useEffect(() => {
        const fetchAllTags = async () => {
            try {
                const tags = await getAllTags();
                setAllTags(tags);
            } catch (error) {
                console.error('タグ取得エラー:', error);
            }
        };
        fetchAllTags();
    }, []);

    const handleAddTag = async () => {
        if (!newTag.trim() || userTags.includes(newTag.trim())) return;
        try {
            const updatedTags = [...userTags, newTag.trim()];
            await updateUserTags(user.uid, updatedTags);
            setUserTags(updatedTags);
            setNewTag('');
        } catch (error) {
            console.error('タグ追加エラー:', error);
            alert('タグの追加に失敗しました');
        }
    };

    const handleRemoveTag = async (tagToRemove) => {
        try {
            const updatedTags = userTags.filter(tag => tag !== tagToRemove);
            await updateUserTags(user.uid, updatedTags);
            setUserTags(updatedTags);
        } catch (error) {
            console.error('タグ削除エラー:', error);
            alert('タグの削除に失敗しました');
        }
    };

    const handleSearchByTag = async () => {
        if (!tagSearch.trim()) return;

        setLoading(true);
        try {
            const users = await searchUsersByTag(tagSearch.trim());
            setTagUsers(users);
        } catch (error) {
            console.error('タグ検索エラー:', error);
            alert('ユーザーの検索に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleInviteByTag = async () => {
        if (!inviteTag.trim() || !currentServer) return;

        setLoading(true);
        try {
            await inviteUsersByTag(currentServer.id, inviteTag.trim(), user.displayName || '匿名');
            alert(`タグ "${inviteTag}" のユーザーを招待しました`);
            setInviteTag('');
            setShowInviteModal(false);
        } catch (error) {
            console.error('タグ別招待エラー:', error);
            alert(`招待に失敗しました: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            backgroundColor: '#2f3136',
            borderRadius: '8px',
            padding: '16px',
            color: '#dcddde',
            maxWidth: '400px'
        }}>
            <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '16px',
                fontWeight: '600'
            }}>
                タグ管理
            </h3>

            {/* ユーザーのタグ管理 */}
            <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    あなたのタグ
                </h4>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '12px'
                }}>
                    {userTags.map((tag, index) => (
                        <div key={index} style={{
                            backgroundColor: '#5865f2',
                            color: 'white',
                            borderRadius: '12px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <span>#{tag}</span>
                            <button
                                onClick={() => handleRemoveTag(tag)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    padding: '0',
                                    marginLeft: '4px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="新しいタグを追加"
                        style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: '#40444b',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#dcddde',
                            fontSize: '14px'
                        }}
                    />
                    <button
                        onClick={handleAddTag}
                        disabled={!newTag.trim()}
                        style={{
                            backgroundColor: newTag.trim() ? '#5865f2' : '#4f545c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '8px 12px',
                            cursor: newTag.trim() ? 'pointer' : 'not-allowed',
                            fontSize: '14px'
                        }}
                    >
                        追加
                    </button>
                </div>
            </div>

            {/* タグでユーザーを検索 */}
            <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    タグでユーザーを検索
                </h4>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                        type="text"
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        placeholder="タグを入力"
                        style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: '#40444b',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#dcddde',
                            fontSize: '14px'
                        }}
                    />
                    <button
                        onClick={handleSearchByTag}
                        disabled={!tagSearch.trim() || loading}
                        style={{
                            backgroundColor: tagSearch.trim() && !loading ? '#5865f2' : '#4f545c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '8px 12px',
                            cursor: tagSearch.trim() && !loading ? 'pointer' : 'not-allowed',
                            fontSize: '14px'
                        }}
                    >
                        {loading ? '検索中...' : '検索'}
                    </button>
                </div>

                {tagUsers.length > 0 && (
                    <div style={{
                        backgroundColor: '#40444b',
                        borderRadius: '4px',
                        padding: '8px',
                        maxHeight: '150px',
                        overflowY: 'auto'
                    }}>
                        {tagUsers.map(user => (
                            <div key={user.id} style={{
                                padding: '8px',
                                borderBottom: '1px solid #36393f',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: '#5865f2',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }}>
                                    {(user.displayName || '匿').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontSize: '14px' }}>
                                        {user.displayName || '匿名'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#b9bbbe' }}>
                                        {user.email}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* タグ別招待ボタン */}
            {currentServer && (
                <div>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        style={{
                            backgroundColor: '#3ba55c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            width: '100%'
                        }}
                    >
                        タグでユーザーを招待
                    </button>
                </div>
            )}

            {/* タグ別招待モーダル */}
            {showInviteModal && (
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
                        <h3 style={{
                            color: '#ffffff',
                            fontSize: '18px',
                            fontWeight: '600',
                            margin: '0 0 16px 0'
                        }}>
                            タグでユーザーを招待
                        </h3>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{
                                display: 'block',
                                color: '#b9bbbe',
                                fontSize: '12px',
                                fontWeight: '600',
                                marginBottom: '8px'
                            }}>
                                招待するタグ
                            </label>
                            <input
                                type="text"
                                value={inviteTag}
                                onChange={(e) => setInviteTag(e.target.value)}
                                placeholder="#社長 #メンバー"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: '#40444b',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: '#dcddde',
                                    fontSize: '16px',
                                    marginBottom: '8px'
                                }}
                            />
                            <div style={{
                                color: '#b9bbbe',
                                fontSize: '12px'
                            }}>
                                例: #社長 や #メンバー などのタグを入力
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px'
                        }}>
                            <button
                                onClick={() => {
                                    setShowInviteModal(false);
                                    setInviteTag('');
                                }}
                                style={{
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: '#ffffff',
                                    padding: '10px 16px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleInviteByTag}
                                disabled={!inviteTag.trim() || loading}
                                style={{
                                    backgroundColor: inviteTag.trim() && !loading ? '#3ba55c' : '#4f545c',
                                    border: 'none',
                                    color: 'white',
                                    padding: '10px 16px',
                                    borderRadius: '4px',
                                    cursor: inviteTag.trim() && !loading ? 'pointer' : 'not-allowed',
                                    fontSize: '14px'
                                }}
                            >
                                {loading ? '招待中...' : '招待'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}