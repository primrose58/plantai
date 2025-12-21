import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, orderBy, getDocs, onSnapshot, limit, doc, getDoc, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import PostCard from '../components/Community/PostCard';
import CreatePostModal from '../components/Community/CreatePostModal';
import UserPreviewModal from '../components/Community/UserPreviewModal';
import { Loader2, Plus, Search, ChevronDown, X } from 'lucide-react';
import { PLANT_TYPES } from '../constants/plantData';

import PageLoader from '../components/Common/PageLoader';
import DailyBotCard from '../components/Community/DailyBotCard';
import { getDailyPost } from '../services/dailyBotService';

// Analysis Modal Component
function AnalysisDetailModal({ analysisId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const snap = await getDoc(doc(db, 'analyses', analysisId));
                if (snap.exists()) {
                    const analysisData = snap.data();

                    // Fetch updates
                    let updates = [];
                    try {
                        const updatesSnaps = await getDocs(collection(db, 'analyses', analysisId, 'updates'));
                        updates = updatesSnaps.docs.map(d => d.data()).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    } catch (e) {
                        console.warn("Could not fetch updates for modal", e);
                    }

                    setData({ ...analysisData, updates });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [analysisId]);

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (loading) return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"><Loader2 className="animate-spin text-white w-8 h-8" /></div>;
    if (!data) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700 transition-colors z-10">
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                <div className="flex justify-between items-start mb-6 pr-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize flex items-center gap-2">
                        <span className="text-green-600">{data.plantType}</span> Diagnosis
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                        <img src={data.mainImage} alt="Main" className="rounded-xl object-cover w-full h-48 bg-gray-100 border border-gray-200 dark:border-gray-700" />
                        {data.macroImage && (
                            <img src={data.macroImage} alt="Macro" className="rounded-xl object-cover w-20 h-20 bg-gray-100 border border-gray-200 dark:border-gray-700" />
                        )}
                    </div>
                    <div>
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block mb-1">Detected Issue</span>
                            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{data.result.disease_name}</p>
                        </div>
                        <div className="mb-4">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Confidence</span>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${Math.min((data.result.confidence > 1 ? data.result.confidence : data.result.confidence * 100) || 80, 100)}%` }}></div>
                            </div>
                            <span className="text-xs text-gray-500 mt-1 block text-right">{Math.round((data.result.confidence > 1 ? data.result.confidence : data.result.confidence * 100) || 80)}% Match</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-green-50 dark:bg-green-900/10 p-5 rounded-xl border border-green-100 dark:border-green-900/30">
                        <h3 className="font-bold text-green-800 dark:text-green-400 mb-2 text-lg">Analysis</h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.result.description}</p>
                    </div>

                    {data.result.treatment_steps && (
                        <div className="border border-gray-100 dark:border-gray-700 p-5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-lg">Treatment Plan</h3>
                            <ul className="space-y-3">
                                {data.result.treatment_steps.map((step, i) => (
                                    <li key={i} className="flex gap-3 text-gray-700 dark:text-gray-300">
                                        <span className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full flex items-center justify-center font-bold text-xs mt-0.5">{i + 1}</span>
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Updates Section */}
                    {data.updates && data.updates.length > 0 && (
                        <div className="mb-6">
                            <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm uppercase tracking-wider opacity-70">Progress Updates</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {data.updates.map((update, uIdx) => (
                                    <div key={uIdx} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                        {update.imageUrl && <img src={update.imageUrl} className="w-full h-32 object-cover rounded-lg mb-2" />}
                                        <p className="text-xs text-gray-500 mb-1">{update.createdAt?.seconds ? new Date(update.createdAt.seconds * 1000).toLocaleDateString() : ''}</p>
                                        <p className="text-sm text-gray-800 dark:text-gray-200">{update.note}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Community() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const location = useLocation();

    // State
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [viewAnalysisId, setViewAnalysisId] = useState(null); // New state for Analysis Modal
    const [dailyFact, setDailyFact] = useState(null);

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
        // Handle Manual Refresh
        if (location.state?.refreshId) {
            setFilterType('All');
            setFilterSearch('');
            // The loading dependency below will trigger data fetch when filterType changes.
            // But if filterType was already All, we need to force re-fetch.
            // Since we use onSnapshot, we can't "force fetch" easily without unsubscribing/resubscribing.
            // Actually, onSnapshot keeps it fresh. 
            // The user just wants a "reset" UI experience.
            window.scrollTo(0, 0);
            // If they want to see new posts that might not have appeared? onSnapshot handles that.
            // So just resetting filters is enough visual feedback.
        }
    }, [location.state]);

    useEffect(() => {
        setLoading(true);
        let q;

        // Dynamic Query Construction
        // Note: For 'All', we rely on 'orderBy' which needs a default index (usually present).
        // For specific types, we use 'where' and sort client-side to avoid needing composite indexes for every type.
        if (filterType === 'All') {
            q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(POSTS_PER_PAGE));
        } else {
            // Fetch all posts of this type (up to a reasonable safety limit) and sort in memory
            // This ensures we don't miss recent posts due to pre-fetch limiting
            q = query(collection(db, 'posts'), where('plantType', '==', filterType), limit(50));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side Sort (Robustness)
            // Even though 'All' comes sorted, sorting again is cheap and ensures consistency
            postsData.sort((a, b) => {
                // If createdAt is null (local pending write), treat it as NOW so it stays at top
                const timeA = a.createdAt?.seconds || (Date.now() / 1000);
                const timeB = b.createdAt?.seconds || (Date.now() / 1000);
                return timeB - timeA;
            });

            setPosts(postsData);
            setLoading(false);

            // Only show 'Load More' if we hit the limit (approximate)
            setHasMore(snapshot.docs.length >= POSTS_PER_PAGE);

        }, (error) => {
            console.error("Error fetching posts:", error);
            setLoading(false);
        });

        // Cleanup
        return () => unsubscribe();
    }, [filterType]);

    // Fetch Daily Fact
    useEffect(() => {
        async function loadDaily() {
            const fact = await getDailyPost();
            if (fact) setDailyFact(fact);
        }
        loadDaily();
    }, []);

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
                                        <div className="px-4 py-2 text-sm text-gray-400">{t('no_results') || 'No results'}</div>
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
                <PageLoader />
            ) : (
                <div className="space-y-6">
                    {/* Daily Bot Card */}
                    {dailyFact && <DailyBotCard fact={dailyFact} />}

                    {posts.length > 0 ? (
                        posts.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onViewAnalysis={(id) => setViewAnalysisId(id)}
                                onUserClick={(userId) => {
                                    // Create minimal user object for preview
                                    setSelectedUser({
                                        id: userId,
                                        name: post.authorName || 'Gardener',
                                        avatar: post.userAvatar
                                    });
                                }}
                            />
                        ))
                    ) : (
                        <div className="text-center py-20 text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                            <p className="text-lg mb-2">{t('no_posts_yet')}</p>
                            <p className="text-sm">{t('be_the_first')}</p>
                        </div>
                    )}
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

            {/* Analysis Detail Modal */}
            {viewAnalysisId && (
                <AnalysisDetailModal analysisId={viewAnalysisId} onClose={() => setViewAnalysisId(null)} />
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
