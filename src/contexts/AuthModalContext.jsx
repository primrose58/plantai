import { createContext, useContext, useState } from 'react';

const AuthModalContext = createContext();

export function useAuthModal() {
    return useContext(AuthModalContext);
}

export function AuthModalProvider({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState('login'); // 'login' or 'register'

    const openLogin = () => {
        setView('login');
        setIsOpen(true);
    };

    const openRegister = () => {
        setView('register');
        setIsOpen(true);
    };

    const closeModal = () => {
        setIsOpen(false);
    };

    const toggleView = () => {
        setView(prev => prev === 'login' ? 'register' : 'login');
    };

    const value = {
        isOpen,
        view,
        openLogin,
        openRegister,
        closeModal,
        toggleView
    };

    return (
        <AuthModalContext.Provider value={value}>
            {children}
        </AuthModalContext.Provider>
    );
}
