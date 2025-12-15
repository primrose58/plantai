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

/**
 * Share an existing analysis to the Community (creates a Post).
 */
export async function shareAnalysisToCommunity(AnalysisId, analysisData, plantType) {
    try {
        // Create a new post document based on the analysis
        await addDoc(collection(db, 'posts'), {
            userId: analysisData.userId,
            authorName: "Gardener", // Ideally fetch user name, but 'Gardener' or anonymous is fine for now
            title: `Help with my ${plantType}`,
            content: `I diagnosed this ${plantType} with ${analysisData.result.disease_name}. ${analysisData.result.description.substring(0, 100)}...`,
            image: analysisData.mainImage,
            plantType: plantType,
            likes: [],
            comments: [],
            createdAt: serverTimestamp(),
            relatedAnalysisId: AnalysisId
        });

        // Mark analysis as shared
        await updateAnalysisStatus(AnalysisId, { isPublic: true });
        return true;
    } catch (error) {
        console.error("Error sharing to community:", error);
        throw error;
    }
}

/**
 * Add a follow-up photo/note to an analysis (Feedback loop).
 */
export async function addFeedbackUpdate(analysisId, imageBase64, note) {
    try {
        let imageUrl = null;
        if (imageBase64) {
            const storageRef = ref(storage, `analyses/feedback/${analysisId}_${Date.now()}.jpg`);
            await uploadString(storageRef, imageBase64, 'data_url');
            imageUrl = await getDownloadURL(storageRef);
        }

        const docRef = doc(db, COLLECTION_NAME, analysisId);
        // We use arrayUnion to append to a 'history' or 'updates' array
        // But first we need to make sure the field exists or simple update logic
        // For simplicity, let's assume we store them in a subcollection or just an array field
        // Let's use a subcollection 'updates' for scalability

        await addDoc(collection(db, COLLECTION_NAME, analysisId, 'updates'), {
            imageUrl,
            note,
            createdAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error("Error adding feedback:", error);
        throw error;
    }
}
