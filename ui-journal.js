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

    container.innerHTML = `
        <div class="flex flex-col h-full">
            <!-- Top Tabs -->
            <div class="flex gap-4 border-b border-[#333] pb-2 mb-2">
                <button id="tab-sessions" class="journal-nav-btn ${window.state.journalTab==='sessions'?'active':''}">Session Logs</button>
                <button id="tab-codex" class="journal-nav-btn ${window.state.journalTab==='codex'?'active':''}">Codex (Database)</button>
            </div>
            
            <!-- Main Content Area -->
            <div id="journal-main-view" class="flex-1 overflow-hidden h-full"></div>
        </div>
        
        <!-- Autocomplete Container (Hidden by default) -->
        <div id="autocomplete-suggestions" class="autocomplete-box"></div>
        
        <!-- Quick Definition Modal -->
        <div id="codex-popup" class="fixed inset-0 bg-black/80 z-[10000] hidden flex items-center justify-center p-4 backdrop-blur-sm">
            <div class="bg-[#1a1a1a] border border-[#d4af37] p-6 max-w-md w-full shadow-[0_0_30px_rgba(0,0,0,0.8)] relative">
                <button onclick="document.getElementById('codex-popup').classList.add('hidden')" class="absolute top-2 right-3 text-gray-500 hover:text-white text-xl">&times;</button>
                <h3 id="codex-popup-title" class="text-xl text-[#d4af37] font-cinzel font-bold mb-2 border-b border-[#333] pb-2"></h3>
                <div class="flex gap-2 mb-3" id="codex-popup-tags"></div>
                <div id="codex-popup-desc" class="text-sm text-gray-300 leading-relaxed font-serif"></div>
                <div class="mt-4 pt-4 border-t border-[#333] text-right">
                    <button id="codex-popup-edit-btn" class="text-xs text-gray-500 hover:text-white underline">Edit Entry</button>
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

function renderSessionLogForm(data) {
    const area = document.getElementById('journal-content-area');
    if(!area) return;

    // ... [Boons/NPCs/Clues Row Generators - Same as before] ...
    const boonRow = (b, type) => `<div class="flex gap-1 mb-1 text-[9px] items-center group boon-row"><input type="text" class="flex-1 bg-black/50 border border-[#333] text-white px-1" placeholder="Name" value="${b.name}" data-group="${type}" data-field="name"><select class="w-20 bg-black/50 border border-[#333] text-white px-1" data-group="${type}" data-field="type"><option value="Trivial" ${b.type==='Trivial'?'selected':''}>Trivial</option><option value="Minor" ${b.type==='Minor'?'selected':''}>Minor</option><option value="Major" ${b.type==='Major'?'selected':''}>Major</option><option value="Life" ${b.type==='Life'?'selected':''}>Life</option></select><input type="text" class="flex-1 bg-black/50 border border-[#333] text-white px-1" placeholder="Reason" value="${b.reason}" data-group="${type}" data-field="reason"><button class="text-gray-600 hover:text-red-500 font-bold px-1" onclick="this.closest('.boon-row').remove()">×</button></div>`;
    const npcRow = (n) => `<div class="bg-[#111] p-2 mb-2 border border-[#333] relative group npc-row"><button class="absolute top-1 right-1 text-gray-600 hover:text-red-500 font-bold text-[10px]" onclick="this.closest('.npc-row').remove()">×</button><div class="grid grid-cols-2 gap-2 mb-1"><input type="text" list="npc-list" class="bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Name" value="${n.name}" data-group="npcs" data-field="name" onchange="window.autofillNPC(this)"><input type="text" class="bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Clan/Role" value="${n.clan}" data-group="npcs" data-field="clan"></div><div class="flex gap-2 mb-1 text-[9px] text-gray-400"><label><input type="radio" name="att-${n.id}" value="Hostile" ${n.attitude==='Hostile'?'checked':''} data-group="npcs" data-field="attitude"> Hostile</label><label><input type="radio" name="att-${n.id}" value="Neutral" ${n.attitude==='Neutral'?'checked':''} data-group="npcs" data-field="attitude"> Neutral</label><label><input type="radio" name="att-${n.id}" value="Friendly" ${n.attitude==='Friendly'?'checked':''} data-group="npcs" data-field="attitude"> Friendly</label><label><input type="radio" name="att-${n.id}" value="Dominated" ${n.attitude==='Dominated'?'checked':''} data-group="npcs" data-field="attitude"> Dominated</label></div><input type="text" class="w-full bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Key Notes" value="${n.notes}" data-group="npcs" data-field="notes"></div>`;
    const clueRow = (c, idx) => `<div class="mb-1 flex gap-1 items-center clue-row"><span class="text-[9px] text-gray-500 w-4">${idx + 1}.</span><input type="text" class="flex-1 bg-[#111] border border-[#333] text-white px-1 text-[10px]" placeholder="Clue / Objective / Secret..." value="${c.text}" data-group="investigation"><button class="text-gray-600 hover:text-red-500 font-bold px-1" onclick="this.closest('.clue-row').remove()">×</button></div>`;

    // --- NEW SMART SCENE ROW ---
    // Includes toolbar and toggle between Edit/View
    const sceneRow = (s, idx) => `
        <div class="mb-4 scene-row bg-[#0a0a0a] border border-[#333] p-1">
            <div class="flex justify-between items-center bg-[#111] px-2 py-1 mb-1 border-b border-[#222]">
                <span class="text-[9px] text-gray-500 font-bold uppercase">Scene ${idx + 1}</span>
                <div class="flex gap-2">
                    <button class="text-[9px] text-gray-400 hover:text-gold uppercase font-bold" onclick="window.toggleSceneView(this)">Read Mode</button>
                    <button class="text-[9px] text-gray-400 hover:text-blue-400 uppercase font-bold" onclick="window.defineSelection(this)">Define Selection</button>
                    ${idx > 0 ? `<button class="text-[9px] text-red-900 hover:text-red-500" onclick="this.closest('.scene-row').remove()">Remove</button>` : ''}
                </div>
            </div>
            
            <!-- EDIT MODE (Textarea) -->
            <textarea class="scene-editor w-full bg-transparent text-white text-[11px] p-2 h-24 resize-y border-none focus:ring-0 leading-relaxed" 
                placeholder="Describe the scene..." 
                data-group="scenes"
                oninput="window.handleSmartInput(this)"
                spellcheck="false">${s.text}</textarea>
            
            <!-- VIEW MODE (Rich Text) -->
            <div class="scene-viewer hidden w-full text-gray-300 text-[11px] p-2 h-auto min-h-[6rem] leading-relaxed whitespace-pre-wrap font-serif"></div>
        </div>`;

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

            <!-- NPCs / Boons / Clues Toggles (Simplified for brevity) -->
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
            <div class="w-3/4 h-full bg-[#080808] border border-[#333] p-6 relative hidden" id="codex-editor">
                <h3 class="text-xl font-cinzel text-[#d4af37] mb-6 border-b border-[#333] pb-2">Codex Entry</h3>
                <input type="hidden" id="cx-id">
                
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Name / Title</label>
                        <input type="text" id="cx-name" class="w-full bg-[#111] border-b border-[#444] text-white p-2 font-bold focus:border-[#d4af37] outline-none">
                    </div>
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
                </div>

                <div class="mb-4">
                    <label class="block text-[10px] uppercase text-gray-500 font-bold mb-1">Tags (comma separated)</label>
                    <input type="text" id="cx-tags" class="w-full bg-[#111] border-b border-[#444] text-gray-300 p-2 text-xs focus:border-[#d4af37] outline-none" placeholder="e.g. Brujah, Safehouse, Ally">
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
        
        item.innerHTML = `
            <div class="text-xs font-bold text-gray-200 group-hover:text-[#d4af37]">${entry.name}</div>
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
    
    let entry = { id: "", name: "", type: "NPC", tags: [], desc: "" };
    
    if (id) {
        const found = window.state.codex.find(c => c.id === id);
        if(found) entry = found;
    }
    
    document.getElementById('cx-id').value = entry.id;
    document.getElementById('cx-name').value = entry.name;
    document.getElementById('cx-type').value = entry.type;
    document.getElementById('cx-tags').value = entry.tags.join(', ');
    document.getElementById('cx-desc').value = entry.desc;
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
        desc: document.getElementById('cx-desc').value
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
    } else {
        // Switch to Read Mode
        const rawText = editor.value;
        const html = parseSmartText(rawText);
        viewer.innerHTML = html;
        
        editor.classList.add('hidden');
        viewer.classList.remove('hidden');
        btn.innerText = "Edit Mode";
        btn.classList.add('text-gold');
    }
}

