import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Image as ImageIcon, Loader2, ArrowRight, Sprout, AlertCircle, ScanLine, Save, CheckCircle, Brain, Sparkles, Activity, ShieldCheck, Zap } from 'lucide-react';
import { analyzePlantImage } from '../services/gemini';
import { saveAnalysis } from '../services/analysisService';
import DiagnosisResult from '../components/Plant/DiagnosisResult';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import CameraModal from '../components/Common/CameraModal';

export default function Home() {
    const { t, i18n } = useTranslation();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { addToast } = useToast();

    const fileInputRef = useRef(null);

    // Wizard State
    const [step, setStep] = useState('landing');
    const [plantType, setPlantType] = useState('');
    const [images, setImages] = useState({ main: null, macro: null });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [isSaved, setIsSaved] = useState(false);
    const [showCamera, setShowCamera] = useState(false); // Camera Modal State

    // Restore state
    useEffect(() => {
        if (location.state?.restoredResult) {
            setResult(location.state.restoredResult);
            setStep('result');
            if (location.state?.restoredImages) {
                setImages(location.state.restoredImages);
                setPlantType(location.state.restoredPlantType || '');
            }
        }
    }, [location.state]);

    const handleNextStep = () => {
        if (step === 'input_type') setStep('capture_main');
    };

    const handleSkipType = () => {
        setPlantType('');
        setStep('capture_main');
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleCameraCapture = (imageDataUrl) => {
        if (imageDataUrl) {
            processImage(imageDataUrl);
        }
        setShowCamera(false); // Close modal after capture
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result;
            processImage(base64String);
        };
        reader.readAsDataURL(file);
    };

    const processImage = async (base64String) => {
        if (step === 'capture_main') {
            setImages(prev => ({ ...prev, main: base64String }));
            await performDiagnosis(base64String, false);
        } else if (step === 'capture_macro') {
            setImages(prev => ({ ...prev, macro: base64String }));
            await performDiagnosis([images.main, base64String], true);
        }
    };

    const performDiagnosis = async (imageData, isMacroRetry) => {
        setLoading(true);
        setStep('analyzing');
        setIsSaved(false);

        try {
            const analysis = await analyzePlantImage(imageData, i18n.language, plantType);

            if (analysis.status === 'needs_details') {
                addToast(t('need_macro_photo') || "I need a closer look. Please take a macro photo.", 'info');
                setStep('capture_macro');
            } else if (analysis.status === 'error') {
                throw new Error(analysis.error);
            } else {
                setResult(analysis);
                setStep('result');
            }
        } catch (err) {
            console.error(err);
            let msg = err.message || t('error_diagnosis_failed') || 'Diagnosis failed.';

            // Map specific errors to localized friendly messages
            if (msg.includes('NOT_PLANT')) {
                msg = t('error_not_plant');
            } else if (msg.includes('503') || msg.includes('overloaded')) {
                msg = t('error_server_busy');
            }

            addToast(msg, 'error'); // REAL ERROR SHOWN HERE
            setStep('capture_main');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveResult = async () => {
        if (!currentUser) return;
        if (isSaved) return;

        try {
            const docId = await saveAnalysis(currentUser.uid, plantType, images, result);
            setIsSaved(true);
            addToast(t('treatment_started') || "Tedavi süreci başlatıldı!", "success");

            // Redirect to Analyses with onboarding flag
            setTimeout(() => {
                navigate('/analyses', {
                    state: {
                        showTreatmentGuide: true,
                        newAnalysisId: docId
                    }
                });
            }, 500); // Small delay for effect

        } catch (error) {
            console.error("Manual save failed:", error);
            addToast((t('save_fail') || "Failed to save analysis:") + " " + error.message, "error");
        }
    };

    const handleLoginRedirect = () => {
        navigate('/login', {
            state: {
                pendingResult: result,
                pendingImages: images,
                pendingPlantType: plantType,
                returnUrl: '/'
            }
        });
    };

    const resetScan = () => {
        setImages({ main: null, macro: null });
        setPlantType('');
        setResult(null);
        setIsSaved(false);
        setStep('input_type');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- RENDER HELPERS ---

    // --- LANDING PAGE COMPONENT ---
    const renderLanding = () => (
        <div className="flex flex-col items-center w-full animate-fade-in relative overflow-hidden">

            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-30 dark:opacity-10">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-green-400 rounded-full mix-blend-multiply filter blur-[100px] animate-float opacity-70"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-300 rounded-full mix-blend-multiply filter blur-[120px] animate-float delay-100 opacity-70"></div>
            </div>

            {/* HERO SECTION */}
            <div className="text-center max-w-4xl py-20 px-4 z-10">
                <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-white/20 dark:border-gray-700/50 shadow-sm mb-8 animate-fade-in">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent font-bold text-sm tracking-wide">
                        {t('ai_powered_v2') || "POWERED BY GEMINI AI"}
                    </span>
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight animate-slide-up">
                    {t('hero_title_1') || "Heal your plants with"} <br />
                    <span className="text-gradient drop-shadow-sm">{t('hero_title_highlight') || "AI Precision"}</span>
                </h1>

                <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up delay-100">
                    {t('hero_desc_v2') || "Instantly identify diseases, get treatment plans, and monitor plant health with our advanced AI botanist. Just snap a photo."}
                </p>

                <button
                    onClick={() => setStep('input_type')}
                    className="group relative bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-5 px-12 rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all text-xl flex items-center justify-center gap-3 mx-auto animate-slide-up delay-200"
                >
                    <div className="absolute inset-0 rounded-full bg-white/20 group-hover:scale-110 transition-transform opacity-0 group-hover:opacity-100 duration-500 blur-lg"></div>
                    <span className="relative flex items-center gap-3">
                        <Camera className="w-6 h-6" />
                        {t('start_diagnosis')}
                    </span>
                </button>
            </div>

            {/* FEATURES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl px-4 z-10 mb-20 animate-slide-up delay-300">
                {[
                    {
                        title: t('feature_1_title') || "Instant Analysis",
                        desc: t('feature_1_desc') || "Get results in seconds. Our AI analyzes leaf patterns to detect subtle signs of disease.",
                        icon: Zap,
                        color: 'from-yellow-400 to-orange-500'
                    },
                    {
                        title: t('feature_2_title') || "Smart Interactions",
                        desc: t('feature_2_desc') || "The AI knows when it needs a better look. It will ask for macro shots if the problem is unclear.",
                        icon: Brain,
                        color: 'from-blue-400 to-indigo-500'
                    },
                    {
                        title: t('feature_3_title') || "Verified Treatments",
                        desc: t('feature_3_desc') || "Get actionable advice. From organic remedies to chemical treatments, we guide you to recovery.",
                        icon: ShieldCheck,
                        color: 'from-green-400 to-emerald-500'
                    },
                ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <div key={i} className="glass-card p-8 hover:scale-[1.02] transition-transform duration-300 group">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br ${s.color} shadow-lg text-white transform group-hover:rotate-6 transition-transform`}>
                                <Icon className="w-7 h-7" />
                            </div>
                            <h3 className="font-bold text-2xl mb-3 text-gray-900 dark:text-white">{s.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
                        </div>
                    );
                })}
            </div>

            {/* HOW IT WORKS / SUMMARY */}
            <div className="w-full max-w-6xl px-4 z-10 mb-20">
                <div className="glass p-10 rounded-3xl text-center md:text-left flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                            {t('summary_title') || "Your Personal Pocket Botanist"}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg leading-relaxed">
                            {t('summary_desc') || "Plant AI combines the power of Google's Gemini models with expert botanical knowledge. We don't just guess; we analyze texture, color, and spot patterns to categorize health issues with high precision. Whether you're a home gardener or a professional farmer, our tool adapts to your needs."}
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
                                <Activity className="w-4 h-4 text-green-500" /> 95% Accuracy
                            </div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
                                <ScanLine className="w-4 h-4 text-blue-500" /> Macro Support
                            </div>
                        </div>
                    </div>
                    <div className="w-full md:w-1/3 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                            <img src="/placeholder-plant.png" // Placeholder - handled by UI or we can put an icon
                                onError={(e) => { e.target.style.display = 'none' }}
                                className="relative w-48 h-48 object-contain drop-shadow-2xl"
                                alt=""
                            />
                            <Sprout className="w-48 h-48 text-green-600 dark:text-green-400 drop-shadow-2xl relative z-10" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderInputType = () => (
        <div className="flex flex-col items-center w-full max-w-md animate-fade-in">
            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-6 text-green-600 dark:text-green-400">
                <Sprout className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-center">{t('scan_step_1')}</h2>
            <p className="text-gray-500 mb-6 text-center">{t('what_plant_question')}</p>

            <input
                type="text"
                value={plantType}
                onChange={(e) => setPlantType(e.target.value)}
                placeholder={t('what_plant_placeholder')}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 mb-4 focus:ring-2 focus:ring-green-500 outline-none"
            />

            <button
                onClick={handleNextStep}
                disabled={!plantType.trim()}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                {t('next_step')} <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={handleSkipType} className="mt-4 text-gray-500 text-sm hover:underline">
                {t('skip')}
            </button>
        </div>
    );

    const renderCapture = (isMacro) => {
        return (
            <div className="flex flex-col items-center w-full max-w-md animate-fade-in">
                <h2 className="text-2xl font-bold mb-4 text-center">
                    {isMacro ? (t('close_up_photo') || "Close-up Photo") : t('scan_step_2')}
                </h2>

                <div className="w-full space-y-4">
                    {/* 1. Camera Button */}
                    <button
                        onClick={() => setShowCamera(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 px-10 rounded-2xl shadow-xl flex items-center justify-center gap-4 text-xl transition-transform active:scale-95"
                    >
                        <Camera className="w-8 h-8" />
                        <span>{t('open_camera') || "Open Camera"}</span>
                    </button>

                    {/* 2. Gallery Button */}
                    <button
                        onClick={triggerFileInput}
                        className="w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-white font-bold py-4 px-10 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center gap-4 text-lg transition-transform active:scale-95"
                    >
                        <ImageIcon className="w-6 h-6" />
                        <span>{t('upload_gallery') || "Select from Gallery"}</span>
                    </button>
                </div>

                <button onClick={() => setStep('input_type')} className="mt-6 text-gray-500 underline">
                    {t('back')}
                </button>
            </div>
        );
    };

    const renderAnalyzing = () => (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="relative w-64 h-64 mb-8 rounded-2xl overflow-hidden shadow-2xl border-4 border-green-500">
                {images.main && <img src={images.main} alt="Analyzing" className="w-full h-full object-cover opacity-50" />}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Loader2 className="w-16 h-16 text-white animate-spin" />
                </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white animate-bounce">
                {t('analyzing') || "Analyzing..."}
            </h2>
            <p className="text-gray-500 mt-2">{t('ai_thinking') || "AI Botanist is thinking..."}</p>
        </div>
    );

    const renderResult = () => (
        <div className="w-full flex gap-8 flex-col md:flex-row items-start animate-fade-in relative justify-center">
            {/* Image Side */}
            <div className="w-full md:w-1/3 flex-shrink-0 z-0">
                <div className="sticky top-4">
                    <img src={images.main} alt="Analyzed Plant" className="w-full rounded-2xl shadow-lg border-2 border-green-100 dark:border-green-900" />
                    {images.macro && (
                        <img src={images.macro} alt="Macro Detail" className="w-24 h-24 rounded-lg shadow border border-white absolute bottom-4 right-4" />
                    )}

                    {/* Manual Save Button - Only show if logged in */}
                    {currentUser && (
                        <button
                            onClick={handleSaveResult}
                            disabled={isSaved}
                            className={`mt-4 w-full font-bold py-4 px-6 rounded-xl border shadow-lg transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-3 ${isSaved
                                ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-default'
                                : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white border-transparent'
                                }`}
                        >
                            {isSaved ? (
                                <>
                                    <CheckCircle className="w-6 h-6" />
                                    <span>{t('saved') || 'Kaydedildi'}</span>
                                </>
                            ) : (
                                <>
                                    <div className="bg-white/20 p-1 rounded-full"><Save className="w-5 h-5" /></div>
                                    <span className="text-lg">
                                        {result?.is_treatable === false ? (t('save_info') || 'Bilgiyi Kaydet') : (t('start_treatment') || 'Tedaviye Başla')}
                                    </span>
                                </>
                            )}
                        </button>
                    )}

                    <button
                        onClick={resetScan}
                        className="mt-4 w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-white font-semibold py-3 px-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all"
                    >
                        {t('take_photo')} (Reset)
                    </button>
                </div>
            </div>

            {/* Result Side */}
            <div className="w-full md:w-2/3 relative">
                {/* BLUR OVERLAY LOGIC */}
                <div className={`transition-all duration-500 ${!currentUser ? 'filter blur-md select-none pointer-events-none opacity-50' : ''}`}>
                    <DiagnosisResult result={result} onReset={resetScan} />
                </div>

                {!currentUser && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 backdrop-blur-[2px] rounded-2xl">
                        <div className="bg-white/90 dark:bg-gray-900/90 p-8 rounded-3xl shadow-2xl text-center max-w-sm border border-white/20 mx-4 transform transition-all hover:scale-105">
                            <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                                <ScanLine className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('login_to_view')}</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">{t('login_blur_text')}</p>
                            <button
                                onClick={handleLoginRedirect}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-green-500/25 active:scale-95"
                            >
                                {t('login')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className={`flex flex-col w-full max-w-7xl mx-auto p-4 lg:p-8 ${step === 'result' ? 'items-start' : 'items-center justify-center min-h-full'}`}>
            <input
                type="file"
                accept="image/*"
                // capture="environment" // REMOVED to allow gallery selection
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
            />

            <CameraModal
                isOpen={showCamera}
                onClose={() => setShowCamera(false)}
                onCapture={handleCameraCapture}
            />

            {/* Conditional Rendering */}
            {step === 'landing' ? renderLanding() : (
                <>
                    {/* Tiny Back Button for Wizard */}
                    {step !== 'result' && (
                        <button
                            onClick={() => setStep('landing')}
                            className="self-start mb-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 flex items-center gap-2"
                        >
                            &larr; {t('back')}
                        </button>
                    )}

                    {step === 'input_type' && renderInputType()}
                    {step === 'capture_main' && renderCapture(false)}
                    {step === 'capture_macro' && renderCapture(true)}
                    {step === 'analyzing' && renderAnalyzing()}
                    {step === 'result' && renderResult()}
                </>
            )}
        </div>
    );
}
