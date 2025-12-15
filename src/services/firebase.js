import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, catchAllErrors } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAukVlaxbs_YneslsBqTydefDhepXbookU",
    authDomain: "plantai0.firebaseapp.com",
    projectId: "plantai0",
    storageBucket: "plantai0.firebasestorage.app",
    messagingSenderId: "265722530392",
    appId: "1:265722530392:web:5e2b3aed63d2597b07d82d",
    measurementId: "G-LSJ7Q09VS0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
export const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Enable offline persistence
// This helps with unstable connections and "slow" feel
try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled in one tab at a a time.
            console.warn("Firebase persistence failed: multiple tabs");
        } else if (err.code == 'unimplemented') {
            // The current browser does not support all of the features required to enable persistence
            console.warn("Firebase persistence not supported");
        }
    });
} catch (e) {
    // Ignore if already initialized
}

export { auth, db, storage, googleProvider };
