import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useTranslation } from 'react-i18next';
import { Camera, Save, User as UserIcon, Loader2, Grid, Leaf, Heart } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useToast } from '../contexts/ToastContext';
import { updateUserPostsName } from '../services/analysisService';
import PostCard from '../components/Community/PostCard'; // Reuse PostCard

export default function Profile() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const { addToast } = useToast();

    const [name, setName] = useState(currentUser?.displayName || '');
    const [avatar, setAvatar] = useState(currentUser?.photoURL || '');
    const [loading, setLoading] = useState(false);
    const [userPosts, setUserPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(true);

    const fileInputRef = useRef(null);

    // Initial Load
    useEffect(() => {
        const loadData = async () => {
            if (!currentUser) return;

            // 1. Load Profile Data
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().avatar) {
                setAvatar(docSnap.data().avatar);
            }

            // 2. Load User's Public Posts
            try {
                const q = query(
                    collection(db, 'posts'),
                    where('userId', '==', currentUser.uid),
                    orderBy('createdAt', 'desc')
                );
                const querySnapshot = await getDocs(q);
                const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUserPosts(posts);
            } catch (err) {
                console.error("Failed to load user posts", err);
            } finally {
                setPostsLoading(false);
            }
        };
        loadData();
    }, [currentUser]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);

        try {
            // Compress
            const options = { maxSizeMB: 0.1, maxWidthOrHeight: 400, useWebWorker: true };
            const compressedFile = await imageCompression(file, options);
            const base64Avatar = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(compressedFile);
                reader.onload = (e) => resolve(e.target.result);
            });

            // Save
            setAvatar(base64Avatar);
            await setDoc(doc(db, 'users', currentUser.uid), {
                avatar: base64Avatar,
                email: currentUser.email,
                name: name || currentUser.displayName,
                updatedAt: new Date()
            }, { merge: true });

            try { await updateProfile(auth.currentUser, { photoURL: base64Avatar }); } catch (e) { }

            // Background sync
            updateUserPostsName(currentUser.uid, name, base64Avatar);
            addToast(t('profile_updated') || 'Profile updated!', "success");
        } catch (err) {
            console.error(err);
            addToast('Error updating avatar.', "error");
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
            await setDoc(doc(db, 'users', currentUser.uid), { name: name, updatedAt: new Date() }, { merge: true });

            // Sync posts
            updateUserPostsName(currentUser.uid, name, avatar);
            addToast(t('profile_updated') || 'Profile updated!', "success");
        } catch (err) {
            addToast('Failed to update profile.', "error");
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) return <div className="p-10 text-center">{t('login_required')}</div>;

    return (
        <div className="max-w-4xl mx-auto w-full pb-20 animate-fade-in">
            {/* Split Layout: Left Profile, Right Posts */}
            <div className="flex flex-col md:flex-row gap-8 mt-6">

                {/* Left: Profile Info Card */}
                <div className="w-full md:w-1/3">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 sticky top-24 border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-green-50 dark:border-green-900/30 shadow-xl bg-gray-100">
                                    {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-6 text-gray-300" />}
                                </div>
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                                {loading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-full"><Loader2 className="animate-spin text-green-600" /></div>}
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

                            <h2 className="text-xl font-bold mt-4 text-gray-900 dark:text-white">{name || 'Gardener'}</h2>
                            <p className="text-sm text-gray-500">{currentUser.email}</p>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">{t('display_name')}</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                                <span>{t('save_changes')}</span>
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between text-center">
                                <div>
                                    <div className="text-2xl font-bold text-green-600">{userPosts.length}</div>
                                    <div className="text-xs text-gray-400 font-medium">Posts</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {userPosts.reduce((acc, curr) => acc + (curr.likes?.length || 0), 0)}
                                    </div>
                                    <div className="text-xs text-gray-400 font-medium">Likes</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Posts Grid */}
                <div className="flex-1">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Grid className="w-5 h-5 text-gray-400" />
                        <span>{t('my_posts') || "My Community Posts"}</span>
                    </h3>

                    {postsLoading ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
                    ) : userPosts.length > 0 ? (
                        <div className="columns-1 gap-6 space-y-6">
                            {userPosts.map(post => (
                                <div key={post.id} className="break-inside-avoid">
                                    <PostCard
                                        post={post}
                                        onViewAnalysis={() => { }} // Could link to analyses if needed
                                    // No need to click user to see self
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                            <Leaf className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">{t('no_posts_yet')}</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
