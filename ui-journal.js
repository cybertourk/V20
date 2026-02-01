import { showNotification } from "./ui-common.js";
import { db, doc, setDoc, deleteDoc } from "./firebase-config.js";

// NOTE: We access window.stState instead of importing to avoid circular dependency.

// Global Codex Cache for Autosuggest & Linking
let codexCache = [];

// --- CONFIGURATION STATE ---
let activeContext = {
    mode: 'player', // 'player' or 'storyteller'
    data: null,     // Reference to the array (window.state.codex or stState.journal)
    onSave: null,   // Callback for saving
    onDelete: null  // Callback for deleting
};

// ==========================================================================
// PUBLIC EXPORTS & ENTRY POINTS
// ==========================================================================

export function renderJournalTab() {
    // PLAYER ENTRY POINT
    const container = document.getElementById('play-mode-5');
    if (!container) return;

    // Default Player State Initialization
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
    const stState = window.stState || {};
    const journalArray = Object.values(stState.journal || {});

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

    // Ensure container is cleared and ready
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = "h-full w-full relative";
    wrapper.id = "journal-main-view";
    container.appendChild(wrapper);

    // Inject Modals into body if missing (Global)
    ensureModalsExist();

    renderCodexView(wrapper);
}

// Smart Update Function used by Storyteller Live Listener
export function updateJournalList(newData) {
    activeContext.data = newData || [];
    codexCache = (activeContext.data || []).map(c => c.name);
    
    // Only re-render the list part, leave the editor alone to prevent focus loss
    const list = document.getElementById('codex-list');
    if (list) renderCodexList(list);
}

// ==========================================================================
// SHARED UI SHELL
// ==========================================================================

function renderJournalInterface(container, activeTab) {
    // Update Cache
    codexCache = (activeContext.data || []).map(c => c.name);
    
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = "flex flex-col h-full relative";
    
    // Tabs (Player Only)
    if (activeContext.mode === 'player') {
        const tabs = document.createElement('div');
        tabs.className = "flex gap-6 border-b border-[#333] pb-2 mb-2 px-2 shrink-0";
        
        const btnSess = document.createElement('button');
        btnSess.className = `text-xs uppercase tracking-wider px-2 pb-1 ${activeTab==='sessions' ? 'border-b-2 border-[#d4af37] text-[#d4af37] font-bold' : 'text-gray-500 hover:text-white transition-colors'}`;
        btnSess.innerText = "Session Logs";
        btnSess.onclick = () => {
            window.state.journalTab = 'sessions';
            renderJournalInterface(container, 'sessions');
        };
        
        const btnCodex = document.createElement('button');
        btnCodex.className = `text-xs uppercase tracking-wider px-2 pb-1 ${activeTab==='codex' ? 'border-b-2 border-[#d4af37] text-[#d4af37] font-bold' : 'text-gray-500 hover:text-white transition-colors'}`;
        btnCodex.innerText = "Codex";
        btnCodex.onclick = () => {
            window.state.journalTab = 'codex';
            renderJournalInterface(container, 'codex');
        };
        
        tabs.appendChild(btnSess);
        tabs.appendChild(btnCodex);
        wrapper.appendChild(tabs);
    }
    
    const mainView = document.createElement('div');
    mainView.id = "journal-main-view";
    mainView.className = "flex-1 overflow-hidden h-full relative";
    wrapper.appendChild(mainView);
    
    // Autocomplete Container
    const acBox = document.createElement('div');
    acBox.id = "autocomplete-suggestions";
    acBox.className = "autocomplete-box";
    wrapper.appendChild(acBox);
    
    container.appendChild(wrapper);
    
    ensureModalsExist(); // Inject modals into DOM
    
    if (activeContext.mode === 'storyteller') {
        renderCodexView(mainView);
    } else {
        if (activeTab === 'sessions') renderSessionView(mainView);
        else renderCodexView(mainView);
    }
}

