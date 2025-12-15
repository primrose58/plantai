import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Image as ImageIcon, Loader2, ArrowRight, Sprout, AlertCircle, ScanLine, Save, CheckCircle } from 'lucide-react';
import { analyzePlantImage } from '../services/gemini';
import { saveAnalysis } from '../services/analysisService';
import DiagnosisResult from '../components/Plant/DiagnosisResult';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

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

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result;

            if (step === 'capture_main') {
                setImages(prev => ({ ...prev, main: base64String }));
                await performDiagnosis(base64String, false);
            } else if (step === 'capture_macro') {
                setImages(prev => ({ ...prev, macro: base64String }));
                await performDiagnosis([images.main, base64String], true);
            }
        };
        reader.readAsDataURL(file);
    };

    const performDiagnosis = async (imageData, isMacroRetry) => {
        setLoading(true);
        setStep('analyzing');
        setIsSaved(false);

        try {
            const analysis = await analyzePlantImage(imageData, i18n.language, plantType);

            if (analysis.status === 'needs_details') {
                addToast(t('need_macro_photo'), 'info');
                setStep('capture_macro');
            } else if (analysis.status === 'error') {
                throw new Error(analysis.error);
            } else {
                setResult(analysis);
                setStep('result');
            }
        } catch (err) {
            console.error(err);
            const msg = err.message || t('error_diagnosis_failed') || 'Diagnosis failed.';
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
            addToast("Failed to save analysis: " + error.message, "error");
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
        <div className="flex flex-col items-center justify-center py-10 px-4 animate-fade-in w-full">
            <div className="text-center max-w-3xl mb-12">
                <span className="inline-block px-4 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold text-sm mb-4">
                    {t('hero_badge')}
                </span>
                <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight" dangerouslySetInnerHTML={{ __html: t('hero_title') }} />
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                    {t('hero_desc')}
                </p>
                <button
                    onClick={() => setStep('input_type')}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-10 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all text-lg flex items-center justify-center gap-3 mx-auto"
                >
                    <Sprout className="w-6 h-6" />
                    {t('start_diagnosis')}
                </button>
            </div>

            {/* Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                {[
                    { title: t('step_1_title'), desc: t('step_1_desc'), icon: ScanLine, color: 'bg-blue-100 text-blue-600' },
                    { title: t('step_2_title'), desc: t('step_2_desc'), icon: Camera, color: 'bg-purple-100 text-purple-600' },
                    { title: t('step_3_title'), desc: t('step_3_desc'), icon: Sprout, color: 'bg-orange-100 text-orange-600' },
                ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:scale-105 transition-transform">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${s.color} dark:bg-opacity-20`}>
                                <Icon className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">{s.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400">{s.desc}</p>
                        </div>
                    );
                })}
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
                    {isMacro ? "Close-up Photo" : "Take Photo"}
                </h2>



                <button
                    onClick={triggerFileInput}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 px-10 rounded-2xl shadow-xl flex items-center justify-center gap-4 text-xl w-full"
                >
                    <Camera className="w-8 h-8" />
                    <span>{isMacro ? "Take Macro" : "Open Camera"}</span>
                </button>

                <button onClick={() => setStep('input_type')} className="mt-6 text-gray-500 underline">
                    Back
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
            <p className="text-gray-500 mt-2">AI Botanist is thinking...</p>
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
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
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
