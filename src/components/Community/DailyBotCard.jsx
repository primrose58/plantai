import React, { useState, useEffect } from 'react';
import { Sprout, Share2, Lightbulb, Bug, Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DailyBotCard = ({ fact }) => {
    const { t } = useTranslation();
    const [imageSrc, setImageSrc] = useState(null);

    // Simple keyword-to-image mapping or placeholder logic
    // specific keyword searching for real images is complex without an external API (Unsplash/Pixabay).
    // For now, we will use high-quality placeholders or generic topic images based on type.

    useEffect(() => {
        if (!fact) return;

        // In a real app, you might call Unsplash API here with fact.imageKeyword
        // For this demo, we'll use a reliable placeholder service with keywords
        const randomSig = Math.floor(Math.random() * 1000);
        setImageSrc(`https://source.unsplash.com/featured/?${encodeURIComponent(fact.imageKeyword)},nature,plant&sig=${randomSig}`);
        // Note: source.unsplash.com is sometimes slow or deprecated. 
        // A better alternative for stability might be:
        // `https://image.pollinations.ai/prompt/${encodeURIComponent(fact.imageKeyword + " realistic photo nature plant")}`
        // But let's try standard unsplash or fall back to pollinations if desired.
        // Let's use Pollinations.ai for generated "AI" look which fits the theme perfectly!
        const generatedImage = `https://image.pollinations.ai/prompt/${encodeURIComponent("realistic nature photography " + fact.imageKeyword)}?nologo=true`;
        setImageSrc(generatedImage);

    }, [fact]);

    if (!fact) return null;

    const getIcon = () => {
        switch (fact.type) {
            case 'pest': return <Bug className="text-red-500 w-6 h-6" />;
            case 'disease': return <Leaf className="text-yellow-500 w-6 h-6" />;
            case 'tip': return <Lightbulb className="text-yellow-400 w-6 h-6" />;
            default: return <Sprout className="text-green-500 w-6 h-6" />;
        }
    };

    const getBgColor = () => {
        switch (fact.type) {
            case 'pest': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
            case 'disease': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
            case 'tip': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
            default: return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: `Plant AI Daily Tip: ${fact.title}`,
            text: fact.content,
            url: window.location.origin
        };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch (e) { /* clean */ }
        } else {
            navigator.clipboard.writeText(fact.content);
            alert("Copied to clipboard!");
        }
    };

    return (
        <div className={`mb-6 rounded-xl border p-4 shadow-sm relative overflow-hidden ${getBgColor()} transition-all hover:shadow-md`}>
            {/* Header Badge */}
            <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                    <Sprout className="text-green-600 w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('daily_bot_title') || "Plant AI Günlük Bilgi"}
                    </h3>
                    <div className="text-xs text-gray-400">{new Date().toLocaleDateString()}</div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                {/* Image Section */}
                <div className="w-full md:w-1/3 h-48 md:h-auto relative rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-inner group">
                    {imageSrc && (
                        <img
                            src={imageSrc}
                            alt={fact.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                        />
                    )}
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                        AI Generated
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                        {getIcon()}
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                            {fact.title}
                        </h2>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
                        {fact.content}
                    </p>

                    <div className="mt-auto flex justify-end border-t border-gray-200 dark:border-gray-700/50 pt-3">
                        <button
                            onClick={handleShare}
                            className="text-gray-500 hover:text-green-600 transition-colors flex items-center gap-1"
                        >
                            <Share2 className="w-5 h-5" />
                            <span className="text-sm font-medium">{(t('share_generic') || "paylaş")}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyBotCard;
