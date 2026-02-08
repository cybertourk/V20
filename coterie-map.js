import { db, doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from "./firebase-config.js";
import { showNotification } from "./ui-common.js";

// We need mermaid from CDN as it's not bundled. 
let mermaidInitialized = false;

async function initMermaid() {
    if (mermaidInitialized) return;
    
    try {
        // Try dynamic import from CDN if not globally available
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
    characters: [],
    relationships: [],
    zoom: 1.0,
    unsub: null,
    editingVisibilityId: null, // Track which item is being edited for visibility
    editingVisibilityType: null // 'char' or 'rel'
};

// --- MAIN RENDERER ---
export async function renderCoterieMap(container) {
    await initMermaid();

    container.innerHTML = `
        <div class="flex h-full bg-[#0a0a0a] text-[#e5e5e5] font-sans overflow-hidden relative">
            <!-- LEFT COLUMN: Editor -->
            <aside class="w-1/3 min-w-[300px] max-w-[400px] flex flex-col gap-4 h-full border-r border-[#333] bg-[#111] p-4 overflow-y-auto custom-scrollbar">
                
                <!-- 1. Add Character -->
                <div class="bg-[#1a1a1a] border border-[#333] rounded p-4 shadow-lg shrink-0">
                    <h3 class="text-md font-cinzel font-bold text-gray-300 border-l-4 border-[#8a0303] pl-2 mb-3 uppercase">1. Characters</h3>
                    
                    <div class="grid grid-cols-2 gap-2 mb-3">
                        <input type="text" id="cmap-name" placeholder="Name" class="bg-[#262626] border border-[#404040] text-white p-2 rounded text-xs focus:border-[#8a0303] outline-none col-span-2">
                        <input type="text" id="cmap-clan" placeholder="Clan / Type" class="bg-[#262626] border border-[#404040] text-white p-2 rounded text-xs focus:border-[#8a0303] outline-none">
                        <select id="cmap-type" class="bg-[#262626] border border-[#404040] text-white p-2 rounded text-xs focus:border-[#8a0303] outline-none">
                            <option value="pc">PC</option>
                            <option value="npc">NPC</option>
                        </select>
                    </div>
                    <button id="cmap-add-char" class="w-full bg-[#8a0303] hover:bg-[#6d0202] text-white font-bold py-2 rounded text-xs uppercase tracking-wider transition-colors">
                        <i class="fas fa-plus mr-2"></i>ADD (Hidden)
                    </button>

                    <ul id="cmap-char-list" class="mt-4 space-y-1 max-h-40 overflow-y-auto custom-scrollbar"></ul>
                </div>

                <!-- 2. Add Relationship -->
                <div class="bg-[#1a1a1a] border border-[#333] rounded p-4 shadow-lg shrink-0">
                    <h3 class="text-md font-cinzel font-bold text-gray-300 border-l-4 border-[#8a0303] pl-2 mb-3 uppercase">2. Relationships</h3>
                    
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
                    <span class="mr-4"><i class="fas fa-ellipsis-h text-gray-500"></i> Boon/Debt</span>
                    <span class="mr-4"><i class="fas fa-minus text-white font-black border-b-2 border-white"></i> Blood Bond</span>
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
        </div>
    `;

    // Initialize Listeners
    setupMapListeners();
    
    // Start Data Sync
    startMapSync();
}

function setupMapListeners() {
    document.getElementById('cmap-add-char').onclick = addCharacter;
    document.getElementById('cmap-add-rel').onclick = addRelationship;
    
    const wrapper = document.getElementById('mermaid-wrapper');
    
    document.getElementById('cmap-zoom-in').onclick = () => {
        mapState.zoom = Math.min(mapState.zoom + 0.1, 3.0);
        if(wrapper) wrapper.style.transform = `scale(${mapState.zoom})`;
    };
    
    document.getElementById('cmap-zoom-out').onclick = () => {
        mapState.zoom = Math.max(mapState.zoom - 0.1, 0.5);
        if(wrapper) wrapper.style.transform = `scale(${mapState.zoom})`;
    };
    
    document.getElementById('cmap-reset-zoom').onclick = () => {
        mapState.zoom = 1.0;
        if(wrapper) wrapper.style.transform = `scale(1)`;
    };

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
            if (finalVal.length === 0) finalVal = 'st'; // Fallback if none checked
        }

        if (mapState.editingVisibilityType === 'char') {
            const char = mapState.characters.find(c => c.id === mapState.editingVisibilityId);
            if(char) char.visibility = finalVal;
        } else if (mapState.editingVisibilityType === 'rel') {
            // Rel ID is index
            const idx = parseInt(mapState.editingVisibilityId);
            if(mapState.relationships[idx]) mapState.relationships[idx].visibility = finalVal;
        }

        document.getElementById('cmap-vis-modal').classList.add('hidden');
        refreshMapUI();
        await saveMapData();
    };
}

// --- FIREBASE SYNC ---
function startMapSync() {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;
    
    if (mapState.unsub) mapState.unsub();
    
    const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'coterie', 'map');
    
    mapState.unsub = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            mapState.characters = data.characters || [];
            mapState.relationships = data.relationships || [];
        } else {
            // Don't wipe local state if snapshot is empty but we have pending local changes
            if (mapState.characters.length === 0) {
                 mapState.characters = [];
                 mapState.relationships = [];
            }
        }
        refreshMapUI();
    });
}

async function saveMapData() {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;
    
    try {
        const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'coterie', 'map');
        
        // Use setDoc with merge: true to handle creation automatically
        await setDoc(docRef, {
            characters: mapState.characters,
            relationships: mapState.relationships
        }, { merge: true });
        
    } catch(e) {
        console.error("Map Save Failed:", e);
        showNotification("Sync Failed (Blocked?)", "error");
    }
}

