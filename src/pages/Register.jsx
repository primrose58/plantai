import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout, UserPlus } from 'lucide-react';
import VerifyEmailModal from '../components/Auth/VerifyEmailModal';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // State for Verification Modal
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [registeredUser, setRegisteredUser] = useState(null);

    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Create User
            const result = await createUserWithEmailAndPassword(auth, email, password);

            // 2. Update Name
            await updateProfile(result.user, { displayName: name });

            // 3. Send Email
            await sendEmailVerification(result.user);

            // NO SignOut yet. We keep them logged in but unverified to poll status.
            // Or we can sign out and make them re-login. 
            // Better UX: Keep them "half-logged-in" or hold the user object to check.
            // But Firebase auto-signs in on create. 
            // We'll keep them signed in to query `user.reload()`.

            setRegisteredUser(result.user);
            setShowVerifyModal(true);
            setLoading(false);

        } catch (err) {
            setError(err.message);
            console.error(err);
            setLoading(false);
        }
    };

    const handleVerified = async () => {
        // User confirmed they verified.
        // We can double check or just let them in (AuthGuard will check emailVerified)
        // Ideally we reload one last time
        if (auth.currentUser) await auth.currentUser.reload();
        setShowVerifyModal(false);
        navigate('/'); // Go to home/dashboard
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 animate-fade-in">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden relative">

                {showVerifyModal && registeredUser && (
                    <VerifyEmailModal
                        user={registeredUser}
                        onClose={() => setShowVerifyModal(false)}
                        onVerified={handleVerified}
                    />
                )}

                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <div className="bg-green-600 w-full mb-8 p-6 rounded-2xl flex items-center justify-center shadow-lg">
                            <Sprout className="w-16 h-16 text-white" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
                        {t('register')}
                    </h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
                        {t('create_account_desc') || t('join_community') || 'Create an account to join the community'}
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('full_name') || 'Full Name'}
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('email')}
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
                                {t('password')}
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
                            disabled={loading || showVerifyModal}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (t('creating_account') || 'Creating Account...') : t('register')}
                            {!loading && <UserPlus className="w-4 h-4" />}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                        {t('already_have_account') || 'Already have an account?'} {' '}
                        <Link to="/login" className="text-green-600 hover:text-green-700 font-semibold hover:underline">
                            {t('login')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