function ensureModalsExist() {
    // 1. Codex Popup/Editor Modal
    if (!document.getElementById('codex-popup')) {
        const m = document.createElement('div');
        m.id = 'codex-popup';
        m.className = "fixed inset-0 bg-black/90 z-[10000] hidden flex items-center justify-center p-4 backdrop-blur-sm";
        // Using innerHTML here for the static modal structure is safe and efficient
        m.innerHTML = `
            <div class="bg-[#1a1a1a] border border-[#d4af37] p-6 max-w-lg w-full shadow-[0_0_30px_rgba(0,0,0,0.8)] relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar">
                <button id="close-codex-popup" class="absolute top-2 right-3 text-gray-500 hover:text-white text-xl">&times;</button>
                
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

                <!-- EDIT MODE -->
                <div id="codex-popup-edit" class="hidden flex flex-col gap-3">
                    <h3 class="text-lg text-[#d4af37] font-bold border-b border-[#333] pb-2">Define / Edit Entry</h3>
                    <input type="hidden" id="quick-cx-id">
                    <div><label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Name</label><input type="text" id="quick-cx-name" class="w-full bg-[#111] border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"></div>
                    <div>
                        <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Image</label>
                        <div class="flex flex-col gap-2">
                            <div id="quick-cx-img-preview" class="w-full h-48 bg-black border border-[#444] flex items-center justify-center overflow-hidden rounded"><i class="fas fa-image text-gray-700 text-3xl"></i></div>
                            <div class="flex gap-2">
                                <input type="file" id="quick-cx-file" accept="image/*" class="hidden">
                                <button id="quick-cx-upload-btn" class="bg-[#222] border border-[#444] text-gray-300 px-3 py-1 text-[10px] hover:text-white uppercase font-bold flex-1">Upload</button>
                                <button id="quick-cx-btn-url" class="bg-[#222] border border-[#444] text-gray-300 px-3 py-1 text-[10px] hover:text-white uppercase font-bold flex-1">Link URL</button>
                                <button id="quick-cx-remove-img" class="text-red-500 hover:text-red-300 text-[10px] border border-red-900/30 px-3 py-1 uppercase font-bold hidden">Remove</button>
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Type</label>
                            <select id="quick-cx-type" class="w-full bg-[#111] border-b border-[#444] text-white p-1 text-xs outline-none">
                                <option value="NPC">NPC</option><option value="Location">Location</option><option value="Faction">Faction</option><option value="Item">Item</option><option value="Handout">Handout</option><option value="Lore">Lore / Rule</option>
                            </select>
                        </div>
                        <div><label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Tags</label><input type="text" id="quick-cx-tags" class="w-full bg-[#111] border-b border-[#444] text-gray-300 p-1 text-xs outline-none" placeholder="e.g. Brujah, Ally"></div>
                    </div>
                    <div><label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Description</label><textarea id="quick-cx-desc" class="w-full h-32 bg-[#111] border border-[#444] text-gray-300 p-2 text-sm focus:border-[#d4af37] outline-none resize-none"></textarea></div>
                    <div class="flex justify-end gap-2 mt-2">
                        <button id="cancel-quick-cx" class="border border-[#444] text-gray-400 px-3 py-1 text-xs uppercase font-bold hover:bg-[#222]">Cancel</button>
                        <button id="save-quick-cx" class="bg-[#d4af37] text-black px-4 py-1 text-xs uppercase font-bold hover:bg-[#fcd34d]">Save</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(m);
        
        // Bind Close Buttons
        document.getElementById('close-codex-popup').onclick = () => m.classList.add('hidden');
        document.getElementById('cancel-quick-cx').onclick = () => m.classList.add('hidden');
        document.getElementById('save-quick-cx').onclick = window.saveQuickCodex;
        
        // Bind Image Logic
        bindPopupListeners(); 
    }

    // 2. Recipient Modal (NEW)
    if (!document.getElementById('recipient-modal')) {
        const rm = document.createElement('div');
        rm.id = 'recipient-modal';
        rm.className = "fixed inset-0 bg-black/80 z-[20000] hidden flex items-center justify-center p-4 backdrop-blur-sm";
        rm.innerHTML = `
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
                    <!-- Players injected here dynamically -->
                </div>
                
                <div class="flex justify-between gap-2 border-t border-[#333] pt-4">
                    <button id="cancel-push" class="text-gray-500 hover:text-white text-xs uppercase font-bold px-4 py-2 border border-transparent hover:border-[#444]">Cancel</button>
                    <button id="confirm-push-btn" class="bg-blue-900 text-white px-6 py-2 text-xs uppercase font-bold hover:bg-blue-700 shadow-lg border border-blue-700">Push Handout</button>
                </div>
            </div>`;
        document.body.appendChild(rm);
        document.getElementById('cancel-push').onclick = () => rm.classList.add('hidden');
    }
}

// ==========================================================================
// VIEW 1: SESSION LOGS (Verbose DOM Construction)
// ==========================================================================

function renderSessionView(container) {
    container.innerHTML = '';
    const flex = document.createElement('div');
    flex.className = "flex h-full gap-4";
    
    // Sidebar: History
    const sidebar = document.createElement('div');
    sidebar.className = "w-1/4 flex flex-col border-r border-[#333] pr-2";
    
    const newBtn = document.createElement('button');
    newBtn.className = "bg-[#8b0000] hover:bg-red-700 text-white font-bold py-2 px-2 text-[10px] uppercase mb-3 flex items-center justify-center gap-1 shadow-md transition-colors";
    newBtn.innerHTML = '<i class="fas fa-plus"></i> New Session Log';
    newBtn.onclick = window.initNewSessionLog;
    sidebar.appendChild(newBtn);
    
    const historyList = document.createElement('div');
    historyList.id = 'journal-history-list';
    historyList.className = "flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar";
    sidebar.appendChild(historyList);
    
    // Content Area
    const content = document.createElement('div');
    content.id = 'journal-content-area';
    content.className = "w-3/4 h-full overflow-y-auto pr-2 bg-[#050505] p-2 custom-scrollbar";
    content.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-500 italic text-xs">
        <i class="fas fa-book-open text-4xl mb-4 opacity-30"></i>
        Select a session from the list or create a new one.
    </div>`;
    
    flex.appendChild(sidebar);
    flex.appendChild(content);
    container.appendChild(flex);
    
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
        
        item.innerHTML = `
            <div class="text-[10px] text-white font-bold truncate pr-4">${log.title || 'Untitled Session'}</div>
            <div class="flex justify-between text-[8px] text-gray-500 mt-1 uppercase font-bold">
                <span>Session #${log.sessionNum || '?'}</span>
                <span>${log.datePlayed || '-'}</span>
            </div>
        `;
        
        // Delete button inside the list item
        const delBtn = document.createElement('button');
        delBtn.className = "absolute top-1 right-1 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-1";
        delBtn.innerHTML = "&times;";
        delBtn.onclick = (e) => {
            e.stopPropagation();
            window.deleteSessionLog(log.id);
        };
        
        item.appendChild(delBtn);
        item.onclick = () => renderSessionLogForm(log);
        list.appendChild(item);
    });
}

