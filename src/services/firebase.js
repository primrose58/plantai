import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, storage, googleProvider };
