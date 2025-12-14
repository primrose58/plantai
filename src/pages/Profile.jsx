import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../services/firebase';
import { useTranslation } from 'react-i18next';
import { Camera, Save, User as UserIcon, Loader2 } from 'lucide-react';

export default function Profile() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();

    const [name, setName] = useState(currentUser?.displayName || '');
    const [avatar, setAvatar] = useState(currentUser?.photoURL || '');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Upload immediately
        const storageRef = ref(storage, `avatars/${currentUser.uid}`);
        setLoading(true);
        try {
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setAvatar(url);
            // Note: We don't save permenantly until "Save Changes" is clicked? 
            // Or we update profile immediately? Better to update immediately for avatar usually.
            await updateProfile(auth.currentUser, { photoURL: url });
            setMessage('Avatar updated!');
        } catch (err) {
            console.error(err);
            setMessage('Error uploading avatar.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setMessage('');
        try {
            await updateProfile(auth.currentUser, { displayName: name });
            setMessage('Profile updated successfully!');
        } catch {
            setMessage('Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) return <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-xl">Please login.</div>;

    return (
        <div className="max-w-md mx-auto w-full">
            <h1 className="text-2xl font-bold mb-6">{t('profile')}</h1>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">

                {/* Avatar Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg bg-gray-100">
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
                    <p className="text-sm text-gray-500 mt-2">Tap to change avatar</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email
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
                        {loading ? 'Saving...' : 'Save Changes'}
                        {!loading && <Save className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div>
    );
}
