import { useState } from 'react';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout, ArrowRight } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [verificationNeeded, setVerificationNeeded] = useState(false); // New State
    const [resendLoading, setResendLoading] = useState(false); // New State

    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const { addToast } = useToast();

    // Auto-redirect if already logged in AND verified
    if (currentUser?.emailVerified) {
        // CRITICAL: Ensure we pass back the pending state if it exists, otherwise data is lost!
        if (location.state?.returnUrl && location.state?.pendingResult) {
            navigate(location.state.returnUrl, {
                replace: true,
                state: {
                    restoredResult: location.state.pendingResult,
                    restoredImages: location.state.pendingImages,
                    restoredPlantType: location.state.pendingPlantType
                }
            });
        } else {
            navigate(location.state?.returnUrl || '/');
        }
        return null;
    }

    const handleResendVerification = async () => {
        setResendLoading(true);
        try {
            // Need to sign in temporarily to send the email
            const cred = await signInWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(cred.user);
            await auth.signOut();

            addToast(t('verification_sent') || "Verification email sent! Check your inbox.", "success");
        } catch (err) {
            console.error("Resend error:", err);
            if (err.code === 'auth/too-many-requests') {
                addToast(t('too_many_requests') || "Too many attempts. Please wait.", "error");
            } else {
                addToast(t('resend_failed') || "Failed to resend email.", "error");
            }
        } finally {
            setResendLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setVerificationNeeded(false);
        setLoading(true);

        try {
            // Perform login
            const credential = await signInWithEmailAndPassword(auth, email, password);
            const user = credential.user;

            if (!user.emailVerified) {
                await auth.signOut();
                setVerificationNeeded(true); // Trigger UI
                // setError(t('email_not_verified') || "Email not verified. Please check your inbox."); // Optional: Keep generic error or let UI handle it
                return;
            }

            // Note: We do NOT navigate here manually anymore.
            // We wait for the AuthContext to update 'currentUser'.
            // The 'if (currentUser)' check at the top of this component
            // will handle the redirect automatically once the state syncs.

        } catch (err) {
            console.error(err);
            let msg = t('login_failed') || 'Failed to login.';

            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                msg = t('invalid_credentials') || 'Invalid email or password.';
            } else if (err.code === 'auth/too-many-requests') {
                msg = t('too_many_requests') || 'Too many attempts. Try again later.';
            } else if (err.code === 'auth/user-disabled') {
                msg = 'Account disabled. Contact support.';
            } else if (err.code === 'auth/network-request-failed') {
                msg = 'Network error. Check your connection.';
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <div className="bg-green-600 w-full mb-8 p-6 rounded-2xl flex items-center justify-center shadow-lg">
                            <Sprout className="w-16 h-16 text-white" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
                        {t('welcome')}
                    </h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
                        {t('login_prompt')}
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {verificationNeeded ? (
                        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl animate-fade-in">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-full text-yellow-600 dark:text-yellow-400">
                                    <Sprout className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white">
                                    {t('verify_email_title') || "Verify your email"}
                                </h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                {t('verify_email_desc') || "We've sent a confirmation link to your inbox. Please check your spam folder too."}
                            </p>

                            <button
                                onClick={handleResendVerification}
                                disabled={resendLoading}
                                className="w-full py-2 px-4 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:hover:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                            >
                                {resendLoading ? 'Sending...' : (t('resend_verification') || 'Resend Verification Email')}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Logging in...' : t('login')}
                                {!loading && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                        Don't have an account?{' '}
                        <Link
                            to="/register"
                            state={location.state} // Pass the pending state to Register
                            className="text-green-600 hover:text-green-700 font-semibold hover:underline"
                        >
                            {t('register')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