// --- LOGIC ---

async function addCharacter() {
    const nameInput = document.getElementById('cmap-name');
    const clanInput = document.getElementById('cmap-clan');
    const typeInput = document.getElementById('cmap-type');
    
    const name = nameInput.value.trim();
    const clan = clanInput.value.trim();
    const type = typeInput.value;

    if (!name) return showNotification("Name required!", "error");

    const id = name.replace(/[^a-zA-Z0-9]/g, '');
    if (mapState.characters.some(c => c.id === id)) return showNotification("Exists!", "error");

    // Add with default visibility: 'st' (Storyteller Only / Hidden)
    mapState.characters.push({ id, name, clan, type, visibility: 'st' });
    
    nameInput.value = '';
    clanInput.value = '';
    
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

    if (!source || !target) return showNotification("Select Source & Target", "error");
    if (source === target) return showNotification("Self-link invalid", "error");

    // Add with default visibility: 'st' (Storyteller Only / Hidden)
    mapState.relationships.push({ source, target, type, label, visibility: 'st' });
    
    labelInput.value = '';
    refreshMapUI(); 
    await saveMapData();
}

// Global functions for list interaction
window.cmapRemoveChar = async (id) => {
    if(!confirm("Remove character?")) return;
    mapState.characters = mapState.characters.filter(c => c.id !== id);
    // Cascade delete relationships
    mapState.relationships = mapState.relationships.filter(r => r.source !== id && r.target !== id);
    refreshMapUI();
    await saveMapData();
};

window.cmapRemoveRel = async (idx) => {
    mapState.relationships.splice(idx, 1);
    refreshMapUI();
    await saveMapData();
};

// Open Visibility Modal
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

    // Set Radio
    const radios = document.getElementsByName('cmap-vis-option');
    if (Array.isArray(currentVis)) {
        radios[2].checked = true; // Specific
        list.classList.remove('hidden');
    } else if (currentVis === 'all') {
        radios[0].checked = true;
        list.classList.add('hidden');
    } else {
        radios[1].checked = true; // ST
        list.classList.add('hidden');
    }

    // Build Player List
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
    if (!sourceSelect || !targetSelect) return;

    const currentS = sourceSelect.value;
    const currentT = targetSelect.value;

    const opts = '<option value="">-- Select --</option>' + 
        mapState.characters.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    sourceSelect.innerHTML = opts;
    targetSelect.innerHTML = opts;

    if (mapState.characters.some(c => c.id === currentS)) sourceSelect.value = currentS;
    if (mapState.characters.some(c => c.id === currentT)) targetSelect.value = currentT;
}

function updateLists() {
    const charList = document.getElementById('cmap-char-list');
    if (charList) {
        charList.innerHTML = mapState.characters.map(c => {
            const vis = c.visibility;
            let iconClass = 'fa-eye-slash text-gray-500'; // Hidden
            if (vis === 'all') iconClass = 'fa-eye text-[#4ade80]';
            if (Array.isArray(vis)) iconClass = 'fa-user-secret text-[#d4af37]'; // Specific

            return `
            <li class="flex justify-between items-center bg-[#222] p-1.5 rounded text-[10px] border border-[#333] ${vis !== 'all' ? 'opacity-70 border-l-2 border-l-gray-600' : 'border-l-2 border-l-[#4ade80]'}">
                <div class="flex items-center gap-2">
                    <button onclick="window.cmapOpenVisModal('${c.id}', 'char')" class="hover:text-white transition-colors" title="Change Visibility">
                        <i class="fas ${iconClass}"></i>
                    </button>
                    <div>
                        <span class="font-bold ${c.type === 'npc' ? 'text-[#8a0303]' : 'text-blue-300'}">${c.name}</span>
                        <span class="text-gray-500 ml-1">(${c.clan || '?'})</span>
                    </div>
                </div>
                <button onclick="window.cmapRemoveChar('${c.id}')" class="text-gray-600 hover:text-red-500 px-1"><i class="fas fa-trash"></i></button>
            </li>`;
        }).join('');
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
    // Style for hidden/restricted nodes (Dashed border)
    graph += 'classDef hiddenNode stroke-dasharray: 5 5,opacity:0.6;\n';

    // RENDER ALL CHARACTERS (ST View)
    mapState.characters.forEach(c => {
        const safeName = c.name.replace(/"/g, "'");
        const label = c.clan ? `${safeName}<br/>(${c.clan})` : safeName;
        
        let cls = c.type === 'npc' ? ':::npc' : ':::pc';
        
        // Check visibility
        if (c.visibility !== 'all') {
             graph += `${c.id}("${label}"):::${c.type === 'npc' ? 'npc' : 'pc'} hiddenNode\n`;
        } else {
             graph += `${c.id}("${label}")${cls}\n`;
        }
    });

    // RENDER ALL RELATIONSHIPS (ST View)
    mapState.relationships.forEach(r => {
        const label = r.label ? `"${r.label}"` : "";
        const isHidden = r.visibility !== 'all';
        
        // Mermaid styling for links
        let arrow = "-->"; 
        if (r.type === 'boon') arrow = "-.->";
        if (r.type === 'blood') arrow = "==>";
        
        let displayLabel = label;
        if (isHidden) {
             // Visual marker for restricted links
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
        
        // Apply styling to restricted links if supported by current mermaid theme
        // (Mermaid link styling is complex by index, simpler to use labels for now)
    });

    try {
        const { svg } = await window.mermaid.render('mermaid-svg-' + Date.now(), graph);
        container.innerHTML = svg;
    } catch (e) {
        console.warn("Mermaid Render Warning:", e);
    }
}
