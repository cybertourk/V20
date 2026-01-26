import { showNotification } from "./ui-common.js";

// --- JOURNAL & CODEX LOGIC ---

// Global Codex Cache for Autosuggest
let codexCache = [];

export function renderJournalTab() {
    const container = document.getElementById('play-mode-5');
    if (!container) return;

    // Initialize State
    if (!window.state.sessionLogs) window.state.sessionLogs = [];
    if (!window.state.codex) window.state.codex = [];
    if (!window.state.journalTab) window.state.journalTab = 'sessions'; // 'sessions' or 'codex'

    // Update Cache
    codexCache = window.state.codex.map(c => c.name);

    // Styling for tabs
    const activeClass = "border-b-2 border-[#d4af37] text-[#d4af37] font-bold";
    const inactiveClass = "text-gray-500 hover:text-white transition-colors";

    container.innerHTML = `
        <div class="flex flex-col h-full">
            <!-- Top Tabs -->
            <div class="flex gap-6 border-b border-[#333] pb-2 mb-2 px-2">
                <button id="tab-sessions" class="text-xs uppercase tracking-wider px-2 pb-1 ${window.state.journalTab==='sessions'?activeClass:inactiveClass}">Session Logs</button>
                <button id="tab-codex" class="text-xs uppercase tracking-wider px-2 pb-1 ${window.state.journalTab==='codex'?activeClass:inactiveClass}">Codex</button>
            </div>
            
            <!-- Main Content Area -->
            <div id="journal-main-view" class="flex-1 overflow-hidden h-full"></div>
        </div>
        
        <!-- Autocomplete Container (Hidden by default) -->
        <div id="autocomplete-suggestions" class="autocomplete-box"></div>
        
        <!-- Quick Definition / Edit Modal -->
        <div id="codex-popup" class="fixed inset-0 bg-black/90 z-[10000] hidden flex items-center justify-center p-4 backdrop-blur-sm">
            <div class="bg-[#1a1a1a] border border-[#d4af37] p-6 max-w-md w-full shadow-[0_0_30px_rgba(0,0,0,0.8)] relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar">
                <button onclick="document.getElementById('codex-popup').classList.add('hidden')" class="absolute top-2 right-3 text-gray-500 hover:text-white text-xl">&times;</button>
                
                <!-- VIEW MODE -->
                <div id="codex-popup-view" class="hidden">
                    <h3 id="codex-popup-title" class="text-xl text-[#d4af37] font-cinzel font-bold mb-2 border-b border-[#333] pb-2"></h3>
                    
                    <!-- Image Display (View Mode) -->
                    <div id="codex-popup-img-container" class="hidden mb-4 rounded border border-[#333] overflow-hidden bg-black flex justify-center">
                        <img id="codex-popup-img" src="" class="max-h-48 object-contain">
                    </div>

                    <div class="flex gap-2 mb-3" id="codex-popup-tags"></div>
                    <div id="codex-popup-desc" class="text-sm text-gray-300 leading-relaxed font-serif whitespace-pre-wrap"></div>
                    <div class="mt-4 pt-4 border-t border-[#333] text-right">
                        <button id="codex-popup-edit-btn" class="text-xs text-gray-500 hover:text-white underline">Edit Entry</button>
                    </div>
                </div>

                <!-- QUICK EDIT MODE -->
                <div id="codex-popup-edit" class="hidden flex flex-col gap-3">
                    <h3 class="text-lg text-[#d4af37] font-bold border-b border-[#333] pb-2">Define / Edit Entry</h3>
                    <input type="hidden" id="quick-cx-id">
                    <div>
                        <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Name</label>
                        <input type="text" id="quick-cx-name" class="w-full bg-[#111] border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none">
                    </div>
                    
                    <!-- Image Upload (Edit Mode) -->
                    <div>
                        <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Image</label>
                        <div class="flex items-center gap-2">
                            <div id="quick-cx-img-preview" class="w-12 h-12 bg-black border border-[#444] flex items-center justify-center overflow-hidden">
                                <i class="fas fa-image text-gray-600"></i>
                            </div>
                            <input type="file" id="quick-cx-file" accept="image/*" class="hidden">
                            <button onclick="document.getElementById('quick-cx-file').click()" class="bg-[#222] border border-[#444] text-gray-300 px-2 py-1 text-[10px] hover:text-white">Upload</button>
                            <button id="quick-cx-remove-img" class="text-red-500 hover:text-red-300 text-[10px] hidden">Remove</button>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Type</label>
                            <select id="quick-cx-type" class="w-full bg-[#111] border-b border-[#444] text-white p-1 text-xs outline-none">
                                <option value="NPC">NPC</option>
                                <option value="Location">Location</option>
                                <option value="Faction">Faction</option>
                                <option value="Item">Item</option>
                                <option value="Concept">Concept</option>
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

    // Bind Tab Switching
    document.getElementById('tab-sessions').onclick = () => {
        window.state.journalTab = 'sessions';
        renderJournalTab();
    };
    document.getElementById('tab-codex').onclick = () => {
        window.state.journalTab = 'codex';
        renderJournalTab();
    };

    // Render Sub-View
    const mainView = document.getElementById('journal-main-view');
    if (window.state.journalTab === 'sessions') {
        renderSessionView(mainView);
    } else {
        renderCodexView(mainView);
    }

    // Bind Image Upload Listener for Modal
    const fileInput = document.getElementById('quick-cx-file');
    if(fileInput) {
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                // Resize Logic
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 600; // Smaller max for Codex
                    const MAX_HEIGHT = 600;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctxCanvas = canvas.getContext('2d');
                    ctxCanvas.drawImage(img, 0, 0, width, height);
                    
                    window.currentCodexImage = canvas.toDataURL('image/jpeg', 0.7);
                    
                    // Update Preview
                    const preview = document.getElementById('quick-cx-img-preview');
                    if(preview) {
                        preview.innerHTML = `<img src="${window.currentCodexImage}" class="w-full h-full object-cover">`;
                        document.getElementById('quick-cx-remove-img').classList.remove('hidden');
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        };
    }
    
    document.getElementById('quick-cx-remove-img').onclick = () => {
        window.currentCodexImage = null;
        document.getElementById('quick-cx-img-preview').innerHTML = '<i class="fas fa-image text-gray-600"></i>';
        document.getElementById('quick-cx-remove-img').classList.add('hidden');
    };
}
window.renderJournalTab = renderJournalTab;

// ==========================================================================
// VIEW 1: SESSION LOGS (Refactored)
// ==========================================================================

function renderSessionView(container) {
    container.innerHTML = `
        <div class="flex h-full gap-4">
            <!-- Sidebar -->
            <div class="w-1/4 flex flex-col border-r border-[#333] pr-2">
                <button onclick="window.initNewSessionLog()" class="bg-[#8b0000] hover:bg-red-700 text-white font-bold py-1 px-2 text-[10px] uppercase mb-3 flex items-center justify-center gap-1">
                    <i class="fas fa-plus"></i> New Session
                </button>
                <div id="journal-history-list" class="flex-1 overflow-y-auto space-y-1"></div>
            </div>
            <!-- Content -->
            <div class="w-3/4 h-full overflow-y-auto pr-2" id="journal-content-area">
                <div class="flex items-center justify-center h-full text-gray-500 italic text-xs">Select a session or create new.</div>
            </div>
        </div>
    `;
    renderJournalHistoryList();
}

function renderJournalHistoryList() {
    const list = document.getElementById('journal-history-list');
    if (!list) return;
    list.innerHTML = '';

    window.state.sessionLogs.slice().reverse().forEach(log => {
        const item = document.createElement('div');
        item.className = "bg-[#111] hover:bg-[#222] p-2 cursor-pointer border-l-2 border-transparent hover:border-gold transition-colors";
        item.innerHTML = `
            <div class="text-[10px] text-white font-bold truncate">${log.title || 'Untitled Session'}</div>
            <div class="flex justify-between text-[8px] text-gray-500 mt-1">
                <span>#${log.sessionNum || '?'}</span>
                <span>${log.datePlayed || '-'}</span>
            </div>
        `;
        item.onclick = () => renderSessionLogForm(log);
        list.appendChild(item);
    });
}

window.initNewSessionLog = function() {
    const healthLevels = ['Bruised', 'Hurt', 'Injured', 'Wounded', 'Mauled', 'Crippled', 'Incapacitated'];
    let currentHealth = "Healthy";
    if (window.state.status && window.state.status.health_states) {
        window.state.status.health_states.forEach((v, i) => { if(v===1) currentHealth = healthLevels[i]; });
    }

    const newLog = {
        id: Date.now(), isNew: true,
        charName: (window.state.textFields && window.state.textFields['c-name']) || '',
        chronicle: (window.state.textFields && window.state.textFields['c-chronicle']) || '',
        sessionNum: (window.state.sessionLogs.length + 1).toString(),
        datePlayed: new Date().toISOString().split('T')[0],
        gameDate: '', title: '',
        status: { blood: window.state.status.blood || 0, willpower: window.state.status.willpower || 0, health: currentHealth, effects: '' },
        boonsOwed: [], boonsIOwe: [], npcs: [], scenes: [{id: 1, text: ''}], investigation: [{id: 1, text: ''}], downtime: ''
    };
    renderSessionLogForm(newLog);
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
                    <button class="text-[9px] text-gray-400 hover:text-gold uppercase font-bold" onclick="window.toggleSceneView(this)">Read Mode</button>
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
    const html = `<div class="bg-[#111] p-2 mb-2 border border-[#333] relative group npc-row"><button class="absolute top-1 right-1 text-gray-600 hover:text-red-500 font-bold text-[10px]" onclick="this.closest('.npc-row').remove()">×</button><div class="grid grid-cols-2 gap-2 mb-1"><input type="text" list="npc-list" class="bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Name" value="" data-group="npcs" data-field="name" onchange="window.autofillNPC(this)"><input type="text" class="bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Clan/Role" value="" data-group="npcs" data-field="clan"></div><div class="flex gap-2 mb-1 text-[9px] text-gray-400"><label><input type="radio" name="att-${id}" value="Hostile" data-group="npcs" data-field="attitude"> Hostile</label><label><input type="radio" name="att-${id}" value="Neutral" checked data-group="npcs" data-field="attitude"> Neutral</label><label><input type="radio" name="att-${id}" value="Friendly" data-group="npcs" data-field="attitude"> Friendly</label><label><input type="radio" name="att-${id}" value="Dominated" data-group="npcs" data-field="attitude"> Dominated</label></div><input type="text" class="w-full bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Key Notes" value="" data-group="npcs" data-field="notes"></div>`;
    container.insertAdjacentHTML('beforeend', html);
};

window.autofillNPC = function(input) {
    // Stub
};

function renderSessionLogForm(data) {
    const area = document.getElementById('journal-content-area');
    if(!area) return;

    // ... [Boons/NPCs/Clues Row Generators] ...
    const boonRow = (b, type) => `<div class="flex gap-1 mb-1 text-[9px] items-center group boon-row"><input type="text" class="flex-1 bg-black/50 border border-[#333] text-white px-1" placeholder="Name" value="${b.name}" data-group="${type}" data-field="name"><select class="w-20 bg-black/50 border border-[#333] text-white px-1" data-group="${type}" data-field="type"><option value="Trivial" ${b.type==='Trivial'?'selected':''}>Trivial</option><option value="Minor" ${b.type==='Minor'?'selected':''}>Minor</option><option value="Major" ${b.type==='Major'?'selected':''}>Major</option><option value="Life" ${b.type==='Life'?'selected':''}>Life</option></select><input type="text" class="flex-1 bg-black/50 border border-[#333] text-white px-1" placeholder="Reason" value="${b.reason}" data-group="${type}" data-field="reason"><button class="text-gray-600 hover:text-red-500 font-bold px-1" onclick="this.closest('.boon-row').remove()">×</button></div>`;
    const npcRow = (n) => `<div class="bg-[#111] p-2 mb-2 border border-[#333] relative group npc-row"><button class="absolute top-1 right-1 text-gray-600 hover:text-red-500 font-bold text-[10px]" onclick="this.closest('.npc-row').remove()">×</button><div class="grid grid-cols-2 gap-2 mb-1"><input type="text" list="npc-list" class="bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Name" value="${n.name}" data-group="npcs" data-field="name" onchange="window.autofillNPC(this)"><input type="text" class="bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Clan/Role" value="${n.clan}" data-group="npcs" data-field="clan"></div><div class="flex gap-2 mb-1 text-[9px] text-gray-400"><label><input type="radio" name="att-${n.id}" value="Hostile" ${n.attitude==='Hostile'?'checked':''} data-group="npcs" data-field="attitude"> Hostile</label><label><input type="radio" name="att-${n.id}" value="Neutral" ${n.attitude==='Neutral'?'checked':''} data-group="npcs" data-field="attitude"> Neutral</label><label><input type="radio" name="att-${n.id}" value="Friendly" ${n.attitude==='Friendly'?'checked':''} data-group="npcs" data-field="attitude"> Friendly</label><label><input type="radio" name="att-${n.id}" value="Dominated" ${n.attitude==='Dominated'?'checked':''} data-group="npcs" data-field="attitude"> Dominated</label></div><input type="text" class="w-full bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Key Notes" value="${n.notes}" data-group="npcs" data-field="notes"></div>`;
    const clueRow = (c, idx) => `<div class="mb-1 flex gap-1 items-center clue-row"><span class="text-[9px] text-gray-500 w-4">${idx + 1}.</span><input type="text" class="flex-1 bg-[#111] border border-[#333] text-white px-1 text-[10px]" placeholder="Clue / Objective / Secret..." value="${c.text}" data-group="investigation"><button class="text-gray-600 hover:text-red-500 font-bold px-1" onclick="this.closest('.clue-row').remove()">×</button></div>`;

    // --- SMART SCENE ROW (UPDATED DEFAULT STATE) ---
    // Now defaults to VIEW MODE unless text is empty
    const sceneRow = (s, idx) => {
        const hasText = s.text && s.text.trim().length > 0;
        const viewModeClass = hasText ? '' : 'hidden';
        const editModeClass = hasText ? 'hidden' : '';
        const btnText = hasText ? 'Edit Mode' : 'Read Mode';
        const btnClass = hasText ? 'text-gold' : '';
        
        // Pre-parse content if viewing
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
            
            <!-- EDIT MODE (Textarea) -->
            <textarea class="scene-editor w-full bg-transparent text-white text-[11px] p-2 h-24 resize-y border-none focus:ring-0 leading-relaxed ${editModeClass}" 
                placeholder="Describe the scene..." 
                data-group="scenes"
                oninput="window.handleSmartInput(this)"
                spellcheck="false">${s.text}</textarea>
            
            <!-- VIEW MODE (Rich Text) -->
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
                <textarea id="log-downtime" class="w-full bg-[#111] border border-[#333] text-white text-[10px] p-1 h-16 resize-none" oninput="window.handleSmartInput(this)">${data.downtime}</textarea>
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

    // Bind Save/Delete
    const getVal = (id) => document.getElementById(id)?.value || '';
    
    // Helper to read dynamic rows
    const readDyn = (id, mapper) => {
        const c = document.getElementById(id);
        return c ? Array.from(c.children).map(mapper).filter(x => x) : [];
    };

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
            investigation: readDyn('container-investigation', (r, i) => ({ id: i+1, text: r.querySelector('input').value }))
        };

        if (data.isNew) { delete updated.isNew; window.state.sessionLogs.push(updated); } 
        else { const idx = window.state.sessionLogs.findIndex(l => l.id === data.id); if(idx !== -1) window.state.sessionLogs[idx] = updated; }
        
        renderJournalHistoryList();
        renderSessionLogForm(updated);
        showNotification("Session Saved");
    };

    if(document.getElementById('btn-delete-log')) {
        document.getElementById('btn-delete-log').onclick = () => {
            if(confirm("Delete log?")) {
                window.state.sessionLogs = window.state.sessionLogs.filter(l => l.id !== data.id);
                renderJournalTab();
            }
        };
    }
}

// ==========================================================================
// VIEW 2: CODEX (DATABASE)
// ==========================================================================

function renderCodexView(container) {
    container.innerHTML = `
        <div class="flex h-full gap-4">
            <!-- Sidebar List -->
            <div class="w-1/4 flex flex-col border-r border-[#333] pr-2">
                <input type="text" id="codex-search" class="bg-[#111] border border-[#333] text-xs p-1 mb-2 text-white placeholder-gray-600" placeholder="Search...">
                <button onclick="window.editCodexEntry()" class="bg-[#d4af37] hover:bg-[#fcd34d] text-black font-bold py-1 px-2 text-[10px] uppercase mb-3 text-center">
                    <i class="fas fa-plus"></i> Add Entry
                </button>
                <div id="codex-list" class="flex-1 overflow-y-auto space-y-1"></div>
            </div>
            <!-- Editor Form -->
            <div class="w-3/4 h-full bg-[#080808] border border-[#333] p-6 relative hidden overflow-y-auto no-scrollbar" id="codex-editor">
                <h3 class="text-xl font-cinzel text-[#d4af37] mb-6 border-b border-[#333] pb-2">Codex Entry</h3>
                <input type="hidden" id="cx-id">
                
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Name / Title</label>
                        <input type="text" id="cx-name" class="w-full bg-[#111] border-b border-[#444] text-white p-2 font-bold focus:border-[#d4af37] outline-none">
                    </div>
                    
                    <!-- Main Codex Editor Image Upload -->
                    <div>
                        <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Image</label>
                        <div class="flex items-center gap-2 h-[34px]">
                            <div id="cx-img-preview" class="w-8 h-8 bg-black border border-[#444] flex items-center justify-center overflow-hidden flex-shrink-0">
                                <i class="fas fa-image text-gray-600 text-[10px]"></i>
                            </div>
                            <input type="file" id="cx-file" accept="image/*" class="hidden">
                            <button onclick="document.getElementById('cx-file').click()" class="bg-[#222] border border-[#444] text-gray-300 px-2 py-1 text-[10px] hover:text-white h-full">Upload</button>
                            <button id="cx-remove-img" class="text-red-500 hover:text-red-300 text-[10px] hidden h-full">Remove</button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Type</label>
                        <select id="cx-type" class="w-full bg-[#111] border-b border-[#444] text-white p-2 outline-none">
                            <option value="NPC">NPC</option>
                            <option value="Location">Location</option>
                            <option value="Faction">Faction</option>
                            <option value="Item">Item/Relic</option>
                            <option value="Concept">Concept/Lore</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Tags (comma separated)</label>
                        <input type="text" id="cx-tags" class="w-full bg-[#111] border-b border-[#444] text-gray-300 p-2 text-xs focus:border-[#d4af37] outline-none" placeholder="e.g. Brujah, Safehouse, Ally">
                    </div>
                </div>

                <div class="mb-6">
                    <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Description</label>
                    <textarea id="cx-desc" class="w-full h-40 bg-[#111] border border-[#444] text-gray-300 p-2 text-sm focus:border-[#d4af37] outline-none resize-none leading-relaxed"></textarea>
                </div>

                <div class="flex justify-end gap-4 mt-auto">
                    <button onclick="window.deleteCodexEntry()" class="text-red-500 text-xs hover:text-red-300 uppercase font-bold mr-auto">Delete Entry</button>
                    <button onclick="document.getElementById('codex-editor').classList.add('hidden')" class="border border-[#444] text-gray-400 px-4 py-2 text-xs uppercase font-bold hover:bg-[#222]">Cancel</button>
                    <button onclick="window.saveCodexEntry()" class="bg-[#d4af37] text-black px-6 py-2 text-xs uppercase font-bold hover:bg-[#fcd34d] shadow-lg">Save Entry</button>
                </div>
            </div>
            
            <div id="codex-empty-state" class="w-3/4 flex items-center justify-center text-gray-600 italic text-xs">
                Select an entry or create a new one.
            </div>
        </div>
    `;
    
    renderCodexList();
    
    document.getElementById('codex-search').oninput = (e) => renderCodexList(e.target.value);

    // Bind Main Editor Image Upload
    const mainFile = document.getElementById('cx-file');
    if(mainFile) {
        mainFile.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 600; 
                    const MAX_HEIGHT = 600;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctxCanvas = canvas.getContext('2d');
                    ctxCanvas.drawImage(img, 0, 0, width, height);
                    
                    window.currentCodexImage = canvas.toDataURL('image/jpeg', 0.7);
                    
                    const preview = document.getElementById('cx-img-preview');
                    if(preview) {
                        preview.innerHTML = `<img src="${window.currentCodexImage}" class="w-full h-full object-cover">`;
                        document.getElementById('cx-remove-img').classList.remove('hidden');
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        };
    }

    document.getElementById('cx-remove-img').onclick = () => {
        window.currentCodexImage = null;
        document.getElementById('cx-img-preview').innerHTML = '<i class="fas fa-image text-gray-600 text-[10px]"></i>';
        document.getElementById('cx-remove-img').classList.add('hidden');
    };
}

function renderCodexList(filter = "") {
    const list = document.getElementById('codex-list');
    if(!list) return;
    list.innerHTML = "";
    
    const sorted = window.state.codex.sort((a,b) => a.name.localeCompare(b.name));
    
    sorted.forEach(entry => {
        if(filter && !entry.name.toLowerCase().includes(filter.toLowerCase()) && !entry.tags.some(t=>t.toLowerCase().includes(filter.toLowerCase()))) return;
        
        const item = document.createElement('div');
        item.className = "p-2 border-b border-[#222] cursor-pointer hover:bg-[#1a1a1a] group";
        
        const typeColor = entry.type === 'NPC' ? 'text-blue-400' : entry.type === 'Location' ? 'text-green-400' : 'text-gray-500';
        const hasImg = entry.image ? '<i class="fas fa-image text-[8px] text-gray-500 ml-1"></i>' : '';

        item.innerHTML = `
            <div class="text-xs font-bold text-gray-200 group-hover:text-[#d4af37] flex items-center">${entry.name} ${hasImg}</div>
            <div class="text-[9px] ${typeColor} uppercase font-bold mt-0.5">${entry.type}</div>
        `;
        item.onclick = () => window.editCodexEntry(entry.id);
        list.appendChild(item);
    });
}

// --- CODEX ACTIONS ---

window.editCodexEntry = function(id = null) {
    const editor = document.getElementById('codex-editor');
    const empty = document.getElementById('codex-empty-state');
    
    empty.classList.add('hidden');
    editor.classList.remove('hidden');
    
    let entry = { id: "", name: "", type: "NPC", tags: [], desc: "", image: null };
    
    if (id) {
        const found = window.state.codex.find(c => c.id === id);
        if(found) entry = found;
    }
    
    document.getElementById('cx-id').value = entry.id;
    document.getElementById('cx-name').value = entry.name;
    document.getElementById('cx-type').value = entry.type;
    document.getElementById('cx-tags').value = entry.tags.join(', ');
    document.getElementById('cx-desc').value = entry.desc;
    
    // Image Handling
    window.currentCodexImage = entry.image || null;
    const preview = document.getElementById('cx-img-preview');
    if(window.currentCodexImage) {
        preview.innerHTML = `<img src="${window.currentCodexImage}" class="w-full h-full object-cover">`;
        document.getElementById('cx-remove-img').classList.remove('hidden');
    } else {
        preview.innerHTML = '<i class="fas fa-image text-gray-600 text-[10px]"></i>';
        document.getElementById('cx-remove-img').classList.add('hidden');
    }
}

window.saveCodexEntry = function() {
    const id = document.getElementById('cx-id').value;
    const name = document.getElementById('cx-name').value.trim();
    if (!name) { showNotification("Name required"); return; }
    
    const newEntry = {
        id: id || Date.now().toString(36),
        name: name,
        type: document.getElementById('cx-type').value,
        tags: document.getElementById('cx-tags').value.split(',').map(t=>t.trim()).filter(t=>t),
        desc: document.getElementById('cx-desc').value,
        image: window.currentCodexImage || null
    };
    
    if (id) {
        const idx = window.state.codex.findIndex(c => c.id === id);
        if(idx !== -1) window.state.codex[idx] = newEntry;
    } else {
        window.state.codex.push(newEntry);
    }
    
    // Update cache
    codexCache = window.state.codex.map(c => c.name);
    
    renderCodexList();
    showNotification("Codex Updated");
    document.getElementById('codex-editor').classList.add('hidden');
    document.getElementById('codex-empty-state').classList.remove('hidden');
    
    window.currentCodexImage = null; // Reset
}

window.deleteCodexEntry = function() {
    const id = document.getElementById('cx-id').value;
    if(!id) return;
    if(confirm("Delete this Codex entry?")) {
        window.state.codex = window.state.codex.filter(c => c.id !== id);
        codexCache = window.state.codex.map(c => c.name);
        renderCodexList();
        document.getElementById('codex-editor').classList.add('hidden');
        document.getElementById('codex-empty-state').classList.remove('hidden');
    }
}

// ==========================================================================
// SMART TEXT & AUTOCOMPLETE LOGIC
// ==========================================================================

// 1. Toggle between Textarea and Rich View
window.toggleSceneView = function(btn) {
    const row = btn.closest('.scene-row');
    const editor = row.querySelector('.scene-editor');
    const viewer = row.querySelector('.scene-viewer');
    
    if (editor.classList.contains('hidden')) {
        // Switch to Edit Mode
        editor.classList.remove('hidden');
        viewer.classList.add('hidden');
        btn.innerText = "Read Mode";
        btn.classList.remove('text-gold');
        btn.classList.remove('toggle-btn'); // For styling
    } else {
        // Switch to Read Mode
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
    
    // Sort codex by name length so we match "Jody's Apartment" before "Jody"
    const sortedCodex = [...window.state.codex].sort((a,b) => b.name.length - a.name.length);
    
    sortedCodex.forEach(entry => {
        const regex = new RegExp(`\\b${escapeRegExp(entry.name)}\\b`, 'gi');
        safeText = safeText.replace(regex, (match) => {
            return `<span class="codex-link" onclick="window.viewCodex('${entry.id}')">${match}</span>`;
        });
    });
    
    return safeText.replace(/\n/g, '<br>');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 3. View Codex Popup
window.viewCodex = function(id) {
    const entry = window.state.codex.find(c => c.id === id);
    if (!entry) return;
    
    const modal = document.getElementById('codex-popup');
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
        // Quick switch to Quick Edit mode inside the modal
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
            preview.innerHTML = `<img src="${window.currentCodexImage}" class="w-full h-full object-cover">`;
            document.getElementById('quick-cx-remove-img').classList.remove('hidden');
        } else {
            preview.innerHTML = '<i class="fas fa-image text-gray-600"></i>';
            document.getElementById('quick-cx-remove-img').classList.add('hidden');
        }
    };
    
    modal.classList.remove('hidden');
}

// 4. Autocomplete Handler
window.handleSmartInput = function(textarea) {
    const text = textarea.value;
    const cursorPos = textarea.selectionStart;
    
    const lastChunk = text.substring(0, cursorPos).split(/[\n\.\,\!\?]/).pop();
    const lastWord = lastChunk.trim().split(" ").pop(); 
    
    if (lastWord.length < 2) {
        hideAutocomplete();
        return;
    }
    
    const matches = codexCache.filter(name => name.toLowerCase().startsWith(lastWord.toLowerCase()) && name.toLowerCase() !== lastWord.toLowerCase());
    
    if (matches.length > 0) {
        showAutocomplete(textarea, matches, lastWord);
    } else {
        hideAutocomplete();
    }
}

function showAutocomplete(textarea, matches, partial) {
    const box = document.getElementById('autocomplete-suggestions');
    if (!box) return;
    
    const rect = textarea.getBoundingClientRect();
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.bottom}px`;
    box.style.width = `${rect.width}px`;
    
    box.innerHTML = matches.slice(0, 5).map(match => {
        const rest = match.substring(partial.length);
        return `<div class="autocomplete-item" onclick="window.applyAutocomplete('${match.replace(/'/g, "\\'")}')"><strong>${partial}</strong>${rest}</div>`;
    }).join('');
    
    box.style.display = 'block';
    window.activeSmartTextarea = textarea;
    window.lastPartial = partial;
}

