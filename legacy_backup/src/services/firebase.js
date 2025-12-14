import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { CONFIG } from "../config.js";

let app, auth, db;

export function initFirebase() {
    if (!CONFIG.FIREBASE) {
        console.warn("Firebase Config missing! Auth and DB features will be disabled.");
        return false;
    }

    try {
        app = initializeApp(CONFIG.FIREBASE);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("Firebase Connected Successfully");
        return true;
    } catch (error) {
        console.error("Firebase Init Error:", error);
        return false;
    }
}

export { auth, db };
