import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { Camera, Save, User as UserIcon, Loader2, Grid, Leaf, Heart, MessageCircle } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useToast } from '../contexts/ToastContext';
import { updateUserPostsName } from '../services/analysisService';
import PostCard from '../components/Community/PostCard';
import { useParams, useNavigate } from 'react-router-dom';

export default function Profile() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const { userId } = useParams(); // Get ID from URL if present

    const [targetUser, setTargetUser] = useState(null);
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState('');
    const [loading, setLoading] = useState(false);
    const [userPosts, setUserPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(true);

    const fileInputRef = useRef(null);

    // Determine whose profile we are viewing
    // If no userId param, or userId matches current user => My Profile
    const isOwnProfile = !userId || (currentUser && userId === currentUser.uid);
    const profileId = userId || currentUser?.uid;

    // Initial Load
    useEffect(() => {
        const loadData = async () => {
            if (!profileId) return;

            setPostsLoading(true);

            try {
                // 1. Load Profile Data
                const docRef = doc(db, 'users', profileId);
                const docSnap = await getDoc(docRef);

                let userData = null;

                if (docSnap.exists()) {
                    userData = { uid: docSnap.id, ...docSnap.data() };
                } else if (isOwnProfile && currentUser) {
                    // Fallback for own profile if not in DB yet
                    userData = { ...currentUser, uid: currentUser.uid };
                }

                if (userData) {
                    setTargetUser(userData);
                    // If viewing own profile, sync state with DB/Auth
                    if (isOwnProfile) {
                        setName(userData.name || userData.displayName || currentUser.displayName || '');
                        setAvatar(userData.avatar || userData.photoURL || currentUser.photoURL || '');
                    } else {
                        // For others, just use DB data
                        setName(userData.name || userData.displayName || 'Gardener');
                        setAvatar(userData.avatar || userData.photoURL || '');
                    }
                }

                // 2. Load User's Public Posts
                // Ensure we query exactly by the string ID
                const q = query(
                    collection(db, 'posts'),
                    where('userId', '==', String(profileId))
                );
                const querySnapshot = await getDocs(q);
                let posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Sort by date desc (client-side to avoid index requirement)
                posts.sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeB - timeA;
                });

                setUserPosts(posts);

            } catch (err) {
                console.error("Failed to load profile data", err);
            } finally {
                setPostsLoading(false);
            }
        };
        loadData();
    }, [profileId, isOwnProfile, currentUser]);

    const handleFileChange = async (e) => {
        if (!isOwnProfile) return;
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
        if (!isOwnProfile) return;
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

    if (!profileId) return <div className="p-10 text-center">{t('login_required')}</div>;

    const isOnline = (u) => {
        if (!u?.lastSeen || !u.lastSeen.seconds) return false;
        return (Date.now() - u.lastSeen.seconds * 1000) < 3 * 60 * 1000;
    };

    const getLastSeenText = (u) => {
        if (!u?.lastSeen) return t('unknown_date') || 'Bilinmiyor';
        return formatDistanceToNow(new Date(u.lastSeen.seconds * 1000), { addSuffix: true, locale: t('language') === 'tr' ? tr : enUS });
    };

    return (
        <div className="max-w-4xl mx-auto w-full pb-20 animate-fade-in p-4">
            {/* Split Layout: Left Profile, Right Posts */}
            <div className="flex flex-col md:flex-row gap-8 mt-6">

                {/* Left: Profile Info Card */}
                <div className="w-full md:w-1/3">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 sticky top-24 border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col items-center mb-6 relative">
                            {/* Online Status for Others */}
                            {!isOwnProfile && targetUser && (
                                <div className={`absolute top-0 right-10 px-2 py-1 rounded-full text-[10px] font-bold border border-white dark:border-gray-800 flex items-center gap-1 ${isOnline(targetUser) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isOnline(targetUser) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                    {isOnline(targetUser) ? 'Online' : getLastSeenText(targetUser)}
                                </div>
                            )}

                            <div className={`relative ${isOwnProfile ? 'group cursor-pointer' : ''} mt-2`} onClick={() => isOwnProfile && fileInputRef.current?.click()}>
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-green-50 dark:border-green-900/30 shadow-xl bg-gray-100">
                                    {(isOwnProfile ? avatar : (targetUser?.avatar || targetUser?.photoURL)) ?
                                        <img src={isOwnProfile ? avatar : (targetUser?.avatar || targetUser?.photoURL)} className="w-full h-full object-cover" />
                                        :
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                            {/* Use the same robust name logic for the avatar initials */}
                                            <img
                                                src={`https://ui-avatars.com/api/?name=${(isOwnProfile ? (name || 'Gardener') : (targetUser?.name || targetUser?.displayName || (userPosts.length > 0 && userPosts[0].authorName) || 'Gardener'))}&background=random&size=128`}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    }
                                </div>
                                {isOwnProfile && (
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-8 h-8 text-white" />
                                    </div>
                                )}
                                {loading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-full"><Loader2 className="animate-spin text-green-600" /></div>}
                            </div>
                            {isOwnProfile && <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />}

                            <h2 className="text-xl font-bold mt-4 text-gray-900 dark:text-white capitalize text-center">
                                {isOwnProfile
                                    ? (name || t('gardener') || 'Bahçıvan')
                                    : (targetUser?.name || targetUser?.displayName || (userPosts.length > 0 && userPosts[0].authorName) || t('gardener') || 'Bahçıvan')}
                            </h2>
                            {isOwnProfile && <p className="text-sm text-gray-500">{currentUser.email}</p>}
                        </div>

                        {isOwnProfile ? (
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
                        ) : (
                            <div className="text-center">
                                <p className="text-sm text-gray-500 italic mb-4">
                                    {t('joined') || "Katılma Tarihi"}: {targetUser?.createdAt?.seconds
                                        ? new Date(targetUser.createdAt.seconds * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                                        : t('unknown_date')}
                                </p>

                                <button
                                    onClick={() => {
                                        // Pass robust user object
                                        const safeUser = {
                                            uid: targetUser.uid || profileId,
                                            name: targetUser.name || targetUser.displayName || (userPosts.length > 0 && userPosts[0].authorName) || 'Gardener',
                                            photoURL: targetUser.photoURL || targetUser.avatar || null
                                        };
                                        navigate('/messages/new', { state: { targetUser: safeUser } });
                                    }}
                                    className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                    <span>{t('send_message')}</span>
                                </button>
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between text-center">
                                <div>
                                    <div className="text-2xl font-bold text-green-600">{userPosts.length}</div>
                                    <div className="text-xs text-gray-400 font-medium">{t('posts') || 'Gönderi'}</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {userPosts.reduce((acc, curr) => acc + (curr.likes?.length || 0), 0)}
                                    </div>
                                    <div className="text-xs text-gray-400 font-medium">{t('likes') || 'Beğeni'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Posts Grid */}
                <div className="flex-1">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Grid className="w-5 h-5 text-gray-400" />
                        <span>
                            {isOwnProfile
                                ? (t('my_posts') || "Gönderilerim")
                                : (t('user_posts_title', { name: targetUser?.name || 'Kullanıcı' }) || `${targetUser?.name || 'Kullanıcı'} Gönderileri`)
                            }
                        </span>
                    </h3>

                    {postsLoading ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
                    ) : userPosts.length > 0 ? (
                        <div className="columns-1 gap-6 space-y-6">
                            {userPosts.map(post => (
                                <div key={post.id} className="break-inside-avoid">
                                    <PostCard
                                        post={{ ...post, hideAuthor: isOwnProfile }}
                                        onViewAnalysis={() => { }}
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
