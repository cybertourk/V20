import { db, auth, collection, doc, setDoc, getDocs, getDoc, deleteDoc, query } from './firebase-config.js';

/**
 * Saves the current character data to Firestore.
 * @param {Object} characterData - The full character JSON object.
 * @returns {Promise<boolean>} - True if successful.
 */
export async function saveCharacter(characterData) {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to save.");
        return false;
    }
    
    // Determine a filename/ID
    const charName = characterData.name || "Unnamed Vampire";
    // Sanitize filename: replace non-alphanumeric chars with underscore, lowercase
    let filename = characterData.filename; 
    if (!filename) {
        filename = charName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        // Add a timestamp if it's new to avoid overwrites? 
        // For simplicity in this app, we stick to the name-based ID or existing ID.
        if (!filename || filename === '_') filename = `vampire_${Date.now()}`;
    }
    
    // Save metadata alongside the sheet
    const saveObject = {
        ...characterData,
        filename: filename,
        lastModified: new Date().toISOString(),
        uid: user.uid,
        ownerEmail: user.email
    };

    try {
        // Path: users/{uid}/characters/{filename}
        const charRef = doc(db, 'users', user.uid, 'characters', filename);
        await setDoc(charRef, saveObject);
        console.log(`Character '${filename}' saved successfully.`);
        return true;
    } catch (e) {
        console.error("Error saving document: ", e);
        alert("Error saving character: " + e.message);
        return false;
    }
}

/**
 * Retrieves a list of characters for the current user.
 * @returns {Promise<Array>} - Array of character summary objects.
 */
export async function getCharacterList() {
    const user = auth.currentUser;
    if (!user) return [];

    const charsRef = collection(db, 'users', user.uid, 'characters');
    try {
        const q = query(charsRef);
        const querySnapshot = await getDocs(q);
        const list = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
                id: docSnap.id,
                name: data.name || "Unnamed",
                clan: data.clan || "Unknown",
                generation: data.generation || 13,
                concept: data.concept || "",
                lastModified: data.lastModified
            });
        });
        return list;
    } catch (e) {
        console.error("Error getting character list: ", e);
        return [];
    }
}

/**
 * Loads a specific character by ID.
 * @param {string} charId - The document ID (filename).
 * @returns {Promise<Object|null>} - The character data or null.
 */
export async function loadCharacter(charId) {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const charRef = doc(db, 'users', user.uid, 'characters', charId);
        const docSnap = await getDoc(charRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (e) {
        console.error("Error loading character: ", e);
        alert("Failed to load character.");
        return null;
    }
}

/**
 * Deletes a character.
 * @param {string} charId 
 */
export async function deleteCharacter(charId) {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'characters', charId));
        return true;
    } catch (e) {
        console.error("Error deleting character: ", e);
        return false;
    }
}