function renderSessionLogForm(data) {
    const area = document.getElementById('journal-content-area');
    if (!area) return;
    area.innerHTML = '';

    const form = document.createElement('div');
    form.className = "bg-black border border-[#444] p-4 text-xs font-serif min-h-full relative";
    form.id = "active-log-form";

    // 1. Header
    const header = document.createElement('div');
    header.className = "flex justify-between items-start border-b-2 border-double border-gold pb-2 mb-4";
    header.innerHTML = `<div><h2 class="text-lg text-white font-bold uppercase tracking-wider">Session Journal</h2><div class="text-gold text-[10px]">${data.charName}</div></div>`;
    
    const controls = document.createElement('div');
    controls.className = "flex gap-2";
    
    const saveBtn = document.createElement('button');
    saveBtn.className = "bg-green-700 hover:bg-green-600 text-white px-3 py-1 text-[10px] font-bold uppercase rounded";
    saveBtn.innerText = "Save";
    saveBtn.onclick = () => saveSessionLog(data.id, data.isNew);
    controls.appendChild(saveBtn);
    
    if (!data.isNew) {
        const delBtn = document.createElement('button');
        delBtn.className = "bg-red-900 hover:bg-red-700 text-white px-3 py-1 text-[10px] font-bold uppercase rounded";
        delBtn.innerText = "Delete";
        delBtn.onclick = () => window.deleteSessionLog(data.id);
        controls.appendChild(delBtn);
    }
    
    header.appendChild(controls);
    form.appendChild(header);

    // 2. Details Grid
    const grid = document.createElement('div');
    grid.className = "grid grid-cols-2 gap-4 mb-4";
    
    const leftCol = document.createElement('div');
    leftCol.innerHTML = `<div class="text-[10px] font-bold text-gray-500 uppercase mb-1">Session Details</div>`;
    const metaRow = document.createElement('div');
    metaRow.className = "grid grid-cols-3 gap-2 mb-2";
    metaRow.innerHTML = `
        <input type="text" id="log-sess-num" class="bg-transparent border-b border-[#333] text-white" placeholder="#" value="${data.sessionNum}">
        <input type="date" id="log-date" class="bg-transparent border-b border-[#333] text-gray-300" value="${data.datePlayed}">
        <input type="text" id="log-game-date" class="bg-transparent border-b border-[#333] text-white" placeholder="Game Date" value="${data.gameDate}">
    `;
    leftCol.appendChild(metaRow);
    leftCol.innerHTML += `<input type="text" id="log-title" class="w-full bg-transparent border-b border-[#333] text-white font-bold text-sm" placeholder="Title" value="${data.title}">`;
    
    const rightCol = document.createElement('div');
    rightCol.className = "bg-[#111] p-2 border border-[#333]";
    rightCol.innerHTML = `
        <div class="text-[10px] font-bold text-gray-500 uppercase mb-1">Status (Start)</div>
        <div class="grid grid-cols-3 gap-2 text-[10px] text-gray-300">
            <div>Blood: <span class="text-red-500 font-bold">${data.status.blood}</span></div>
            <div>WP: <span class="text-blue-400 font-bold">${data.status.willpower}</span></div>
            <div>HP: <span class="text-white font-bold">${data.status.health}</span></div>
        </div>
        <input type="text" id="log-effects" class="w-full bg-transparent border-b border-[#333] text-white text-[10px] mt-1" value="${data.status.effects}" placeholder="Effects...">
    `;
    
    grid.appendChild(leftCol);
    grid.appendChild(rightCol);
    form.appendChild(grid);

    // 3. Scenes
    const scenesDiv = document.createElement('div');
    scenesDiv.className = "mb-4";
    scenesDiv.innerHTML = `<div class="text-[10px] font-bold text-gray-500 uppercase mb-1 border-b border-gray-700/30">Scenes</div>`;
    
    const addSceneBtn = document.createElement('button');
    addSceneBtn.className = "ml-2 text-gray-500 hover:text-white";
    addSceneBtn.innerText = "+";
    addSceneBtn.onclick = () => window.addLogScene(containerScenes);
    scenesDiv.querySelector('div').appendChild(addSceneBtn);
    
    const containerScenes = document.createElement('div');
    containerScenes.id = 'container-scenes';
    containerScenes.className = "space-y-2";
    (data.scenes || [{id:1, text:''}]).forEach((s, i) => addSceneRow(containerScenes, s, i));
    scenesDiv.appendChild(containerScenes);
    form.appendChild(scenesDiv);

    // 4. Downtime
    const dtDiv = document.createElement('div');
    dtDiv.className = "mb-4";
    dtDiv.innerHTML = `<div class="text-[10px] font-bold text-blue-400 uppercase mb-1 border-b border-blue-500/30">Downtime</div>`;
    const dtText = document.createElement('textarea');
    dtText.id = "log-downtime";
    dtText.className = "w-full h-24 bg-[#111] border border-[#333] text-gray-300 p-2 text-xs focus:border-gold outline-none resize-none smart-text-area";
    dtText.placeholder = "Feeding, Training, Influence actions...";
    dtText.value = data.downtime;
    dtDiv.appendChild(dtText);
    form.appendChild(dtDiv);

    // 5. Ledger (Boons, NPCs, Investigation)
    const ledgerGrid = document.createElement('div');
    ledgerGrid.className = "grid grid-cols-1 md:grid-cols-2 gap-4";
    
    const boonsCol = document.createElement('div');
    boonsCol.innerHTML = `
        <div class="text-[10px] font-bold text-gold uppercase mb-1">Boons & NPCs</div>
        <button class="text-[9px] text-gray-400 border border-[#333] px-2 mb-1" onclick="document.getElementById('extra-ledger').classList.toggle('hidden')">Show Ledger</button>
    `;
    const ledgerContent = document.createElement('div');
    ledgerContent.id = "extra-ledger";
    ledgerContent.className = "hidden space-y-4 border-l border-[#333] pl-2 mt-2";
    
    // Owed Me
    const owedMeDiv = document.createElement('div');
    owedMeDiv.innerHTML = `<span class="text-green-400 text-[9px] font-bold">Owed Me</span> <button class="text-[9px] text-gray-500">+</button>`;
    owedMeDiv.querySelector('button').onclick = () => window.addLogBoon('boonsOwed');
    const owedMeCont = document.createElement('div'); owedMeCont.id = 'container-boonsOwed';
    data.boonsOwed.forEach(b => addBoonRow(owedMeCont, b, 'boonsOwed'));
    owedMeDiv.appendChild(owedMeCont);
    ledgerContent.appendChild(owedMeDiv);

    // I Owe
    const iOweDiv = document.createElement('div');
    iOweDiv.innerHTML = `<span class="text-red-400 text-[9px] font-bold">I Owe</span> <button class="text-[9px] text-gray-500">+</button>`;
    iOweDiv.querySelector('button').onclick = () => window.addLogBoon('boonsIOwe');
    const iOweCont = document.createElement('div'); iOweCont.id = 'container-boonsIOwe';
    data.boonsIOwe.forEach(b => addBoonRow(iOweCont, b, 'boonsIOwe'));
    iOweDiv.appendChild(iOweCont);
    ledgerContent.appendChild(iOweDiv);
    
    // NPCs
    const npcDiv = document.createElement('div');
    npcDiv.innerHTML = `<span class="text-gold text-[9px] font-bold">NPCs</span> <button class="text-[9px] text-gray-500">+</button>`;
    npcDiv.querySelector('button').onclick = () => window.addLogNPC();
    const npcCont = document.createElement('div'); npcCont.id = 'container-npcs';
    data.npcs.forEach(n => addNpcRow(npcCont, n));
    npcDiv.appendChild(npcCont);
    ledgerContent.appendChild(npcDiv);
    
    boonsCol.appendChild(ledgerContent);
    ledgerGrid.appendChild(boonsCol);

    // Investigation
    const investCol = document.createElement('div');
    investCol.innerHTML = `<div class="text-[10px] font-bold text-purple-400 uppercase mb-1">Investigation</div>`;
    const investCont = document.createElement('div'); investCont.id = 'container-investigation'; investCont.className = "space-y-1";
    (data.investigation || [{id:1, text:''}]).forEach((c, i) => addClueRow(investCont, c, i));
    investCol.appendChild(investCont);
    const addClueBtn = document.createElement('button');
    addClueBtn.className = "text-[9px] text-gray-500 mt-1";
    addClueBtn.innerText = "+ Clue";
    addClueBtn.onclick = () => window.addLogClue(investCont);
    investCol.appendChild(addClueBtn);
    
    ledgerGrid.appendChild(investCol);
    form.appendChild(ledgerGrid);

    area.appendChild(form);
    setupSmartTextAreas(area);
}

