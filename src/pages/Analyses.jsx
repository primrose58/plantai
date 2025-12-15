import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Loader2, Calendar, ArrowRight, Sprout, Share2, PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { enUS, tr } from 'date-fns/locale';
import { saveAnalysis, shareAnalysisToCommunity, addFeedbackUpdate } from '../services/analysisService'; // We will need these

export default function Analyses() {
    const { t, i18n } = useTranslation();
    const { currentUser } = useAuth();
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnalyses() {
            if (!currentUser) return;
            try {
                const q = query(
                    collection(db, 'analyses'),
                    where('userId', '==', currentUser.uid)
                    // orderBy('createdAt', 'desc') // Requires index, do client sort
                );
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Client-side sort desc
                list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

                setAnalyses(list);
            } catch (err) {
                console.error("Failed to fetch analyses", err);
            } finally {
                setLoading(false);
            }
        }
        fetchAnalyses();
    }, [currentUser]);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Sprout className="text-green-600" />
                {t('my_analyses') || "My Plant Analyses"}
            </h1>

            <div className="grid gap-6">
                {analyses.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <p>{t('no_analyses') || "No analyses yet. Scan a plant!"}</p>
                    </div>
                ) : (
                    analyses.map(analysis => (
                        <div key={analysis.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex gap-6 hover:shadow-md transition-all">
                            <img
                                src={analysis.mainImage}
                                alt={analysis.plantType}
                                className="w-24 h-24 rounded-xl object-cover bg-gray-100"
                            />
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                                            {analysis.result.plant_name}
                                        </h3>
                                        <p className="text-sm text-red-500 font-medium">
                                            {analysis.result.disease_name}
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDistanceToNow(new Date(analysis.createdAt?.seconds * 1000), { addSuffix: true, locale: i18n.language === 'tr' ? tr : enUS })}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                                    {analysis.result.description}
                                </p>

                                <div className="mt-4 flex gap-3">
                                    {/* Action Buttons Placeholder */}
                                    <button className="text-sm font-semibold text-green-600 hover:text-green-700 flex items-center gap-1">
                                        {t('view_details') || "View Details"} <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
