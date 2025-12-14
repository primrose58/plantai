import { db, auth } from './firebase.js';
import {
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export class CommunityService {
    constructor() {
        this.unsubscribe = null;
    }

    // Share a diagnosis to the community
    async sharePost(diagnosisData, imageUrl) {
        if (!db || !auth.currentUser) throw new Error("Must be logged in to post");

        const post = {
            userId: auth.currentUser.uid,
            userName: auth.currentUser.displayName || "Bitki Dostu",
            userAvatar: "👨‍🌾", // Default avatar for now
            diseaseName: diagnosisData.disease_name,
            description: diagnosisData.description,
            imageUrl: imageUrl, // Storing Base64 directly for simplicity in this MVP (Not ideal for prod but works for small scale)
            likes: 0,
            comments: 0,
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, "posts"), post);
    }

    // Listen to real-time feed
    subscribeToFeed(callback) {
        if (!db) return;

        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20));

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const posts = [];
            snapshot.forEach((doc) => {
                posts.push({ id: doc.id, ...doc.data() });
            });
            callback(posts);
        });
    }

    stopFeed() {
        if (this.unsubscribe) this.unsubscribe();
    }
}
