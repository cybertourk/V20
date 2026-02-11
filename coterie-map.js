import { db, doc, onSnapshot, setDoc, updateDoc, collection, getDocs, deleteDoc } from "./firebase-config.js";
import { showNotification } from "./ui-common.js";

// We need mermaid from CDN as it's not bundled. 
let mermaidInitialized = false;

async function initMermaid() {
    if (mermaidInitialized) return;
    try {
        if (!window.mermaid) {
            const module = await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs');
            window.mermaid = module.default;
        }
        window.mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            themeVariables: {
                primaryColor: '#2d2d2d',
                primaryTextColor: '#fff',
                primaryBorderColor: '#8a0303',
                lineColor: '#aaa',
                secondaryColor: '#000',
                tertiaryColor: '#fff',
                fontFamily: 'Lato'
            },
            securityLevel: 'loose',
            flowchart: { curve: 'basis', htmlLabels: true }
        });
        mermaidInitialized = true;
    } catch (e) {
        console.error("Mermaid Init Failed:", e);
        showNotification("Failed to load Graph Engine", "error");
    }
}

// --- STATE ---
let mapState = {
    currentMapId: 'main', 
    mapHistory: [],       
    availableMaps: [],    
    characters: [],
    relationships: [],
    expandedGroups: new Set(), 
    zoom: 1.0,
    unsub: null,
    editingVisibilityId: null,
    editingVisibilityType: null,
    editingNodeId: null // Track which node is being edited
};

