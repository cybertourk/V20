import { 
    auth, 
    db, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    collection, 
    query, 
    deleteDoc,
    signInAnonymously,
    where,
    appId 
} from "./firebase-config.js";

// Helper for UI notifications
function notify(msg, type='info') {
    if (window.showNotification) window.showNotification(msg, type);
    else console.log("Notify:", msg);
}

// Helper to sync text fields before saving
function syncInputs() {
    if (!window.state) return;
    if (!window.state.textFields) window.state.textFields = {};
    
    document.querySelectorAll('input:not([type="checkbox"]), select, textarea').forEach(el => {
        // Skip ephemeral UI inputs
        if (el.id && !el.id.startsWith('inv-') && !el.id.startsWith('merit-') && !el.id.startsWith('flaw-') && !el.id.startsWith('save-') && !el.closest('.combat-row') && !el.classList.contains('specialty-input')) {
            window.state.textFields[el.id] = el.value;
        }
    });
}

// --- LOCAL UI STATE FOR LOAD MENU ---
let loadMenuState = {
    characters: [],
    folders: [], // New: Store persistent folders
    sort: 'date', // 'date' or 'alpha'
    expandedFolders: {}
};

// --- MAIN ACTIONS ---

export function handleNew() {
    if(!confirm("Create new character? Unsaved changes will be lost.")) return;
    window.location.reload(); 
}

export function handleSaveClick() {
    if (!window.state) window.state = { meta: { filename: "", folder: "" }, textFields: {} };
    syncInputs();
    if (!window.state.meta) window.state.meta = { filename: "", folder: "" };
    
    const nameIn = document.getElementById('save-name-input');
    const folderIn = document.getElementById('save-folder-input');
    
    // Pre-populate modal with current state
    if(nameIn) {
        if(window.state.meta.filename) nameIn.value = window.state.meta.filename;
        else nameIn.value = document.getElementById('c-name')?.value || "Unnamed Vampire";
    }
    if(folderIn && window.state.meta.folder) folderIn.value = window.state.meta.folder;
    
    const modal = document.getElementById('save-modal');
    if(modal) modal.classList.add('active');
    
    // Populate Folder Datalist (and fetch persistent folders)
    populateFolderList();
}

async function populateFolderList() {
    if (!auth.currentUser) return;
    const list = document.getElementById('folder-datalist');
    if (!list) return;
    list.innerHTML = '';
    
    try {
        const user = auth.currentUser;
        const folders = new Set();

        // 1. Fetch persistent folders
        const folderSnap = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'folders'));
        folderSnap.forEach(doc => folders.add(doc.id));

        // 2. Fetch existing character folders (for backward compatibility)
        const charSnap = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'characters'));
        charSnap.forEach(doc => {
            const data = doc.data();
            if (data.meta && data.meta.folder) folders.add(data.meta.folder);
        });
        
        folders.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            list.appendChild(opt);
        });
    } catch (e) {
        console.warn("Could not fetch folders", e);
    }
}

// NEW: Function to explicitly create a persistent folder
export async function createPersistentFolder(folderName) {
    if (!folderName || !auth.currentUser) return;
    try {
        const folderRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'folders', folderName);
        await setDoc(folderRef, { created: new Date().toISOString() });
        console.log(`Folder '${folderName}' created/persisted.`);
    } catch (e) {
        console.error("Error creating folder:", e);
    }
}

// NEW: Delete empty folder manually
export async function deletePersistentFolder(folderName) {
    if (!folderName || !auth.currentUser) return;
    if(!confirm(`Delete folder '${folderName}'? (Only empty folders can be removed)`)) return;
    try {
        const folderRef = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'folders', folderName);
        await deleteDoc(folderRef);
        await renderFileBrowser(auth.currentUser); // Refresh view
        notify("Folder deleted.");
    } catch (e) {
        console.error("Error deleting folder:", e);
        notify("Failed to delete folder.", "error");
    }
}

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

    await renderFileBrowser(user);
}

// --- CORE OPERATIONS ---

