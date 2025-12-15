import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import PostCard from '../components/Community/PostCard';
import CreatePostModal from '../components/Community/CreatePostModal';
import { Loader2, Plus } from 'lucide-react';

export default function Community() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterType, setFilterType] = useState('All');

    const plantTypes = ['All', 'Tomato', 'Rose', 'Pepper', 'Cucumber', 'Unknown'];

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side filtering
            const filtered = filterType === 'All'
                ? postsData
                : postsData.filter(p => p.plantType?.toLowerCase() === filterType.toLowerCase());

            setPosts(filtered);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching posts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filterType]);

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20 p-4">
            {/* Header with Float/Action Button */}
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('community')}</h1>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-gray-50 dark:bg-gray-700 border-none rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500 hidden sm:block"
                    >
                        {plantTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => {
                        if (!currentUser) {
                            alert(t('login_to_post') || "Please login to post.");
                            return; // Keep modal closed if not logged in
                        }
                        setIsModalOpen(true);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">Ask Question</span>
                    <span className="sm:hidden">Ask</span>
                </button>
            </div>

            {/* Mobile Filter */}
            <div className="sm:hidden">
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-medium outline-none"
                >
                    {plantTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                </div>
            ) : posts.length > 0 ? (
                <div className="space-y-6">
                    {posts.map(post => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-lg mb-2">👋 No posts yet</p>
                    <p className="text-sm">Be the first to share your garden!</p>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <CreatePostModal
                    onClose={() => setIsModalOpen(false)}
                    onPostCreated={() => {
                        // Snapshot listener handles refresh
                    }}
                />
            )}
        </div>
    );
}
