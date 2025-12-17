import React from 'react';
import { Sprout } from 'lucide-react';

export default function PageLoader() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900 transition-opacity duration-300">
            <div className="flex flex-col items-center animate-fade-in">
                <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* Ring Animation */}
                    <div className="absolute inset-0 border-4 border-green-100 dark:border-green-900 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>

                    {/* Pulsing Sprout Logo */}
                    <Sprout className="w-10 h-10 text-green-600 dark:text-green-400 animate-pulse" />
                </div>
                <h3 className="mt-6 text-lg font-bold text-gray-800 dark:text-gray-200 animate-pulse tracking-wide">
                    Plant AI
                </h3>
            </div>
        </div>
    );
}