// --- HELPER FUNCTIONS FOR FORM ROWS ---

function addSceneRow(container, data, idx) {
    const div = document.createElement('div');
    div.className = "mb-4 scene-row bg-[#0a0a0a] border border-[#333] p-1";
    const hasText = data.text && data.text.trim().length > 0;
    
    div.innerHTML = `
        <div class="flex justify-between items-center bg-[#111] px-2 py-1 mb-1 border-b border-[#222]">
            <span class="text-[9px] text-gray-500 font-bold uppercase">Scene ${idx + 1}</span>
            <div class="flex gap-2">
                <button class="text-[9px] text-gray-400 hover:text-gold uppercase font-bold toggle-btn ${hasText?'text-gold':''}">
                    ${hasText ? 'Edit Mode' : 'Read Mode'}
                </button>
                <button class="text-[9px] text-gray-400 hover:text-blue-400 uppercase font-bold define-btn">Define</button>
                ${idx > 0 ? `<button class="text-[9px] text-red-900 hover:text-red-500 remove-scene">Remove</button>` : ''}
            </div>
        </div>
        <textarea class="scene-editor w-full bg-transparent text-white text-[11px] p-2 h-24 resize-y border-none focus:ring-0 leading-relaxed ${hasText?'hidden':''}" 
            placeholder="Describe the scene..." spellcheck="false">${data.text || ''}</textarea>
        <div class="scene-viewer w-full text-gray-300 text-[11px] p-2 h-auto min-h-[6rem] leading-relaxed whitespace-pre-wrap font-serif ${hasText?'':'hidden'}">
            ${hasText ? parseSmartText(data.text) : ''}
        </div>
    `;
    
    container.appendChild(div);
    const ta = div.querySelector('textarea');
    ta.oninput = () => window.handleSmartInput(ta);
    
    div.querySelector('.toggle-btn').onclick = function() { window.toggleSceneView(this); };
    div.querySelector('.define-btn').onclick = function() { window.defineSelection(this); };
    const remBtn = div.querySelector('.remove-scene');
    if (remBtn) remBtn.onclick = function() { div.remove(); };
}

function addClueRow(container, data, idx) {
    const div = document.createElement('div');
    div.className = "mb-1 flex gap-1 items-center clue-row";
    div.innerHTML = `
        <span class="text-[9px] text-gray-500 w-4">${idx + 1}.</span>
        <input type="text" class="flex-1 bg-[#111] border border-[#333] text-white px-1 text-[10px]" placeholder="Clue..." value="${data.text}">
        <button class="text-gray-600 hover:text-red-500 font-bold px-1">&times;</button>
    `;
    container.appendChild(div);
    div.querySelector('button').onclick = () => div.remove();
}

