import { useState, useRef } from 'react';
import { uploadImage } from '../lib/firestore';

export default function ImageUploader({ onImageUploaded, folder = 'images', multiple = false }) {
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    const validateFile = (file) => {
        // ファイルサイズチェック (10MB制限)
        if (file.size > 10 * 1024 * 1024) {
            alert('ファイルサイズは10MB以下にしてください');
            return false;
        }

        // ファイルタイプチェック
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('JPEG、PNG、GIF、WebP形式の画像のみアップロード可能です');
            return false;
        }

        return true;
    };

    const createPreview = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleFileUpload = async (file) => {
        if (!file || !validateFile(file)) return;

        createPreview(file);
        setUploading(true);

        try {
            const uploadedImage = await uploadImage(file, folder);
            onImageUploaded(uploadedImage);
        } catch (error) {
            console.error('アップロードエラー:', error);
            alert('画像のアップロードに失敗しました');
        } finally {
            setUploading(false);
            setPreview(null);
        }
    };

    const handleMultipleFiles = async (files) => {
        if (!multiple) {
            handleFileUpload(files[0]);
            return;
        }

        const validFiles = Array.from(files).filter(validateFile);
        if (validFiles.length === 0) return;

        setUploading(true);
        try {
            const uploadPromises = validFiles.map(file => uploadImage(file, folder));
            const uploadedImages = await Promise.all(uploadPromises);
            uploadedImages.forEach(image => onImageUploaded(image));
        } catch (error) {
            console.error('アップロードエラー:', error);
            alert('画像のアップロードに失敗しました');
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            if (multiple) {
                handleMultipleFiles(files);
            } else {
                handleFileUpload(files[0]);
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleFileInputChange = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            if (multiple) {
                handleMultipleFiles(files);
            } else {
                handleFileUpload(files[0]);
            }
        }
    };

    return (
        <div>
            <input
                type="file"
                accept="image/jpeg, image/png, image/gif, image/webp"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
                id="image-upload"
                disabled={uploading}
                multiple={multiple}
                ref={fileInputRef}
            />

            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !uploading && fileInputRef.current.click()}
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
                ) : preview ? (
                    <img src={preview} alt="プレビュー" style={{ maxWidth: '100%', maxHeight: '200px' }} />
                ) : (
                    <div>
                        <div style={{ fontSize: '20px', marginBottom: '8px' }}>📷</div>
                        <div>クリックまたはドラッグ&ドロップで画像をアップロード</div>
                        <div style={{ fontSize: '12px', color: '#72767d', marginTop: '4px' }}>
                            最大 10MB / {multiple ? '複数ファイル可' : '1ファイルのみ'}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}