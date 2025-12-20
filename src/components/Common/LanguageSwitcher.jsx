import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const toggleLang = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'tr' : 'en');
    };

    // Don't show if inside Layout (md screens) because Layout has one? 
    // Actually user requested "her ekranda", so let's make it visible but maybe positioned safely.
    // Bottom-Right is standard.

    return (
        <button
            onClick={toggleLang}
            className="fixed bottom-20 md:bottom-6 right-4 z-[9990] bg-white/90 dark:bg-gray-800/90 backdrop-blur-md text-gray-900 dark:text-white px-4 py-2.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 font-bold text-xs flex items-center gap-2 transition-all hover:scale-105 hover:bg-white dark:hover:bg-gray-800"
            aria-label="Change Language"
        >
            <Globe className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span>{i18n.language === 'en' ? 'TR' : 'EN'}</span>
        </button>
    );
}
