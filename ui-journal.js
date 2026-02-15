import { showNotification } from "./ui-common.js";
import { db, doc, setDoc, deleteDoc } from "./firebase-config.js";

// NOTE: We avoid importing stState directly to prevent circular dependency issues.
// We will access window.stState (set by ui-storyteller.js) instead.

// Global Codex Cache for Autosuggest & Linking
let codexCache = [];

// --- CONFIGURATION STATE ---
// Allows switching between "Player Mode" (Local) and "Storyteller Mode" (Cloud)
let activeContext = {
    mode: 'player', // 'player' or 'storyteller'
    data: null,     // Reference to window.state.codex or window.stState.journal
    onSave: null,   
    onDelete: null  
};

// ==========================================================================
// PUBLIC EXPORTS & ENTRY POINTS
// ==========================================================================

export function renderJournalTab() {
    // PLAYER ENTRY POINT
    const container = document.getElementById('play-mode-5');
    if (!container) return;

    // Init Defaults
    if (!window.state.sessionLogs) window.state.sessionLogs = [];
    if (!window.state.codex) window.state.codex = [];
    if (!window.state.journalTab) window.state.journalTab = 'sessions';

    // Set Context: LOCAL
    activeContext = {
        mode: 'player',
        data: window.state.codex,
        onSave: () => { 
            if (window.performSave) window.performSave(true); 
        },
        onDelete: () => { 
            if (window.performSave) window.performSave(true); 
        }
    };

    renderJournalInterface(container, window.state.journalTab);
}

export function renderStorytellerJournal(container) {
    // STORYTELLER ENTRY POINT
    if (!container) {
        console.warn("Storyteller Journal: Container not found.");
        return;
    }

    const stState = window.stState || {};
    // Ensure journal data exists, defaulting to empty object if not found
    const journalData = stState.journal || {};
    const journalArray = Object.values(journalData);

    // Set Context: CLOUD
    activeContext = {
        mode: 'storyteller',
        data: journalArray, 
        onSave: async (entry) => {
            if (!stState.activeChronicleId) {
                showNotification("No Active Chronicle", "error");
                return;
            }
            try {
                // Prefix ID with 'journal_' for the 'players' collection workaround
                // This ensures we can store >1MB of data in total by splitting docs
                const safeId = entry.id.startsWith('journal_') ? entry.id : 'journal_' + entry.id;
                const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'players', safeId);
                
                await setDoc(docRef, { 
                    ...entry, 
                    metadataType: 'journal', 
                    original_id: entry.id 
                }, { merge: true });
                
                showNotification("Journal Synced.");
            } catch(e) { 
                console.error("ST Journal Save Failed:", e);
                showNotification("Sync Failed: " + e.message, "error");
            }
        },
        onDelete: async (id) => {
            if (!stState.activeChronicleId) return;
            try {
                const safeId = id.startsWith('journal_') ? id : 'journal_' + id;
                await deleteDoc(doc(db, 'chronicles', stState.activeChronicleId, 'players', safeId));
                showNotification("Entry Deleted.");
            } catch(e) { console.error(e); }
        }
    };

    // STs default to Codex view, using shared shell to ensure modals exist
    renderJournalInterface(container, 'codex');
}

export function updateJournalList(newData) {
    activeContext.data = newData || [];
    codexCache = (activeContext.data || []).map(c => c.name);
    // Only re-render list if the codex view is active to avoid overwriting editor state unnecessarily
    const list = document.getElementById('codex-list');
    if (list) renderCodexList();
}

// ==========================================================================
// SHARED UI SHELL
// ==========================================================================

function renderJournalInterface(container, activeTab) {
    // Refresh cache
    codexCache = (activeContext.data || []).map(c => c.name);

    const activeClass = "border-b-2 border-[#d4af37] text-[#d4af37] font-bold";
    const inactiveClass = "text-gray-500 hover:text-white transition-colors";
    const showTabs = activeContext.mode === 'player';

    // FIX: Apply height constraint to Player Mode to prevent page stretching.
    // ST Mode uses h-full because it lives in a flex-locked dashboard.
    const isPlayer = activeContext.mode === 'player';
    const wrapperClass = isPlayer 
        ? 'flex flex-col relative w-full overflow-hidden' 
        : 'flex flex-col h-full relative w-full overflow-hidden';
    const wrapperStyle = isPlayer 
        ? 'height: calc(100vh - 240px); min-height: 500px;' 
        : '';

    container.innerHTML = `
        <div class="${wrapperClass}" style="${wrapperStyle}">
            ${showTabs ? `
            <div class="flex gap-6 border-b border-[#333] pb-2 mb-2 px-2 shrink-0">
                <button id="tab-sessions" class="text-xs uppercase tracking-wider px-2 pb-1 ${activeTab==='sessions'?activeClass:inactiveClass}">Session Logs</button>
                <button id="tab-codex" class="text-xs uppercase tracking-wider px-2 pb-1 ${activeTab==='codex'?activeClass:inactiveClass}">Codex</button>
            </div>
            ` : ''}
            
            <!-- Main Content Area -->
            <div id="journal-main-view" class="flex-1 overflow-hidden h-full relative w-full"></div>
            
            <!-- Floating Autocomplete Box -->
            <div id="autocomplete-suggestions" class="autocomplete-box"></div>
        </div>
        
        <!-- Shared Codex Modal -->
        ${renderPopupModal()} 
        
        <!-- NEW: Recipient Selection Modal -->
        <div id="recipient-modal" class="fixed inset-0 bg-black/80 z-[20000] hidden flex items-center justify-center p-4 backdrop-blur-sm">
            <div class="bg-[#1a1a1a] border border-[#d4af37] p-6 max-w-sm w-full shadow-2xl relative">
                <h3 class="text-lg text-gold font-cinzel font-bold mb-4 border-b border-[#333] pb-2 uppercase">Select Recipients</h3>
                
                <div class="mb-4">
                    <label class="flex items-center gap-3 p-2 bg-blue-900/10 border border-blue-900/30 rounded cursor-pointer hover:bg-blue-900/20 transition-colors">
                        <input type="checkbox" id="push-all" checked class="w-4 h-4 accent-blue-500 cursor-pointer">
                        <span class="text-xs font-bold text-white uppercase">Broadcast to Everyone</span>
                    </label>
                </div>
                
                <div class="text-[10px] text-gray-500 font-bold uppercase mb-2">Individual Players</div>
                <div id="recipient-list" class="space-y-1 max-h-48 overflow-y-auto mb-4 custom-scrollbar border border-[#333] bg-[#050505] p-2 rounded">
                    <!-- Players injected here -->
                </div>
                
                <div class="flex justify-between gap-2 border-t border-[#333] pt-4">
                    <button onclick="document.getElementById('recipient-modal').classList.add('hidden')" class="text-gray-500 hover:text-white text-xs uppercase font-bold px-4 py-2 border border-transparent hover:border-[#444]">Cancel</button>
                    <button id="confirm-push-btn" class="bg-blue-900 text-white px-6 py-2 text-xs uppercase font-bold hover:bg-blue-700 shadow-lg border border-blue-700">Push Handout</button>
                </div>
            </div>
        </div>
    `;

    if (showTabs) {
        document.getElementById('tab-sessions').onclick = () => {
            window.state.journalTab = 'sessions';
            renderJournalInterface(container, 'sessions');
        };
        document.getElementById('tab-codex').onclick = () => {
            window.state.journalTab = 'codex';
            renderJournalInterface(container, 'codex');
        };
    }

    const mainView = document.getElementById('journal-main-view');
    if (activeContext.mode === 'storyteller') {
        renderCodexView(mainView);
    } else {
        if (activeTab === 'sessions') renderSessionView(mainView);
        else renderCodexView(mainView);
    }

    bindPopupListeners();
}

