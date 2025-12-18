import { db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateDailyPlantFact } from './gemini';

const COLLECTION_NAME = 'daily_posts';

export const getDailyPost = async () => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const docRef = doc(db, COLLECTION_NAME, today);

    try {
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            // Check if we already have a generated post for today in local storage? 
            // Better to just generate and save to Firestore so everyone sees the same one (race condition is acceptable/rare for low traffic)
            const newFact = await generateDailyPlantFact('tr'); // Default to TR for now as per user language

            const postData = {
                ...newFact,
                date: today,
                createdAt: serverTimestamp(),
                likes: 0,
                views: 0
            };

            await setDoc(docRef, postData);
            return postData;
        }
    } catch (error) {
        console.error("Error fetching/creating daily post:", error);
        return null;
    }
};
