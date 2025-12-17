import { db } from './firebase'; // Removed storage import
import { collection, addDoc, query, where, getDocs, getDoc, doc, updateDoc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';

const COLLECTION_NAME = 'analyses';

/**
 * Saves a new diagnosis record.
 * NOW SAVES BASE64 DIRECTLY TO FIRESTORE (No Storage Bucket).
 */
export async function saveAnalysis(userId, plantType, images, result, isPublic = false) {
    try {
        // Images are expected to be Base64 strings already from the UI (Home.jsx)
        // If they are not, we might need to convert them, but Home.jsx likely handles the capture as Data URL.

        const mainImageUrl = images.main || null; // Direct Base64
        const macroImageUrl = images.macro || null; // Direct Base64

        // Check if image is too massive (sanity check)
        if (mainImageUrl && mainImageUrl.length > 900000) {
            console.warn("Main image is very large for Firestore!");
            // In a real app we might re-compress here, but Home.jsx should have handled it.
        }

        // Save to Firestore
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            userId,
            plantType,
            mainImage: mainImageUrl, // Saved as Base64 string
            macroImage: macroImageUrl,
            result,
            isPublic,
            status: 'active',
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
            where("userId", "==", userId)
        );
        const snapshot = await getDocs(q);

        // Fetch updates subcollection for each analysis
        const analysesPromises = snapshot.docs.map(async (docSnapshot) => {
            const data = docSnapshot.data();
            let updates = [];
            try {
                const updatesSnapshot = await getDocs(collection(db, COLLECTION_NAME, docSnapshot.id, 'updates'));
                updates = updatesSnapshot.docs.map(u => u.data()).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            } catch (e) {
                console.log("No updates found or error", e);
            }
            return { id: docSnapshot.id, ...data, updates };
        });

        const analyses = await Promise.all(analysesPromises);

        return analyses.sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA;
        });
    } catch (error) {
        console.error("Error fetching analyses:", error);
        return [];
    }
}

/**
 * Delete an analysis.
 */
export async function deleteAnalysis(analysisId) {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, analysisId));
        return true;
    } catch (error) {
        console.error("Error deleting analysis:", error);
        throw error;
    }
}

/**
 * Update analysis status.
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
 * Create a new community post.
 */
export async function createPost(userId, postData, onProgress) {
    try {
        let imageUrl = null;
        if (postData.image) {
            if (typeof postData.image === 'string' && postData.image.startsWith('data:')) {
                imageUrl = postData.image;
            } else {
                console.warn("Received File object but Storage is disabled. Skipping image.");
            }
        }

        const addDocPromise = addDoc(collection(db, 'posts'), {
            userId,
            authorName: postData.authorName || "Gardener",
            title: postData.title || "",
            content: postData.content,
            image: imageUrl,
            plantType: postData.plantType || 'Unknown',
            likes: [],
            comments: [],
            createdAt: serverTimestamp(),
        });

        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 5000));
        await Promise.race([addDocPromise, timeoutPromise]);

        return true;
    } catch (error) {
        console.error("Error creating post:", error);
        throw error;
    }
}

/**
 * Share an existing analysis to the Community.
 */
export async function shareAnalysisToCommunity(AnalysisId, analysisData, plantType, authorName = "Gardener", authorAvatar = null) {
    try {
        // Localized Title/Content based on Plant Type and Disease
        // In a real app we might pass the 't' function or language code, 
        // Here we default to a smart template assuming Turkish context if widely used, or generic English

        const title = `${plantType} - ${analysisData.result.disease_name}`;

        // Use the description from AI directly as it provides the best context
        let content = `Analiz Sonucu: ${analysisData.result.disease_name}\n\n${analysisData.result.description}`;

        // Add Treatment Steps or Prevention Tips
        if (analysisData.result.is_treatable === false) {
            if (analysisData.result.preventive_measures && analysisData.result.preventive_measures.length > 0) {
                content += `\n\n🛡️ Koruyucu Önlemler:\n` + analysisData.result.preventive_measures.map(step => `• ${step}`).join('\n');
            }
        } else {
            if (analysisData.result.treatment_steps && analysisData.result.treatment_steps.length > 0) {
                content += `\n\n💊 Tedavi Adımları:\n` + analysisData.result.treatment_steps.map(step => `• ${step}`).join('\n');
            }
        }

        await addDoc(collection(db, 'posts'), {
            userId: analysisData.userId,
            authorName: authorName, // Real Name
            userAvatar: authorAvatar, // Real Avatar
            title: title,
            content: content,
            image: analysisData.mainImage, // Already Base64
            plantType: plantType,
            likes: [],
            comments: [],
            createdAt: serverTimestamp(),
            relatedAnalysisId: AnalysisId
        });

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
        // Base64 is passed directly to Firestore
        await addDoc(collection(db, COLLECTION_NAME, analysisId, 'updates'), {
            imageUrl: imageBase64 || null,
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
 * Delete a post.
 */
export async function deletePost(postId) {
    try {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) return false;

        const postData = postSnap.data();

        // If this post was shared from an analysis, reset the analysis status
        if (postData.relatedAnalysisId) {
            try {
                const analysisRef = doc(db, 'analyses', postData.relatedAnalysisId);
                await updateDoc(analysisRef, { isPublic: false });
            } catch (e) {
                console.warn("Could not sync analysis status (might be deleted)", e);
            }
        }

        await deleteDoc(postRef);
        return true;
    } catch (error) {
        console.error("Error deleting post:", error);
        throw error;
    }
}

/**
 * Toggle Like.
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
 * Add a comment.
 */
export async function addComment(postId, userId, userName, text) {
    try {
        const postRef = doc(db, 'posts', postId);
        const comment = {
            userId,
            userName,
            text,
            createdAt: Date.now()
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

/**
 * Update post.
 */
export async function updatePost(postId, updates) {
    try {
        const docRef = doc(db, 'posts', postId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Error updating post:", error);
        throw error;
    }
}

/**
 * Update author name in all posts.
 */
export async function updateUserPostsName(userId, newName, newAvatar) {
    try {
        const q = query(collection(db, 'posts'), where('userId', '==', userId));
        const snapshot = await getDocs(q);

        const updatePromises = snapshot.docs.map(doc => {
            return updateDoc(doc.ref, {
                authorName: newName,
                userAvatar: newAvatar
            });
        });

        await Promise.all(updatePromises);
        return true;
    } catch (error) {
        console.error("Error syncing user profile to posts:", error);
        return false;
    }
}

/**
 * Start or Retrieve a Chat.
 */
export async function startChat(currentUserId, otherUserId, otherUserData, currentUserData) {
    try {
        if (currentUserId === otherUserId) {
            throw new Error("Cannot start chat with yourself.");
        }

        const sortedIds = [currentUserId, otherUserId].sort();
        const chatId = `${sortedIds[0]}_${sortedIds[1]}`;

        const chatRef = doc(db, 'chats', chatId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
            await setDoc(chatRef, {
                participants: [currentUserId, otherUserId],
                participantData: {
                    [otherUserId]: otherUserData,
                    [currentUserId]: currentUserData
                },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastMessage: ''
            });
        } else {
            await updateDoc(chatRef, {
                [`participantData.${currentUserId}`]: currentUserData,
            });
        }

        return chatId;
    } catch (error) {
        console.error("Error starting chat:", error);
        throw error;
    }
}
