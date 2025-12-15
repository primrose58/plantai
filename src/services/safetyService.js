import { db } from './firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

// Simple bad words list (Turkish/English mix)
const BAD_WORDS = ['badword', 'kötügöz', 'küfür', 'hakaret', 'aptal', 'salak', 'idiot', 'stupid', 'xxx', 'porn'];

/**
 * Checks text for inappropriate content.
 * @param {string} text 
 * @returns {boolean} true if safe, false if contains bad words
 */
export function isTextSafe(text) {
    if (!text) return true;
    const lowerText = text.toLowerCase();
    return !BAD_WORDS.some(word => lowerText.includes(word));
}

/**
 * Checks image safety (placeholder for now, relying on Gemini usually).
 * You can integrate more robust checks here.
 */
export async function isImageSafe(base64Image) {
    // In a real app, send to Cloud Vision API or similar.
    // For this prototype, we assume if Gemini processed it for analysis it's 'mostly' safe, 
    // but for community posts without analysis (just photos), we might want a check.
    // For now returning true to avoid blocking valid usage without a real filter API.
    return true;
}

/**
 * Block a user.
 */
export async function blockUser(currentUserId, targetUserId) {
    try {
        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, {
            blockedUsers: arrayUnion(targetUserId)
        });
        return true;
    } catch (error) {
        console.error("Error blocking user:", error);
        throw error;
    }
}

/**
 * Unblock a user.
 */
export async function unblockUser(currentUserId, targetUserId) {
    try {
        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, {
            blockedUsers: arrayRemove(targetUserId)
        });
        return true;
    } catch (error) {
        console.error("Error unblocking user:", error);
        throw error;
    }
}

/**
 * Check if a user is blocked.
 */
export async function isUserBlocked(currentUserId, targetUserId) {
    try {
        const userRef = doc(db, 'users', currentUserId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            const blocked = snap.data().blockedUsers || [];
            return blocked.includes(targetUserId);
        }
        return false;
    } catch (error) {
        return false;
    }
}