function hideAutocomplete() {
    const box = document.getElementById('autocomplete-suggestions');
    if (box) box.style.display = 'none';
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
    
    hideAutocomplete();
    ta.focus();
}

// 5. Define Selection -> MODAL QUICK ENTRY
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
    
    // Open Modal in Edit Mode immediately
    const modal = document.getElementById('codex-popup');
    const viewDiv = document.getElementById('codex-popup-view');
    const editDiv = document.getElementById('codex-popup-edit');
    
    viewDiv.classList.add('hidden');
    editDiv.classList.remove('hidden');
    
    // Reset Fields
    document.getElementById('quick-cx-id').value = "";
    document.getElementById('quick-cx-name').value = selectedText;
    document.getElementById('quick-cx-type').value = "NPC";
    document.getElementById('quick-cx-tags').value = "";
    document.getElementById('quick-cx-desc').value = "";
    window.currentCodexImage = null;
    document.getElementById('quick-cx-img-preview').innerHTML = '<i class="fas fa-image text-gray-600"></i>';
    document.getElementById('quick-cx-remove-img').classList.add('hidden');
    
    modal.classList.remove('hidden');
    document.getElementById('quick-cx-desc').focus();
    
    showNotification(`Defining: ${selectedText}`);
}

window.saveQuickCodex = function() {
    const id = document.getElementById('quick-cx-id').value;
    const name = document.getElementById('quick-cx-name').value.trim();
    if (!name) { showNotification("Name required"); return; }
    
    const newEntry = {
        id: id || Date.now().toString(36),
        name: name,
        type: document.getElementById('quick-cx-type').value,
        tags: document.getElementById('quick-cx-tags').value.split(',').map(t=>t.trim()).filter(t=>t),
        desc: document.getElementById('quick-cx-desc').value,
        image: window.currentCodexImage || null
    };
    
    // Check for existing ID
    if (id) {
        const idx = window.state.codex.findIndex(c => c.id === id);
        if(idx !== -1) window.state.codex[idx] = newEntry;
    } else {
        // Check for existing name to avoid duplicates
        const existIdx = window.state.codex.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
        if(existIdx !== -1) {
            if(confirm("Entry with this name exists. Overwrite?")) {
                newEntry.id = window.state.codex[existIdx].id; // Keep old ID
                window.state.codex[existIdx] = newEntry;
            } else return;
        } else {
            window.state.codex.push(newEntry);
        }
    }
    
    // Update cache
    codexCache = window.state.codex.map(c => c.name);
    
    // If main codex view is open, refresh it
    if (document.getElementById('codex-list')) renderCodexList();
    
    showNotification("Codex Saved");
    document.getElementById('codex-popup').classList.add('hidden');
    window.currentCodexImage = null; // Reset
}

// Global click to close autocomplete
document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-box')) hideAutocomplete();
});
