import { auth, db, appId, doc, setDoc, getDocs, collection, query, deleteDoc } from "./firebase-config.js";
import { V20_MERITS_LIST, V20_FLAWS_LIST, ATTRIBUTES, ABILITIES, VIRTUES, DISCIPLINES, BACKGROUNDS } from "./data.js";

// Helper for UI notifications
function notify(msg) {
    if (window.showNotification) window.showNotification(msg);
    else console.log("Notify:", msg);
}

// Helper to sync text fields before saving
function syncInputs() {
    if (!window.state) return;
    document.querySelectorAll('input:not([type="checkbox"]), select, textarea').forEach(el => {
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
    const user = auth.currentUser;
    if(!user) return notify("Login Required");
    syncInputs();
    
    // Pre-fill inputs if existing
    const nameIn = document.getElementById('save-name-input');
    const folderIn = document.getElementById('save-folder-input');
    
    if(window.state.meta.filename) nameIn.value = window.state.meta.filename;
    else nameIn.value = document.getElementById('c-name').value || "Unnamed Vampire";
    
    if(window.state.meta.folder) folderIn.value = window.state.meta.folder;
    
    document.getElementById('save-modal').classList.add('active');
}

export function handleLoadClick() {
    const user = auth.currentUser;
    if(!user) return notify("Login Required");
    document.getElementById('load-modal').classList.add('active');
    renderFileBrowser(user);
}

export async function performSave() {
    const user = auth.currentUser;
    if (!user) return notify("Login Required");

    const nameIn = document.getElementById('save-name-input');
    const folderIn = document.getElementById('save-folder-input');
    
    let rawName = nameIn.value.trim();
    let folder = folderIn.value.trim() || "Unsorted";
    
    if(!rawName) return notify("Filename required");
    
    // Sanitize ID
    const safeId = rawName.replace(/[^a-zA-Z0-9 _-]/g, "");
    
    window.state.meta.filename = safeId;
    window.state.meta.folder = folder;
    
    try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'characters', safeId);
        await setDoc(docRef, { 
            ...window.state, 
            lastSaved: Date.now() 
        });
        notify("Inscribed.");
        document.getElementById('save-modal').classList.remove('active');
        
        // Update Datalist
        const dl = document.getElementById('folder-datalist');
        if(dl && !Array.from(dl.options).some(o => o.value === folder)) {
            const opt = document.createElement('option');
            opt.value = folder;
            dl.appendChild(opt);
        }
    } catch (e) { 
        notify("Save Error."); 
        console.error(e); 
    }
}

export async function deleteCharacter(id, name, event) {
    if(event) event.stopPropagation();
    if(!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    
    const user = auth.currentUser;
    if (!user) return;

    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'characters', id));
        notify("Deleted.");
        await renderFileBrowser(user); // Refresh list
    } catch (e) {
        console.error("Delete Error:", e);
        notify("Delete Failed.");
    }
}

// --- BROWSER UI ---

export async function renderFileBrowser(user) {
    const browser = document.getElementById('file-browser');
    browser.innerHTML = '<div class="text-center text-gray-500 italic mt-10">Consulting Archives...</div>';
    
    try {
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'characters'));
        const snap = await getDocs(q);
        
        const structure = {};
        
        snap.forEach(d => {
            const data = d.data();
            const f = data.meta?.folder || "Unsorted";
            if(!structure[f]) structure[f] = [];
            structure[f].push({ id: d.id, ...data });
        });
        
        browser.innerHTML = '';
        
        // Sort folders (Unsorted last)
        const folders = Object.keys(structure).sort((a,b) => a === "Unsorted" ? 1 : b === "Unsorted" ? -1 : a.localeCompare(b));
        
        const dl = document.getElementById('folder-datalist');
        if(dl) dl.innerHTML = ''; // Reset datalist
        
        folders.forEach(f => {
            if(dl) { const opt = document.createElement('option'); opt.value = f; dl.appendChild(opt); }
            
            const header = document.createElement('div');
            header.className = 'folder-header';
            header.innerHTML = `<i class="fas fa-folder mr-2"></i> ${f}`;
            browser.appendChild(header);
            
            structure[f].forEach(char => {
                const row = document.createElement('div');
                row.className = 'file-row';
                const date = new Date(char.lastSaved || Date.now()).toLocaleDateString();
                row.innerHTML = `
                    <div class="flex-1">
                        <div class="file-info text-white">${char.meta?.filename || char.id}</div>
                        <div class="file-meta">${char.textFields['c-clan'] || 'Unknown Clan'} • ${char.textFields['c-nature'] || 'Unknown Nature'}</div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="file-meta">${date}</div>
                        <button class="file-delete-btn" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                // Attach Event Listeners manually to avoid HTML string issues
                const deleteBtn = row.querySelector('.file-delete-btn');
                deleteBtn.onclick = (e) => deleteCharacter(char.id, char.meta?.filename || char.id, e);
                
                row.onclick = async (e) => {
                    if(e.target.closest('.file-delete-btn')) return;
                    await loadSelectedChar(char);
                };
                
                browser.appendChild(row);
            });
        });
        
        if(folders.length === 0) browser.innerHTML = '<div class="text-center text-gray-500 italic mt-10">No Archives Found.</div>';
        
    } catch (e) {
        console.error(e);
        browser.innerHTML = '<div class="text-red-500 text-center mt-10">Archive Error.</div>';
    }
}

export async function loadSelectedChar(data) {
    // Safety check: if no data is passed (e.g. initial auto-load attempt), exit gracefully
    if (!data) return;

    if(!confirm(`Recall ${data.meta?.filename}? Unsaved progress will be lost.`)) return;
    
    window.state = data;
    
    // Legacy Data Patches
    if(!window.state.specialties) window.state.specialties = {}; 
    if (!window.state.furthestPhase) window.state.furthestPhase = 1;
    if (window.state.status && window.state.status.tempWillpower === undefined) {
        window.state.status.tempWillpower = window.state.status.willpower || 5;
    }
    if (window.state.status && (window.state.status.health_states === undefined || !Array.isArray(window.state.status.health_states))) {
        // Migration from old integer health
        const oldDamage = window.state.status.health || 0;
        window.state.status.health_states = [0,0,0,0,0,0,0];
        for(let i=0; i<oldDamage && i<7; i++) {
            window.state.status.health_states[i] = 2; // Assume lethal
        }
    }
    
    // Call the MAIN UI Refresher (Defined in ui-renderer.js or main.js)
    if (window.fullRefresh) {
        window.fullRefresh();
    } else {
        console.error("Refresh function missing.");
    }
    
    // Close Modal
    document.getElementById('load-modal').classList.remove('active');
    notify("Recalled.");
}
