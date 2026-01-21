import { 
    db, 
    auth, 
    collection, 
    doc, 
    setDoc, 
    getDocs, 
    getDoc, 
    deleteDoc, 
    query, 
    where,
    signInAnonymously // Ensure this is imported if not already in config
} from "./firebase-config.js";

// --- SAVE CHARACTER ---
export async function performSave(silent = false) {
    if (!window.state) return;
    
    // 1. Ensure User is Authenticated
    let user = auth.currentUser;
    if (!user) {
        try {
            // Attempt auto-login if guest
            const cred = await signInAnonymously(auth);
            user = cred.user;
        } catch (e) {
            console.error("Auth failed during save:", e);
            window.showNotification("Save Failed: Not logged in.", "error");
            return;
        }
    }

    // 2. Validate Data
    const nameField = document.getElementById('save-name-input');
    const folderField = document.getElementById('save-folder-input');
    
    // If modal is not open, use existing meta or default
    let filename = window.state.meta?.filename || window.state.textFields['c-name'] || "Unnamed";
    let folder = window.state.meta?.folder || "";

    if (nameField && document.getElementById('save-modal').classList.contains('active')) {
        filename = nameField.value;
        folder = folderField.value;
    }
    
    if (!filename) {
        window.showNotification("Enter a character name.", "error");
        return;
    }

    // Update State Meta
    window.state.meta = {
        filename: filename,
        folder: folder,
        lastModified: new Date().toISOString(),
        version: "v20-1.1"
    };

    // 3. Prepare Data Payload
    const saveData = JSON.parse(JSON.stringify(window.state)); // Deep copy
    
    // Sanitize ID (remove illegal chars for Firestore Doc ID)
    const docId = filename.replace(/[^a-zA-Z0-9_-]/g, "_");

    try {
        // --- CRITICAL UPDATE: USER-SCOPED PATH ---
        // Path: /users/{uid}/characters/{docId}
        const userCharRef = doc(db, "users", user.uid, "characters", docId);
        
        await setDoc(userCharRef, saveData);
        
        if (!silent) {
            window.showNotification(`Saved "${filename}" successfully!`);
            document.getElementById('save-modal').classList.remove('active');
        }
        console.log("Save complete:", docId);

    } catch (e) {
        console.error("Firestore Save Error:", e);
        if (e.code === 'permission-denied') {
             window.showNotification("Save Failed: Permission Denied. Check Rules.", "error");
        } else {
             window.showNotification("Save Failed: " + e.message, "error");
        }
    }
}

// --- LOAD CHARACTER LIST ---
export async function handleLoadClick() {
    const modal = document.getElementById('load-modal');
    const list = document.getElementById('file-browser');
    
    if (!modal || !list) return;
    
    modal.classList.add('active');
    list.innerHTML = '<div class="text-center text-gray-500 italic mt-4"><i class="fas fa-circle-notch fa-spin"></i> Accessing Archives...</div>';

    let user = auth.currentUser;
    if (!user) {
         try {
            const cred = await signInAnonymously(auth);
            user = cred.user;
        } catch (e) {
            list.innerHTML = '<div class="text-red-500 text-center mt-4">Login required to access cloud saves.</div>';
            return;
        }
    }

    try {
        // --- CRITICAL UPDATE: USER-SCOPED QUERY ---
        // Path: /users/{uid}/characters
        const charsRef = collection(db, "users", user.uid, "characters");
        const snapshot = await getDocs(charsRef);
        
        if (snapshot.empty) {
            list.innerHTML = '<div class="text-center text-gray-500 italic mt-4">No characters found in your archive.</div>';
            return;
        }

        list.innerHTML = ''; // Clear loading
        
        // Group by Folder
        const folders = {};
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const meta = data.meta || {};
            const folderName = meta.folder || "Unsorted";
            
            if (!folders[folderName]) folders[folderName] = [];
            folders[folderName].push({ id: docSnap.id, ...data });
        });

        // Render List
        Object.keys(folders).sort().forEach(folder => {
            const folderDiv = document.createElement('div');
            folderDiv.className = "mb-2";
            
            const title = document.createElement('div');
            title.className = "text-[#d4af37] font-bold text-xs uppercase border-b border-[#333] mb-1 sticky top-0 bg-[#050505] py-1";
            title.innerHTML = `<i class="fas fa-folder mr-1"></i> ${folder}`;
            folderDiv.appendChild(title);
            
            folders[folder].forEach(char => {
                const item = document.createElement('div');
                item.className = "flex justify-between items-center p-2 hover:bg-[#222] rounded cursor-pointer group transition-colors text-xs";
                
                const charName = char.meta?.filename || char.textFields?.['c-name'] || char.id;
                const clan = char.textFields?.['c-clan'] || "Unknown";
                const date = char.meta?.lastModified ? new Date(char.meta.lastModified).toLocaleDateString() : "";

                item.innerHTML = `
                    <div class="flex-1" onclick="window.loadCharacter('${char.id}')">
                        <div class="font-bold text-white">${charName}</div>
                        <div class="text-[10px] text-gray-500">${clan} | ${date}</div>
                    </div>
                    <button class="text-red-900 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2" onclick="window.deleteCharacter('${char.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                folderDiv.appendChild(item);
            });
            
            list.appendChild(folderDiv);
        });

    } catch (e) {
        console.error("Load List Error:", e);
        list.innerHTML = `<div class="text-red-500 text-center mt-4">Error loading list: ${e.message}</div>`;
    }
}

// --- LOAD SINGLE CHARACTER ---
window.loadCharacter = async function(docId) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const docRef = doc(db, "users", user.uid, "characters", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            if (confirm(`Load "${data.meta?.filename || docId}"? Unsaved changes will be lost.`)) {
                window.state = data;
                
                // Legacy Patching
                if (!window.state.rituals) window.state.rituals = [];
                if (!window.state.retainers) window.state.retainers = [];

                if (window.fullRefresh) window.fullRefresh();
                
                document.getElementById('load-modal').classList.remove('active');
                window.showNotification("Character Loaded.");
            }
        } else {
            window.showNotification("Character not found!", "error");
        }
    } catch (e) {
        console.error("Load Char Error:", e);
        window.showNotification("Load Failed: " + e.message, "error");
    }
};

// --- DELETE CHARACTER ---
window.deleteCharacter = async function(docId) {
    const user = auth.currentUser;
    if (!user) return;

    if (confirm("Are you sure you want to PERMANENTLY delete this character?")) {
        try {
            const docRef = doc(db, "users", user.uid, "characters", docId);
            await deleteDoc(docRef);
            
            // Refresh List
            handleLoadClick();
            window.showNotification("Character Deleted.");
        } catch (e) {
            console.error("Delete Error:", e);
            window.showNotification("Delete Failed: " + e.message, "error");
        }
    }
};

// --- HANDLE NEW ---
export function handleNew() {
    if (confirm("Create New Character? Unsaved progress will be lost.")) {
        window.location.reload();
    }
}

// --- HANDLE SAVE BUTTON CLICK (TRIGGER MODAL) ---
export function handleSaveClick() {
    const modal = document.getElementById('save-modal');
    if (modal) {
        modal.classList.add('active');
        
        // Pre-fill
        const nameInput = document.getElementById('save-name-input');
        const folderInput = document.getElementById('save-folder-input');
        
        if (nameInput) nameInput.value = window.state.meta?.filename || window.state.textFields['c-name'] || "";
        if (folderInput) folderInput.value = window.state.meta?.folder || "";
    }
}
