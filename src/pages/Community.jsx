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

// ... imports
import { doc, getDoc } from 'firebase/firestore'; // Added imports

// Analysis Modal Component
function AnalysisDetailModal({ analysisId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const snap = await getDoc(doc(db, 'analyses', analysisId));
                if (snap.exists()) setData(snap.data());
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [analysisId]);

    if (loading) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-white" /></div>;
    if (!data) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize flex items-center gap-2">
                        <span className="text-green-600">{data.plantType}</span> Diagnosis
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <img src={data.mainImage} alt="Main" className="rounded-xl object-cover w-full h-48 bg-gray-100" />
                    <div>
                        <div className="mb-4">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Detected Issue</span>
                            <p className="text-xl font-bold text-red-500">{data.result.disease_name}</p>
                        </div>
                        <div className="mb-4">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Confidence</span>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(data.result.confidence || 0.8) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl">
                        <h3 className="font-bold text-green-800 dark:text-green-400 mb-2">Analysis</h3>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{data.result.description}</p>
                    </div>

                    {data.result.treatment_steps && (
                        <div className="border border-gray-100 dark:border-gray-700 p-4 rounded-xl">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-3">Treatment Plan</h3>
                            <ul className="space-y-2">
                                {data.result.treatment_steps.map((step, i) => (
                                    <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                                        <span className="font-bold text-green-600">{i + 1}.</span>
                                        {step}
                                    </li>
                                ))}
                            </ul>
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
    // ... items ...
    const [viewAnalysisId, setViewAnalysisId] = useState(null); // New state

    // ... useEffect ...

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20 p-4">
            {/* ... header ... (unchanged) */}

            {/* Posts */}
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
                            onViewAnalysis={(id) => setViewAnalysisId(id)}
                            onUserClick={(userId) => {
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
                // ... empty state
                <div className="text-center py-20 text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-lg mb-2">{t('no_posts_yet')}</p>
                    <p className="text-sm">{t('be_the_first')}</p>
                </div>
            )}

            {/* Modals */}
            {isModalOpen && (
                <CreatePostModal onClose={() => setIsModalOpen(false)} onPostCreated={() => { }} />
            )}

            {viewAnalysisId && (
                <AnalysisDetailModal analysisId={viewAnalysisId} onClose={() => setViewAnalysisId(null)} />
            )}

            {selectedUser && (
                <UserPreviewModal user={selectedUser} onClose={() => setSelectedUser(null)} />
            )}
        </div>
    );
}
