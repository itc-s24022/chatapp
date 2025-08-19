// components/YoutubePreview.js
import { useState, useEffect } from "react";

function YoutubePreview({ url }) {
    const [videoInfo, setVideoInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchVideoInfo = async () => {
            try {
                // YouTubeの動画IDをURLから抽出
                const videoId = extractVideoId(url);
                if (!videoId) {
                    setError("有効なYouTube URLではありません");
                    setLoading(false);
                    return;
                }

                // YouTube Data APIを使用して動画情報を取得
                const response = await fetch(
                    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=YOUR_API_KEY&part=snippet`
                );

                if (!response.ok) {
                    throw new Error("動画情報の取得に失敗しました");
                }

                const data = await response.json();

                if (data.items && data.items.length > 0) {
                    setVideoInfo({
                        id: videoId,
                        title: data.items[0].snippet.title,
                        thumbnail: data.items[0].snippet.thumbnails.medium.url,
                        channel: data.items[0].snippet.channelTitle
                    });
                } else {
                    setError("動画が見つかりません");
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchVideoInfo();
    }, [url]);

    // YouTube URLから動画IDを抽出する関数
    const extractVideoId = (url) => {
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    };

    if (loading) {
        return (
            <div style={{
                backgroundColor: '#2f3136',
                borderRadius: '8px',
                padding: '16px',
                margin: '8px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#b9bbbe'
            }}>
                YouTube動画を読み込み中...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                backgroundColor: '#2f3136',
                borderRadius: '8px',
                padding: '16px',
                margin: '8px 0',
                color: '#ed4245'
            }}>
                エラー: {error}
            </div>
        );
    }

    if (!videoInfo) {
        return null;
    }

    return (
        <div
            style={{
                backgroundColor: '#2f3136',
                borderRadius: '8px',
                overflow: 'hidden',
                margin: '8px 0',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                border: '1px solid #40444b'
            }}
            onClick={() => window.open(`https://www.youtube.com/watch?v=${videoInfo.id}`, '_blank')}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
            <div style={{ display: 'flex' }}>
                <img
                    src={videoInfo.thumbnail}
                    alt={videoInfo.title}
                    style={{
                        width: '120px',
                        height: '90px',
                        objectFit: 'cover',
                        borderRadius: '4px 0 0 4px'
                    }}
                />
                <div style={{ padding: '12px', flex: 1 }}>
                    <div style={{
                        color: '#ffffff',
                        fontWeight: '600',
                        fontSize: '14px',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                    }}>
                        {videoInfo.title}
                    </div>
                    <div style={{
                        color: '#72767d',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <span>YouTube</span>
                        <span>•</span>
                        <span>{videoInfo.channel}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default YoutubePreview;