function addBoonRow(container, data, type) {
    const div = document.createElement('div');
    div.className = "flex gap-1 mb-1 text-[9px] items-center group boon-row";
    div.innerHTML = `
        <input type="text" class="flex-1 bg-black/50 border border-[#333] text-white px-1" placeholder="Name" value="${data.name}" data-field="name">
        <select class="w-20 bg-black/50 border border-[#333] text-white px-1" data-field="type">
            <option value="Trivial">Trivial</option><option value="Minor">Minor</option>
            <option value="Major">Major</option><option value="Life">Life</option>
        </select>
        <input type="text" class="flex-1 bg-black/50 border border-[#333] text-white px-1" placeholder="Reason" value="${data.reason}" data-field="reason">
        <button class="text-gray-600 hover:text-red-500 font-bold px-1">&times;</button>
    `;
    div.querySelector('select').value = data.type || "Trivial";
    div.querySelector('button').onclick = () => div.remove();
    container.appendChild(div);
}

function addNpcRow(container, data) {
    const id = data.id || Math.random().toString(36).substr(2, 5);
    const div = document.createElement('div');
    div.className = "bg-[#111] p-2 mb-2 border border-[#333] relative group npc-row";
    div.innerHTML = `
        <button class="absolute top-1 right-1 text-gray-600 hover:text-red-500 font-bold text-[10px]">&times;</button>
        <div class="grid grid-cols-2 gap-2 mb-1">
            <input type="text" class="bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Name" value="${data.name}" data-field="name">
            <input type="text" class="bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Clan/Role" value="${data.clan}" data-field="clan">
        </div>
        <div class="flex gap-2 mb-1 text-[9px] text-gray-400">
            <label><input type="radio" name="att-${id}" value="Hostile"> Hostile</label>
            <label><input type="radio" name="att-${id}" value="Neutral"> Neutral</label>
            <label><input type="radio" name="att-${id}" value="Friendly"> Friendly</label>
            <label><input type="radio" name="att-${id}" value="Dominated"> Dominated</label>
        </div>
        <input type="text" class="w-full bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Notes" value="${data.notes}" data-field="notes">
    `;
    const radios = div.querySelectorAll(`input[name="att-${id}"]`);
    radios.forEach(r => { if(r.value === data.attitude) r.checked = true; });
    if (!data.attitude && radios[1]) radios[1].checked = true; // Default Neutral

    div.querySelector('button').onclick = () => div.remove();
    container.appendChild(div);
}

function saveSessionLog(id, isNew) {
    const getVal = (eid) => document.getElementById(eid)?.value || '';
    
    const readRows = (containerId, callback) => {
        const cont = document.getElementById(containerId);
        if(!cont) return [];
        return Array.from(cont.children).map(callback);
    };

    const updated = {
        id: id,
        sessionNum: getVal('log-sess-num'),
        datePlayed: getVal('log-date'),
        gameDate: getVal('log-game-date'),
        title: getVal('log-title'),
        status: { 
            blood: window.state.status.blood, 
            willpower: window.state.status.willpower, 
            health: "Healthy", 
            effects: getVal('log-effects') 
        },
        downtime: getVal('log-downtime'),
        xp: 0,
        
        boonsOwed: readRows('container-boonsOwed', r => ({
            name: r.querySelector('[data-field="name"]').value,
            type: r.querySelector('select').value,
            reason: r.querySelector('[data-field="reason"]').value
        })),
        
        boonsIOwe: readRows('container-boonsIOwe', r => ({
            name: r.querySelector('[data-field="name"]').value,
            type: r.querySelector('select').value,
            reason: r.querySelector('[data-field="reason"]').value
        })),
        
        npcs: readRows('container-npcs', r => ({
            name: r.querySelector('[data-field="name"]').value,
            clan: r.querySelector('[data-field="clan"]').value,
            notes: r.querySelector('[data-field="notes"]').value,
            attitude: r.querySelector('input:checked')?.value || 'Neutral'
        })),
        
        investigation: readRows('container-investigation', (r, i) => ({
            id: i + 1,
            text: r.querySelector('input').value
        })),
        
        scenes: readRows('container-scenes', (r, i) => ({
            id: i + 1,
            text: r.querySelector('textarea').value
        }))
    };
    
    if (isNew) {
        delete updated.isNew;
        window.state.sessionLogs.push(updated);
    } else {
        const idx = window.state.sessionLogs.findIndex(l => l.id === id);
        if(idx !== -1) window.state.sessionLogs[idx] = updated;
    }
    
    renderJournalHistoryList();
    renderSessionLogForm(updated);
    
    if (window.performSave) { 
        window.performSave(true); 
        showNotification("Session Saved & Synced"); 
    } else {
        showNotification("Session Saved Locally");
    }
}

// Global Helpers for Button Clicks
window.initNewSessionLog = initNewSessionLog;
window.deleteSessionLog = deleteSessionLog;
window.addLogScene = () => addSceneRow(document.getElementById('container-scenes'), {id:0, text:''}, document.querySelectorAll('.scene-row').length + 1);
window.addLogClue = () => addClueRow(document.getElementById('container-investigation'), {id:0, text:''}, document.querySelectorAll('.clue-row').length + 1);
window.addLogBoon = (type) => addBoonRow(document.getElementById('container-'+type), {name:'', type:'Trivial', reason:''}, type);
window.addLogNPC = () => addNpcRow(document.getElementById('container-npcs'), {name:'', clan:'', notes:'', attitude:'Neutral'});


// ==========================================================================
// VIEW 2: CODEX (DATABASE)
// ==========================================================================

