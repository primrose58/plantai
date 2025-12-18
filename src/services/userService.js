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
 * Check if current user follows target user OR has a pending request
 */
export const checkFollowStatus = async (currentUserId, targetUserId) => {
    try {
        if (!currentUserId || !targetUserId) return { isFollowing: false, isRequested: false };

        // Check following
        const followRef = doc(db, 'users', currentUserId, 'following', targetUserId);
        const followSnap = await getDoc(followRef);
        const isFollowing = followSnap.exists();

        // Check pending request
        // We check if a request doc exists in targetUser's notifications or a dedicated requests subcollection
        // For simplicity, let's use a dedicated 'followRequests' subcollection on the TARGET user
        const requestRef = doc(db, 'users', targetUserId, 'followRequests', currentUserId);
        const requestSnap = await getDoc(requestRef);
        const isRequested = requestSnap.exists();

        return { isFollowing, isRequested };
    } catch (error) {
        console.error("Error checking follow status:", error);
        return { isFollowing: false, isRequested: false };
    }
};

/**
 * Send Follow Request
 */
export const sendFollowRequest = async (currentUserId, currentUserData, targetUserId) => {
    try {
        if (!currentUserId || !targetUserId) throw new Error("Invalid IDs");

        // Add to target user's 'followRequests' subcollection
        await setDoc(doc(db, 'users', targetUserId, 'followRequests', currentUserId), {
            followerId: currentUserId,
            followerName: currentUserData.displayName || currentUserData.name,
            followerPhoto: currentUserData.photoURL || currentUserData.avatar,
            createdAt: serverTimestamp(),
            status: 'pending'
        });

        // Also add to Notification system (will be implemented next, but good to prep)
        // await addNotification(targetUserId, 'follow_request', currentUserId, ...);

        return true;
    } catch (error) {
        console.error("Error sending follow request:", error);
        throw error;
    }
};

/**
 * Cancel Follow Request (Un-request)
 */
export const cancelFollowRequest = async (currentUserId, targetUserId) => {
    try {
        await deleteDoc(doc(db, 'users', targetUserId, 'followRequests', currentUserId));
        return true;
    } catch (error) {
        console.error("Error cancelling request:", error);
        throw error;
    }
};

/**
 * Accept Follow Request
 */
export const acceptFollowRequest = async (requestId, requesterId, requesterData, currentUserId, currentUserData) => {
    try {
        // 1. Perform the actual Follow (Requester -> CurrentUser)
        // Note: The requester is following the current user.
        await followUser(requesterId, requesterData, currentUserId, currentUserData);

        // 2. Delete the request
        await deleteDoc(doc(db, 'users', currentUserId, 'followRequests', requesterId));

        return true;
    } catch (error) {
        console.error("Error accepting request:", error);
        throw error;
    }
};

/**
 * Reject Follow Request
 */
export const rejectFollowRequest = async (currentUserId, requesterId) => {
    try {
        await deleteDoc(doc(db, 'users', currentUserId, 'followRequests', requesterId));
        return true;
    } catch (error) {
        console.error("Error rejecting request:", error);
        throw error;
    }
};

/**
 * Get Incoming Follow Requests
 */
export const getFollowRequests = async (userId) => {
    try {
        const q = query(collection(db, 'users', userId, 'followRequests'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching requests:", error);
        return [];
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
 * Get list of followers with FRESH user data
 */
export const getFollowers = async (userId) => {
    try {
        const q = query(collection(db, 'users', userId, 'followers'), orderBy('followedAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return [];

        const followerIds = snapshot.docs.map(doc => doc.id);
        const followers = [];

        // Fetch fresh user data for each follower
        // Note: Firestore 'in' query supports max 10 items. For >10, we'd need multiple queries or individual fetches.
        // For simplicity in this iteration, we'll do individual fetches (or parallel).
        // A optimized production app might use 'in' batches. 

        const userPromises = followerIds.map(id => getDoc(doc(db, 'users', id)));
        const userSnapshots = await Promise.all(userPromises);

        userSnapshots.forEach(snap => {
            if (snap.exists()) {
                followers.push({ id: snap.id, ...snap.data() });
            }
        });

        return followers;
    } catch (error) {
        console.error("Error fetching followers:", error);
        return [];
    }
};

/**
 * Get list of following with FRESH user data
 */
export const getFollowing = async (userId) => {
    try {
        const q = query(collection(db, 'users', userId, 'following'), orderBy('followedAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return [];

        const followingIds = snapshot.docs.map(doc => doc.id);
        const following = [];

        const userPromises = followingIds.map(id => getDoc(doc(db, 'users', id)));
        const userSnapshots = await Promise.all(userPromises);

        userSnapshots.forEach(snap => {
            if (snap.exists()) {
                following.push({ id: snap.id, ...snap.data() });
            }
        });

        return following;
    } catch (error) {
        console.error("Error fetching following:", error);
        return [];
    }
};
