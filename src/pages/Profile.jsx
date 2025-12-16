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
import PostCard from '../components/Community/PostCard';
import { useParams } from 'react-router-dom';

export default function Profile() {
    const { t } = useTranslation();
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
                    where('userId', '==', String(profileId)),
                    orderBy('createdAt', 'desc')
                );
                const querySnapshot = await getDocs(q);
                const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUserPosts(posts);

            } catch (err) {
                console.error("Failed to load profile data", err);
            } finally {
                setPostsLoading(false);
            }
        };
        loadData();
    }, [profileId, isOwnProfile, currentUser]);

    // ... (keep handleFileChange and handleSave same) ...

    const isOnline = (u) => {
        if (!u?.lastSeen || !u.lastSeen.seconds) return false;
        return (Date.now() - u.lastSeen.seconds * 1000) < 3 * 60 * 1000;
    };

    // ... (keep render logic up to Profile Info Card) ...

    return (
        <div className="max-w-4xl mx-auto w-full pb-20 animate-fade-in p-4">
            {/* ... */}
            {/* Left: Profile Info Card */}
            <div className="w-full md:w-1/3">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 sticky top-24 border border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col items-center mb-6 relative">
                        {/* Online Status for Others */}
                        {!isOwnProfile && targetUser && (
                            <div className={`absolute top-0 right-10 px-2 py-1 rounded-full text-[10px] font-bold border border-white dark:border-gray-800 flex items-center gap-1 ${isOnline(targetUser) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isOnline(targetUser) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                {isOnline(targetUser) ? 'Online' : 'Offline'}
                            </div>
                        )}

                        <div className={`relative ${isOwnProfile ? 'group cursor-pointer' : ''} mt-2`} onClick={() => isOwnProfile && fileInputRef.current?.click()}>
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-green-50 dark:border-green-900/30 shadow-xl bg-gray-100">
                                {(isOwnProfile ? avatar : (targetUser?.avatar || targetUser?.photoURL)) ?
                                    <img src={isOwnProfile ? avatar : (targetUser?.avatar || targetUser?.photoURL)} className="w-full h-full object-cover" />
                                    :
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                        <span className="text-4xl">{(name || targetUser?.name || 'G').charAt(0).toUpperCase()}</span>
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
                            {isOwnProfile ? (name || t('gardener')) : (targetUser?.name || targetUser?.displayName || t('gardener'))}
                        </h2>
                        {isOwnProfile && <p className="text-sm text-gray-500">{currentUser.email}</p>}
                    </div>

                    {/* ... (Keep form for own profile) ... */}

                    {!isOwnProfile && (
                        <div className="text-center">
                            <p className="text-sm text-gray-500 italic">
                                {t('community_member_since') || "Community Member since"} {targetUser?.createdAt?.seconds ? new Date(targetUser.createdAt.seconds * 1000).getFullYear() : (new Date().getFullYear())}
                            </p>
                        </div>
                    )}

                    {/* ... (Keep stats) ... */}
                </div>
            </div>

            {/* Right: Posts Grid */}
            <div className="flex-1">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Grid className="w-5 h-5 text-gray-400" />
                    <span>
                        {isOwnProfile
                            ? (t('my_posts') || "My Community Posts")
                            : t('user_posts', { name: targetUser?.name || 'User' }) || `${targetUser?.name || 'User'}'s Posts`
                        }
                    </span>
                </h3>

                {/* ... (Keep posts grid) ... */}

                {postsLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
                ) : userPosts.length > 0 ? (
                    <div className="columns-1 gap-6 space-y-6">
                        {userPosts.map(post => (
                            <div key={post.id} className="break-inside-avoid">
                                <PostCard
                                    post={post}
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
        </div >
    );
}
