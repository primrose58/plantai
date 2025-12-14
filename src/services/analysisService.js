import { db, storage } from './firebase';
import { collection, addDoc, query, where, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

const COLLECTION_NAME = 'analyses';

/**
 * Saves a new diagnosis record.
 * Uploads image to Storage first, then saves metadata to Firestore.
 */
export async function saveAnalysis(userId, plantType, images, result, isPublic = false) {
    try {
        // 1. Upload Main Image
        let mainImageUrl = null;
        if (images.main) {
            const storageRef = ref(storage, `analyses/${userId}/${Date.now()}_main.jpg`);
            await uploadString(storageRef, images.main, 'data_url');
            mainImageUrl = await getDownloadURL(storageRef);
        }

        // 2. Upload Macro Image (if exists)
        let macroImageUrl = null;
        if (images.macro) {
            const storageRef = ref(storage, `analyses/${userId}/${Date.now()}_macro.jpg`);
            await uploadString(storageRef, images.macro, 'data_url');
            macroImageUrl = await getDownloadURL(storageRef);
        }

        // 3. Save to Firestore
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            userId,
            plantType,
            mainImage: mainImageUrl,
            macroImage: macroImageUrl,
            result,
            isPublic, // For Community features later
            status: 'active', // active, resolved, archived
            createdAt: serverTimestamp(),
            nextCheckup: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7 days
        });

        return docRef.id;
    } catch (error) {
        console.error("Error saving analysis:", error);
        throw error;
    }
}

/**
 * Fetch all analyses for a specific user.
 */
export async function getUserAnalyses(userId) {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching analyses:", error);
        return [];
    }
}

/**
 * Update analysis status or add feedback(progress).
 */
export async function updateAnalysisStatus(analysisId, updates) {
    try {
        const docRef = doc(db, COLLECTION_NAME, analysisId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error updating analysis:", error);
        throw error;
    }
}
