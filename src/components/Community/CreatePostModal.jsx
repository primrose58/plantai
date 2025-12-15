import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Image as ImageIcon, Loader2, Send } from 'lucide-react';
import { createPost } from '../../services/analysisService';
import { useAuth } from '../contexts/AuthContext';

export default function CreatePostModal({ onClose, onPostCreated }) {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const fileInputRef = useRef(null);

    const [content, setContent] = useState('');
    const [plantType, setPlantType] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        setLoading(true);
        setError('');

        try {
            await createPost(currentUser.uid, {
                authorName: currentUser.displayName || 'Gardener',
                content,
                plantType,
                image: image // post service handles file upload
            });
            onPostCreated();
            onClose();
        } catch (err) {
            setError('Failed to share post. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Ask Community</h3>
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

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <textarea
                            className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none resize-none min-h-[120px]"
                            placeholder="What's on your mind? Ask about a plant, disease, or share a tip..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />

                        <div className="flex gap-4">
                            <input
                                type="text"
                                placeholder="Plant Type (Optional)"
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                                value={plantType}
                                onChange={(e) => setPlantType(e.target.value)}
                            />
                        </div>

                        {/* Image Preview */}
                        {imagePreview && (
                            <div className="relative rounded-xl overflow-hidden max-h-48 bg-gray-100 dark:bg-gray-900">
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => { setImage(null); setImagePreview(null); }}
                                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 text-gray-500 hover:text-green-600 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <ImageIcon className="w-5 h-5" />
                                <span className="text-sm font-medium">Add Photo</span>
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
                                Post
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
