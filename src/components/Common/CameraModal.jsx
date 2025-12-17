import React, { useRef, useState, useEffect } from 'react';
import { X, Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function CameraModal({ isOpen, onClose, onCapture }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState('');
    const { t } = useTranslation();

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen]);

    const startCamera = async () => {
        setError('');
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Prefer back camera on mobile
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera Error:", err);
            setError(t('camera_permission_denied') || "Camera access denied or not available.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Match canvas size to video size
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            onCapture({ target: { files: [] } }, imageDataUrl); // Simulate event signature or pass data directly
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 animate-fade-in">
            <div className="relative w-full max-w-lg bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-800">

                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
                    <span className="text-white font-medium">{t('take_photo')}</span>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Video Area */}
                <div className="relative aspect-[3/4] bg-gray-900 flex items-center justify-center">
                    {error ? (
                        <div className="text-center p-6 text-red-400">
                            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-80" />
                            <p>{error}</p>
                            <button
                                onClick={startCamera}
                                className="mt-4 px-4 py-2 bg-gray-800 rounded-lg text-white text-sm hover:bg-gray-700"
                            >
                                {t('retry') || "Retry"}
                            </button>
                        </div>
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>

                {/* Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center items-center bg-gradient-to-t from-black/80 to-transparent">
                    {!error && (
                        <button
                            onClick={handleCapture}
                            className="group relative"
                        >
                            <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform group-active:scale-95">
                                <div className="w-16 h-16 bg-white rounded-full"></div>
                            </div>
                        </button>
                    )}
                </div>

                <canvas ref={canvasRef} className="hidden" />
            </div>
        </div>
    );
}
