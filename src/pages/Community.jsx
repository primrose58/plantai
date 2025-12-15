import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import PostCard from '../components/Community/PostCard';
import CreatePostModal from '../components/Community/CreatePostModal';
import UserPreviewModal from '../components/Community/UserPreviewModal';
import { Loader2, Plus, Search, ChevronDown, X } from 'lucide-react';
import { PLANT_TYPES } from '../constants/plantData';

export default function Community() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Filter State
    const [filterType, setFilterType] = useState('All');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [filterSearch, setFilterSearch] = useState('');

    // Pagination (Simple limit for now)
    const POSTS_PER_PAGE = 10;
    const [hasMore, setHasMore] = useState(true);

    // Prepare filter options (All + Plant Types)
    const filterOptions = [
        { value: 'All', labelKey: 'community' },
        ...PLANT_TYPES
    ];

    const filteredOptions = filterOptions.filter(p => {
        const label = p.value === 'All' ? t('community') + ' (All)' : t(p.labelKey);
        return label.toLowerCase().includes(filterSearch.toLowerCase());
    });

    useEffect(() => {
        setLoading(true);
        // Initial Query with Limit
        let q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(POSTS_PER_PAGE));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side filtering logic
            let displayPosts = postsData;
            if (filterType !== 'All') {
                displayPosts = postsData.filter(p => p.plantType === filterType);
            }

            setPosts(displayPosts);
            setLoading(false);
            setHasMore(snapshot.docs.length === POSTS_PER_PAGE);

        }, (error) => {
            console.error("Error fetching posts:", error);
            setLoading(false);
        });

        // Cleanup
        return () => unsubscribe();
    }, [filterType]);

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20 p-4">
            {/* Header with Float/Action Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-0 z-20 gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white shrink-0">{t('community')}</h1>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Searchable Filter Dropdown */}
                    <div className="relative w-full sm:w-64">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder={t('select_plant')}
                                value={filterSearch}
                                onFocus={() => setShowFilterDropdown(true)}
                                onChange={(e) => {
                                    setFilterSearch(e.target.value);
                                    setShowFilterDropdown(true);
                                }}
                            />
                            {filterType !== 'All' ? (
                                <button
                                    onClick={() => {
                                        setFilterType('All');
                                        setFilterSearch('');
                                    }}
                                    className="absolute right-2 top-2 p-0.5 hover:bg-gray-200 rounded-full"
                                >
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            ) : (
                                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                            )}
                        </div>

                        {showFilterDropdown && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)}></div>
                                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                    {filteredOptions.map(p => (
                                        <div
                                            key={p.value}
                                            className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200 flex justify-between items-center"
                                            onClick={() => {
                                                setFilterType(p.value);
                                                setFilterSearch(p.value === 'All' ? '' : t(p.labelKey));
                                                setShowFilterDropdown(false);
                                            }}
                                        >
                                            <span>{p.value === 'All' ? t('community') : t(p.labelKey)}</span>
                                            {filterType === p.value && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                                        </div>
                                    ))}
                                    {filteredOptions.length === 0 && (
                                        <div className="px-4 py-2 text-sm text-gray-400">No results</div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            if (!currentUser) {
                                alert(t('login_to_post') || "Please login to post.");
                                return;
                            }
                            setIsModalOpen(true);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">{t('ask_question')}</span>
                        <span className="sm:hidden">{t('ask_question')}</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                </div>
            ) : posts.length > 0 ? (
                <div className="space-y-6">
                    {posts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            onUserClick={(userId) => {
                                // Create minimal user object for preview
                                setSelectedUser({
                                    id: userId,
                                    name: post.authorName || 'Gardener',
                                    avatar: post.userAvatar
                                });
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-lg mb-2">👋 No posts yet</p>
                    <p className="text-sm">Be the first to share your garden!</p>
                </div>
            )}

            {/* Modals */}
            {isModalOpen && (
                <CreatePostModal
                    onClose={() => setIsModalOpen(false)}
                    onPostCreated={() => {
                        // Snapshot listener handles refresh
                    }}
                />
            )}

            {selectedUser && (
                <UserPreviewModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    );
}