function renderCodexView(container) {
    container.innerHTML = '';
    const flex = document.createElement('div');
    flex.className = "flex h-full gap-4";
    
    // Sidebar
    const sidebar = document.createElement('div');
    sidebar.className = "w-1/4 flex flex-col border-r border-[#333] pr-2";
    
    const search = document.createElement('input');
    search.type = "text";
    search.id = "codex-search";
    search.className = "bg-[#111] border border-[#333] text-xs p-1 mb-2 text-white placeholder-gray-600";
    search.placeholder = "Search...";
    
    const addBtn = document.createElement('button');
    addBtn.className = "bg-[#d4af37] hover:bg-[#fcd34d] text-black font-bold py-1 px-2 text-[10px] uppercase mb-3 text-center transition-colors";
    addBtn.innerHTML = '<i class="fas fa-plus mr-1"></i> Add Entry';
    addBtn.onclick = () => window.editCodexEntry();
    
    const list = document.createElement('div');
    list.id = "codex-list";
    list.className = "flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar";
    
    sidebar.appendChild(search);
    sidebar.appendChild(addBtn);
    sidebar.appendChild(list);
    
    // Main Area (Editor)
    const main = document.createElement('div');
    main.className = "w-3/4 h-full bg-[#080808] border border-[#333] p-6 relative overflow-y-auto custom-scrollbar no-scrollbar hidden";
    main.id = "codex-editor";
    
    // Static HTML structure for editor
    main.innerHTML = `
        <h3 class="text-xl font-cinzel text-[#d4af37] mb-6 border-b border-[#333] pb-2 uppercase tracking-widest">Entry Details</h3>
        <input type="hidden" id="cx-id">
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div><label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Name (Trigger)</label><input type="text" id="cx-name" class="w-full bg-[#111] border-b border-[#444] text-white p-2 font-bold focus:border-[#d4af37] outline-none transition-colors"></div>
            <div>
                <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Image / Map</label>
                <div class="flex flex-col gap-2">
                    <div id="cx-img-preview" class="w-full h-48 bg-black border border-[#444] flex items-center justify-center overflow-hidden rounded relative group"><i class="fas fa-image text-gray-700 text-4xl group-hover:text-gray-500 transition-colors"></i></div>
                    <div class="flex gap-2">
                        <input type="file" id="cx-file" accept="image/*" class="hidden">
                        <button id="cx-upload-btn" class="bg-[#222] border border-[#444] text-gray-300 px-3 py-1 text-[10px] hover:text-white uppercase font-bold flex-1 transition-colors">Upload</button>
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
                    <option value="NPC">NPC</option><option value="Location">Location</option><option value="Faction">Faction</option><option value="Item">Item</option><option value="Handout">Handout</option><option value="Lore">Lore / Rule</option>
                </select>
            </div>
            <div><label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Tags</label><input type="text" id="cx-tags" class="w-full bg-[#111] border-b border-[#444] text-gray-300 p-2 text-xs focus:border-[#d4af37] outline-none transition-colors" placeholder="e.g. Brujah, Ally, Safehouse"></div>
        </div>
        <div class="mb-6"><label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Description</label><textarea id="cx-desc" class="w-full h-64 bg-[#111] border border-[#444] text-gray-300 p-2 text-sm focus:border-[#d4af37] outline-none resize-none leading-relaxed font-serif"></textarea></div>
        <div class="flex justify-between mt-auto pt-4 border-t border-[#333]">
            <div class="flex gap-2">
                ${activeContext.mode === 'storyteller' ? `<button onclick="window.handleJournalPush()" class="bg-blue-900/40 border border-blue-500 text-blue-200 px-4 py-2 text-xs uppercase font-bold hover:text-white hover:bg-blue-800 transition-colors"><i class="fas fa-share-alt mr-1"></i> Push to Players</button>` : ''}
                <button onclick="window.deleteCodexEntry()" class="text-red-500 text-xs hover:text-red-300 uppercase font-bold transition-colors">Delete Entry</button>
            </div>
            <div class="flex gap-2">
                <button onclick="document.getElementById('codex-editor').classList.add('hidden'); document.getElementById('codex-empty-state').classList.remove('hidden');" class="border border-[#444] text-gray-400 px-4 py-2 text-xs uppercase font-bold hover:bg-[#222] transition-colors">Close</button>
                <button onclick="window.saveCodexEntry(false)" class="bg-[#d4af37] text-black px-6 py-2 text-xs uppercase font-bold hover:bg-[#fcd34d] shadow-lg transition-colors">Save</button>
            </div>
        </div>
    `;

    const empty = document.createElement('div');
    empty.id = "codex-empty-state";
    empty.className = "w-3/4 flex flex-col items-center justify-center text-gray-600 italic text-xs h-full";
    empty.innerHTML = `<i class="fas fa-search text-4xl mb-4 opacity-30"></i><p>Select an entry to view details or create a new one.</p>`;

    flex.appendChild(sidebar);
    flex.appendChild(main);
    flex.appendChild(empty);
    container.appendChild(flex);

    renderCodexList(list);
    
    // Bind Search
    search.oninput = (e) => renderCodexList(list, e.target.value);
    
    // Bind Image Handlers
    bindImageHandlersInEditor(main);
}

function renderCodexList(listEl, filter = "") {
    if(!listEl) return;
    listEl.innerHTML = "";
    
    const entries = activeContext.data || [];
    const sorted = [...entries].sort((a,b) => (a.name||"").localeCompare(b.name||""));
    
    sorted.forEach(entry => {
        if(filter && !entry.name?.toLowerCase().includes(filter.toLowerCase()) && !entry.tags.some(t=>t.toLowerCase().includes(filter.toLowerCase()))) return;
        
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
        listEl.appendChild(item);
    });
}

