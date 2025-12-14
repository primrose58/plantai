import { auth } from './firebase.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export class AuthService {
    constructor(onUserChangeCallback) {
        this.currentUser = null;
        if (auth) {
            onAuthStateChanged(auth, (user) => {
                this.currentUser = user;
                if (onUserChangeCallback) onUserChangeCallback(user);
            });
        }
    }

    async register(email, password, name) {
        if (!auth) throw new Error("Firebase not initialized");
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        return cred.user;
    }

    async login(email, password) {
        if (!auth) throw new Error("Firebase not initialized");
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return cred.user;
    }

    async logout() {
        if (!auth) return;
        await signOut(auth);
    }

    isAuthenticated() {
        return !!this.currentUser;
    }
}
