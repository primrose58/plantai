import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout, ArrowRight } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { currentUser } = useAuth(); // Access currentUser

    // Auto-redirect if already logged in
    if (currentUser) {
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (!user.emailVerified) {
                await auth.signOut();
                setError(t('email_not_verified') || "Please verify your email address. Check your spam folder.");
                return;
            }

            // Perform login
            await signInWithEmailAndPassword(auth, email, password);

            // Note: We do NOT navigate here manually anymore.
            // We wait for the AuthContext to update 'currentUser'.
            // The 'if (currentUser)' check at the top of this component
            // will handle the redirect automatically once the state syncs.

        } catch (err) {
            console.error(err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError(t('invalid_credentials') || 'Invalid email or password.');
            } else if (err.code === 'auth/too-many-requests') {
                setError(t('too_many_requests') || 'Too many attempts. Try again later.');
            } else {
                setError(t('login_failed') || 'Failed to login. Please try again.');
            }
            setLoading(false); // Only stop loading on error. On success, keep loading until redirect.
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

                    <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-green-600 hover:text-green-700 font-semibold hover:underline">
                            {t('register')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
