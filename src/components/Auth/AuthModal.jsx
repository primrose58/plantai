import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { X, Mail, Lock, User, Loader2, ArrowRight } from 'lucide-react';

export default function AuthModal() {
    const { isOpen, view, closeModal, toggleView } = useAuthModal();
    const { t } = useTranslation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (view === 'login') {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const res = await createUserWithEmailAndPassword(auth, email, password);
                // Create user doc
                await updateProfile(res.user, { displayName: name });
                await setDoc(doc(db, 'users', res.user.uid), {
                    uid: res.user.uid,
                    displayName: name,
                    email,
                    createdAt: new Date(),
                    photoURL: `https://ui-avatars.com/api/?name=${name}&background=random`
                });
            }
            closeModal();
            // Reset form
            setEmail('');
            setPassword('');
            setName('');
        } catch (err) {
            console.error(err);
            // Simple error mapping
            if (err.code === 'auth/invalid-credential') setError(t('error_invalid_credential') || "Hatalı e-posta veya şifre");
            else if (err.code === 'auth/email-already-in-use') setError(t('error_email_in_use') || "Bu e-posta zaten kullanımda");
            else setError(t('error_generic') || "Bir hata oluştu");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative animate-slide-up">
                {/* Close Button */}
                <button
                    onClick={closeModal}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {view === 'login' ? (t('welcome_back') || "Tekrar Hoşgeldiniz") : (t('create_account') || "Hesap Oluştur")}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {view === 'login'
                                ? (t('login_desc') || "Devam etmek için giriş yapın")
                                : (t('register_desc') || "Topluluğa katılmak için kayıt olun")
                            }
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {view === 'register' && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 ml-1">{t('full_name')}</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        placeholder="Ad Soyad"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 ml-1">{t('email')}</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                    placeholder="ornek@email.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 ml-1">{t('password')}</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    <span>{view === 'login' ? (t('login') || "Giriş Yap") : (t('register') || "Kayıt Ol")}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {view === 'login' ? (t('no_account') || "Hesabınız yok mu?") : (t('already_have_account') || "Zaten hesabınız var mı?")}
                            {' '}
                            <button
                                onClick={toggleView}
                                className="font-bold text-green-600 hover:text-green-700 transition-colors"
                            >
                                {view === 'login' ? (t('register_now') || "Hemen Kaydol") : (t('login_now') || "Giriş Yap")}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
