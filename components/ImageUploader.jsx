
import { useState } from 'react';
import { uploadImage } from '../lib/firestore';

export default function ImageUploader({ onImageUploaded, accept = "image/*", maxSize = 5 * 1024 * 1024 }) {
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const handleFileSelect = async (file) => {
        if (!file) return;
        
        // ファイルサイズチェック
        if (file.size > maxSize) {
            alert(`ファイルサイズが大きすぎます。${Math.round(maxSize / 1024 / 1024)}MB以下にしてください。`);
            return;
        }
        
        // ファイルタイプチェック
        if (!file.type.startsWith('image/')) {
            alert('画像ファイルのみアップロード可能です。');
            return;
        }
        
        setUploading(true);
        try {
            const uploadedImage = await uploadImage(file);
            onImageUploaded(uploadedImage);
        } catch (error) {
            console.error('画像アップロードエラー:', error);
            alert('画像のアップロードに失敗しました。');
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };

    return (
        <div>
            <input
                type="file"
                accept={accept}
                onChange={(e) => handleFileSelect(e.target.files[0])}
                style={{ display: 'none' }}
                id="image-upload"
                disabled={uploading}
            />
            
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !uploading && document.getElementById('image-upload').click()}
                style={{
                    border: `2px dashed ${dragOver ? '#5865f2' : '#40444b'}`,
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    backgroundColor: dragOver ? 'rgba(88, 101, 242, 0.1)' : '#2f3136',
                    color: '#dcddde',
                    transition: 'all 0.2s ease'
                }}
            >
                {uploading ? (
                    <div>
                        <div style={{ fontSize: '20px', marginBottom: '8px' }}>⏳</div>
                        <div>アップロード中...</div>
                    </div>
                ) : (
                    <div>
                        <div style={{ fontSize: '20px', marginBottom: '8px' }}>📷</div>
                        <div>クリックまたはドラッグ&ドロップで画像をアップロード</div>
                        <div style={{ fontSize: '12px', color: '#72767d', marginTop: '4px' }}>
                            最大 {Math.round(maxSize / 1024 / 1024)}MB
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
