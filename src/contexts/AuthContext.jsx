import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Set fundamental user immediately to unblock UI
                setCurrentUser(user);

                // Fetch profile in background
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        // Merge profile data
                        setCurrentUser(prev => ({ ...prev, ...userDoc.data() }));
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const logout = async () => {
        await auth.signOut();
        setCurrentUser(null);
    };

    const refreshUser = async () => {
        if (auth.currentUser) {
            await auth.currentUser.reload();
            const updatedUser = auth.currentUser;

            // Re-fetch firestore
            let firestoreData = {};
            try {
                const userDoc = await getDoc(doc(db, "users", updatedUser.uid));
                if (userDoc.exists()) {
                    firestoreData = userDoc.data();
                }
            } catch (error) {
                console.error("Error refreshing profile:", error);
            }

            setCurrentUser({ ...updatedUser, ...firestoreData });
        }
    };

    const value = {
        currentUser,
        loading,
        logout,
        refreshUser
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
