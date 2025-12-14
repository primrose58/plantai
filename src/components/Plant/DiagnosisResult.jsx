import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle, Activity, Sprout } from 'lucide-react';

export default function DiagnosisResult({ result, onReset }) {
    const { t } = useTranslation();

    if (!result) return null;

    // Handle "Not a Plant" error gracefully
    if (result.error === 'NOT_PLANT') {
        return (
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden p-8 text-center">
                <div className="mx-auto bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Could not identify plant</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Please ensure the photo contains a clear view of a plant leaf or stem.</p>
                <button
                    onClick={onReset}
                    className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-xl font-medium transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-green-600 text-white p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold">{result.disease_name}</h2>
                        <p className="opacity-90 italic text-lg">{result.latin_name}</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="text-2xl font-bold">{result.confidence}%</div>
                        <div className="text-xs uppercase opacity-75">{t('confidence')}</div>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/20">
                        <div className="flex items-center gap-2 mb-1 text-orange-700 dark:text-orange-500 font-semibold">
                            <Activity className="w-5 h-5" />
                            <span>Urgency</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-orange-600 h-2.5 rounded-full" style={{ width: `${result.urgency}%` }}></div>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20">
                        <div className="flex items-center gap-2 mb-1 text-blue-700 dark:text-blue-500 font-semibold">
                            <Sprout className="w-5 h-5" />
                            <span>Spread Risk</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${result.spread_risk}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        {result.description}
                    </p>
                </div>

                {/* Treatment Steps */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('treatment')}</h3>
                    <ul className="space-y-3">
                        {result.treatment_steps?.map((step, index) => (
                            <li key={index} className="flex gap-3">
                                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-500 flex-shrink-0" />
                                <span className="text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg flex-1">
                                    {step}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex gap-4">
                    <button
                        onClick={onReset}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-3 rounded-xl font-medium transition-colors"
                    >
                        New Scan
                    </button>
                    {/* Add Save/Share buttons here later */}
                </div>
            </div>
        </div>
    );
}