function renderPopupModal() {
    return `
        <div id="codex-popup" class="fixed inset-0 bg-black/90 z-[10000] hidden flex items-center justify-center p-4 backdrop-blur-sm">
            <div class="bg-[#1a1a1a] border border-[#d4af37] p-6 max-w-lg w-full shadow-[0_0_30px_rgba(0,0,0,0.8)] relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar">
                <button onclick="document.getElementById('codex-popup').classList.add('hidden')" class="absolute top-2 right-3 text-gray-500 hover:text-white text-xl">&times;</button>
                
                <!-- VIEW MODE -->
                <div id="codex-popup-view" class="hidden">
                    <h3 id="codex-popup-title" class="text-xl text-[#d4af37] font-cinzel font-bold mb-2 border-b border-[#333] pb-2"></h3>
                    <div id="codex-popup-img-container" class="hidden mb-4 rounded border border-[#333] overflow-hidden bg-black flex justify-center">
                        <img id="codex-popup-img" src="" class="max-h-64 object-contain w-full">
                    </div>
                    <div class="flex gap-2 mb-3 flex-wrap" id="codex-popup-tags"></div>
                    <div id="codex-popup-desc" class="text-sm text-gray-300 leading-relaxed font-serif whitespace-pre-wrap"></div>
                    <div class="mt-4 pt-4 border-t border-[#333] text-right flex justify-between items-center">
                        <div id="st-push-container"></div>
                        <button id="codex-popup-edit-btn" class="text-xs text-gray-500 hover:text-white underline">Edit Entry</button>
                    </div>
                </div>

                <!-- EDIT MODE (Quick Edit) -->
                <div id="codex-popup-edit" class="hidden flex flex-col gap-3">
                    <h3 class="text-lg text-[#d4af37] font-bold border-b border-[#333] pb-2">Define / Edit Entry</h3>
                    <input type="hidden" id="quick-cx-id">
                    <div>
                        <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Name</label>
                        <input type="text" id="quick-cx-name" class="w-full bg-[#111] border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none">
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Image</label>
                        <div class="flex flex-col gap-2">
                            <div id="quick-cx-img-preview" class="w-full h-48 bg-black border border-[#444] flex items-center justify-center overflow-hidden rounded">
                                <i class="fas fa-image text-gray-700 text-3xl"></i>
                            </div>
                            <div class="flex gap-2">
                                <input type="file" id="quick-cx-file" accept="image/*" class="hidden">
                                <button onclick="document.getElementById('quick-cx-file').click()" class="bg-[#222] border border-[#444] text-gray-300 px-3 py-1 text-[10px] hover:text-white uppercase font-bold flex-1">Upload</button>
                                <button id="quick-cx-btn-url" class="bg-[#222] border border-[#444] text-gray-300 px-3 py-1 text-[10px] hover:text-white uppercase font-bold flex-1">Link URL</button>
                                <button id="quick-cx-remove-img" class="text-red-500 hover:text-red-300 text-[10px] border border-red-900/30 px-3 py-1 uppercase font-bold hidden">Remove</button>
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Type</label>
                            <select id="quick-cx-type" class="w-full bg-[#111] border-b border-[#444] text-white p-1 text-xs outline-none">
                                <option value="NPC">NPC</option>
                                <option value="PC">PC</option>
                                <option value="Location">Location</option>
                                <option value="Faction">Faction</option>
                                <option value="Item">Item</option>
                                <option value="Handout">Handout</option>
                                <option value="Lore">Lore / Rule</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Tags</label>
                            <input type="text" id="quick-cx-tags" class="w-full bg-[#111] border-b border-[#444] text-gray-300 p-1 text-xs outline-none" placeholder="e.g. Brujah, Ally">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Description</label>
                        <textarea id="quick-cx-desc" class="w-full h-32 bg-[#111] border border-[#444] text-gray-300 p-2 text-sm focus:border-[#d4af37] outline-none resize-none"></textarea>
                    </div>
                    <div class="flex justify-end gap-2 mt-2">
                        <button onclick="document.getElementById('codex-popup').classList.add('hidden')" class="border border-[#444] text-gray-400 px-3 py-1 text-xs uppercase font-bold hover:bg-[#222]">Cancel</button>
                        <button onclick="window.saveQuickCodex()" class="bg-[#d4af37] text-black px-4 py-1 text-xs uppercase font-bold hover:bg-[#fcd34d]">Save</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==========================================================================
// VIEW 1: SESSION LOGS
// ==========================================================================

function renderSessionView(container) {
    container.innerHTML = `
        <div class="flex h-full gap-4 overflow-hidden">
            <div class="w-1/4 flex flex-col border-r border-[#333] pr-2 h-full">
                <button onclick="window.initNewSessionLog()" class="bg-[#8b0000] hover:bg-red-700 text-white font-bold py-2 px-2 text-[10px] uppercase mb-3 flex items-center justify-center gap-1 shadow-md transition-colors shrink-0">
                    <i class="fas fa-plus"></i> New Session Log
                </button>
                <div id="journal-history-list" class="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar"></div>
            </div>
            <div class="w-3/4 h-full overflow-y-auto pr-2 bg-[#050505] p-2 custom-scrollbar" id="journal-content-area">
                <div class="flex flex-col items-center justify-center h-full text-gray-500 italic text-xs">
                    <i class="fas fa-book-open text-4xl mb-4 opacity-30"></i>
                    Select a session from the list or create a new one.
                </div>
            </div>
        </div>
    `;
    renderJournalHistoryList();
}

function renderJournalHistoryList() {
    const list = document.getElementById('journal-history-list');
    if (!list) return;
    list.innerHTML = '';
    
    const sorted = [...window.state.sessionLogs].sort((a,b) => parseInt(b.sessionNum) - parseInt(a.sessionNum));
    
    if (sorted.length === 0) {
        list.innerHTML = `<div class="text-gray-600 text-[10px] italic text-center mt-4">No logs recorded.</div>`;
        return;
    }

    sorted.forEach(log => {
        const item = document.createElement('div');
        item.className = "bg-[#111] hover:bg-[#222] p-2 cursor-pointer border-l-2 border-transparent hover:border-gold transition-colors group relative mb-1";
        
        // Quoted ID for safety against type coercion issues
        item.innerHTML = `
            <div class="text-[10px] text-white font-bold truncate pr-4">${log.title || 'Untitled Session'}</div>
            <div class="flex justify-between text-[8px] text-gray-500 mt-1 uppercase font-bold">
                <span>Session #${log.sessionNum || '?'}</span>
                <span>${log.datePlayed || '-'}</span>
            </div>
            <button class="absolute top-1 right-1 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-1" onclick="event.stopPropagation(); window.deleteSessionLog('${log.id}')">
                &times;
            </button>
        `;
        item.onclick = () => renderSessionLogForm(log);
        list.appendChild(item);
    });
}

window.initNewSessionLog = function() {
    const lastSession = window.state.sessionLogs.length > 0 
        ? window.state.sessionLogs[window.state.sessionLogs.length - 1] 
        : null;
        
    const nextNum = lastSession ? parseInt(lastSession.sessionNum) + 1 : 1;

    // Detect health
    const healthLevels = ['Bruised', 'Hurt', 'Injured', 'Wounded', 'Mauled', 'Crippled', 'Incapacitated'];
    let currentHealth = "Healthy";
    if (window.state.status && window.state.status.health_states) {
        window.state.status.health_states.forEach((v, i) => { if(v===1) currentHealth = healthLevels[i]; });
    }

    const newLog = {
        id: Date.now(), 
        isNew: true,
        charName: window.state.textFields?.['c-name'] || '',
        chronicle: window.state.textFields?.['c-chronicle'] || '',
        sessionNum: nextNum.toString(),
        datePlayed: new Date().toISOString().split('T')[0],
        gameDate: '', 
        title: '',
        status: { 
            blood: window.state.status.blood||0, 
            willpower: window.state.status.willpower||0, 
            health: currentHealth, 
            effects: '' 
        },
        boonsOwed: [], 
        boonsIOwe: [], 
        npcs: [], 
        scenes: [{id: 1, text: ''}], 
        investigation: [{id: 1, text: ''}], 
        downtime: '',
        xp: 0
    };
    renderSessionLogForm(newLog);
};

window.deleteSessionLog = function(id) {
    if(!confirm("Permanently delete this session log?")) return;
    
    // Use loose equality (==) to match string ID from HTML (if quoted) to potentially numeric ID in state
    window.state.sessionLogs = window.state.sessionLogs.filter(l => l.id != id);
    
    // Force a full re-render of the Journal Tab to ensure UI state is completely reset and clean
    renderJournalTab(); 
    
    if(window.performSave) window.performSave(true);
};

// --- DYNAMIC LOG BUILDER FUNCTIONS (GLOBAL) ---

window.addLogScene = function() {
    const container = document.getElementById('container-scenes');
    if(!container) return;
    const idx = container.children.length;
    
    // New scenes start in EDIT MODE by default
    const html = `
        <div class="mb-4 scene-row bg-[#0a0a0a] border border-[#333] p-1">
            <div class="flex justify-between items-center bg-[#111] px-2 py-1 mb-1 border-b border-[#222]">
                <span class="text-[9px] text-gray-500 font-bold uppercase">Scene ${idx + 1}</span>
                <div class="flex gap-2">
                    <button class="text-[9px] text-gray-400 hover:text-gold uppercase font-bold toggle-btn text-gold" onclick="window.toggleSceneView(this)">Edit Mode</button>
                    <button class="text-[9px] text-gray-400 hover:text-blue-400 uppercase font-bold" onclick="window.defineSelection(this)">Define Selection</button>
                    <button class="text-[9px] text-red-900 hover:text-red-500" onclick="this.closest('.scene-row').remove()">Remove</button>
                </div>
            </div>
            <textarea class="scene-editor w-full bg-transparent text-white text-[11px] p-2 h-24 resize-y border-none focus:ring-0 leading-relaxed" 
                placeholder="Describe the scene..." 
                data-group="scenes"
                oninput="window.handleSmartInput(this)"
                spellcheck="false"></textarea>
            <div class="scene-viewer hidden w-full text-gray-300 text-[11px] p-2 h-auto min-h-[6rem] leading-relaxed whitespace-pre-wrap font-serif"></div>
        </div>`;
    
    container.insertAdjacentHTML('beforeend', html);
};

window.addLogClue = function() {
    const container = document.getElementById('container-investigation');
    if(!container) return;
    const idx = container.children.length;
    const html = `<div class="mb-1 flex gap-1 items-center clue-row"><span class="text-[9px] text-gray-500 w-4">${idx + 1}.</span><input type="text" class="flex-1 bg-[#111] border border-[#333] text-white px-1 text-[10px]" placeholder="Clue / Objective / Secret..." value="" data-group="investigation"><button class="text-gray-600 hover:text-red-500 font-bold px-1" onclick="this.closest('.clue-row').remove()">×</button></div>`;
    container.insertAdjacentHTML('beforeend', html);
};

window.addLogBoon = function(type) { // type = 'boonsOwed' or 'boonsIOwe'
    const container = document.getElementById('container-' + type);
    if(!container) return;
    const html = `<div class="flex gap-1 mb-1 text-[9px] items-center group boon-row"><input type="text" class="flex-1 bg-black/50 border border-[#333] text-white px-1" placeholder="Name" value="" data-group="${type}" data-field="name"><select class="w-20 bg-black/50 border border-[#333] text-white px-1" data-group="${type}" data-field="type"><option value="Trivial">Trivial</option><option value="Minor">Minor</option><option value="Major">Major</option><option value="Life">Life</option></select><input type="text" class="flex-1 bg-black/50 border border-[#333] text-white px-1" placeholder="Reason" value="" data-group="${type}" data-field="reason"><button class="text-gray-600 hover:text-red-500 font-bold px-1" onclick="this.closest('.boon-row').remove()">×</button></div>`;
    container.insertAdjacentHTML('beforeend', html);
};

window.addLogNPC = function() {
    const container = document.getElementById('container-npcs');
    if(!container) return;
    const id = Math.random().toString(36).substr(2, 5);
    const html = `<div class="bg-[#111] p-2 mb-2 border border-[#333] relative group npc-row"><button class="absolute top-1 right-1 text-gray-600 hover:text-red-500 font-bold text-[10px]" onclick="this.closest('.npc-row').remove()">×</button><div class="grid grid-cols-2 gap-2 mb-1"><input type="text" list="npc-list" class="bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Name" value="" data-group="npcs" data-field="name"><input type="text" class="bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Clan/Role" value="" data-group="npcs" data-field="clan"></div><div class="flex gap-2 mb-1 text-[9px] text-gray-400"><label><input type="radio" name="att-${id}" value="Hostile" data-group="npcs" data-field="attitude"> Hostile</label><label><input type="radio" name="att-${id}" value="Neutral" checked data-group="npcs" data-field="attitude"> Neutral</label><label><input type="radio" name="att-${id}" value="Friendly" data-group="npcs" data-field="attitude"> Friendly</label><label><input type="radio" name="att-${id}" value="Dominated" data-group="npcs" data-field="attitude"> Dominated</label></div><input type="text" class="w-full bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Key Notes" value="" data-group="npcs" data-field="notes"></div>`;
    container.insertAdjacentHTML('beforeend', html);
};

function renderSessionLogForm(data) {
    const area = document.getElementById('journal-content-area');
    if(!area) return;

    // Generators
    const boonRow = (b, type) => `<div class="flex gap-1 mb-1 text-[9px] items-center group boon-row"><input type="text" class="flex-1 bg-black/50 border border-[#333] text-white px-1" placeholder="Name" value="${b.name}" data-group="${type}" data-field="name"><select class="w-20 bg-black/50 border border-[#333] text-white px-1" data-group="${type}" data-field="type"><option value="Trivial" ${b.type==='Trivial'?'selected':''}>Trivial</option><option value="Minor" ${b.type==='Minor'?'selected':''}>Minor</option><option value="Major" ${b.type==='Major'?'selected':''}>Major</option><option value="Life" ${b.type==='Life'?'selected':''}>Life</option></select><input type="text" class="flex-1 bg-black/50 border border-[#333] text-white px-1" placeholder="Reason" value="${b.reason}" data-group="${type}" data-field="reason"><button class="text-gray-600 hover:text-red-500 font-bold px-1" onclick="this.closest('.boon-row').remove()">×</button></div>`;
    const npcRow = (n) => `<div class="bg-[#111] p-2 mb-2 border border-[#333] relative group npc-row"><button class="absolute top-1 right-1 text-gray-600 hover:text-red-500 font-bold text-[10px]" onclick="this.closest('.npc-row').remove()">×</button><div class="grid grid-cols-2 gap-2 mb-1"><input type="text" list="npc-list" class="bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Name" value="${n.name}" data-group="npcs" data-field="name"><input type="text" class="bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Clan/Role" value="${n.clan}" data-group="npcs" data-field="clan"></div><div class="flex gap-2 mb-1 text-[9px] text-gray-400"><label><input type="radio" name="att-${n.id}" value="Hostile" ${n.attitude==='Hostile'?'checked':''} data-group="npcs" data-field="attitude"> Hostile</label><label><input type="radio" name="att-${n.id}" value="Neutral" ${n.attitude==='Neutral'?'checked':''} data-group="npcs" data-field="attitude"> Neutral</label><label><input type="radio" name="att-${n.id}" value="Friendly" ${n.attitude==='Friendly'?'checked':''} data-group="npcs" data-field="attitude"> Friendly</label><label><input type="radio" name="att-${n.id}" value="Dominated" ${n.attitude==='Dominated'?'checked':''} data-group="npcs" data-field="attitude"> Dominated</label></div><input type="text" class="w-full bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Key Notes" value="${n.notes}" data-group="npcs" data-field="notes"></div>`;
    const clueRow = (c, idx) => `<div class="mb-1 flex gap-1 items-center clue-row"><span class="text-[9px] text-gray-500 w-4">${idx + 1}.</span><input type="text" class="flex-1 bg-[#111] border border-[#333] text-white px-1 text-[10px]" placeholder="Clue / Objective / Secret..." value="${c.text}" data-group="investigation"><button class="text-gray-600 hover:text-red-500 font-bold px-1" onclick="this.closest('.clue-row').remove()">×</button></div>`;

    const sceneRow = (s, idx) => {
        const hasText = s.text && s.text.trim().length > 0;
        const viewModeClass = hasText ? '' : 'hidden';
        const editModeClass = hasText ? 'hidden' : '';
        const btnText = hasText ? 'Edit Mode' : 'Read Mode';
        const btnClass = hasText ? 'text-gold' : '';
        const viewContent = hasText ? parseSmartText(s.text) : '';

        return `
        <div class="mb-4 scene-row bg-[#0a0a0a] border border-[#333] p-1">
            <div class="flex justify-between items-center bg-[#111] px-2 py-1 mb-1 border-b border-[#222]">
                <span class="text-[9px] text-gray-500 font-bold uppercase">Scene ${idx + 1}</span>
                <div class="flex gap-2">
                    <button class="text-[9px] text-gray-400 hover:text-gold uppercase font-bold toggle-btn ${btnClass}" onclick="window.toggleSceneView(this)">${btnText}</button>
                    <button class="text-[9px] text-gray-400 hover:text-blue-400 uppercase font-bold" onclick="window.defineSelection(this)">Define Selection</button>
                    ${idx > 0 ? `<button class="text-[9px] text-red-900 hover:text-red-500" onclick="this.closest('.scene-row').remove()">Remove</button>` : ''}
                </div>
            </div>
            <textarea class="scene-editor w-full bg-transparent text-white text-[11px] p-2 h-24 resize-y border-none focus:ring-0 leading-relaxed ${editModeClass}" 
                placeholder="Describe the scene..." data-group="scenes" oninput="window.handleSmartInput(this)" spellcheck="false">${s.text}</textarea>
            <div class="scene-viewer w-full text-gray-300 text-[11px] p-2 h-auto min-h-[6rem] leading-relaxed whitespace-pre-wrap font-serif ${viewModeClass}">${viewContent}</div>
        </div>`;
    };

    area.innerHTML = `
        <div class="bg-black border border-[#444] p-4 text-xs font-serif min-h-full relative" id="active-log-form">
            <div class="flex justify-between items-start border-b-2 border-double border-gold pb-2 mb-4">
                <div><h2 class="text-lg text-white font-bold uppercase tracking-wider">Session Journal</h2><div class="text-gold text-[10px]">${data.charName}</div></div>
                <div class="flex gap-2"><button id="btn-save-log" class="bg-green-700 hover:bg-green-600 text-white px-3 py-1 text-[10px] font-bold uppercase rounded">Save</button>${!data.isNew ? `<button id="btn-delete-log" class="bg-red-900 hover:bg-red-700 text-white px-3 py-1 text-[10px] font-bold uppercase rounded">Delete</button>` : ''}</div>
            </div>

            <!-- Details & Status -->
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <div class="text-[10px] font-bold text-gray-500 uppercase mb-1">Session Details</div>
                    <div class="grid grid-cols-3 gap-2 mb-2"><input type="text" id="log-sess-num" class="bg-transparent border-b border-[#333] text-white" placeholder="#" value="${data.sessionNum}"><input type="date" id="log-date" class="bg-transparent border-b border-[#333] text-gray-300" value="${data.datePlayed}"><input type="text" id="log-game-date" class="bg-transparent border-b border-[#333] text-white" placeholder="Game Date" value="${data.gameDate}"></div>
                    <input type="text" id="log-title" class="w-full bg-transparent border-b border-[#333] text-white font-bold text-sm" placeholder="Title" value="${data.title}">
                </div>
                <div class="bg-[#111] p-2 border border-[#333]">
                    <div class="text-[10px] font-bold text-gray-500 uppercase mb-1">Status (Start)</div>
                    <div class="grid grid-cols-3 gap-2 text-[10px] text-gray-300"><div>Blood: <span class="text-red-500 font-bold">${data.status.blood}</span></div><div>WP: <span class="text-blue-400 font-bold">${data.status.willpower}</span></div><div>HP: <span class="text-white font-bold">${data.status.health}</span></div></div>
                    <input type="text" id="log-effects" class="w-full bg-transparent border-b border-[#333] text-white text-[10px] mt-1" value="${data.status.effects}" placeholder="Effects...">
                </div>
            </div>

            <!-- Scenes (Smart Text Enabled) -->
            <div class="mb-4">
                <div class="text-[10px] font-bold text-gray-500 uppercase mb-1 border-b border-gray-700/30">Scenes <button class="ml-2 text-gray-500 hover:text-white" onclick="window.addLogScene()">+</button></div>
                <div id="container-scenes" class="space-y-2">${(data.scenes || [{id:1, text:''}]).map((s, i) => sceneRow(s, i)).join('')}</div>
            </div>

            <!-- Downtime -->
            <div class="mb-4">
                <div class="text-[10px] font-bold text-blue-400 uppercase mb-1 border-b border-blue-500/30">Downtime</div>
                <textarea id="log-downtime" class="w-full h-24 bg-[#111] border border-[#333] text-gray-300 p-2 text-xs focus:border-gold outline-none resize-none smart-text-area" placeholder="Feeding, Training, Influence actions..." oninput="window.handleSmartInput(this)">${data.downtime}</textarea>
            </div>

            <!-- NPCs / Boons / Clues Toggles -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <div class="text-[10px] font-bold text-gold uppercase mb-1">Boons & NPCs</div>
                    <button class="text-[9px] text-gray-400 border border-[#333] px-2 mb-1" onclick="document.getElementById('extra-ledger').classList.toggle('hidden')">Show Ledger</button>
                    <div id="extra-ledger" class="hidden space-y-4 border-l border-[#333] pl-2 mt-2">
                        <div><span class="text-green-400 text-[9px] font-bold">Owed Me</span> <button class="text-[9px] text-gray-500" onclick="window.addLogBoon('boonsOwed')">+</button><div id="container-boonsOwed">${data.boonsOwed.map(b => boonRow(b, 'boonsOwed')).join('')}</div></div>
                        <div><span class="text-red-400 text-[9px] font-bold">I Owe</span> <button class="text-[9px] text-gray-500" onclick="window.addLogBoon('boonsIOwe')">+</button><div id="container-boonsIOwe">${data.boonsIOwe.map(b => boonRow(b, 'boonsIOwe')).join('')}</div></div>
                        <div><span class="text-gold text-[9px] font-bold">NPCs</span> <button class="text-[9px] text-gray-500" onclick="window.addLogNPC()">+</button><div id="container-npcs">${data.npcs.map(n => { n.id = n.id || Math.random().toString(36).substr(2, 5); return npcRow(n); }).join('')}</div></div>
                    </div>
                </div>
                <div>
                    <div class="text-[10px] font-bold text-purple-400 uppercase mb-1">Investigation</div>
                    <div id="container-investigation" class="space-y-1">${(data.investigation || [{id:1, text:''}]).map((c, i) => clueRow(c, i)).join('')}</div>
                    <button class="text-[9px] text-gray-500 mt-1" onclick="window.addLogClue()">+ Clue</button>
                </div>
            </div>
        </div>
    `;

    setupSmartTextAreas(area);

    // Save Handling
    const getVal = (id) => document.getElementById(id)?.value || '';
    const readDyn = (id, mapper) => { const c = document.getElementById(id); return c ? Array.from(c.children).map(mapper).filter(x => x) : []; };

    document.getElementById('btn-save-log').onclick = () => {
        const updated = {
            id: data.id,
            sessionNum: getVal('log-sess-num'),
            datePlayed: getVal('log-date'),
            gameDate: getVal('log-game-date'),
            title: getVal('log-title'),
            status: { ...data.status, effects: getVal('log-effects') },
            downtime: getVal('log-downtime'),
            boonsOwed: readDyn('container-boonsOwed', r => ({ name: r.querySelector('[data-field="name"]').value, type: r.querySelector('[data-field="type"]').value, reason: r.querySelector('[data-field="reason"]').value })),
            boonsIOwe: readDyn('container-boonsIOwe', r => ({ name: r.querySelector('[data-field="name"]').value, type: r.querySelector('[data-field="type"]').value, reason: r.querySelector('[data-field="reason"]').value })),
            npcs: readDyn('container-npcs', r => ({ name: r.querySelector('[data-field="name"]').value, clan: r.querySelector('[data-field="clan"]').value, notes: r.querySelector('[data-field="notes"]').value, attitude: r.querySelector('input:checked')?.value, id: Math.random().toString(36).substr(2,5) })),
            scenes: readDyn('container-scenes', (r, i) => ({ id: i+1, text: r.querySelector('textarea').value })),
            investigation: readDyn('container-investigation', (r, i) => ({ id: i+1, text: r.querySelector('input').value })),
            xp: 0 // Keep for legacy
        };

        if (data.isNew) { delete updated.isNew; window.state.sessionLogs.push(updated); } 
        else { const idx = window.state.sessionLogs.findIndex(l => l.id === data.id); if(idx !== -1) window.state.sessionLogs[idx] = updated; }
        
        renderJournalHistoryList();
        renderSessionLogForm(updated);
        
        if (window.performSave) { window.performSave(true); showNotification("Session Saved & Synced"); } 
        else showNotification("Session Saved Locally");
    };

    if(document.getElementById('btn-delete-log')) {
        document.getElementById('btn-delete-log').onclick = () => {
            if(confirm("Delete log?")) {
                window.state.sessionLogs = window.state.sessionLogs.filter(l => l.id !== data.id);
                renderJournalTab();
                if (window.performSave) window.performSave(true);
            }
        };
    }
}

// ==========================================================================
// VIEW 2: CODEX (DATABASE)
// ==========================================================================

function renderCodexView(container) {
    const isST = activeContext.mode === 'storyteller';
    const bgClass = "bg-[#080808]";
    
    // Updated HTML with overflow classes for scrolling
    container.innerHTML = `
        <div class="flex h-full gap-4 overflow-hidden w-full">
            <!-- Sidebar -->
            <div class="w-1/4 flex flex-col border-r border-[#333] pr-2 h-full">
                <input type="text" id="codex-search" class="bg-[#111] border border-[#333] text-xs p-1 mb-2 text-white placeholder-gray-600" placeholder="Search...">
                <button onclick="window.editCodexEntry()" class="bg-[#d4af37] hover:bg-[#fcd34d] text-black font-bold py-1 px-2 text-[10px] uppercase mb-3 text-center transition-colors">
                    <i class="fas fa-plus mr-1"></i> Add Entry
                </button>
                <div id="codex-list" class="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar"></div>
            </div>

            <!-- Editor / Viewer -->
            <div class="w-3/4 h-full flex flex-col relative overflow-hidden">
                <div class="h-full ${bgClass} border border-[#333] p-6 hidden overflow-y-auto no-scrollbar custom-scrollbar" id="codex-editor">
                    <h3 class="text-xl font-cinzel text-[#d4af37] mb-6 border-b border-[#333] pb-2 uppercase tracking-widest">Entry Details</h3>
                    <input type="hidden" id="cx-id">
                    
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Name (Trigger)</label>
                            <input type="text" id="cx-name" class="w-full bg-[#111] border-b border-[#444] text-white p-2 font-bold focus:border-[#d4af37] outline-none transition-colors">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Image / Map</label>
                            <div class="flex flex-col gap-2">
                                <div id="cx-img-preview" class="w-full h-48 bg-black border border-[#444] flex items-center justify-center overflow-hidden rounded relative group">
                                    <i class="fas fa-image text-gray-700 text-4xl group-hover:text-gray-500 transition-colors"></i>
                                </div>
                                <div class="flex gap-2">
                                    <input type="file" id="cx-file" accept="image/*" class="hidden">
                                    <button onclick="document.getElementById('cx-file').click()" class="bg-[#222] border border-[#444] text-gray-300 px-3 py-1 text-[10px] hover:text-white uppercase font-bold flex-1 transition-colors">Upload</button>
                                    <button id="cx-btn-url" class="bg-[#222] border border-[#444] text-gray-300 px-3 py-1 text-[10px] hover:text-white uppercase font-bold flex-1 transition-colors">Link URL</button>
                                    <button id="cx-remove-img" class="text-red-500 hover:text-red-300 text-[10px] border border-red-900/30 px-3 py-1 uppercase font-bold hidden transition-colors">Remove</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Type</label>
                            <select id="cx-type" class="w-full bg-[#111] border-b border-[#444] text-white p-2 outline-none focus:border-[#d4af37] transition-colors">
                                <option value="NPC">NPC</option>
                                <option value="PC">PC</option>
                                <option value="Location">Location</option>
                                <option value="Faction">Faction</option>
                                <option value="Item">Item</option>
                                <option value="Handout">Handout</option>
                                <option value="Lore">Lore / Rule</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Tags</label>
                            <input type="text" id="cx-tags" class="w-full bg-[#111] border-b border-[#444] text-gray-300 p-2 text-xs focus:border-[#d4af37] outline-none transition-colors" placeholder="e.g. Brujah, Ally, Safehouse">
                        </div>
                    </div>

                    <div class="mb-6">
                        <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Description</label>
                        <textarea id="cx-desc" class="w-full h-64 bg-[#111] border border-[#444] text-gray-300 p-2 text-sm focus:border-[#d4af37] outline-none resize-none leading-relaxed font-serif"></textarea>
                    </div>

                    <div class="flex justify-between mt-auto pt-4 border-t border-[#333]">
                        <div class="flex gap-2">
                            <!-- PUSH BUTTON WITH NEW HANDLER -->
                            ${isST ? `<button onclick="window.handleJournalPush()" class="bg-blue-900/40 border border-blue-500 text-blue-200 px-4 py-2 text-xs uppercase font-bold hover:text-white hover:bg-blue-800 transition-colors"><i class="fas fa-share-alt mr-1"></i> Push to Players</button>` : ''}
                            <button onclick="window.deleteCodexEntry()" class="text-red-500 text-xs hover:text-red-300 uppercase font-bold transition-colors">Delete Entry</button>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="document.getElementById('codex-editor').classList.add('hidden'); document.getElementById('codex-empty-state').classList.remove('hidden');" class="border border-[#444] text-gray-400 px-4 py-2 text-xs uppercase font-bold hover:bg-[#222] transition-colors">Close</button>
                            <!-- SAVE BUTTON -->
                            <button onclick="window.saveCodexEntry(false)" class="bg-[#d4af37] text-black px-6 py-2 text-xs uppercase font-bold hover:bg-[#fcd34d] shadow-lg transition-colors">Save</button>
                        </div>
                    </div>
                </div>
                
                <div id="codex-empty-state" class="w-full flex flex-col items-center justify-center text-gray-600 italic text-xs h-full absolute inset-0 pointer-events-none">
                    <i class="fas fa-search text-4xl mb-4 opacity-30"></i>
                    <p>Select an entry to view details or create a new one.</p>
                    <p class="mt-2 text-[10px] text-gray-700">Entries will auto-link when typed in Journal Logs.</p>
                </div>
            </div>
        </div>
    `;
    
    renderCodexList();
    document.getElementById('codex-search').oninput = (e) => renderCodexList(e.target.value);
    
    bindImageHandlersInEditor();
}

function renderCodexList(filter = "") {
    const list = document.getElementById('codex-list');
    if(!list) return;
    list.innerHTML = "";
    
    const entries = activeContext.data || [];
    const sorted = [...entries].sort((a,b) => a.name.localeCompare(b.name));
    
    sorted.forEach(entry => {
        if(filter && !entry.name.toLowerCase().includes(filter.toLowerCase()) && !entry.tags.some(t=>t.toLowerCase().includes(filter.toLowerCase()))) return;
        
        const item = document.createElement('div');
        item.className = "p-2 border-b border-[#222] cursor-pointer hover:bg-[#1a1a1a] group transition-colors";
        
        let typeColor = "text-gray-500";
        if (entry.type === 'NPC') typeColor = "text-blue-400";
        if (entry.type === 'Location') typeColor = "text-green-400";
        if (entry.type === 'Handout') typeColor = "text-purple-400";

        item.innerHTML = `
            <div class="text-xs font-bold text-gray-200 group-hover:text-[#d4af37] flex items-center justify-between">
                <span>${entry.name}</span>
                ${entry.image ? '<i class="fas fa-image text-[8px] text-gray-600"></i>' : ''}
            </div>
            <div class="flex justify-between items-center mt-0.5">
                <span class="text-[9px] ${typeColor} uppercase font-bold">${entry.type}</span>
                ${entry.pushed && activeContext.mode==='storyteller' ? '<i class="fas fa-share-alt text-[8px] text-green-500" title="Pushed"></i>' : ''}
            </div>
        `;
        item.onclick = () => window.editCodexEntry(entry.id);
        list.appendChild(item);
    });
}

// --- IMAGE HANDLERS (EDITOR) ---
function bindImageHandlersInEditor() {
    const btnUrl = document.getElementById('cx-btn-url');
    const inputUpload = document.getElementById('cx-file');
    const btnRemove = document.getElementById('cx-remove-img');
    const preview = document.getElementById('cx-img-preview');

    if (btnUrl) {
        btnUrl.onclick = () => {
            let url = prompt("Paste Image URL (Discord, Imgur, Drive):");
            if (url) {
                if (window.convertGoogleDriveLink) url = window.convertGoogleDriveLink(url);
                window.currentCodexImage = url;
                preview.innerHTML = `<img src="${url}" class="w-full h-full object-contain">`;
                btnRemove.classList.remove('hidden');
            }
        };
    }

    if (inputUpload) {
        inputUpload.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200; 
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
                    else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                    canvas.width = width; canvas.height = height;
                    const ctxCanvas = canvas.getContext('2d');
                    ctxCanvas.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    
                    window.currentCodexImage = dataUrl;
                    preview.innerHTML = `<img src="${dataUrl}" class="w-full h-full object-contain">`;
                    btnRemove.classList.remove('hidden');
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        };
    }

    if (btnRemove) {
        btnRemove.onclick = () => {
            window.currentCodexImage = null;
            preview.innerHTML = '<i class="fas fa-image text-gray-700 text-4xl group-hover:text-gray-500 transition-colors"></i>';
            btnRemove.classList.add('hidden');
        };
    }
}

// --- ACTIONS (CONTEXT AWARE) ---

window.editCodexEntry = function(id = null) {
    const editor = document.getElementById('codex-editor');
    document.getElementById('codex-empty-state').classList.add('hidden');
    editor.classList.remove('hidden');
    
    let entry = { id: "", name: "", type: "NPC", tags: [], desc: "", image: null };
    
    const source = activeContext.data || [];
    if (id) {
        const found = source.find(c => c.id === id);
        if(found) entry = found;
    }
    
    document.getElementById('cx-id').value = entry.id;
    document.getElementById('cx-name').value = entry.name;
    
    // FIX: TYPE SAVING BUG (Add Custom Type if missing)
    const typeSelect = document.getElementById('cx-type');
    const typeVal = entry.type || "NPC";
    const options = Array.from(typeSelect.options).map(o => o.value);
    
    if (!options.includes(typeVal)) {
        const newOpt = new Option(typeVal, typeVal, true, true);
        typeSelect.add(newOpt);
    }
    typeSelect.value = typeVal;

    document.getElementById('cx-tags').value = entry.tags.join(', ');
    document.getElementById('cx-desc').value = entry.desc;
    
    window.currentCodexImage = entry.image || null;
    const preview = document.getElementById('cx-img-preview');
    const removeBtn = document.getElementById('cx-remove-img');
    
    if(window.currentCodexImage) {
        preview.innerHTML = `<img src="${window.currentCodexImage}" class="w-full h-full object-contain">`;
        removeBtn.classList.remove('hidden');
    } else {
        preview.innerHTML = '<i class="fas fa-image text-gray-700 text-4xl"></i>';
        removeBtn.classList.add('hidden');
    }
}

// Updated Save Function (Returns Promise with ID)
window.saveCodexEntry = async function(closeAfter = false) {
    const idField = document.getElementById('cx-id');
    const id = idField.value;
    const name = document.getElementById('cx-name').value.trim();
    if (!name) {
        showNotification("Name required");
        return null;
    }
    
    // Generate ID immediately if new
    const finalId = id || "cx_" + Date.now();
    // CRITICAL: Update the hidden field so next clicks use this ID
    idField.value = finalId;
    
    const newEntry = {
        id: finalId,
        name: name,
        type: document.getElementById('cx-type').value || "NPC",
        tags: document.getElementById('cx-tags').value.split(',').map(t=>t.trim()).filter(t=>t),
        desc: document.getElementById('cx-desc').value,
        image: window.currentCodexImage || null
    };
    
    if (activeContext.mode === 'player') {
        if (id) {
            const idx = window.state.codex.findIndex(c => c.id === id);
            if(idx !== -1) window.state.codex[idx] = newEntry;
        } else {
            window.state.codex.push(newEntry);
        }
        activeContext.onSave(); 
        showNotification("Entry Saved Locally.");
        renderCodexList();
    } else {
        await activeContext.onSave(newEntry); // Cloud Save (Await ensures completion)
    }
    
    if (closeAfter) {
        document.getElementById('codex-editor').classList.add('hidden');
        document.getElementById('codex-empty-state').classList.remove('hidden');
    }
    
    return finalId;
}

// NEW: Push Handler (Saves first then opens Recipient Modal)
window.handleJournalPush = async function() {
    let id = document.getElementById('cx-id').value;
    
    // Auto-Save if dirty or new (and get the valid ID back)
    id = await window.saveCodexEntry(false); // false = keep open
    if (!id) return;

    // Open Recipient Selection Modal
    const modal = document.getElementById('recipient-modal');
    const list = document.getElementById('recipient-list');
    if (!modal || !list) return;

    // Reset List
    list.innerHTML = '';

    // Filter players (Exclude Journal Entries from the players list)
    // Use window.stState to ensure access
    const stState = window.stState || {};
    const players = Object.entries(stState.players || {}).filter(([_, p]) => !p.metadataType || p.metadataType !== 'journal');
    
    if (players.length === 0) {
        list.innerHTML = `<div class="text-[10px] text-gray-500 italic text-center py-2">No players connected.</div>`;
    } else {
        players.forEach(([uid, p]) => {
            const row = document.createElement('label');
            row.className = "flex items-center justify-between p-2 hover:bg-[#222] rounded cursor-pointer group";
            row.innerHTML = `
                <div class="flex items-center gap-3">
                    <input type="checkbox" class="recipient-checkbox w-4 h-4 accent-[#d4af37]" value="${uid}">
                    <span class="text-xs text-gray-300 group-hover:text-white">${p.character_name || "Unknown"}</span>
                </div>
                <span class="text-[8px] text-gray-600 font-mono uppercase">${uid.substring(0, 8)}</span>
            `;
            list.appendChild(row);
        });
    }

    // Auto-deselect individual boxes if All is checked
    const allCheck = document.getElementById('push-all');
    allCheck.addEventListener('change', () => {
        const boxes = document.querySelectorAll('.recipient-checkbox');
        boxes.forEach(b => { 
            b.disabled = allCheck.checked; 
            if(allCheck.checked) b.checked = false; 
        });
    });

    const pushBtn = document.getElementById('confirm-push-btn');
    pushBtn.onclick = async () => {
        const isAll = document.getElementById('push-all').checked;
        const selected = Array.from(document.querySelectorAll('.recipient-checkbox:checked')).map(cb => cb.value);
        
        if (!isAll && selected.length === 0) {
            showNotification("Select at least one recipient", "error");
            return;
        }

        modal.classList.add('hidden');
        
        // Call ST Push Function with recipient list
        if (window.stPushHandout) {
            await window.stPushHandout(id, isAll ? null : selected);
        } else {
            console.error("stPushHandout not found on window");
        }
    };

    modal.classList.remove('hidden');
}

window.deleteCodexEntry = async function() {
    const id = document.getElementById('cx-id').value;
    if(!id) return;
    if(!confirm("Delete this entry?")) return;
    
    if (activeContext.mode === 'player') {
        window.state.codex = window.state.codex.filter(c => c.id !== id);
        activeContext.onSave();
        renderCodexList();
    } else {
        await activeContext.onDelete(id);
    }
    document.getElementById('codex-editor').classList.add('hidden');
    document.getElementById('codex-empty-state').classList.remove('hidden');
}

// ==========================================================================
// SMART TEXT & PARSER (Auto-Linking Logic)
// ==========================================================================

function setupSmartTextAreas(container) {
    const textareas = container.querySelectorAll('.smart-text-area');
    const suggestions = document.getElementById('autocomplete-suggestions');
    
    textareas.forEach(ta => {
        ta.addEventListener('input', (e) => {
            const val = ta.value;
            const cursor = ta.selectionStart;
            const textBefore = val.substring(0, cursor);
            
            // Detect "@" trigger
            const match = textBefore.match(/@([\w\s]*)$/);
            
            if (match) {
                const query = match[1].toLowerCase();
                const matches = codexCache.filter(name => name.toLowerCase().includes(query));
                
                if (matches.length > 0) {
                    showSuggestions(matches, ta, cursor, match[0].length);
                } else {
                    suggestions.style.display = 'none';
                }
            } else {
                suggestions.style.display = 'none';
            }
        });
    });
}

function showSuggestions(matches, inputEl, cursor, triggerLen) {
    const suggestions = document.getElementById('autocomplete-suggestions');
    if(!suggestions) return;
    
    suggestions.innerHTML = '';
    const rect = inputEl.getBoundingClientRect();
    
    suggestions.style.left = (rect.left + 10) + 'px';
    suggestions.style.top = (rect.top + 30) + 'px'; 
    suggestions.style.display = 'block';
    
    matches.forEach(m => {
        const div = document.createElement('div');
        div.className = "autocomplete-item";
        div.innerText = m;
        div.onmousedown = (e) => { 
            e.preventDefault();
            const text = inputEl.value;
            const before = text.substring(0, cursor - triggerLen);
            const after = text.substring(cursor);
            inputEl.value = before + m + after;
            suggestions.style.display = 'none';
        };
        suggestions.appendChild(div);
    });
}

// 1. Toggle between Textarea and Rich View
window.toggleSceneView = function(btn) {
    const row = btn.closest('.scene-row');
    const editor = row.querySelector('.scene-editor');
    const viewer = row.querySelector('.scene-viewer');
    
    if (editor.classList.contains('hidden')) {
        editor.classList.remove('hidden');
        viewer.classList.add('hidden');
        btn.innerText = "Read Mode";
        btn.classList.remove('text-gold');
        btn.classList.remove('toggle-btn'); 
    } else {
        const rawText = editor.value;
        const html = parseSmartText(rawText);
        viewer.innerHTML = html;
        editor.classList.add('hidden');
        viewer.classList.remove('hidden');
        btn.innerText = "Edit Mode";
        btn.classList.add('text-gold');
        btn.classList.add('toggle-btn');
    }
}

// 2. Parse Text to add Links
function parseSmartText(text) {
    if (!text) return "";
    let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Use codexCache derived from current context
    const sortedCache = [...codexCache].sort((a,b) => b.length - a.length);
    
    sortedCache.forEach(name => {
        const regex = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'gi');
        // Find corresponding ID in data
        const entry = (activeContext.data || []).find(c => c.name === name);
        if (entry) {
            safeText = safeText.replace(regex, (match) => {
                return `<span class="codex-link" onclick="window.viewCodex('${entry.id}')">${match}</span>`;
            });
        }
    });
    
    return safeText.replace(/\n/g, '<br>');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 3. View Codex Popup
function ensureJournalContext() {
    // If we already have data and handlers, we assume it's good
    if (activeContext.data && activeContext.onSave) return;

    if (window.stState && window.stState.isStoryteller) {
        // ST Mode Initialization
        const stState = window.stState;
        const journalArray = Object.values(stState.journal || {});
        
        activeContext = {
            mode: 'storyteller',
            data: journalArray,
            onSave: async (entry) => {
                if (!stState.activeChronicleId) { showNotification("No Active Chronicle", "error"); return; }
                try {
                    const safeId = entry.id.startsWith('journal_') ? entry.id : 'journal_' + entry.id;
                    const docRef = doc(db, 'chronicles', stState.activeChronicleId, 'players', safeId);
                    await setDoc(docRef, { ...entry, metadataType: 'journal', original_id: entry.id }, { merge: true });
                    showNotification("Journal Synced.");
                } catch(e) { console.error(e); showNotification("Sync Failed", "error"); }
            },
            onDelete: async (id) => {
                if (!stState.activeChronicleId) return;
                try {
                    const safeId = id.startsWith('journal_') ? id : 'journal_' + id;
                    await deleteDoc(doc(db, 'chronicles', stState.activeChronicleId, 'players', safeId));
                    showNotification("Entry Deleted.");
                } catch(e) { console.error(e); }
            }
        };
    } else if (window.state) {
        // Player Mode Initialization
        activeContext = {
            mode: 'player',
            data: window.state.codex || [],
            onSave: () => { if (window.performSave) window.performSave(true); },
            onDelete: () => { if (window.performSave) window.performSave(true); }
        };
    }
}

window.viewCodex = function(id) {
    // 1. Ensure Context is initialized (essential for external calls from Map)
    ensureJournalContext();
    
    // 2. Ensure Modal Exists in DOM
    let modal = document.getElementById('codex-popup');
    if (!modal) {
        const div = document.createElement('div');
        div.innerHTML = renderPopupModal();
        modal = div.firstElementChild;
        document.body.appendChild(modal);
        bindPopupListeners(); // Rebind listeners for the new modal
    }

    // 3. Proceed with finding entry
    const entry = (activeContext.data || []).find(c => c.id === id);
    if (!entry) {
        // Fallback: If context didn't have it, try refreshing data from source one last time
        if (window.stState && window.stState.isStoryteller) {
             const freshData = Object.values(window.stState.journal || {});
             activeContext.data = freshData;
             const retry = freshData.find(c => c.id === id);
             if (retry) { window.viewCodex(id); return; }
        }
        console.warn("Codex entry not found:", id);
        return;
    }
    
    const viewDiv = document.getElementById('codex-popup-view');
    const editDiv = document.getElementById('codex-popup-edit');
    
    viewDiv.classList.remove('hidden');
    editDiv.classList.add('hidden');
    
    document.getElementById('codex-popup-title').innerText = entry.name;
    document.getElementById('codex-popup-desc').innerText = entry.desc || "No description provided.";
    
    const imgContainer = document.getElementById('codex-popup-img-container');
    const imgEl = document.getElementById('codex-popup-img');
    
    if (entry.image) {
        imgEl.src = entry.image;
        imgContainer.classList.remove('hidden');
    } else {
        imgContainer.classList.add('hidden');
    }
    
    const tagCont = document.getElementById('codex-popup-tags');
    tagCont.innerHTML = `<span class="codex-tag border border-gray-600 text-gray-400">${entry.type}</span>` + 
        entry.tags.map(t => `<span class="codex-tag">${t}</span>`).join('');
        
    const editBtn = document.getElementById('codex-popup-edit-btn');
    editBtn.onclick = () => {
        viewDiv.classList.add('hidden');
        editDiv.classList.remove('hidden');
        
        document.getElementById('quick-cx-id').value = entry.id;
        document.getElementById('quick-cx-name').value = entry.name;
        document.getElementById('quick-cx-type').value = entry.type;
        document.getElementById('quick-cx-tags').value = entry.tags.join(', ');
        document.getElementById('quick-cx-desc').value = entry.desc;
        
        window.currentCodexImage = entry.image || null;
        const preview = document.getElementById('quick-cx-img-preview');
        if(window.currentCodexImage) {
            preview.innerHTML = `<img src="${window.currentCodexImage}" class="w-full h-full object-contain">`;
            document.getElementById('quick-cx-remove-img').classList.remove('hidden');
        } else {
            preview.innerHTML = '<i class="fas fa-image text-gray-700 text-3xl"></i>';
            document.getElementById('quick-cx-remove-img').classList.add('hidden');
        }
    };
    
    // Inject "Push" button if ST
    const pushCont = document.getElementById('st-push-container');
    if (activeContext.mode === 'storyteller' && window.stPushHandout) {
        // Use handleJournalPush to open the selector
        pushCont.innerHTML = `<button onclick="window.handleJournalPush()" class="text-xs bg-blue-900/40 text-blue-200 border border-blue-500 px-3 py-1 uppercase font-bold hover:text-white mr-4"><i class="fas fa-share-alt mr-1"></i> Push Handout</button>`;
    } else {
        pushCont.innerHTML = '';
    }
    
    modal.classList.remove('hidden');
}

// 4. Define Selection
window.defineSelection = function(btn) {
    const row = btn.closest('.scene-row');
    const textarea = row.querySelector('.scene-editor');
    
    if (textarea.classList.contains('hidden')) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end) {
        showNotification("Highlight text first.");
        return;
    }
    
    const selectedText = textarea.value.substring(start, end).trim();
    if (!selectedText) return;
    
    const modal = document.getElementById('codex-popup');
    const viewDiv = document.getElementById('codex-popup-view');
    const editDiv = document.getElementById('codex-popup-edit');
    
    viewDiv.classList.add('hidden');
    editDiv.classList.remove('hidden');
    
    document.getElementById('quick-cx-id').value = "";
    document.getElementById('quick-cx-name').value = selectedText;
    document.getElementById('quick-cx-type').value = "NPC";
    document.getElementById('quick-cx-tags').value = "";
    document.getElementById('quick-cx-desc').value = "";
    window.currentCodexImage = null;
    document.getElementById('quick-cx-img-preview').innerHTML = '<i class="fas fa-image text-gray-700 text-3xl"></i>';
    document.getElementById('quick-cx-remove-img').classList.add('hidden');
    
    modal.classList.remove('hidden');
    document.getElementById('quick-cx-desc').focus();
    
    showNotification(`Defining: ${selectedText}`);
}

window.saveQuickCodex = function() {
    const id = document.getElementById('quick-cx-id').value;
    const name = document.getElementById('quick-cx-name').value.trim();
    if (!name) return showNotification("Name required");
    
    const newEntry = {
        id: id || "cx_" + Date.now(),
        name: name,
        type: document.getElementById('quick-cx-type').value,
        tags: document.getElementById('quick-cx-tags').value.split(',').map(t=>t.trim()).filter(t=>t),
        desc: document.getElementById('quick-cx-desc').value,
        image: window.currentCodexImage || null
    };
    
    if (activeContext.mode === 'player') {
        if (id) {
            const idx = window.state.codex.findIndex(c => c.id === id);
            if(idx !== -1) window.state.codex[idx] = newEntry;
        } else {
            window.state.codex.push(newEntry);
        }
        activeContext.onSave();
        showNotification("Quick Entry Saved.");
    } else {
        activeContext.onSave(newEntry); 
    }
    
    document.getElementById('codex-popup').classList.add('hidden');
    codexCache = (activeContext.data || []).map(c => c.name);
}

// --- GLOBAL LISTENERS ---
function bindPopupListeners() {
    const fileInput = document.getElementById('quick-cx-file');
    const urlBtn = document.getElementById('quick-cx-btn-url');
    const removeBtn = document.getElementById('quick-cx-remove-img');
    const preview = document.getElementById('quick-cx-img-preview');

    if(urlBtn) {
        urlBtn.onclick = () => {
            let url = prompt("Paste Image URL:");
            if(url) {
                if(window.convertGoogleDriveLink) url = window.convertGoogleDriveLink(url);
                window.currentCodexImage = url;
                if(preview) {
                    preview.innerHTML = `<img src="${url}" class="w-full h-full object-contain">`;
                    removeBtn.classList.remove('hidden');
                }
            }
        };
    }
    if(removeBtn) {
        removeBtn.onclick = () => {
            window.currentCodexImage = null;
            preview.innerHTML = '<i class="fas fa-image text-gray-700 text-3xl"></i>';
            removeBtn.classList.add('hidden');
        };
    }
}

// Handle AutoComplete
window.handleSmartInput = function(textarea) {
    const text = textarea.value;
    const cursorPos = textarea.selectionStart;
    
    const lastChunk = text.substring(0, cursorPos).split(/[\n\.\,\!\?]/).pop();
    const lastWord = lastChunk.trim().split(" ").pop(); 
    
    if (lastWord.length < 2) {
        document.getElementById('autocomplete-suggestions').style.display = 'none';
        return;
    }
    
    const matches = codexCache.filter(name => name.toLowerCase().startsWith(lastWord.toLowerCase()) && name.toLowerCase() !== lastWord.toLowerCase());
    
    if (matches.length > 0) {
        showSuggestions(matches, textarea, cursorPos, lastWord.length);
    } else {
        document.getElementById('autocomplete-suggestions').style.display = 'none';
    }
}

window.applyAutocomplete = function(fullName) {
    const ta = window.activeSmartTextarea;
    if (!ta) return;
    
    const partial = window.lastPartial;
    const text = ta.value;
    const pos = ta.selectionStart;
    
    const before = text.substring(0, pos - partial.length);
    const after = text.substring(pos);
    
    ta.value = before + fullName + after;
    
    document.getElementById('autocomplete-suggestions').style.display = 'none';
    ta.focus();
}

document.addEventListener('click', (e) => {
    // FIX: Check if suggestions exists BEFORE checking style to avoid startup crash
    const suggestions = document.getElementById('autocomplete-suggestions');
    if (suggestions && !e.target.closest('.autocomplete-box')) {
        suggestions.style.display = 'none';
    }
});

// Exports
window.saveQuickCodex = window.saveQuickCodex || (() => {});
window.renderJournalTab = renderJournalTab;