export async function performSave(silent = false) {
    let user = auth.currentUser;
    if (!user) {
        try {
            const cred = await signInAnonymously(auth);
            user = cred.user;
        } catch (e) {
            notify("Login Required to Save", "error");
            return;
        }
    }

    // Ensure inputs are synced before constructing save data
    syncInputs();

    let rawName, folder;
    const modal = document.getElementById('save-modal');
    const isManualSave = modal && modal.classList.contains('active');

    if (isManualSave) {
        rawName = document.getElementById('save-name-input')?.value.trim();
        folder = document.getElementById('save-folder-input')?.value.trim();
    } else {
        rawName = window.state.meta.filename || window.state.textFields['c-name'] || "Unnamed Vampire";
        folder = window.state.meta.folder || "";
    }
    
    if(!rawName) {
        rawName = "Unnamed Vampire";
    }
    
    // Create Safe ID
    const safeId = rawName.replace(/[^a-zA-Z0-9 _-]/g, "");
    
    if (!window.state.meta) window.state.meta = {};
    window.state.meta.filename = rawName; 
    window.state.meta.folder = folder;
    window.state.meta.lastModified = new Date().toISOString();
    window.state.meta.uid = user.uid;
    
    try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'characters', safeId);
        
        // --- ROLLBACK / BACKUP LOGIC (NEW) ---
        // Before overwriting, check if file exists. If so, copy to backups collection.
        // Only do this on manual saves to avoid spamming backups on auto-save
        if (isManualSave) {
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const oldData = snap.data();
                const backupId = `${safeId}_bak_${Date.now()}`;
                const backupRef = doc(db, 'artifacts', appId, 'users', user.uid, 'backups', backupId);
                // Fire and forget backup to not slow down main save too much
                setDoc(backupRef, oldData).catch(e => console.warn("Backup failed", e));
            }
        }

        // --- PERSIST FOLDER ---
        if (folder) {
            createPersistentFolder(folder);
        }

        const dataToSave = JSON.parse(JSON.stringify(window.state));
        
        // Size Check
        const jsonStr = JSON.stringify(dataToSave);
        const sizeInMB = new Blob([jsonStr]).size / (1024 * 1024);
        
        if (sizeInMB > 0.95) {
            console.warn(`Save file size: ${sizeInMB.toFixed(2)} MB`);
            notify("Warning: File size near limit (Images). Save might fail.", "warning");
        }

        await setDoc(docRef, dataToSave);
        
        if (isManualSave) {
            notify("Character Inscribed.");
            modal.classList.remove('active');
        } else if (!silent) {
            // Optional: notify("Auto-saved");
        }
        
        const dl = document.getElementById('folder-datalist');
        if(dl && folder && !Array.from(dl.options).some(o => o.value === folder)) {
            const opt = document.createElement('option');
            opt.value = folder;
            dl.appendChild(opt);
        }
        
        if(document.getElementById('load-modal').classList.contains('active')) {
            await renderFileBrowser(user);
        }

    } catch (e) { 
        console.error("Save Error:", e); 
        if (e.code === 'resource-exhausted' || e.message.includes("exceeds the maximum allowed size")) {
            notify("Save Failed: File too large (Max 1MB). Try removing images.", "error");
        } else {
            notify("Save Failed: " + e.message, "error");
        }
    }
}

export async function deleteCharacter(id, name, event) {
    if(event) event.stopPropagation();
    if(!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'characters', id);
        await deleteDoc(docRef);
        notify("Deleted.");
        await renderFileBrowser(user);
    } catch (e) {
        console.error("Delete Error:", e);
        notify("Delete Failed.", "error");
    }
}

// --- BROWSER UI (UPDATED FOR PERSISTENT FOLDERS) ---

export async function renderFileBrowser(user) {
    const browser = document.getElementById('file-browser');
    
    try {
        // 1. Fetch Characters
        const qChar = query(collection(db, 'artifacts', appId, 'users', user.uid, 'characters'));
        const snapChar = await getDocs(qChar);
        loadMenuState.characters = [];
        snapChar.forEach(d => {
            loadMenuState.characters.push({ id: d.id, ...d.data() });
        });

        // 2. Fetch Persistent Folders
        const qFolder = query(collection(db, 'artifacts', appId, 'users', user.uid, 'folders'));
        const snapFolder = await getDocs(qFolder);
        loadMenuState.folders = [];
        snapFolder.forEach(d => loadMenuState.folders.push(d.id));

        renderLoadMenuUI();
        
    } catch (e) {
        console.error("Browser Error:", e);
        browser.innerHTML = `<div class="text-red-500 text-center mt-10">Archive Error: ${e.message}<br><span class="text-gray-500 text-[10px]">Check Firestore Rules.</span></div>`;
    }
}

