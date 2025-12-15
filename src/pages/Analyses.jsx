import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getUserAnalyses, shareAnalysisToCommunity, addFeedbackUpdate } from '../services/analysisService'; // Updated Import
import { Sprout, Clock, AlertTriangle, CheckCircle, ArrowRight, Share2, Camera, Loader2, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Analyses() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    // Feedback State
    const [feedbackOpenId, setFeedbackOpenId] = useState(null);
    const [feedbackNote, setFeedbackNote] = useState('');
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const feedbackFileRef = useRef(null);

    const toggleExpand = (id) => {
        setExpandedId(prev => prev === id ? null : id);
        setFeedbackOpenId(null); // Close feedback if changing items
    };

    useEffect(() => {
        if (currentUser) {
            loadAnalyses();
        }
    }, [currentUser]);

    const loadAnalyses = async () => {
        setLoading(true);
        const data = await getUserAnalyses(currentUser.uid);
        setAnalyses(data);
        setLoading(false);
    };

    const handleShare = async (e, item) => {
        e.stopPropagation(); // Prevent toggle expand
        if (item.isPublic) {
            alert(t('already_shared') || "This analysis is already shared to the community.");
            return;
        }

        if (!window.confirm(t('confirm_share') || "Share this diagnosis with the community?")) return;

        try {
            await shareAnalysisToCommunity(item.id, item, item.plantType || 'plant');
            alert(t('share_success') || "Shared successfully!");
            // Update local state to show 'shared' status
            setAnalyses(prev => prev.map(a => a.id === item.id ? { ...a, isPublic: true } : a));
        } catch (error) {
            console.error("Share failed", error);
            alert("Failed to share.");
        }
    };

    const handleFeedbackSubmit = async (item) => {
        if (!feedbackNote.trim()) return;
        setFeedbackLoading(true);

        try {
            let base64 = null;
            if (feedbackFileRef.current?.files?.[0]) {
                const file = feedbackFileRef.current.files[0];
                base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
            }

            await addFeedbackUpdate(item.id, base64, feedbackNote);
            alert("Feedback added! Thank you for updating the progress.");
            setFeedbackOpenId(null);
            setFeedbackNote('');
            if (feedbackFileRef.current) feedbackFileRef.current.value = '';
        } catch (error) {
            console.error("Feedback failed", error);
            alert("Failed to save feedback.");
        } finally {
            setFeedbackLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-green-600" /></div>;

    if (analyses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500 animate-fade-in">
                <Sprout className="w-16 h-16 mb-4 opacity-50" />
                <h2 className="text-xl font-bold mb-2">No Analyses Yet</h2>
                <p className="mb-6">Start diagnosing your plants to track their health here.</p>
                <Link to="/" className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition-colors">
                    Start Diagnosis
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto w-full pb-24 px-4 animate-fade-in">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white mt-6">
                <Clock className="w-6 h-6 text-green-600" />
                {t('my_analyses') || "My Plant Analyses"}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analyses.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="relative h-48 cursor-pointer group" onClick={() => toggleExpand(item.id)}>
                            <img src={item.mainImage} alt={item.plantType} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/50 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                                {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                            </div>
                            {item.isPublic && (
                                <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                                    <Share2 className="w-3 h-3" /> Shared
                                </div>
                            )}
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white capitalize">
                                    {item.plantType || 'Unknown Plant'}
                                </h3>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.result.status === 'success' || !item.result.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {item.result.disease_name || 'Healthy'}
                                </span>
                            </div>

                            <div className={`transition-all duration-300 ${expandedId === item.id ? '' : 'line-clamp-2'}`}>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                    {item.result.description}
                                </p>

                                {/* Expanded Content */}
                                {expandedId === item.id && (
                                    <div className="space-y-4 animate-fade-in">
                                        {item.result.treatment_steps && (
                                            <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                                <h4 className="font-bold text-xs text-green-800 dark:text-green-400 mb-2 uppercase">Treatment</h4>
                                                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                                    {item.result.treatment_steps.map((step, idx) => (
                                                        <li key={idx}>{step}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setFeedbackOpenId(feedbackOpenId === item.id ? null : item.id); }}
                                                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Camera className="w-4 h-4" /> Add Update
                                            </button>
                                            <button
                                                onClick={(e) => handleShare(e, item)}
                                                className={`flex-1 ${item.isPublic ? 'bg-blue-100 text-blue-600 cursor-default' : 'bg-blue-600 hover:bg-blue-700 text-white'} py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors`}
                                                disabled={item.isPublic}
                                            >
                                                <Share2 className="w-4 h-4" /> {item.isPublic ? 'Shared' : 'Share'}
                                            </button>
                                        </div>

                                        {/* Feedback Form */}
                                        {feedbackOpenId === item.id && (
                                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 animate-fade-in">
                                                <h4 className="font-bold text-sm mb-2">Update Progress</h4>
                                                <textarea
                                                    className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm mb-2 focus:ring-2 focus:ring-green-500 outline-none"
                                                    placeholder="How is the plant doing? e.g., 'Leaves are recovering...'"
                                                    rows={2}
                                                    value={feedbackNote}
                                                    onChange={(e) => setFeedbackNote(e.target.value)}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="file"
                                                        ref={feedbackFileRef}
                                                        accept="image/*"
                                                        className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                                    />
                                                    <button
                                                        onClick={() => handleFeedbackSubmit(item)}
                                                        disabled={feedbackLoading || !feedbackNote.trim()}
                                                        className="ml-auto bg-green-600 text-white p-2 rounded-lg disabled:opacity-50"
                                                    >
                                                        {feedbackLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
                                <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                                    <Clock className="w-4 h-4" />
                                    <span>Checkup: 7 days</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
                                    className="text-green-600 font-bold text-sm flex items-center gap-1 hover:text-green-700"
                                >
                                    {expandedId === item.id ? 'Hide Details' : 'View Details'} <ArrowRight className={`w-4 h-4 transition-transform ${expandedId === item.id ? 'rotate-90' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