// 2. Parse Text to add Links
function parseSmartText(text) {
    if (!text) return "";
    let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Sort codex by name length so we match "Jody's Apartment" before "Jody"
    const sortedCodex = [...window.state.codex].sort((a,b) => b.name.length - a.name.length);
    
    sortedCodex.forEach(entry => {
        // Regex: match name, Case Insensitive, global. Use boundary \b if possible, but names might have spaces
        // We match whole words or phrases.
        // We replace with a marker first to prevent double-replacing inside tags
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
    document.getElementById('codex-popup-title').innerText = entry.name;
    document.getElementById('codex-popup-desc').innerText = entry.desc || "No description provided.";
    
    const tagCont = document.getElementById('codex-popup-tags');
    tagCont.innerHTML = `<span class="codex-tag border border-gray-600 text-gray-400">${entry.type}</span>` + 
        entry.tags.map(t => `<span class="codex-tag">${t}</span>`).join('');
        
    const editBtn = document.getElementById('codex-popup-edit-btn');
    editBtn.onclick = () => {
        modal.classList.add('hidden');
        // Switch tab to Codex
        document.getElementById('tab-codex').click();
        // Open editor
        window.editCodexEntry(id);
    };
    
    modal.classList.remove('hidden');
}

// 4. Autocomplete Handler
window.handleSmartInput = function(textarea) {
    const text = textarea.value;
    const cursorPos = textarea.selectionStart;
    
    // Find word/phrase being typed
    // Logic: Look backwards from cursor until a newline or punctuation
    const lastChunk = text.substring(0, cursorPos).split(/[\n\.\,\!\?]/).pop();
    const lastWord = lastChunk.trim().split(" ").pop(); // Very simple last word check
    
    // Better logic: Match against cache
    // We want to trigger if they typed at least 2 chars
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
    
    // Position box relative to cursor is hard in simple textarea.
    // Simplification: Position below textarea
    const rect = textarea.getBoundingClientRect();
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.bottom}px`;
    box.style.width = `${rect.width}px`;
    
    box.innerHTML = matches.slice(0, 5).map(match => {
        // Highlight the matched part
        const rest = match.substring(partial.length);
        return `<div class="autocomplete-item" onclick="window.applyAutocomplete('${match.replace(/'/g, "\\'")}')"><strong>${partial}</strong>${rest}</div>`;
    }).join('');
    
    box.style.display = 'block';
    
    // Store reference to active textarea
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
    
    // Replace the partial word before cursor with full name
    const before = text.substring(0, pos - partial.length);
    const after = text.substring(pos);
    
    ta.value = before + fullName + after;
    
    hideAutocomplete();
    ta.focus();
}

// 5. Define Selection
window.defineSelection = function(btn) {
    const row = btn.closest('.scene-row');
    const textarea = row.querySelector('.scene-editor');
    
    // Textarea must be active/visible
    if (textarea.classList.contains('hidden')) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end) {
        showNotification("Highlight text first.");
        return;
    }
    
    const selectedText = textarea.value.substring(start, end).trim();
    if (!selectedText) return;
    
    // Open Codex Tab and New Entry
    document.getElementById('tab-codex').click();
    window.editCodexEntry();
    
    // Pre-fill
    document.getElementById('cx-name').value = selectedText;
    document.getElementById('cx-desc').focus();
    
    showNotification(`Defining: ${selectedText}`);
}

// Global click to close autocomplete
document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-box')) hideAutocomplete();
});