function renderLoadMenuUI() {
    const browser = document.getElementById('file-browser');
    if (!browser) return;
    browser.innerHTML = '';

    // 1. Controls Header
    const controls = document.createElement('div');
    controls.className = "flex justify-between items-center mb-3 px-1 border-b border-[#333] pb-2";
    
    const sortHtml = `
        <div class="flex gap-2 text-[10px] uppercase font-bold text-gray-500">
            <span>Sort:</span>
            <button class="${loadMenuState.sort === 'alpha' ? 'text-gold' : 'hover:text-gray-300'}" onclick="window.setLoadSort('alpha')">A-Z</button>
            <span>|</span>
            <button class="${loadMenuState.sort === 'date' ? 'text-gold' : 'hover:text-gray-300'}" onclick="window.setLoadSort('date')">Recent</button>
        </div>
    `;
    const refreshHtml = `<button class="text-gray-500 hover:text-white" title="Refresh" onclick="window.handleLoadClick()"><i class="fas fa-sync"></i></button>`;
    
    controls.innerHTML = sortHtml + refreshHtml;
    browser.appendChild(controls);

    // 2. Merge Folders (Persistent + Implicit from characters)
    const structure = {};
    const allFolderNames = new Set(loadMenuState.folders);
    
    loadMenuState.characters.forEach(char => {
        const f = char.meta?.folder || "Unsorted";
        if (f !== "Unsorted") allFolderNames.add(f);
        if(!structure[f]) structure[f] = [];
        structure[f].push(char);
    });

    // Ensure empty persistent folders exist in structure
    allFolderNames.forEach(fName => {
        if (!structure[fName]) structure[fName] = [];
    });

    // Sort Folders
    const getFolderDate = (folderItems) => {
        if (!folderItems || folderItems.length === 0) return 0;
        return Math.max(...folderItems.map(i => i.meta?.lastModified ? new Date(i.meta.lastModified).getTime() : 0));
    };

    const folders = Object.keys(structure).sort((a,b) => {
        if (a === "Unsorted") return 1;
        if (b === "Unsorted") return -1;
        if (loadMenuState.sort === 'date') {
            const dateA = getFolderDate(structure[a]);
            const dateB = getFolderDate(structure[b]);
            // If dates match (e.g. both empty/0), fall back to alpha
            if (dateA === dateB) return a.localeCompare(b);
            return dateB - dateA; 
        } else {
            return a.localeCompare(b);
        }
    });

    // 3. Render Folders
    folders.forEach(f => {
        const items = structure[f].sort((a,b) => {
            if (loadMenuState.sort === 'date') {
                const da = a.meta?.lastModified ? new Date(a.meta.lastModified) : new Date(0);
                const db = b.meta?.lastModified ? new Date(b.meta.lastModified) : new Date(0);
                return db - da; 
            } else {
                const na = a.meta?.filename || a.textFields?.['c-name'] || "Unknown";
                const nb = b.meta?.filename || b.textFields?.['c-name'] || "Unknown";
                return na.localeCompare(nb);
            }
        });

        const folderDiv = document.createElement('div');
        folderDiv.className = "mb-2";
        
        const isOpen = loadMenuState.expandedFolders[f];
        const isEmpty = items.length === 0;
        
        // Folder Header
        const header = document.createElement('div');
        header.className = `flex items-center gap-2 p-2 rounded cursor-pointer transition-colors select-none ${isOpen ? 'bg-[#222] border-gold border text-white' : 'bg-[#111] border border-[#333] text-gray-400 hover:border-gray-500'}`;
        
        let folderIcon = isOpen ? 'fa-folder-open' : 'fa-folder';
        if (f === "Unsorted") folderIcon = 'fa-box-archive';
        
        // Delete button for empty folders
        const delBtnHtml = (isEmpty && f !== "Unsorted") 
            ? `<button class="text-gray-600 hover:text-red-500 ml-auto px-2" title="Delete Folder" onclick="event.stopPropagation(); window.deletePersistentFolder('${f}')"><i class="fas fa-trash-alt text-[10px]"></i></button>`
            : `<i class="fas fa-chevron-${isOpen ? 'down' : 'right'} text-[10px] ml-auto"></i>`;

        header.innerHTML = `
            <i class="fas ${folderIcon} ${isOpen ? 'text-gold' : ''}"></i>
            <span class="text-xs font-bold truncate max-w-[200px]">${f}</span>
            <span class="text-[9px] bg-black/50 px-1.5 py-0.5 rounded text-gray-500">${items.length}</span>
            ${delBtnHtml}
        `;
        
        header.onclick = () => {
            loadMenuState.expandedFolders[f] = !isOpen;
            renderLoadMenuUI();
        };
        folderDiv.appendChild(header);

        if (isOpen) {
            const listDiv = document.createElement('div');
            listDiv.className = "ml-3 pl-2 border-l border-[#333] mt-1 space-y-1 bg-[#0a0a0a] py-1";
            
            if (isEmpty) {
                listDiv.innerHTML = `<div class="text-[10px] text-gray-600 italic px-2">Empty Folder</div>`;
            } else {
                items.forEach(char => {
                    const row = document.createElement('div');
                    row.className = "flex justify-between items-center p-2 hover:bg-[#222] rounded cursor-pointer group transition-colors text-xs";
                    
                    const date = char.meta?.lastModified ? new Date(char.meta.lastModified).toLocaleDateString() : "";
                    const charName = char.meta?.filename || char.textFields?.['c-name'] || char.id;
                    const clan = char.textFields?.['c-clan'] || "Unknown";

                    row.innerHTML = `
                        <div class="flex-1 overflow-hidden" onclick="window.loadSelectedCharFromId('${char.id}')">
                            <div class="font-bold text-gray-200 group-hover:text-white truncate">${charName}</div>
                            <div class="text-[10px] text-gray-600 group-hover:text-gray-500 truncate">${clan} • ${date}</div>
                        </div>
                        <button class="text-red-900 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2" onclick="window.deleteCharacter('${char.id}', '${charName.replace(/'/g, "\\'")}', event)" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                    listDiv.appendChild(row);
                });
            }
            folderDiv.appendChild(listDiv);
        }
        
        browser.appendChild(folderDiv);
    });
}

// --- GLOBAL HELPERS FOR HTML EVENTS ---
window.setLoadSort = (mode) => {
    loadMenuState.sort = mode;
    renderLoadMenuUI();
};

window.loadSelectedCharFromId = (id) => {
    const char = loadMenuState.characters.find(c => c.id === id);
    if(char) loadSelectedChar(char);
}

// NEW: Global bind for deleting folders
window.deletePersistentFolder = deletePersistentFolder;

// --- MIGRATION TOOL ---
window.migrateOldData = async function(oldCollectionName = "characters") {
    const user = auth.currentUser;
    if (!user) return alert("Please log in.");
    if (!confirm(`Migrate from '${oldCollectionName}'?`)) return;
    try {
        console.log(`Scanning...`);
        const oldRef = collection(db, oldCollectionName);
        const snapshot = await getDocs(oldRef);
        if (snapshot.empty) return alert(`No files in '${oldCollectionName}'.`);
        let count = 0;
        const batchPromises = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (!data.meta) data.meta = {};
            data.meta.uid = user.uid;
            data.meta.migrated = new Date().toISOString();
            const newRef = doc(db, 'artifacts', appId, 'users', user.uid, 'characters', docSnap.id);
            batchPromises.push(setDoc(newRef, data));
            count++;
        });
        await Promise.all(batchPromises);
        alert(`Migrated ${count} files.`);
        await renderFileBrowser(user);
    } catch (e) {
        alert("Migration Failed: " + e.message);
    }
};

export async function loadSelectedChar(data) {
    if (!data) return;
    if(!confirm(`Recall ${data.meta?.filename || "Character"}? Unsaved progress will be lost.`)) return;
    
    // Deep Clone
    window.state = JSON.parse(JSON.stringify(data));
    
    // --- BACKWARD COMPATIBILITY INITIALIZATION ---
    if(!window.state.meta) window.state.meta = { filename: data.id || "Loaded Character", folder: "" };
    if(!window.state.specialties) window.state.specialties = {}; 
    if(!window.state.rituals) window.state.rituals = [];
    if(!window.state.retainers) window.state.retainers = [];
    
    if(!window.state.codex) window.state.codex = [];
    if(!window.state.sessionLogs) window.state.sessionLogs = [];
    if(!window.state.characterImage) window.state.characterImage = null;
    if(!window.state.beastTraits) window.state.beastTraits = []; 

    if (!window.state.furthestPhase) window.state.furthestPhase = 1;
    
    if (window.state.status) {
        if (window.state.status.tempWillpower === undefined) window.state.status.tempWillpower = window.state.status.willpower || 5;
        if (window.state.status.health_states === undefined || !Array.isArray(window.state.status.health_states)) {
            const oldDamage = window.state.status.health || 0;
            window.state.status.health_states = [0,0,0,0,0,0,0];
            for(let i=0; i<oldDamage && i<7; i++) window.state.status.health_states[i] = 2; 
        }
    } else {
        window.state.status = { humanity: 7, willpower: 5, tempWillpower: 5, health_states: [0,0,0,0,0,0,0], blood: 10 };
    }
    
    // Force Refresh
    if (window.fullRefresh) window.fullRefresh();
    else window.location.reload();
    
    const modal = document.getElementById('load-modal');
    if(modal) modal.classList.remove('active');
    notify("Character Recalled.");
}