function bindImageHandlersInEditor(mainContainer) {
    const btnUrl = mainContainer.querySelector('#cx-btn-url');
    const inputUpload = mainContainer.querySelector('#cx-file');
    const uploadBtn = mainContainer.querySelector('#cx-upload-btn');
    const btnRemove = mainContainer.querySelector('#cx-remove-img');
    const preview = mainContainer.querySelector('#cx-img-preview');
    
    if (uploadBtn) uploadBtn.onclick = () => inputUpload.click();
    
    if(btnUrl) btnUrl.onclick = () => {
        let url = prompt("Paste Image URL:");
        if(url) { 
            if(window.convertGoogleDriveLink) url=window.convertGoogleDriveLink(url); 
            window.currentCodexImage=url; 
            preview.innerHTML=`<img src="${url}" class="w-full h-full object-contain">`; 
            btnRemove.classList.remove('hidden'); 
        }
    };
    
    if(inputUpload) inputUpload.onchange = (e) => {
        const file = e.target.files[0]; if(!file) return;
        const reader = new FileReader(); 
        reader.onload = (ev) => {
            const img = new Image(); 
            img.onload = () => {
                const canvas = document.createElement('canvas'); const MAX=1200; let w=img.width, h=img.height;
                if(w>h){if(w>MAX){h*=MAX/w; w=MAX;}} else{if(h>MAX){w*=MAX/h; h=MAX;}}
                canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
                window.currentCodexImage = canvas.toDataURL('image/jpeg', 0.8);
                preview.innerHTML=`<img src="${window.currentCodexImage}" class="w-full h-full object-contain">`; 
                btnRemove.classList.remove('hidden');
            }; 
            img.src = ev.target.result;
        }; 
        reader.readAsDataURL(file);
    };
    
    if(btnRemove) btnRemove.onclick = () => { 
        window.currentCodexImage=null; 
        preview.innerHTML='<i class="fas fa-image text-gray-700 text-4xl group-hover:text-gray-500 transition-colors"></i>'; 
        btnRemove.classList.add('hidden'); 
    };
}

// --- ACTIONS ---

window.editCodexEntry = function(id = null) {
    const editor = document.getElementById('codex-editor');
    const empty = document.getElementById('codex-empty-state');
    if (!editor) return;
    
    empty.classList.add('hidden');
    editor.classList.remove('hidden');
    
    let entry = { id: "", name: "", type: "NPC", tags: [], desc: "", image: null };
    const source = activeContext.data || [];
    if (id) {
        const found = source.find(c => c.id === id);
        if(found) entry = found;
    }
    
    document.getElementById('cx-id').value = entry.id;
    document.getElementById('cx-name').value = entry.name;
    
    // TYPE SAVING FIX: Check if the type exists in the dropdown; if not, add it temporarily.
    const typeSelect = document.getElementById('cx-type');
    const typeVal = entry.type || "NPC";
    const options = Array.from(typeSelect.options).map(o => o.value);
    
    if (!options.includes(typeVal)) {
        const newOpt = new Option(typeVal, typeVal, true, true);
        typeSelect.add(newOpt);
    }
    typeSelect.value = typeVal;

    document.getElementById('cx-tags').value = entry.tags?.join(', ') || "";
    document.getElementById('cx-desc').value = entry.desc || "";
    
    window.currentCodexImage = entry.image || null;
    const preview = document.getElementById('cx-img-preview');
    const removeBtn = document.getElementById('cx-remove-img');
    
    if(window.currentCodexImage) {
        preview.innerHTML = `<img src="${window.currentCodexImage}" class="w-full h-full object-contain">`;
        removeBtn.classList.remove('hidden');
    } else {
        preview.innerHTML = '<i class="fas fa-image text-gray-700 text-4xl group-hover:text-gray-500 transition-colors"></i>';
        removeBtn.classList.add('hidden');
    }
};

window.saveCodexEntry = async function(closeAfter = false) {
    const idField = document.getElementById('cx-id');
    const id = idField.value;
    const name = document.getElementById('cx-name').value.trim();
    if (!name) { showNotification("Name required"); return null; }
    
    const finalId = id || "cx_" + Date.now(); 
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
        const list = document.getElementById('codex-list');
        if(list) renderCodexList(list);
    } else {
        await activeContext.onSave(newEntry); 
    }
    
    if (closeAfter) {
        document.getElementById('codex-editor').classList.add('hidden');
        document.getElementById('codex-empty-state').classList.remove('hidden');
    }
    
    return finalId;
};

window.deleteCodexEntry = async function() {
    const id = document.getElementById('cx-id').value;
    if(!id) return;
    if(!confirm("Delete this entry?")) return;
    
    if (activeContext.mode === 'player') {
        window.state.codex = window.state.codex.filter(c => c.id !== id);
        activeContext.onSave();
        const list = document.getElementById('codex-list');
        if(list) renderCodexList(list);
    } else {
        await activeContext.onDelete(id);
    }
    document.getElementById('codex-editor').classList.add('hidden');
    document.getElementById('codex-empty-state').classList.remove('hidden');
};