// --- MAIN RENDERER ---
export async function renderCoterieMap(container) {
    await initMermaid();

    container.innerHTML = `
        <div class="flex h-full bg-[#0a0a0a] text-[#e5e5e5] font-sans overflow-hidden relative">
            <!-- LEFT COLUMN: Editor -->
            <aside class="w-1/3 min-w-[300px] max-w-[400px] flex flex-col gap-4 h-full border-r border-[#333] bg-[#111] p-4 overflow-y-auto custom-scrollbar">
                
                <!-- MAP CONTROLS -->
                <div class="bg-[#1a1a1a] border border-[#333] rounded p-4 shadow-lg shrink-0">
                    <h3 class="text-md font-cinzel font-bold text-gold border-b border-[#333] pb-2 mb-3 uppercase flex justify-between items-center">
                        <span>Active Map</span>
                        <div class="flex gap-2">
                             <button id="cmap-cleanup-map" class="text-xs text-gray-500 hover:text-white" title="Fix Orphans / Cleanup"><i class="fas fa-broom"></i></button>
                             <button id="cmap-delete-map" class="text-xs text-red-500 hover:text-white" title="Delete current map"><i class="fas fa-trash"></i></button>
                        </div>
                    </h3>
                    
                    <div class="flex gap-2 mb-3">
                        <select id="cmap-select-map" class="bg-[#262626] border border-[#404040] text-white p-2 rounded text-xs w-full outline-none focus:border-gold"></select>
                        <button id="cmap-new-map-btn" class="bg-[#333] hover:bg-[#444] border border-[#444] text-white px-3 rounded text-xs"><i class="fas fa-plus"></i></button>
                    </div>

                    <div id="cmap-breadcrumbs" class="text-[10px] text-gray-400 font-mono mb-1 hidden">
                        <button id="cmap-nav-up" class="text-blue-400 hover:text-white mr-2"><i class="fas fa-level-up-alt mr-1"></i> Back to Parent</button>
                        <span id="cmap-current-label" class="text-gold font-bold"></span>
                    </div>
                </div>

                <!-- 1. Add Character / Group -->
                <div class="bg-[#1a1a1a] border border-[#333] rounded p-4 shadow-lg shrink-0">
                    <h3 class="text-md font-cinzel font-bold text-gray-300 border-l-4 border-[#8a0303] pl-2 mb-3 uppercase">Add Node</h3>
                    
                    <div class="grid grid-cols-2 gap-2 mb-3">
                        <input type="text" id="cmap-name" placeholder="Name" class="bg-[#262626] border border-[#404040] text-white p-2 rounded text-xs focus:border-[#8a0303] outline-none col-span-2">
                        <input type="text" id="cmap-clan" placeholder="Clan / Type / Desc" class="bg-[#262626] border border-[#404040] text-white p-2 rounded text-xs focus:border-[#8a0303] outline-none">
                        <select id="cmap-type" class="bg-[#262626] border border-[#404040] text-white p-2 rounded text-xs focus:border-[#8a0303] outline-none">
                            <option value="pc">PC</option>
                            <option value="npc">NPC</option>
                            <option value="group">Group (Sub-Map)</option> 
                        </select>
                        <!-- Group Parent Selector -->
                        <select id="cmap-parent-group" class="bg-[#262626] border border-[#404040] text-white p-2 rounded text-xs focus:border-[#8a0303] outline-none col-span-2 hidden">
                            <option value="">-- No Parent Group --</option>
                        </select>
                    </div>
                    <button id="cmap-add-char" class="w-full bg-[#8a0303] hover:bg-[#6d0202] text-white font-bold py-2 rounded text-xs uppercase tracking-wider transition-colors">
                        <i class="fas fa-plus mr-2"></i>ADD (Hidden)
                    </button>

                    <ul id="cmap-char-list" class="mt-4 space-y-1 max-h-60 overflow-y-auto custom-scrollbar"></ul>
                </div>

                <!-- 2. Add Relationship -->
                <div class="bg-[#1a1a1a] border border-[#333] rounded p-4 shadow-lg shrink-0">
                    <h3 class="text-md font-cinzel font-bold text-gray-300 border-l-4 border-[#8a0303] pl-2 mb-3 uppercase">Connect</h3>
                    
                    <div class="space-y-3 mb-4">
                        <div class="flex gap-2 items-center">
                            <select id="cmap-source" class="bg-[#262626] border border-[#404040] text-white p-2 rounded text-xs w-full outline-none"></select>
                            <i class="fas fa-arrow-right text-gray-500 text-xs"></i>
                            <select id="cmap-target" class="bg-[#262626] border border-[#404040] text-white p-2 rounded text-xs w-full outline-none"></select>
                        </div>
                        
                        <select id="cmap-rel-type" class="bg-[#262626] border border-[#404040] text-white p-2 rounded text-xs w-full outline-none">
                            <option value="social">Social (Solid)</option>
                            <option value="boon">Boon/Debt (Dotted)</option>
                            <option value="blood">Blood Bond (Thick)</option>
                        </select>

                        <input type="text" id="cmap-label" placeholder="Label (e.g. Sire of)" class="bg-[#262626] border border-[#404040] text-white p-2 rounded text-xs w-full outline-none">
                    </div>

                    <button id="cmap-add-rel" class="w-full bg-[#334155] hover:bg-[#1e293b] text-white font-bold py-2 rounded text-xs uppercase tracking-wider transition-colors">
                        <i class="fas fa-link mr-2"></i>Connect (Hidden)
                    </button>

                    <ul id="cmap-rel-list" class="mt-4 space-y-1 max-h-40 overflow-y-auto custom-scrollbar"></ul>
                </div>
            </aside>

            <!-- RIGHT COLUMN: Visualization -->
            <section class="flex-1 bg-[#050505] relative flex flex-col overflow-hidden">
                
                <!-- Toolbar -->
                <div class="absolute top-4 right-4 z-10 flex gap-2 bg-black/50 p-1 rounded backdrop-blur border border-[#333]">
                    <button id="cmap-zoom-out" class="w-8 h-8 flex items-center justify-center bg-[#222] hover:bg-[#333] text-white rounded font-bold transition-colors">-</button>
                    <button id="cmap-reset-zoom" class="w-8 h-8 flex items-center justify-center bg-[#222] hover:bg-[#333] text-white rounded font-bold transition-colors"><i class="fas fa-compress"></i></button>
                    <button id="cmap-zoom-in" class="w-8 h-8 flex items-center justify-center bg-[#222] hover:bg-[#333] text-white rounded font-bold transition-colors">+</button>
                </div>

                <!-- Canvas -->
                <div class="flex-1 overflow-auto p-4 flex items-center justify-center bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:20px_20px]">
                    <div id="mermaid-wrapper" class="origin-center transition-transform duration-200">
                        <div id="mermaid-container" class="mermaid"></div>
                    </div>
                </div>

                <!-- Legend -->
                <div class="bg-[#111] text-gray-400 text-[10px] p-2 text-center border-t border-[#333] uppercase font-bold tracking-wider">
                    <span class="mr-4"><i class="fas fa-minus text-gray-500"></i> Social</span>
                    <span class="mr-4"><i class="fas fa-ellipsis-h text-gray-500"></i> Boon</span>
                    <span class="mr-4"><i class="fas fa-minus text-white font-black border-b-2 border-white"></i> Bond</span>
                    <span class="mr-4 text-blue-400"><i class="fas fa-layer-group"></i> Group</span>
                    <span class="text-gray-600"><i class="fas fa-eye-slash mr-1"></i> Hidden</span>
                </div>
            </section>

            <!-- VISIBILITY MODAL -->
            <div id="cmap-vis-modal" class="hidden absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                <div class="bg-[#1a1a1a] border border-[#d4af37] p-4 w-64 shadow-2xl rounded">
                    <h4 class="text-[#d4af37] font-cinzel font-bold text-sm mb-3 border-b border-[#333] pb-1 uppercase">Visibility Settings</h4>
                    
                    <div class="space-y-2 mb-4">
                        <label class="flex items-center gap-2 cursor-pointer p-1 hover:bg-[#222] rounded">
                            <input type="radio" name="cmap-vis-option" value="all" class="accent-[#d4af37]">
                            <span class="text-xs text-white">Visible to Everyone</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer p-1 hover:bg-[#222] rounded">
                            <input type="radio" name="cmap-vis-option" value="st" class="accent-[#d4af37]">
                            <span class="text-xs text-white">Hidden (ST Only)</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer p-1 hover:bg-[#222] rounded">
                            <input type="radio" name="cmap-vis-option" value="specific" class="accent-[#d4af37]">
                            <span class="text-xs text-white">Specific Players</span>
                        </label>
                    </div>

                    <div id="cmap-vis-players" class="hidden border border-[#333] bg-[#050505] p-2 max-h-32 overflow-y-auto custom-scrollbar mb-4 space-y-1">
                        <!-- Player checkboxes injected here -->
                    </div>

                    <div class="flex justify-end gap-2">
                        <button onclick="document.getElementById('cmap-vis-modal').classList.add('hidden')" class="px-3 py-1 text-[10px] uppercase font-bold text-gray-400 hover:text-white border border-[#444] rounded">Cancel</button>
                        <button id="cmap-vis-save" class="px-3 py-1 text-[10px] uppercase font-bold bg-[#d4af37] text-black hover:bg-[#fcd34d] rounded">Save</button>
                    </div>
                </div>
            </div>

            <!-- MOVE MODAL -->
            <div id="cmap-move-modal" class="hidden absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                <div class="bg-[#1a1a1a] border border-blue-500 p-4 w-64 shadow-2xl rounded">
                    <h4 class="text-blue-400 font-cinzel font-bold text-sm mb-3 border-b border-[#333] pb-1 uppercase">Move To Group</h4>
                    <select id="cmap-move-select" class="w-full bg-[#111] border border-[#444] text-white p-2 rounded mb-4 text-xs outline-none focus:border-blue-500">
                        <option value="">-- Root (No Group) --</option>
                    </select>
                    <div class="flex justify-end gap-2">
                        <button onclick="document.getElementById('cmap-move-modal').classList.add('hidden')" class="px-3 py-1 text-[10px] uppercase font-bold text-gray-400 hover:text-white border border-[#444] rounded">Cancel</button>
                        <button id="cmap-move-save" class="px-3 py-1 text-[10px] uppercase font-bold bg-blue-600 text-white hover:bg-blue-500 rounded">Move</button>
                    </div>
                </div>
            </div>

            <!-- EDIT NODE MODAL (NEW) -->
            <div id="cmap-edit-modal" class="hidden absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                <div class="bg-[#1a1a1a] border border-[#8a0303] p-4 w-64 shadow-2xl rounded">
                    <h4 class="text-[#8a0303] font-cinzel font-bold text-sm mb-3 border-b border-[#333] pb-1 uppercase">Edit Node</h4>
                    <div class="space-y-3 mb-4">
                        <input type="text" id="cmap-edit-name" class="w-full bg-[#111] border border-[#444] text-white p-2 rounded text-xs outline-none focus:border-[#8a0303]" placeholder="Name">
                        <input type="text" id="cmap-edit-clan" class="w-full bg-[#111] border border-[#444] text-white p-2 rounded text-xs outline-none focus:border-[#8a0303]" placeholder="Clan / Type / Desc">
                        <select id="cmap-edit-type" class="w-full bg-[#111] border border-[#444] text-white p-2 rounded text-xs outline-none focus:border-[#8a0303]">
                            <option value="pc">PC</option>
                            <option value="npc">NPC</option>
                            <option value="group">Group</option>
                        </select>
                    </div>
                    <div class="flex justify-end gap-2">
                        <button onclick="document.getElementById('cmap-edit-modal').classList.add('hidden')" class="px-3 py-1 text-[10px] uppercase font-bold text-gray-400 hover:text-white border border-[#444] rounded">Cancel</button>
                        <button id="cmap-edit-save" class="px-3 py-1 text-[10px] uppercase font-bold bg-[#8a0303] text-white hover:bg-[#6d0202] rounded">Save</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize Listeners
    setupMapListeners();
    
    // Load Available Maps
    await loadMapList();
    
    // Start Data Sync (Default 'main')
    startMapSync('main');
}

function setupMapListeners() {
    document.getElementById('cmap-add-char').onclick = addCharacter;
    document.getElementById('cmap-add-rel').onclick = addRelationship;
    document.getElementById('cmap-new-map-btn').onclick = createNewMap;
    document.getElementById('cmap-delete-map').onclick = deleteCurrentMap;
    document.getElementById('cmap-cleanup-map').onclick = cleanupOrphans; 
    document.getElementById('cmap-select-map').onchange = (e) => switchMap(e.target.value);
    document.getElementById('cmap-nav-up').onclick = navigateUp;

    document.getElementById('cmap-type').onchange = (e) => {
        document.getElementById('cmap-parent-group').classList.remove('hidden');
    };

    const wrapper = document.getElementById('mermaid-wrapper');
    document.getElementById('cmap-zoom-in').onclick = () => { mapState.zoom = Math.min(mapState.zoom + 0.1, 3.0); if(wrapper) wrapper.style.transform = `scale(${mapState.zoom})`; };
    document.getElementById('cmap-zoom-out').onclick = () => { mapState.zoom = Math.max(mapState.zoom - 0.1, 0.5); if(wrapper) wrapper.style.transform = `scale(${mapState.zoom})`; };
    document.getElementById('cmap-reset-zoom').onclick = () => { mapState.zoom = 1.0; if(wrapper) wrapper.style.transform = `scale(1)`; };

    // VISIBILITY MODAL LOGIC
    const radios = document.getElementsByName('cmap-vis-option');
    radios.forEach(r => {
        r.onchange = () => {
            document.getElementById('cmap-vis-players').classList.toggle('hidden', r.value !== 'specific');
        };
    });

    document.getElementById('cmap-vis-save').onclick = async () => {
        const selected = document.querySelector('input[name="cmap-vis-option"]:checked')?.value;
        let finalVal = 'st';

        if (selected === 'all') finalVal = 'all';
        else if (selected === 'specific') {
            const checks = document.querySelectorAll('.cmap-player-check:checked');
            finalVal = Array.from(checks).map(c => c.value);
            if (finalVal.length === 0) finalVal = 'st';
        }

        if (mapState.editingVisibilityType === 'char') {
            const char = mapState.characters.find(c => c.id === mapState.editingVisibilityId);
            if(char) char.visibility = finalVal;
        } else if (mapState.editingVisibilityType === 'rel') {
            const idx = parseInt(mapState.editingVisibilityId);
            if(mapState.relationships[idx]) mapState.relationships[idx].visibility = finalVal;
        }

        document.getElementById('cmap-vis-modal').classList.add('hidden');
        refreshMapUI();
        await saveMapData();
    };
    
    // MOVE MODAL LOGIC
    document.getElementById('cmap-move-save').onclick = async () => {
        const charId = mapState.editingVisibilityId; 
        const newParent = document.getElementById('cmap-move-select').value || null;
        
        const char = mapState.characters.find(c => c.id === charId);
        if (char) {
            if (newParent === charId) {
                showNotification("Cannot put group inside itself.", "error");
                return;
            }
            if (newParent) {
                const parent = mapState.characters.find(c => c.id === newParent);
                if (parent && parent.parent === charId) {
                    showNotification("Loop detected.", "error");
                    return;
                }
            }
            
            char.parent = newParent;
            refreshMapUI();
            await saveMapData();
            document.getElementById('cmap-move-modal').classList.add('hidden');
            showNotification("Node moved.");
        }
    };

    // EDIT NODE MODAL LOGIC (NEW)
    document.getElementById('cmap-edit-save').onclick = async () => {
        const id = mapState.editingNodeId;
        const char = mapState.characters.find(c => c.id === id);
        if (char) {
            // Only update non-ID properties to prevent breaking links
            char.name = document.getElementById('cmap-edit-name').value.trim() || char.name;
            char.clan = document.getElementById('cmap-edit-clan').value.trim();
            char.type = document.getElementById('cmap-edit-type').value;
            
            document.getElementById('cmap-edit-modal').classList.add('hidden');
            refreshMapUI();
            await saveMapData();
            showNotification("Node updated.");
        }
    };
}

// --- MAP MANAGEMENT ---

async function loadMapList() {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;

    try {
        const snap = await getDocs(collection(db, 'chronicles', stState.activeChronicleId, 'coterie'));
        mapState.availableMaps = [];
        snap.forEach(doc => {
            mapState.availableMaps.push(doc.id);
        });
        
        if (mapState.availableMaps.length === 0) mapState.availableMaps.push('main');
        
        updateMapSelect();
    } catch(e) { console.error("Map List Load Error", e); }
}

function updateMapSelect() {
    const sel = document.getElementById('cmap-select-map');
    if(!sel) return;
    
    sel.innerHTML = mapState.availableMaps.map(id => `<option value="${id}">${id}</option>`).join('');
    sel.value = mapState.currentMapId;
}

async function createNewMap() {
    const name = prompt("New Map Name (ID):");
    if (!name) return;
    const id = name.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    
    if (mapState.availableMaps.includes(id)) {
        showNotification("Map ID exists.");
        return;
    }
    
    switchMap(id);
    await saveMapData(); 
    
    mapState.availableMaps.push(id);
    updateMapSelect();
}

async function deleteCurrentMap() {
    if (mapState.currentMapId === 'main') {
        showNotification("Cannot delete 'main' map.");
        return;
    }
    if (!confirm(`Delete map '${mapState.currentMapId}' permanently?`)) return;
    
    try {
        const stState = window.stState;
        await deleteDoc(doc(db, 'chronicles', stState.activeChronicleId, 'coterie', mapState.currentMapId));
        
        mapState.availableMaps = mapState.availableMaps.filter(id => id !== mapState.currentMapId);
        switchMap('main');
        updateMapSelect();
        showNotification("Map Deleted.");
    } catch(e) { console.error(e); }
}

// CLEANUP UTILITY
async function cleanupOrphans() {
    if (!confirm("Remove invalid nodes? (Resets parents if missing)")) return;
    
    const validIds = new Set(mapState.characters.map(c => c.id));
    
    mapState.characters.forEach(c => {
        if (c.parent && !validIds.has(c.parent)) {
            console.log(`Orphan found: ${c.name} (Parent: ${c.parent} missing). Moved to root.`);
            c.parent = null; 
        }
    });

    mapState.relationships = mapState.relationships.filter(r => {
        return validIds.has(r.source) && validIds.has(r.target);
    });
    
    refreshMapUI();
    await saveMapData();
    showNotification("Cleanup Complete.");
}

function switchMap(mapId) {
    if (mapId === mapState.currentMapId) return;
    mapState.currentMapId = mapId;
    mapState.mapHistory = []; 
    startMapSync(mapId);
    
    const sel = document.getElementById('cmap-select-map');
    if(sel) sel.value = mapId;
    
    document.getElementById('cmap-breadcrumbs').classList.add('hidden');
}

// Group Toggle Logic
window.cmapToggleGroup = (groupId) => {
    if (mapState.expandedGroups.has(groupId)) {
        mapState.expandedGroups.delete(groupId);
    } else {
        mapState.expandedGroups.add(groupId);
    }
    renderMermaidChart();
};

// Node Edit Trigger (from Mermaid Graph)
window.cmapNodeClick = (id) => {
    const char = mapState.characters.find(c => c.id === id);
    if (!char) return;

    if (char.type === 'group') {
        window.cmapToggleGroup(id);
    } else {
        // Open Edit Modal
        mapState.editingNodeId = id;
        document.getElementById('cmap-edit-name').value = char.name;
        document.getElementById('cmap-edit-clan').value = char.clan || "";
        document.getElementById('cmap-edit-type').value = char.type;
        document.getElementById('cmap-edit-modal').classList.remove('hidden');
    }
};

// Node Edit Trigger (from UI List for Groups)
window.cmapOpenEditModal = (id) => {
    const char = mapState.characters.find(c => c.id === id);
    if (!char) return;

    mapState.editingNodeId = id;
    document.getElementById('cmap-edit-name').value = char.name;
    document.getElementById('cmap-edit-clan').value = char.clan || "";
    document.getElementById('cmap-edit-type').value = char.type;
    document.getElementById('cmap-edit-modal').classList.remove('hidden');
};

// Open Move Modal 
window.cmapOpenMoveModal = (id) => {
    mapState.editingVisibilityId = id; // reuse ID holder
    const modal = document.getElementById('cmap-move-modal');
    const select = document.getElementById('cmap-move-select');
    
    select.innerHTML = '<option value="">-- Root (No Group) --</option>';
    
    mapState.characters.filter(c => c.type === 'group' && c.id !== id).forEach(g => {
        select.innerHTML += `<option value="${g.id}">${g.name}</option>`;
    });

    const char = mapState.characters.find(c => c.id === id);
    if(char) select.value = char.parent || "";

    modal.classList.remove('hidden');
};

function navigateUp() {
    if (mapState.mapHistory.length === 0) return;
    const prevMap = mapState.mapHistory.pop();
    mapState.currentMapId = prevMap;
    startMapSync(prevMap);
    renderBreadcrumbs();
}

function renderBreadcrumbs() {
    const bc = document.getElementById('cmap-breadcrumbs');
    if(!bc) return;
    
    if (mapState.mapHistory.length > 0) {
        bc.classList.remove('hidden');
        document.getElementById('cmap-current-label').innerText = mapState.currentMapId;
    } else {
        bc.classList.add('hidden');
        const sel = document.getElementById('cmap-select-map');
        if(sel) sel.value = mapState.currentMapId;
    }
}

// --- FIREBASE SYNC ---
function startMapSync(docId = 'main') {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;
    
    if (mapState.unsub) mapState.unsub();
    
    const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'coterie', docId);
    
    mapState.unsub = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            mapState.characters = data.characters || [];
            mapState.relationships = data.relationships || [];
        } else {
             mapState.characters = [];
             mapState.relationships = [];
        }
        refreshMapUI();
    });
}

async function saveMapData() {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;
    
    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'coterie', mapState.currentMapId);
        
        await setDoc(docRef, {
            characters: mapState.characters,
            relationships: mapState.relationships
        }, { merge: true });
        
    } catch(e) {
        console.error("Map Save Failed:", e);
        showNotification("Sync Failed", "error");
    }
}

// --- LOGIC ---

async function addCharacter() {
    const nameInput = document.getElementById('cmap-name');
    const clanInput = document.getElementById('cmap-clan');
    const typeInput = document.getElementById('cmap-type');
    const parentSelect = document.getElementById('cmap-parent-group');
    
    const name = nameInput.value.trim();
    const clan = clanInput.value.trim();
    const type = typeInput.value;
    const parent = parentSelect.value || null;

    if (!name) return showNotification("Name required!", "error");

    const id = name.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase(); 
    if (mapState.characters.some(c => c.id === id)) return showNotification("Exists!", "error");

    mapState.characters.push({ id, name, clan, type, parent, visibility: 'st' });
    
    nameInput.value = '';
    clanInput.value = '';
    parentSelect.value = '';
    
    refreshMapUI(); 
    await saveMapData();
}

async function addRelationship() {
    const sourceInput = document.getElementById('cmap-source');
    const targetInput = document.getElementById('cmap-target');
    const typeInput = document.getElementById('cmap-rel-type');
    const labelInput = document.getElementById('cmap-label');
    
    const source = sourceInput.value;
    const target = targetInput.value;
    const type = typeInput.value;
    const label = labelInput.value.trim();

    if (!source || !target) return showNotification("Select Nodes", "error");
    if (source === target) return showNotification("Self-link invalid", "error");

    mapState.relationships.push({ source, target, type, label, visibility: 'st' });
    
    labelInput.value = '';
    refreshMapUI(); 
    await saveMapData();
}

window.cmapRemoveChar = async (id) => {
    if(!confirm("Remove node?")) return;
    mapState.characters = mapState.characters.filter(c => c.id !== id);
    mapState.relationships = mapState.relationships.filter(r => r.source !== id && r.target !== id);
    refreshMapUI();
    await saveMapData();
};

window.cmapRemoveRel = async (idx) => {
    mapState.relationships.splice(idx, 1);
    refreshMapUI();
    await saveMapData();
};

window.cmapToggleChar = async (id) => {
    const char = mapState.characters.find(c => c.id === id);
    if (char) {
        char.visibility = (char.visibility === 'all') ? 'st' : 'all';
        refreshMapUI();
        await saveMapData();
    }
};

window.cmapToggleRel = async (idx) => {
    if (mapState.relationships[idx]) {
        const rel = mapState.relationships[idx];
        rel.visibility = (rel.visibility === 'all') ? 'st' : 'all';
        refreshMapUI();
        await saveMapData();
    }
};

window.cmapOpenVisModal = (id, type) => {
    mapState.editingVisibilityId = id;
    mapState.editingVisibilityType = type;
    
    const modal = document.getElementById('cmap-vis-modal');
    const list = document.getElementById('cmap-vis-players');
    
    let currentVis = 'st';
    if (type === 'char') {
        const c = mapState.characters.find(x => x.id === id);
        if(c) currentVis = c.visibility || 'st';
    } else {
        const r = mapState.relationships[id];
        if(r) currentVis = r.visibility || 'st';
    }

    const radios = document.getElementsByName('cmap-vis-option');
    if (Array.isArray(currentVis)) {
        radios[2].checked = true; 
        list.classList.remove('hidden');
    } else if (currentVis === 'all') {
        radios[0].checked = true;
        list.classList.add('hidden');
    } else {
        radios[1].checked = true;
        list.classList.add('hidden');
    }

    list.innerHTML = '';
    const players = window.stState?.players || {};
    Object.entries(players).forEach(([uid, p]) => {
        if (!p.metadataType || p.metadataType !== 'journal') {
            const isChecked = Array.isArray(currentVis) && currentVis.includes(uid);
            list.innerHTML += `
                <label class="flex items-center gap-2 p-1 hover:bg-[#222] rounded cursor-pointer">
                    <input type="checkbox" class="cmap-player-check accent-[#d4af37]" value="${uid}" ${isChecked ? 'checked' : ''}>
                    <span class="text-xs text-gray-300 truncate">${p.character_name || "Unknown"}</span>
                </label>
            `;
        }
    });

    if (list.innerHTML === '') list.innerHTML = '<div class="text-gray-500 italic text-[10px]">No players found.</div>';

    modal.classList.remove('hidden');
};

// --- UI UPDATES ---

function refreshMapUI() {
    renderMermaidChart();
    updateDropdowns();
    updateLists();
}

function updateDropdowns() {
    const sourceSelect = document.getElementById('cmap-source');
    const targetSelect = document.getElementById('cmap-target');
    const parentSelect = document.getElementById('cmap-parent-group');

    if (!sourceSelect || !targetSelect || !parentSelect) return;

    const currentS = sourceSelect.value;
    const currentT = targetSelect.value;
    const currentP = parentSelect.value;

    let opts = '<option value="">-- Select --</option>';
    let groupOpts = '<option value="">-- No Parent Group --</option>';

    mapState.characters.forEach(c => {
        opts += `<option value="${c.id}">${c.name}</option>`;
        if(c.type === 'group') groupOpts += `<option value="${c.id}">${c.name}</option>`;
    });

    sourceSelect.innerHTML = opts;
    targetSelect.innerHTML = opts;
    parentSelect.innerHTML = groupOpts;

    if (mapState.characters.some(c => c.id === currentS)) sourceSelect.value = currentS;
    if (mapState.characters.some(c => c.id === currentT)) targetSelect.value = currentT;
    if (mapState.characters.some(c => c.id === currentP)) parentSelect.value = currentP;
}

function updateLists() {
    const charList = document.getElementById('cmap-char-list');
    if (charList) {
        // Organize hierarchy: Groups -> Items
        const roots = mapState.characters.filter(c => !c.parent);
        let html = '';

        const renderItem = (c, level) => {
            const vis = c.visibility;
            let iconClass = 'fa-eye-slash text-gray-500'; 
            if (vis === 'all') iconClass = 'fa-eye text-[#4ade80]';
            if (Array.isArray(vis)) iconClass = 'fa-user-secret text-[#d4af37]'; 
            
            const indent = level * 10;
            const borderClass = vis !== 'all' ? 'border-l-gray-600' : 'border-l-[#4ade80]';
            
            return `
            <li class="flex justify-between items-center bg-[#222] p-1.5 rounded text-[10px] border border-[#333] border-l-2 ${borderClass} mb-1" style="margin-left:${indent}px">
                <div class="flex items-center gap-2">
                    <button onclick="window.cmapOpenVisModal('${c.id}', 'char')" class="hover:text-white transition-colors" title="Change Visibility">
                        <i class="fas ${iconClass}"></i>
                    </button>
                    <div>
                        <span class="font-bold ${c.type === 'npc' ? 'text-[#8a0303]' : (c.type === 'group' ? 'text-blue-400' : 'text-blue-300')}">${c.name}</span>
                        <span class="text-gray-500 ml-1">(${c.clan || (c.type==='group'?'Group':'?')})</span>
                    </div>
                </div>
                <div class="flex gap-1">
                    <button onclick="window.cmapOpenEditModal('${c.id}')" class="text-gray-500 hover:text-white px-1" title="Edit Node Details"><i class="fas fa-edit"></i></button>
                    ${c.type === 'group' ? `<button onclick="window.cmapToggleGroup('${c.id}')" class="text-blue-400 hover:text-white px-1" title="Toggle Expand/Collapse"><i class="fas ${mapState.expandedGroups.has(c.id) ? 'fa-minus-square' : 'fa-plus-square'}"></i></button>` : ''}
                    <button onclick="window.cmapOpenMoveModal('${c.id}')" class="text-gray-500 hover:text-white px-1" title="Move to Group"><i class="fas fa-arrows-alt"></i></button>
                    <button onclick="window.cmapRemoveChar('${c.id}')" class="text-gray-600 hover:text-red-500 px-1"><i class="fas fa-trash"></i></button>
                </div>
            </li>`;
        };

        const renderTree = (parent, level) => {
             html += renderItem(parent, level);
             const children = mapState.characters.filter(c => c.parent === parent.id);
             children.forEach(child => renderTree(child, level + 1));
        };

        roots.forEach(root => renderTree(root, 0));
        charList.innerHTML = html;
    }

    const relList = document.getElementById('cmap-rel-list');
    if (relList) {
        relList.innerHTML = mapState.relationships.map((r, i) => {
            const sName = mapState.characters.find(c => c.id === r.source)?.name || r.source;
            const tName = mapState.characters.find(c => c.id === r.target)?.name || r.target;
            let icon = r.type === 'blood' ? 'fa-link text-red-500' : (r.type === 'boon' ? 'fa-ellipsis-h' : 'fa-arrow-right');
            
            const vis = r.visibility;
            let iconClass = 'fa-eye-slash text-gray-500'; 
            if (vis === 'all') iconClass = 'fa-eye text-[#4ade80]';
            if (Array.isArray(vis)) iconClass = 'fa-user-secret text-[#d4af37]';

            return `
            <li class="flex justify-between items-center bg-[#222] p-1.5 rounded text-[10px] border-l-2 ${r.type === 'blood' ? 'border-[#8a0303]' : 'border-gray-500'} border-t border-r border-b border-[#333] ${vis !== 'all' ? 'opacity-70' : ''}">
                <div class="flex gap-2 items-center flex-1 truncate">
                    <button onclick="window.cmapOpenVisModal('${i}', 'rel')" class="hover:text-white flex-shrink-0 transition-colors" title="Change Visibility">
                        <i class="fas ${iconClass}"></i>
                    </button>
                    <div class="truncate">
                        <span class="font-bold text-gray-300">${sName}</span>
                        <i class="fas ${icon} mx-1 text-gray-600"></i>
                        <span class="font-bold text-gray-300">${tName}</span>
                        <div class="text-[9px] text-[#d4af37] italic truncate">${r.label || r.type}</div>
                    </div>
                </div>
                <button onclick="window.cmapRemoveRel(${i})" class="text-gray-600 hover:text-red-500 px-1 ml-1 flex-shrink-0"><i class="fas fa-trash"></i></button>
            </li>`;
        }).join('');
    }
}

async function renderMermaidChart() {
    const container = document.getElementById('mermaid-container');
    if (!container) return;
    
    if (!window.mermaid) {
        container.innerHTML = `<div class="text-center text-gray-500 text-xs mt-10">Loading Graph Engine...</div>`;
        return;
    }

    if (mapState.characters.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-500 text-xs mt-10 italic">Add characters to begin mapping...</div>`;
        return;
    }

    let graph = 'graph TD\n';
    
    // Classes
    graph += 'classDef pc fill:#1e293b,stroke:#fff,stroke-width:2px,color:#fff;\n';
    graph += 'classDef npc fill:#000,stroke:#8a0303,stroke-width:3px,color:#8a0303,font-weight:bold;\n';
    // Style for Expanded Group (The Ring) - Dashed, Transparent center
    graph += 'classDef groupRing fill:none,stroke:#1e3a8a,stroke-width:2px,stroke-dasharray: 5 5;\n'; 
    // Style for Collapsed Group (The Node) - Blue Circle
    graph += 'classDef groupNode fill:#1e3a8a,stroke:#60a5fa,stroke-width:2px,color:#fff;\n';
    
    graph += 'classDef hiddenNode stroke-dasharray: 5 5,opacity:0.6;\n';

    // RENDER NODES
    
    const renderedIds = new Set();
    
    const renderNode = (c) => {
        if(renderedIds.has(c.id)) return "";
        renderedIds.add(c.id);

        const safeName = c.name.replace(/"/g, "'");
        let label = c.clan ? `${safeName}<br/>(${c.clan})` : safeName;
        
        let cls = ':::pc';
        if (c.type === 'npc') cls = ':::npc';
        
        // Group Logic: Check if Expanded
        if (c.type === 'group') {
             const isExpanded = mapState.expandedGroups.has(c.id);
             
             if (isExpanded) {
                 // Render as Subgraph Wrapper (Ring) - Handled in renderSubgraph recursion
                 // BUT we still need a clickable title for the ring.
                 // We will render a "Header Node" inside the subgraph.
                 cls = ':::groupNode';
                 label = `<b>${safeName}</b>`; 
             } else {
                 // Render as Standard Node (Circle)
                 cls = ':::groupNode';
                 label = `${safeName}<br/>(Group)`;
             }
        }
        
        let line = "";
        // Visibility Check
        if (c.visibility !== 'all') {
             line = `${c.id}("${label}"):::${c.type === 'group' ? 'groupNode' : (c.type === 'npc' ? 'npc' : 'pc')} hiddenNode\n`;
        } else {
             line = `${c.id}("${label}")${cls}\n`;
        }

        // Attach Click Interaction to everything
        line += `click ${c.id} call cmapNodeClick("${c.id}") "Interact"\n`;
        
        return line;
    };

    const renderSubgraph = (group) => {
        // If NOT expanded, render as a single node
        if (!mapState.expandedGroups.has(group.id)) {
            return renderNode(group);
        }

        // If EXPANDED, render as a subgraph (Ring)
        let output = `subgraph ${group.id}_sg [" "]\n`; // Empty string title to avoid double label
        output += `direction TB\n`; 
        
        // Render the clickable header node inside the ring
        output += renderNode(group);
        
        const children = mapState.characters.filter(c => c.parent === group.id);
        children.forEach(child => {
            if (child.type === 'group') {
                output += renderSubgraph(child); 
            } else {
                output += renderNode(child);
            }
        });
        output += `end\n`;
        
        // Apply class to the subgraph (Ring style)
        output += `class ${group.id}_sg groupRing\n`;
        
        return output;
    };

    // 1. Render Roots (Nodes with no parent)
    const validIds = new Set(mapState.characters.map(c => c.id));
    const roots = mapState.characters.filter(c => !c.parent || !validIds.has(c.parent));
    
    roots.forEach(root => {
        if (root.type === 'group') {
             graph += renderSubgraph(root);
        } else {
             graph += renderNode(root);
        }
    });

    // 2. Cleanup: Ensure any orphaned nodes (if parent missing) are rendered
    mapState.characters.forEach(c => {
        if (!renderedIds.has(c.id)) {
            graph += renderNode(c);
        }
    });

    // RENDER LINKS
    mapState.relationships.forEach(r => {
        const label = r.label ? `"${r.label}"` : "";
        const isHidden = r.visibility !== 'all';
        
        let arrow = "-->"; 
        if (r.type === 'boon') arrow = "-.->";
        if (r.type === 'blood') arrow = "==>";
        
        let displayLabel = label;
        if (isHidden) {
             if (displayLabel) displayLabel = `"${r.label} *"`; 
             else displayLabel = `"* *"`;
        }

        if (displayLabel) {
            if (r.type === 'blood') graph += `${r.source} == ${displayLabel} ==> ${r.target}\n`;
            else if (r.type === 'boon') graph += `${r.source} -. ${displayLabel} .-> ${r.target}\n`;
            else graph += `${r.source} -- ${displayLabel} --> ${r.target}\n`;
        } else {
            graph += `${r.source} ${arrow} ${r.target}\n`;
        }
    });

    try {
        const { svg } = await window.mermaid.render('mermaid-svg-' + Date.now(), graph);
        container.innerHTML = svg;
    } catch (e) {
        console.warn("Mermaid Render Warning:", e);
    }
}
