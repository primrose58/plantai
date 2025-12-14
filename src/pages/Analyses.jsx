import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getUserAnalyses } from '../services/analysisService';
import { Sprout, Clock, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Analyses() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    const toggleExpand = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    useEffect(() => {
        if (currentUser) {
            loadAnalyses();
        }
    }, [currentUser]);

    const loadAnalyses = async () => {
        setLoading(true);
        const data = await getUserAnalyses(currentUser.uid);
        setAnalyses(data);
        setLoading(false);
    };

    if (loading) return <div className="p-8 text-center">{t('loading') || 'Loading...'}</div>;

    if (analyses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
                <Sprout className="w-16 h-16 mb-4 opacity-50" />
                <h2 className="text-xl font-bold mb-2">No Analyses Yet</h2>
                <p className="mb-6">Start diagnosing your plants to track their health here.</p>
                <Link to="/" className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700">
                    Start Diagnosis
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto w-full pb-20">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6 text-green-600" />
                My Plant Analyses
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analyses.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="relative h-48 cursor-pointer" onClick={() => toggleExpand(item.id)}>
                            <img src={item.mainImage} alt={item.plantType} className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/50 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                                {new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white capitalize">
                                    {item.plantType || 'Unknown Plant'}
                                </h3>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.result.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {item.result.disease_name || 'Healthy'}
                                </span>
                            </div>

                            <div className={`transition-all duration-300 ${expandedId === item.id ? '' : 'line-clamp-2'}`}>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                    {item.result.description}
                                </p>
                                {expandedId === item.id && item.result.treatment_steps && (
                                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                        <h4 className="font-bold text-xs text-green-800 dark:text-green-400 mb-1 uppercase">Treatment</h4>
                                        <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                            {item.result.treatment_steps.map((step, idx) => (
                                                <li key={idx}>{step}</li>
                                            ))}
                                        </ul>
                                        <button className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg text-sm font-bold opacity-50 cursor-not-allowed" title="Feedback coming soon">
                                            Add Update Photo (Coming Soon)
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
                                <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                                    <Clock className="w-4 h-4" />
                                    <span>Checkup: 7 days</span>
                                </div>
                                <button
                                    onClick={() => toggleExpand(item.id)}
                                    className="text-green-600 font-bold text-sm flex items-center gap-1 hover:text-green-700"
                                >
                                    {expandedId === item.id ? 'Hide Details' : 'View Details'} <ArrowRight className={`w-4 h-4 transition-transform ${expandedId === item.id ? 'rotate-90' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
