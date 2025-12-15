import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Image as ImageIcon, Loader2, Send, Wand2 } from 'lucide-react';
import { createPost } from '../../services/analysisService';
import { useAuth } from '../../contexts/AuthContext';
import { PLANT_TYPES, DISEASE_TYPES } from '../../constants/plantData';
import imageCompression from 'browser-image-compression';
import { analyzePlantImage } from '../../services/gemini';

export default function CreatePostModal({ onClose, onPostCreated }) {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const fileInputRef = useRef(null);

    const [content, setContent] = useState('');
    const [plantType, setPlantType] = useState('other');
    const [diseaseType, setDiseaseType] = useState('none');

    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Preview immediately
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);

            // Compress immediately
            try {
                const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                    initialQuality: 0.8
                };
                const compressedFile = await imageCompression(file, options);
                setImage(compressedFile);
            } catch (err) {
                console.error("Compression error:", err);
                setImage(file); // Fallback to original
            }
        }
    };

    const handleAutoDetect = async () => {
        if (!image) return;
        setDetecting(true);
        try {
            // Convert blob to base64 for API
            const reader = new FileReader();
            reader.readAsDataURL(image);
            reader.onloadend = async () => {
                const base64data = reader.result;
                const result = await analyzePlantImage(base64data, 'en'); // Use EN for internal consistency mapping

                // Simple heuristic mapping based on result
                // This is a basic implementation, ideal world we ask AI for specific JSON keys
                const text = (result.plant_name + " " + result.disease_name).toLowerCase();

                const foundPlant = PLANT_TYPES.find(p => text.includes(p.value));
                if (foundPlant) setPlantType(foundPlant.value);

                const foundDisease = DISEASE_TYPES.find(d => text.includes(d.value) || result.disease_name.toLowerCase().includes(d.value));
                if (foundDisease) setDiseaseType(foundDisease.value);

                setDetecting(false);
                setSuccessMsg("Detected: " + result.plant_name);
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            console.error("Auto detect failed", err);
            setDetecting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        setLoading(true);
        setError('');
        setUploadProgress(0);

        try {
            await createPost(currentUser.uid, {
                authorName: currentUser.displayName || 'Gardener',
                content,
                plantType: plantType === 'other' ? '' : plantType, // Store raw value
                title: '', // Deprecated
                image: image,
                // Add extended metadata if needed in future
            }, (progress) => {
                setUploadProgress(progress);
            });
            onPostCreated();
            onClose();
        } catch (err) {
            setError(t('error_diagnosis_failed') || 'Failed to share post.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('community')}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="mb-4 p-3 bg-green-100 border border-green-200 text-green-700 rounded-lg text-sm">
                            {successMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <textarea
                            className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none resize-none min-h-[120px]"
                            placeholder={t('what_plant_placeholder')}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />

                        <div className="grid grid-cols-2 gap-4">
                            {/* Plant Type Dropdown */}
                            <select
                                value={plantType}
                                onChange={(e) => setPlantType(e.target.value)}
                                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm outline-none"
                            >
                                <option value="" disabled>Select Plant</option>
                                {PLANT_TYPES.map(p => (
                                    <option key={p.value} value={p.value}>{t(p.labelKey)}</option>
                                ))}
                            </select>

                            {/* Disease Type Dropdown - Optional Metadata */}
                            {/* Integrating disease info into content or separate field - for now simplified ui */}
                        </div>

                        {/* Image Preview */}
                        {imagePreview && (
                            <div className="relative rounded-xl overflow-hidden max-h-48 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => { setImage(null); setImagePreview(null); }}
                                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                                    disabled={loading}
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                {/* AI Auto Detect Button */}
                                <button
                                    type="button"
                                    onClick={handleAutoDetect}
                                    disabled={detecting}
                                    className="absolute bottom-2 right-2 px-3 py-1.5 bg-blue-600/90 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-blue-700 backdrop-blur-sm"
                                >
                                    {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                    {detecting ? t('detecting') : t('auto_detect')}
                                </button>
                            </div>
                        )}

                        {/* Progress Bar */}
                        {loading && uploadProgress > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                <div className="bg-green-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                <p className="text-xs text-center mt-1 text-gray-500">{Math.round(uploadProgress)}%</p>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                                className="flex items-center gap-2 text-gray-500 hover:text-green-600 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                            >
                                <ImageIcon className="w-5 h-5" />
                                <span className="text-sm font-medium">{t('upload_photo')}</span>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />

                            <button
                                type="submit"
                                disabled={loading || !content.trim()}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {loading ? '...' : t('ask_question')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
