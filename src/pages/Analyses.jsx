import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getUserAnalyses, shareAnalysisToCommunity, addFeedbackUpdate } from '../services/analysisService';
import { Sprout, Clock, ArrowRight, Share2, Camera, Loader2, Send, Stethoscope, Activity, CalendarCheck, CheckCircle2, ChevronDown, Check } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Analyses() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [showGuide, setShowGuide] = useState(false);

    // Feedback State
    const [feedbackOpenId, setFeedbackOpenId] = useState(null);
    const [feedbackNote, setFeedbackNote] = useState('');
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const feedbackFileRef = useRef(null);

    // --- INITIAL LOAD & ONBOARDING ---
    useEffect(() => {
        if (currentUser) {
            loadAnalyses();
        }
    }, [currentUser]);

    // Check for "Start Treatment" redirect
    useEffect(() => {
        if (location.state?.showTreatmentGuide) {
            setShowGuide(true);
            // Clear state so it doesn't reappear on reload
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const loadAnalyses = async () => {
        setLoading(true);
        const data = await getUserAnalyses(currentUser.uid);
        setAnalyses(data);
        setLoading(false);

        // If redirected from new analysis, expand it automatically
        if (location.state?.newAnalysisId) {
            setExpandedId(location.state.newAnalysisId);
        } else if (data.length > 0 && location.state?.showTreatmentGuide) {
            // If just guide is shown, maybe expand the most recent one
            setExpandedId(data[0].id);
        }
    };

    // --- ACTIONS ---
    const toggleExpand = (id) => {
        setExpandedId(prev => prev === id ? null : id);
        setFeedbackOpenId(null);
    };

    const handleShare = async (e, item) => {
        e.stopPropagation();
        if (item.isPublic) return;
        if (!window.confirm(t('confirm_share') || "Share this diagnosis with the community?")) return;

        try {
            await shareAnalysisToCommunity(item.id, item, item.plantType || 'plant');
            // Optimistic update
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

            // Show success and reset
            setFeedbackOpenId(null);
            setFeedbackNote('');

            // Ideally reload analyses or append update locally? Reload is safer for sync.
            // alert("Gelişme kaydedildi!");
            loadAnalyses();

        } catch (error) {
            console.error("Feedback failed", error);
            alert("Failed to save update.");
        } finally {
            setFeedbackLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-green-600" /></div>;

    if (analyses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center text-gray-500 animate-fade-in">
                <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full mb-6">
                    <Sprout className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('no_analyses_title') || "Henüz Bir Analiz Yok"}</h2>
                <p className="mb-8 max-w-md">{t('no_analyses_desc') || "Bitkilerinizin sağlığını takip etmek için ilk analizinizi yapın."}</p>
                <Link to="/" className="bg-green-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-green-700 transition-colors shadow-lg hover:shadow-green-500/30 flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    {t('start_diagnosis') || "Analiz Başlat"}
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto w-full pb-24 px-4 animate-fade-in relative">

            {/* Header */}
            <div className="flex items-center justify-between mb-8 mt-6">
                <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                    <Activity className="w-7 h-7 text-green-600" />
                    {t('treatment_updates') || "Tedavi & Takip"}
                </h1>
                <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                    {analyses.length} {t('records') || "Kayıt"}
                </span>
            </div>

            {/* List */}
            <div className="grid gap-6">
                {analyses.map((item) => (
                    <div key={item.id} className={`bg-white dark:bg-gray-800 rounded-3xl shadow-sm border transition-all duration-300 overflow-hidden ${expandedId === item.id ? 'border-green-500 ring-4 ring-green-500/10 shadow-lg' : 'border-gray-100 dark:border-gray-700 hover:shadow-md'}`}>

                        {/* Summary Card Area (Always Visible) */}
                        <div
                            className="p-5 flex gap-5 cursor-pointer md:items-center relative"
                            onClick={() => toggleExpand(item.id)}
                        >
                            <img
                                src={item.mainImage}
                                alt={item.plantType}
                                className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover bg-gray-100 shadow-inner shrink-0"
                            />

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-lg md:text-xl text-gray-900 dark:text-white capitalize truncate">
                                        {item.plantType || 'Unknown Plant'}
                                    </h3>
                                    <span className="text-xs font-medium text-gray-400 flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg shrink-0">
                                        <Clock className="w-3 h-3" />
                                        {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Today'}
                                    </span>
                                </div>

                                <p className="text-red-600 dark:text-red-400 font-bold mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                    {item.result.disease_name}
                                </p>

                                <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 md:line-clamp-1">
                                    {item.result.description}
                                </p>

                                <div className="mt-3 flex items-center gap-4 text-xs font-bold text-gray-400">
                                    <div className="flex items-center gap-1 text-green-600">
                                        <CalendarCheck className="w-4 h-4" />
                                        <span>7 Günlük Program</span>
                                    </div>
                                    {item.isPublic && (
                                        <div className="flex items-center gap-1 text-blue-500">
                                            <Share2 className="w-4 h-4" />
                                            <span>Paylaşıldı</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="absolute right-5 bottom-5 md:static md:block hidden">
                                <ChevronDown className={`w-6 h-6 text-gray-300 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`} />
                            </div>
                        </div>

                        {/* Expanded Details Area */}
                        {expandedId === item.id && (
                            <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-6 animate-fade-in-down">

                                {/* Treatment Steps */}
                                <div className="mb-6">
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Stethoscope className="w-5 h-5 text-green-600" />
                                        Tedavi Adımları
                                    </h4>
                                    <div className="space-y-3">
                                        {item.result.treatment_steps && item.result.treatment_steps.map((step, idx) => (
                                            <div key={idx} className="flex gap-4 p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 shadow-sm">
                                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 flex items-center justify-center font-bold text-sm shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed pt-1">
                                                    {step}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Updates / History Section */}
                                {item.updates && item.updates.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm uppercase tracking-wider opacity-70">Gelişmeler</h4>
                                        <div className="flex gap-4 overflow-x-auto pb-4">
                                            {item.updates.map((update, uIdx) => (
                                                <div key={uIdx} className="min-w-[200px] bg-white dark:bg-gray-700 p-3 rounded-xl border border-gray-100 shadow-sm">
                                                    {update.imageUrl && <img src={update.imageUrl} className="w-full h-32 object-cover rounded-lg mb-2" />}
                                                    <p className="text-xs text-gray-500 mb-1">{new Date(update.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                                    <p className="text-sm text-gray-800 dark:text-gray-200">{update.note}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Bar */}
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => setFeedbackOpenId(feedbackOpenId === item.id ? null : item.id)}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-all active:scale-95"
                                    >
                                        <Camera className="w-5 h-5" />
                                        Gelişme Ekle
                                    </button>

                                    <button
                                        onClick={(e) => handleShare(e, item)}
                                        disabled={item.isPublic}
                                        className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${item.isPublic ? 'bg-blue-50 text-blue-400 cursor-default' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <Share2 className="w-5 h-5" />
                                        {item.isPublic ? 'Toplulukta Yayında' : 'Paylaş'}
                                    </button>
                                </div>

                                {/* Feedback Form */}
                                {feedbackOpenId === item.id && (
                                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-green-200 dark:border-green-800 shadow-inner animate-fade-in">
                                        <textarea
                                            value={feedbackNote}
                                            onChange={(e) => setFeedbackNote(e.target.value)}
                                            placeholder="Bitkinin durumu nasıl? Örneğin: 'Yapraklar tekrar yeşerdi...'"
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 mb-3 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
                                            rows={3}
                                        />
                                        <div className="flex justify-between items-center">
                                            <input
                                                type="file"
                                                ref={feedbackFileRef}
                                                className="text-xs text-gray-500 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                            />
                                            <button
                                                onClick={() => handleFeedbackSubmit(item)}
                                                disabled={feedbackLoading}
                                                className="bg-green-600 text-white p-2.5 rounded-full hover:bg-green-700 disabled:opacity-50 transition-colors"
                                            >
                                                {feedbackLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* TREATMENT GUIDE MODAL */}
            {showGuide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative overflow-hidden">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -ml-10 -mb-10"></div>

                        <div className="text-center relative z-10">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <CheckCircle2 className="w-10 h-10 text-green-600" />
                            </div>

                            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
                                Tedavi Süreci Başladı!
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                                Bitki analizi başarıyla kaydedildi. İyileşme sürecini buradan adım adım takip edebilirsin.
                            </p>

                            <div className="space-y-4 text-left mb-8">
                                <div className="flex gap-4 items-start p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                        <Stethoscope className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">Uygula</h4>
                                        <p className="text-xs text-gray-500">Önerilen tedavi adımlarını düzenli olarak uygula.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                        <Camera className="w-5 h-5 text-purple-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">Raporla</h4>
                                        <p className="text-xs text-gray-500">Haftalık yeni fotoğraflar yükleyerek gelişimi kaydet.</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowGuide(false)}
                                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                            >
                                Anladım, Başla
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
