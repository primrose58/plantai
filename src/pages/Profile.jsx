import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase'; // Added db
import { useTranslation } from 'react-i18next';
import { Camera, Save, User as UserIcon, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useToast } from '../contexts/ToastContext';
import { updateUserPostsName } from '../services/analysisService'; // Import this

export default function Profile() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const { addToast } = useToast();

    const [name, setName] = useState(currentUser?.displayName || '');
    const [avatar, setAvatar] = useState(currentUser?.photoURL || '');
    const [loading, setLoading] = useState(false);

    const fileInputRef = useRef(null);

    // Load avatar from Firestore if Auth Profile is empty (or to get high-res)
    useEffect(() => {
        const loadUserAvatar = async () => {
            if (currentUser) {
                const docRef = doc(db, 'users', currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().avatar) {
                    setAvatar(docSnap.data().avatar);
                }
            }
        };
        loadUserAvatar();
    }, [currentUser]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);

        try {
            // 1. Compress Image (Target: < 100KB for Firestore Document)
            let base64Avatar = '';
            try {
                const options = {
                    maxSizeMB: 0.1, // 100KB limit
                    maxWidthOrHeight: 400,
                    useWebWorker: true
                };
                const compressedFile = await imageCompression(file, options);

                base64Avatar = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(compressedFile);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                });

            } catch (cErr) {
                console.warn("Avatar compression failed:", cErr);
                addToast("Image too large or invalid.", "error");
                setLoading(false);
                return;
            }

            // 2. Update Local State for immediate feedback
            setAvatar(base64Avatar);

            // 3. Save to Firestore (Reliable Storage)
            await setDoc(doc(db, 'users', currentUser.uid), {
                avatar: base64Avatar,
                email: currentUser.email,
                name: name || currentUser.displayName,
                updatedAt: new Date()
            }, { merge: true });

            // 4. Also try to update Auth Profile (might fail if string too long, but Firestore is our backup)
            try {
                await updateProfile(auth.currentUser, { photoURL: base64Avatar });
            } catch (authErr) {
                console.log("Auth profile update skipped (image likely too big for token), using Firestore only.");
            }

            // 5. Sync with existing posts
            // Fire and forget - don't wait
            updateUserPostsName(currentUser.uid, name, base64Avatar);

            addToast(t('profile_updated') || 'Profile photo updated!', "success");
        } catch (err) {
            console.error(err);
            addToast('Error updating avatar: ' + err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await updateProfile(auth.currentUser, { displayName: name });

            // Sync name to Firestore too
            await setDoc(doc(db, 'users', currentUser.uid), {
                name: name,
                updatedAt: new Date()
            }, { merge: true });

            // Sync posts
            updateUserPostsName(currentUser.uid, name, avatar);

            addToast(t('profile_updated') || 'Profile updated successfully!', "success");
        } catch (err) {
            addToast('Failed to update profile.', "error");
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) return <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-xl">{t('login_required')}</div>;

    return (
        <div className="max-w-md mx-auto w-full">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t('profile')}</h1>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">

                {/* Avatar Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg bg-gray-100 dark:bg-gray-900">
                            {avatar ? (
                                <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <UserIcon className="w-12 h-12" />
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                        {loading && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    <p className="text-sm text-gray-500 mt-2">{t('change_avatar')}</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('display_name')}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('email')}
                        </label>
                        <input
                            type="email"
                            value={currentUser.email}
                            disabled
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                        />
                    </div>

                    {message && <div className={`text-center text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{message}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    >
                        {loading ? t('saving') : t('save_changes')}
                        {!loading && <Save className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div>
    );
}
