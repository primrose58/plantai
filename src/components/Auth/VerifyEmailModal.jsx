import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, CheckCircle, RefreshCw } from 'lucide-react';
import { reload } from 'firebase/auth'; // We need to reload user to check verification status

export default function VerifyEmailModal({ user, onClose, onVerified }) {
    const { t } = useTranslation();
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        // Auto-poll every 3 seconds to check if they verified
        const interval = setInterval(async () => {
            if (user) {
                try {
                    await user.reload(); // Refresh user state from Firebase
                    if (user.emailVerified) {
                        clearInterval(interval);
                        onVerified();
                    }
                } catch (e) {
                    console.error("Verification check failed", e);
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [user, onVerified]);

    const handleManualCheck = async () => {
        setChecking(true);
        try {
            await user.reload();
            if (user.emailVerified) {
                onVerified();
            } else {
                // Shake or show "Still not verified"
            }
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => setChecking(false), 500);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl p-8 flex flex-col items-center text-center relative overflow-hidden">

                {/* Decorative Background Blob */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-400 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-400 rounded-full blur-3xl opacity-20"></div>

                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 text-green-600 dark:text-green-400 animate-pulse">
                    <Mail className="w-10 h-10" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {t('verify_email_title') || 'Verify Your Email'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {t('verify_email_desc') || `We sent a confirmation link to ${user?.email}. Please check your inbox and click the link to continue.`}
                </p>

                <div className="space-y-4 w-full">
                    <button
                        onClick={() => window.open('https://mail.google.com', '_blank')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                    >
                        {t('open_email_app') || 'Open Email App'}
                    </button>

                    <button
                        onClick={handleManualCheck}
                        disabled={checking}
                        className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {checking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                        {t('i_verified_it') || 'I Verified the Email'}
                    </button>

                    <button
                        onClick={onClose}
                        className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        {t('cancel') || 'Cancel'}
                    </button>
                </div>
            </div>
        </div>
    );
}
