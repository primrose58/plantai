import React from 'react';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

class ErrorBoundaryInternal extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        // We can use the navigate prop if passed, or just href
        window.location.href = '/';
    };

    render() {
        // Get localization from props
        const { t } = this.props;

        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-fade-in text-gray-900 dark:text-white">
                    <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-full mb-6">
                        <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">
                        {t ? t('something_went_wrong') : "Something went wrong"}
                    </h2>
                    <p className="mb-8 max-w-md text-gray-500 dark:text-gray-400">
                        {this.state.error?.message || (t ? t('unexpected_error') : "An unexpected error occurred.")}
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={this.handleReload}
                            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className="w-5 h-5" />
                            {t ? t('reload') : "Reload"}
                        </button>
                        <button
                            onClick={this.handleGoHome}
                            className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg hover:shadow-green-500/30 flex items-center gap-2"
                        >
                            <Home className="w-5 h-5" />
                            {t ? t('go_home') : "Go Home"}
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Functional Wrapper to inject hooks
export default function ErrorBoundary({ children }) {
    const { t } = useTranslation();
    const location = useLocation();

    // Key forces remount on route change, effectively resetting the error state
    return (
        <ErrorBoundaryInternal key={location.pathname} t={t}>
            {children}
        </ErrorBoundaryInternal>
    );
}
