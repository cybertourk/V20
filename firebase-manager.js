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
    appId // Import the App ID
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
    
    if(nameIn) {
        if(window.state.meta.filename) nameIn.value = window.state.meta.filename;
        else nameIn.value = document.getElementById('c-name')?.value || "Unnamed Vampire";
    }
    if(folderIn && window.state.meta.folder) folderIn.value = window.state.meta.folder;
    
    const modal = document.getElementById('save-modal');
    if(modal) modal.classList.add('active');
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

// --- MIGRATION TOOL ---
window.migrateOldData = async function(oldCollectionName = "characters") {
    const user = auth.currentUser;
    if (!user) return alert("Please log in/wait for auth first.");

    if (!confirm(`Attempt to migrate data from root '${oldCollectionName}' to your secure folder?`)) return;

    try {
        const list = document.getElementById('file-browser');
        if(list) list.innerHTML = '<div class="text-center text-gold italic mt-4">Migrating data... please wait...</div>';

        console.log(`Scanning old collection: ${oldCollectionName}...`);
        
        // 1. Read from OLD root collection
        const oldRef = collection(db, oldCollectionName);
        const snapshot = await getDocs(oldRef);

        if (snapshot.empty) {
            alert(`No files found in root '${oldCollectionName}'. Your files might already be in the correct folder.`);
            if(list) renderFileBrowser(user); 
            return;
        }

        let count = 0;
        const batchPromises = [];
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const safeId = docSnap.id;
            
            if (!data.meta) data.meta = {};
            data.meta.uid = user.uid;
            data.meta.migrated = new Date().toISOString();

            // Save to NEW Artifact path
            const newRef = doc(db, 'artifacts', appId, 'users', user.uid, 'characters', safeId);
            batchPromises.push(setDoc(newRef, data));
            count++;
        });

        await Promise.all(batchPromises);

        alert(`Success! Migrated ${count} characters. Reloading list...`);
        await renderFileBrowser(user);
        
    } catch (e) {
        console.error("Migration Error:", e);
        alert("Migration Failed: " + e.message);
        if(document.getElementById('file-browser')) renderFileBrowser(user);
    }
};

// --- CORE OPERATIONS ---

export async function performSave() {
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

    const nameIn = document.getElementById('save-name-input');
    const folderIn = document.getElementById('save-folder-input');
    
    let rawName = nameIn ? nameIn.value.trim() : "Unnamed";
    let folder = folderIn ? folderIn.value.trim() : "Unsorted";
    
    if(!rawName) return notify("Filename required", "error");
    const safeId = rawName.replace(/[^a-zA-Z0-9 _-]/g, "");
    
    if (!window.state.meta) window.state.meta = {};
    window.state.meta.filename = safeId;
    window.state.meta.folder = folder;
    window.state.meta.lastModified = new Date().toISOString();
    window.state.meta.uid = user.uid;
    
    try {
        // CORRECT PATH: artifacts/{appId}/users/{uid}/characters/{docId}
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'characters', safeId);
        
        const dataToSave = JSON.parse(JSON.stringify(window.state));
        
        await setDoc(docRef, dataToSave);
        
        notify("Character Inscribed.");
        const modal = document.getElementById('save-modal');
        if(modal) modal.classList.remove('active');
        
        const dl = document.getElementById('folder-datalist');
        if(dl && folder && !Array.from(dl.options).some(o => o.value === folder)) {
            const opt = document.createElement('option');
            opt.value = folder;
            dl.appendChild(opt);
        }
    } catch (e) { 
        console.error("Save Error:", e); 
        notify("Save Failed: " + e.message, "error");
    }
}

export async function deleteCharacter(id, name, event) {
    if(event) event.stopPropagation();
    if(!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
        // CORRECT PATH
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'characters', id);
        await deleteDoc(docRef);
        notify("Deleted.");
        await renderFileBrowser(user);
    } catch (e) {
        console.error("Delete Error:", e);
        notify("Delete Failed.", "error");
    }
}

// --- BROWSER UI ---

