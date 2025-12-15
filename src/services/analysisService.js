import { db, storage } from './firebase';
import { collection, addDoc, query, where, orderBy, getDocs, getDoc, doc, updateDoc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadString, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

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
        // Query WITHOUT orderBy to avoid index requirements
        const q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId)
        );
        const snapshot = await getDocs(q);

        // Sort in memory (Client-side sorting)
        const analyses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return analyses.sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA; // Descending order
        });
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
 * Create a new community post (generic, not necessarily analysis-linked).
 */
/**
 * Create a new community post (generic, not necessarily analysis-linked).
 */
export async function createPost(userId, postData, onProgress) {
    try {
        let imageUrl = null;
        if (postData.image) {
            const storageRef = ref(storage, `posts/${userId}/${Date.now()}.jpg`);
            console.log("Starting upload to:", storageRef.fullPath);

            // Failsafe for onProgress if not provided
            const reportProgress = (val) => {
                if (onProgress) onProgress(val);
                console.log(`Upload Progress: ${val}%`);
            };

            reportProgress(10); // Start

            // Handle both base64 and blob/file
            if (typeof postData.image === 'string' && postData.image.startsWith('data:')) {
                await uploadString(storageRef, postData.image, 'data_url');
            } else {
                console.log("Using Standard UploadBytes...");
                // Note: uploadBytes does not support progress stream easily in SDK v9 without XHR hook, 
                // but it is more robust against hanging listeners.
                // We fake progress for UX or use resumable if strictly needed. 
                // Given the issues, let's try uploadBytes for reliability. 
                // If user really needs progress, we can revert, but let's fix the hang first.

                reportProgress(30);
                const snapshot = await uploadBytes(storageRef, postData.image);
                reportProgress(90);
            }
            console.log("Upload done, getting URL...");
            imageUrl = await getDownloadURL(storageRef);
            reportProgress(100);
            console.log("Got URL:", imageUrl);
        }

        console.log("Adding doc to Firestore...");

        // Create the document promise
        const addDocPromise = addDoc(collection(db, 'posts'), {
            userId,
            authorName: postData.authorName || "Gardener",
            title: postData.title || "", // No default title
            content: postData.content,
            image: imageUrl,
            plantType: postData.plantType || 'Unknown',
            likes: [],
            comments: [],
            createdAt: serverTimestamp(),
        });

        // Race against a 5-second timeout to prevent UI hanging
        // If Firestore is offline/slow, the local cache handles it (optimistic UI)
        // We don't want to trap the user in "Posting..." forever.
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 5000));

        const result = await Promise.race([addDocPromise, timeoutPromise]);

        if (result === 'timeout') {
            console.log("Firestore write timed out (likely offline). Proceeding optimistically.");
        } else {
            console.log("Firestore write confirmed by server.");
        }

        return true;
    } catch (error) {
        console.error("Error creating post:", error);
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

/**
 * Delete a post (Owner only).
 */
export async function deletePost(postId) {
    try {
        await deleteDoc(doc(db, 'posts', postId));
        return true;
    } catch (error) {
        console.error("Error deleting post:", error);
        throw error;
    }
}

/**
 * Toggle Like on a post.
 */
export async function toggleLike(postId, userId) {
    try {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) return;

        const likes = postSnap.data().likes || [];
        if (likes.includes(userId)) {
            await updateDoc(postRef, { likes: arrayRemove(userId) });
        } else {
            await updateDoc(postRef, { likes: arrayUnion(userId) });
        }
    } catch (error) {
        console.error("Error toggling like:", error);
        throw error;
    }
}

/**
 * Add a comment to a post.
 */
export async function addComment(postId, userId, userName, text) {
    try {
        const postRef = doc(db, 'posts', postId);
        const comment = {
            userId,
            userName,
            text,
            createdAt: Date.now() // Timestamp for sorting
        };
        await updateDoc(postRef, {
            comments: arrayUnion(comment)
        });
        return true;
    } catch (error) {
        console.error("Error adding comment:", error);
        throw error;
    }
}
