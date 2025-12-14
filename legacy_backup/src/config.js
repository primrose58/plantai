// Configuration Management
export const CONFIG = {
    // The key user provided. 
    // IMPORTANT: In a real production environment, this should be proxied via a backend.
    // For this "Serverless/Client-Side" product, we use it directly.
    GEMINI_API_KEY: "AIzaSyBZsgE07GnD6GGpOdeHCFbSQs8tT7Gnd20",

    // Default Locale
    DEFAULT_LANG: 'tr',

    // Firebase Config
    FIREBASE: {
        apiKey: "AIzaSyAukVlaxbs_YneslsBqTydefDhepXbookU",
        authDomain: "plantai0.firebaseapp.com",
        projectId: "plantai0",
        storageBucket: "plantai0.firebasestorage.app",
        messagingSenderId: "265722530392",
        appId: "1:265722530392:web:5e2b3aed63d2597b07d82d",
        measurementId: "G-LSJ7Q09VS0"
    }
};

export const IS_DEBUG = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