export async function renderFileBrowser(user) {
    const browser = document.getElementById('file-browser');
    
    // 1. Render Structure first to ensure Button exists even on error
    browser.innerHTML = '';
    
    const migrateHeader = document.createElement('div');
    migrateHeader.className = "p-2 bg-red-900/20 border-b border-red-900/50 mb-2 text-center";
    migrateHeader.innerHTML = `
        <div class="text-[10px] text-red-300 mb-1">Missing old files?</div>
        <button class="bg-red-900 hover:bg-red-800 text-white text-xs font-bold px-3 py-1 rounded" onclick="window.migrateOldData('characters')">
            <i class="fas fa-sync mr-1"></i> Check Legacy Storage
        </button>
    `;
    browser.appendChild(migrateHeader);

    const listContainer = document.createElement('div');
    browser.appendChild(listContainer);

    try {
        // Path: query artifacts/{appId}/users/{uid}/characters
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'characters'));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            listContainer.innerHTML = '<div class="text-center text-gray-500 italic mt-4 text-xs">No secure archives found.</div>';
            return;
        }

        const structure = {};
        snap.forEach(d => {
            const data = d.data();
            const f = data.meta?.folder || "Unsorted";
            if(!structure[f]) structure[f] = [];
            structure[f].push({ id: d.id, ...data });
        });
        
        const folders = Object.keys(structure).sort((a,b) => a === "Unsorted" ? 1 : b === "Unsorted" ? -1 : a.localeCompare(b));
        const dl = document.getElementById('folder-datalist');
        if(dl) dl.innerHTML = ''; 
        
        folders.forEach(f => {
            if(dl) { const opt = document.createElement('option'); opt.value = f; dl.appendChild(opt); }
            const header = document.createElement('div');
            header.className = "text-[#d4af37] font-bold text-xs uppercase border-b border-[#333] mb-1 sticky top-0 bg-[#050505] py-1 mt-2";
            header.innerHTML = `<i class="fas fa-folder mr-2"></i> ${f}`;
            listContainer.appendChild(header);
            
            structure[f].forEach(char => {
                const row = document.createElement('div');
                row.className = "flex justify-between items-center p-2 hover:bg-[#222] rounded cursor-pointer group transition-colors text-xs border-b border-[#111]";
                const date = char.meta?.lastModified ? new Date(char.meta.lastModified).toLocaleDateString() : "";
                const charName = char.meta?.filename || char.textFields?.['c-name'] || char.id;
                const clanName = char.textFields?.['c-clan'] || 'Unknown Clan';
                const natureName = char.textFields?.['c-nature'] || 'Unknown Nature';

                row.innerHTML = `
                    <div class="flex-1">
                        <div class="font-bold text-white">${charName}</div>
                        <div class="text-[10px] text-gray-500">${clanName} • ${natureName}</div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="text-[10px] text-gray-600">${date}</div>
                        <button class="file-delete-btn text-red-900 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                const deleteBtn = row.querySelector('.file-delete-btn');
                deleteBtn.onclick = (e) => deleteCharacter(char.id, charName, e);
                row.onclick = async (e) => {
                    if(e.target.closest('.file-delete-btn')) return;
                    await loadSelectedChar(char);
                };
                listContainer.appendChild(row);
            });
        });
        
    } catch (e) {
        console.error("Browser Error:", e);
        listContainer.innerHTML = `<div class="text-red-500 text-center mt-10">Archive Error: ${e.message}<br><span class="text-gray-500 text-[10px]">Check Firestore Rules.</span></div>`;
    }
}

export async function loadSelectedChar(data) {
    if (!data) return;
    if(!confirm(`Recall ${data.meta?.filename || "Character"}? Unsaved progress will be lost.`)) return;
    
    window.state = JSON.parse(JSON.stringify(data));
    
    if(!window.state.meta) window.state.meta = { filename: data.id || "Loaded Character", folder: "" };
    if(!window.state.specialties) window.state.specialties = {}; 
    if(!window.state.rituals) window.state.rituals = [];
    if(!window.state.retainers) window.state.retainers = [];
    if (!window.state.furthestPhase) window.state.furthestPhase = 1;
    
    if (window.state.status) {
        if (window.state.status.tempWillpower === undefined) {
            window.state.status.tempWillpower = window.state.status.willpower || 5;
        }
        if (window.state.status.health_states === undefined || !Array.isArray(window.state.status.health_states)) {
            const oldDamage = window.state.status.health || 0;
            window.state.status.health_states = [0,0,0,0,0,0,0];
            for(let i=0; i<oldDamage && i<7; i++) window.state.status.health_states[i] = 2; 
        }
    } else {
        window.state.status = { humanity: 7, willpower: 5, tempWillpower: 5, health_states: [0,0,0,0,0,0,0], blood: 10 };
    }
    
    if (window.fullRefresh) window.fullRefresh();
    else window.location.reload();
    
    const modal = document.getElementById('load-modal');
    if(modal) modal.classList.remove('active');
    notify("Character Recalled.");
}
