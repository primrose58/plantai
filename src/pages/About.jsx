import { useTranslation } from 'react-i18next';
import { Sprout, Globe, Heart, Target } from 'lucide-react';

export default function About() {
    const { t, i18n } = useTranslation();

    // Hardcoded content for now, ideally moved to locales or CMS
    const content = {
        en: {
            intro: "This project aims to facilitate the detection and control of agricultural pests using an AI-based system.",
            sections: [
                { title: "Global Agriculture Network", text: "PlantAI is an advanced AI assistant developed to increase agricultural productivity and minimize crop losses.", icon: Sprout },
                { title: "Collective Intelligence", text: "Not just a diagnostic tool, but a massive community of farmers.", icon: Globe },
                { title: "Our Mission", text: "We are putting technology in everyone's pocket for sustainable agriculture.", icon: Target }
            ]
        },
        tr: {
            intro: "Bu proje, tarım zararlılarının tespitini ve onlarla mücadeleyi kolaylaştırmak amacıyla yapay zeka tabanlı bir sistem geliştirilmesini kapsamaktadır.",
            sections: [
                { title: "Küresel Tarım Ağı", text: "PlantAI, tarımsal verimliliği artırmak ve ürün kayıplarını en aza indirmek için geliştirilmiş gelişmiş bir yapay zeka asistanıdır.", icon: Sprout },
                { title: "Kolektif Bilgi Gücü", text: "Sadece bir teşhis aracı değil, aynı zamanda dev bir çiftçi topluluğudur.", icon: Globe },
                { title: "Misyonumuz", text: "Sürdürülebilir tarım için teknolojiyi herkesin cebine sokuyoruz.", icon: Target }
            ]
        }
    };

    const currentContent = content[i18n.language] || content.en;

    return (
        <div className="max-w-2xl mx-auto w-full pb-8">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                    <Heart className="w-8 h-8 text-green-600 dark:text-green-500" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{t('about')}</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 italic">
                    "{currentContent.intro}"
                </p>
            </div>

            <div className="space-y-6">
                {currentContent.sections.map((section, idx) => {
                    const Icon = section.icon;
                    return (
                        <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4 items-start hover:shadow-md transition-shadow">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                                <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">{section.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {section.text}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
