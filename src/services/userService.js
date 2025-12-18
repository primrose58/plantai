import { db } from './firebase';
import {
    doc,
    setDoc,
    deleteDoc,
    getDoc,
    collection,
    getDocs,
    increment,
    updateDoc,
    serverTimestamp,
    query,
    orderBy,
    limit
} from 'firebase/firestore';

/**
 * Follow a user
 * @param {string} currentUserId - The ID of the user performing the action
 * @param {object} currentUserData - Basic data of current user (name, avatar) to store in follower doc for quick access
 * @param {string} targetUserId - The ID of the user to be followed
 * @param {object} targetUserData - Basic data of target user to store in following doc
 */
export const followUser = async (currentUserId, currentUserData, targetUserId, targetUserData) => {
    try {
        if (!currentUserId || !targetUserId) throw new Error("Invalid user IDs");

        // 1. Add targetUser to currentUser's 'following' collection
        const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
        await setDoc(followingRef, {
            ...targetUserData,
            followedAt: serverTimestamp()
        });

        // 2. Add currentUser to targetUser's 'followers' collection
        const followerRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
        await setDoc(followerRef, {
            ...currentUserData,
            followedAt: serverTimestamp()
        });

        // 3. Increment 'followingCount' for currentUser
        const currentUserRef = doc(db, 'users', currentUserId);
        await updateDoc(currentUserRef, {
            followingCount: increment(1)
        });

        // 4. Increment 'followersCount' for targetUser
        const targetUserRef = doc(db, 'users', targetUserId);
        await updateDoc(targetUserRef, {
            followersCount: increment(1)
        });

        return true;
    } catch (error) {
        console.error("Error following user:", error);
        throw error;
    }
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (currentUserId, targetUserId) => {
    try {
        if (!currentUserId || !targetUserId) throw new Error("Invalid user IDs");

        // 1. Remove from 'following'
        await deleteDoc(doc(db, 'users', currentUserId, 'following', targetUserId));

        // 2. Remove from 'followers'
        await deleteDoc(doc(db, 'users', targetUserId, 'followers', currentUserId));

        // 3. Decrement 'followingCount'
        await updateDoc(doc(db, 'users', currentUserId), {
            followingCount: increment(-1)
        });

        // 4. Decrement 'followersCount'
        await updateDoc(doc(db, 'users', targetUserId), {
            followersCount: increment(-1)
        });

        return true;
    } catch (error) {
        console.error("Error unfollowing user:", error);
        throw error;
    }
};

/**
 * Check if current user follows target user
 */
export const checkFollowStatus = async (currentUserId, targetUserId) => {
    try {
        if (!currentUserId || !targetUserId) return false;
        const docRef = doc(db, 'users', currentUserId, 'following', targetUserId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists();
    } catch (error) {
        console.error("Error checking follow status:", error);
        return false;
    }
};

/**
 * Get user stats (followers/following counts)
 * This is useful if we want fresh stats without listening to the whole user doc
 */
export const getUserStats = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const data = userDoc.data();
            return {
                followersCount: data.followersCount || 0,
                followingCount: data.followingCount || 0
            };
        }
        return { followersCount: 0, followingCount: 0 };
    } catch (error) {
        console.error("Error getting user stats:", error);
        return { followersCount: 0, followingCount: 0 };
    }
};

/**
 * Get list of followers
 */
export const getFollowers = async (userId) => {
    try {
        const q = query(collection(db, 'users', userId, 'followers'), orderBy('followedAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching followers:", error);
        return [];
    }
};

/**
 * Get list of following
 */
export const getFollowing = async (userId) => {
    try {
        const q = query(collection(db, 'users', userId, 'following'), orderBy('followedAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching following:", error);
        return [];
    }
};
