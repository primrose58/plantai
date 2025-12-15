import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Image as ImageIcon, Loader2, Send, Wand2, Search, ChevronDown } from 'lucide-react';
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
    const [plantType, setPlantType] = useState('');
    const [plantSearch, setPlantSearch] = useState('');
    const [showPlantDropdown, setShowPlantDropdown] = useState(false);

    // Disease is optional/secondary for now, kept simpler
    const [diseaseType, setDiseaseType] = useState('none');

    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [uploadProgress, setUploadProgress] = useState(0);

    // Initial load: Set search text if type is already set (e.g. from props)
    useEffect(() => {
        if (plantType) {
            const p = PLANT_TYPES.find(pt => pt.value === plantType);
            if (p) setPlantSearch(t(p.labelKey));
        }
    }, [plantType, t]);


    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Preview immediately
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
            setImage(file); // Set original first to be safe
        }
    };

    const handleAutoDetect = async () => {
        if (!image) return;
        setDetecting(true);
        try {
            // Compress for analysis to save bandwidth
            let analysisImage = image;
            try {
                const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true };
                analysisImage = await imageCompression(image, options);
            } catch (err) {
                console.warn("Compression failed for analysis, using original", err);
            }

            const reader = new FileReader();
            reader.readAsDataURL(analysisImage);
            reader.onloadend = async () => {
                const base64data = reader.result;
                const result = await analyzePlantImage(base64data, 'en');

                const text = (result.plant_name + " " + result.disease_name).toLowerCase();

                // Find best match
                let bestMatch = null;
                for (const p of PLANT_TYPES) {
                    if (text.includes(p.value)) {
                        bestMatch = p;
                        break;
                    }
                }

                if (bestMatch) {
                    setPlantType(bestMatch.value);
                    setPlantSearch(t(bestMatch.labelKey)); // Update UI
                    setSuccessMsg(`${t('auto_detect')}: ${t(bestMatch.labelKey)}`);
                } else {
                    setSuccessMsg("Plant detected but not in our list yet.");
                }

                setTimeout(() => setSuccessMsg(''), 3000);
                setDetecting(false);
            }
        } catch (err) {
            console.error("Auto detect failed", err);
            setError(t('error_diagnosis_failed'));
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
            // 1. Aggressive Compression for Firestore Base64 (Target < 300KB)
            let base64Image = null;
            if (image) {
                try {
                    console.log("Compressing for Base64 storage...");
                    const options = {
                        maxSizeMB: 0.3, // Very small to fit in document
                        maxWidthOrHeight: 800,
                        useWebWorker: true
                    };
                    const compressedFile = await imageCompression(image, options);

                    // Convert to Base64
                    base64Image = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(compressedFile);
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = error => reject(error);
                    });
                    console.log("Base64 string ready, length:", base64Image.length);
                } catch (cErr) {
                    console.error("Compression failed:", cErr);
                    // Skip image if compression fails to avoid breaking DB limit
                    setError("Image is too large and could not be compressed.");
                    setLoading(false);
                    return;
                }
            }

            // 2. Create Post (Pass Base64 string directly)
            await createPost(currentUser.uid, {
                authorName: currentUser.displayName || 'Gardener',
                content,
                plantType: plantType || 'other',
                image: base64Image, // This is now a string, not a File
            });

            onPostCreated();
            onClose();
        } catch (err) {
            console.error("FULL POST ERROR:", err);
            // Show detailed error if available, else generic
            setError(err.message || t('error_diagnosis_failed') || 'Failed to share post.');
        } finally {
            setLoading(false);
        }
    };

    const filteredPlants = PLANT_TYPES.filter(p =>
        t(p.labelKey).toLowerCase().includes(plantSearch.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('ask_question')}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
                    {successMsg && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">{successMsg}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <textarea
                            className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none resize-none min-h-[120px]"
                            placeholder={t('what_plant_placeholder')}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />

                        {/* Searchable Plant Selector */}
                        <div className="relative">
                            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1 uppercase">{t('plant_diagnosis')}</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder={t('select_plant')}
                                    value={plantSearch}
                                    onChange={(e) => {
                                        setPlantSearch(e.target.value);
                                        setShowPlantDropdown(true);
                                        if (e.target.value === '') setPlantType('');
                                    }}
                                    onFocus={() => setShowPlantDropdown(true)}
                                />
                                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>

                            {showPlantDropdown && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                                    {filteredPlants.length > 0 ? (
                                        filteredPlants.map(p => (
                                            <div
                                                key={p.value}
                                                className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200"
                                                onClick={() => {
                                                    setPlantType(p.value);
                                                    setPlantSearch(t(p.labelKey));
                                                    setShowPlantDropdown(false);
                                                }}
                                            >
                                                {t(p.labelKey)}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-2 text-sm text-gray-400">No Match</div>
                                    )}
                                </div>
                            )}
                            {/* Overlay to close dropdown when clicking outside */}
                            {showPlantDropdown && (
                                <div className="fixed inset-0 z-0" onClick={() => setShowPlantDropdown(false)}></div>
                            )}
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

                                <button
                                    type="button"
                                    onClick={handleAutoDetect}
                                    disabled={detecting}
                                    className="absolute bottom-2 right-2 px-3 py-1.5 bg-blue-600/90 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-blue-700 backdrop-blur-sm shadow-lg transition-transform hover:scale-105"
                                >
                                    {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                    {detecting ? t('detecting') : t('auto_detect')}
                                </button>
                            </div>
                        )}

                        {/* Progress */}
                        {loading && uploadProgress > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
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
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-95"
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
