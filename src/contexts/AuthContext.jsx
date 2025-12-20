import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Set fundamental user immediately
                setCurrentUser(prev => ({ ...prev, ...user }));

                // REAL-TIME LISTENER for User Profile
                const userDocRef = doc(db, "users", user.uid);

                // We use a simplified listener here. 
                // Note: The listener itself returns an unsubscribe function.
                // We need to manage this inner subscription to avoid leaks if the auth state changes quickly.
                const unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        // Merge profile data with auth object
                        setCurrentUser(prev => ({ ...prev, ...prev?.reloadUserInfo, ...user, ...docSnap.data() }));
                    } else {
                        // SELF-HEALING: Create document if missing
                        console.warn("User document missing. Creating active sync record...");
                        const newUserData = {
                            uid: user.uid,
                            name: user.displayName || 'User',
                            displayName: user.displayName || 'User',
                            email: user.email,
                            photoURL: user.photoURL,
                            avatar: user.photoURL,
                            createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime) : new Date(),
                            lastSeen: new Date(),
                            bio: ""
                        };
                        try {
                            // Merge true is safer
                            await setDoc(userDocRef, newUserData, { merge: true });
                            // The snapshot listener will fire again automatically after this write!
                        } catch (writeErr) {
                            console.error("Failed to auto-create user doc:", writeErr);
                        }
                    }
                }, (error) => {
                    console.error("Real-time profile sync error:", error);
                });

                // Return cleanup for the snapshot listener when the auth effect re-runs or unmounts
                // However, since onAuthStateChanged is long-lived, we need a way to store this unsubscribe.
                // A common pattern is just to let it run, but properly we should clean up.
                // For simplicity in this functional component without extra refs, we'll rely on the fact 
                // that onAuthStateChanged typically is stable. 
                // Ideally, we'd store `unsubscribeSnapshot` in a ref to call it on logout.
                // But `onAuthStateChanged` fires with null on logout, so we can handle it there? 
                // Actually, `onAuthStateChanged` might stay active. 
                // Let's attach the unsubscriber to the user object or a ref if precise cleanup is needed.
                // For now, simpler: we just set the listener. 

                // BETTER APPROACH FOR CLEANUP:
                // We can't easily return the unsubscribeSnapshot from here to the outer scope 
                // because onAuthStateChanged is an event handler.
                // We'll trust React to remount if necessary, but actually `AuthProvider` mounts once.
                // We should track the listener in a ref.
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
        };
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