// NEW: Handle Journal Push with Selection Modal
window.handleJournalPush = async function() {
    let id = document.getElementById('cx-id').value;
    
    // Auto-Save to ensure data is fresh and ID is valid
    id = await window.saveCodexEntry(false);
    if (!id) return;

    // Show Selection Modal
    const modal = document.getElementById('recipient-modal');
    const list = document.getElementById('recipient-list');
    if (!modal || !list) {
         console.error("Recipient modal not found");
         return;
    }

    // Populate List
    list.innerHTML = '';
    
    // Use window.stState to access players without circular import
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

    // Toggle All/Individual logic
    const allCheck = document.getElementById('push-all');
    allCheck.onchange = () => {
        const boxes = document.querySelectorAll('.recipient-checkbox');
        boxes.forEach(b => { 
            b.disabled = allCheck.checked; 
            if(allCheck.checked) b.checked = false; 
        });
    };

    // Bind Confirm
    const pushBtn = document.getElementById('confirm-push-btn');
    pushBtn.onclick = async () => {
        const isAll = allCheck.checked;
        const selected = Array.from(document.querySelectorAll('.recipient-checkbox:checked')).map(cb => cb.value);
        
        if (!isAll && selected.length === 0) {
            showNotification("Select at least one recipient", "error");
            return;
        }

        modal.classList.add('hidden');
        
        if (window.stPushHandout) {
            await window.stPushHandout(id, isAll ? null : selected);
        } else {
            console.error("stPushHandout not found on window");
        }
    };

    modal.classList.remove('hidden');
};

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
};

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

// 3. View Codex Popup (From Link)
window.viewCodex = function(id) {
    const entry = (activeContext.data || []).find(c => c.id === id);
    if (!entry) return;
    
    const modal = document.getElementById('codex-popup');
    const viewDiv = document.getElementById('codex-popup-view');
    const editDiv = document.getElementById('codex-popup-edit');
    
    viewDiv.classList.remove('hidden');
    editDiv.classList.add('hidden');
    
    document.getElementById('codex-popup-title').innerText = entry.name;
    document.getElementById('codex-popup-desc').innerText = entry.desc || "No description provided.";
    
    const imgEl = document.getElementById('codex-popup-img');
    if (entry.image) {
        imgEl.src = entry.image;
        document.getElementById('codex-popup-img-container').classList.remove('hidden');
    } else {
        document.getElementById('codex-popup-img-container').classList.add('hidden');
    }
    
    document.getElementById('codex-popup-tags').innerHTML = `<span class="codex-tag border border-gray-600 text-gray-400">${entry.type}</span>` + 
        entry.tags.map(t => `<span class="codex-tag">${t}</span>`).join('');
        
    document.getElementById('codex-popup-edit-btn').onclick = () => {
        viewDiv.classList.add('hidden');
        editDiv.classList.remove('hidden');
        document.getElementById('quick-cx-id').value = entry.id;
        document.getElementById('quick-cx-name').value = entry.name;
        document.getElementById('quick-cx-type').value = entry.type;
        document.getElementById('quick-cx-tags').value = entry.tags.join(', ');
        document.getElementById('quick-cx-desc').value = entry.desc;
    };
    
    // Inject Push Button Logic (If Storyteller)
    const pushCont = document.getElementById('st-push-container');
    if (activeContext.mode === 'storyteller' && window.handleJournalPush) {
        // Set the hidden ID first so handleJournalPush picks it up
        document.getElementById('cx-id').value = entry.id;
        pushCont.innerHTML = `<button onclick="window.handleJournalPush()" class="text-xs bg-blue-900/40 text-blue-200 border border-blue-500 px-3 py-1 uppercase font-bold hover:text-white mr-4"><i class="fas fa-share-alt mr-1"></i> Push Handout</button>`;
    } else {
        pushCont.innerHTML = '';
    }
    
    modal.classList.remove('hidden');
};

window.defineSelection = function(btn) {
    const row = btn.closest('.scene-row');
    const textarea = row.querySelector('.scene-editor');
    if (textarea.classList.contains('hidden')) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) { showNotification("Highlight text first."); return; }
    
    const selectedText = textarea.value.substring(start, end).trim();
    if (!selectedText) return;
    
    const modal = document.getElementById('codex-popup');
    document.getElementById('codex-popup-view').classList.add('hidden');
    document.getElementById('codex-popup-edit').classList.remove('hidden');
    
    document.getElementById('quick-cx-id').value = "";
    document.getElementById('quick-cx-name').value = selectedText;
    document.getElementById('quick-cx-type').value = "NPC";
    document.getElementById('quick-cx-tags').value = "";
    document.getElementById('quick-cx-desc').value = "";
    
    modal.classList.remove('hidden');
    document.getElementById('quick-cx-desc').focus();
    showNotification(`Defining: ${selectedText}`);
};

// Quick Save from Popup
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
};

function bindPopupListeners() {
    // Only bind if elements exist
    const urlBtn = document.getElementById('quick-cx-btn-url');
    if(urlBtn) {
        urlBtn.onclick = () => {
            let url = prompt("Paste Image URL:");
            if(url) {
                if(window.convertGoogleDriveLink) url = window.convertGoogleDriveLink(url);
                window.currentCodexImage = url;
                const preview = document.getElementById('quick-cx-img-preview');
                const removeBtn = document.getElementById('quick-cx-remove-img');
                if(preview) {
                    preview.innerHTML = `<img src="${url}" class="w-full h-full object-contain">`;
                    if(removeBtn) removeBtn.classList.remove('hidden');
                }
            }
        };
    }
    
    const removeBtn = document.getElementById('quick-cx-remove-img');
    if(removeBtn) {
        removeBtn.onclick = () => {
            window.currentCodexImage = null;
            const preview = document.getElementById('quick-cx-img-preview');
            if(preview) preview.innerHTML = '<i class="fas fa-image text-gray-700 text-3xl"></i>';
            removeBtn.classList.add('hidden');
        };
    }
}

document.addEventListener('click', (e) => {
    const suggestions = document.getElementById('autocomplete-suggestions');
    if (suggestions && !e.target.closest('.autocomplete-box')) {
        suggestions.style.display = 'none';
    }
});

// Exports
window.saveQuickCodex = window.saveQuickCodex || (() => {});
window.renderJournalTab = renderJournalTab;
