import { showNotification } from "./ui-common.js";

// --- SESSION JOURNAL LOGIC ---

export function renderJournalTab() {
    const container = document.getElementById('play-mode-5');
    if (!container) return;

    // Initialize logs array if missing
    if (!window.state.sessionLogs) window.state.sessionLogs = [];

    // Main Layout: 2 Columns (Sidebar List | Content Area)
    container.innerHTML = `
        <div class="flex h-full gap-4">
            <!-- Sidebar: Log History -->
            <div class="w-1/4 flex flex-col border-r border-[#333] pr-2">
                <div class="text-[10px] uppercase font-bold text-gray-400 mb-2 border-b border-[#333] pb-1">Session Logs</div>
                <button onclick="window.initNewSessionLog()" class="bg-[#8b0000] hover:bg-red-700 text-white font-bold py-1 px-2 text-[10px] uppercase mb-3 flex items-center justify-center gap-1">
                    <i class="fas fa-plus"></i> New Session
                </button>
                <div id="journal-history-list" class="flex-1 overflow-y-auto space-y-1">
                    <!-- List Items Injected Here -->
                </div>
            </div>

            <!-- Main Content: Form / View -->
            <div class="w-3/4 h-full overflow-y-auto pr-2" id="journal-content-area">
                <div class="flex items-center justify-center h-full text-gray-500 italic text-xs">
                    Select a session or create new.
                </div>
            </div>
        </div>
    `;

    renderJournalHistoryList();
}
window.renderJournalTab = renderJournalTab;

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
    // Snapshot current state
    const healthLevels = ['Bruised', 'Hurt', 'Injured', 'Wounded', 'Mauled', 'Crippled', 'Incapacitated'];
    let currentHealth = "Healthy";
    if (window.state.status && window.state.status.health_states) {
        window.state.status.health_states.forEach((v, i) => { if(v===1) currentHealth = healthLevels[i]; });
    }

    const newLog = {
        id: Date.now(),
        isNew: true,
        charName: (window.state.textFields && window.state.textFields['c-name']) || '',
        chronicle: (window.state.textFields && window.state.textFields['c-chronicle']) || '',
        sessionNum: (window.state.sessionLogs.length + 1).toString(),
        datePlayed: new Date().toISOString().split('T')[0],
        gameDate: '',
        title: '',
        status: {
            blood: window.state.status.blood || 0,
            willpower: window.state.status.willpower || 0,
            health: currentHealth,
            effects: ''
        },
        boonsOwed: [], 
        boonsIOwe: [],
        npcs: [], 
        // Changed to array for dynamic scenes
        scenes: [{id: 1, text: ''}], 
        // Changed to array for dynamic clues
        investigation: [{id: 1, text: ''}],
        downtime: ''
    };
    renderSessionLogForm(newLog);
};

function renderSessionLogForm(data) {
    const area = document.getElementById('journal-content-area');
    if(!area) return;

    // Collect unique NPC names from all previous logs for autocomplete
    const existingNPCs = new Set();
    window.state.sessionLogs.forEach(log => {
        if(log.npcs) log.npcs.forEach(n => existingNPCs.add(n.name));
    });
    const npcOptions = Array.from(existingNPCs).map(name => `<option value="${name}">`).join('');

    // --- HTML GENERATORS ---

    const boonRow = (b, type) => `
        <div class="flex gap-1 mb-1 text-[9px] items-center group boon-row">
            <input type="text" class="flex-1 bg-black/50 border border-[#333] text-white px-1" placeholder="Name" value="${b.name}" data-group="${type}" data-field="name">
            <select class="w-20 bg-black/50 border border-[#333] text-white px-1" data-group="${type}" data-field="type">
                <option value="Trivial" ${b.type==='Trivial'?'selected':''}>Trivial</option>
                <option value="Minor" ${b.type==='Minor'?'selected':''}>Minor</option>
                <option value="Major" ${b.type==='Major'?'selected':''}>Major</option>
                <option value="Life" ${b.type==='Life'?'selected':''}>Life</option>
            </select>
            <input type="text" class="flex-1 bg-black/50 border border-[#333] text-white px-1" placeholder="Reason" value="${b.reason}" data-group="${type}" data-field="reason">
            <button class="text-gray-600 hover:text-red-500 font-bold px-1" onclick="this.closest('.boon-row').remove()">×</button>
        </div>`;

    const npcRow = (n) => `
        <div class="bg-[#111] p-2 mb-2 border border-[#333] relative group npc-row">
            <button class="absolute top-1 right-1 text-gray-600 hover:text-red-500 font-bold text-[10px]" onclick="this.closest('.npc-row').remove()">×</button>
            <div class="grid grid-cols-2 gap-2 mb-1">
                <input type="text" list="npc-list" class="bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Name" value="${n.name}" data-group="npcs" data-field="name" onchange="window.autofillNPC(this)">
                <input type="text" class="bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Clan/Role" value="${n.clan}" data-group="npcs" data-field="clan">
            </div>
            <div class="flex gap-2 mb-1 text-[9px] text-gray-400">
                <label><input type="radio" name="att-${n.id}" value="Hostile" ${n.attitude==='Hostile'?'checked':''} data-group="npcs" data-field="attitude"> Hostile</label>
                <label><input type="radio" name="att-${n.id}" value="Neutral" ${n.attitude==='Neutral'?'checked':''} data-group="npcs" data-field="attitude"> Neutral</label>
                <label><input type="radio" name="att-${n.id}" value="Friendly" ${n.attitude==='Friendly'?'checked':''} data-group="npcs" data-field="attitude"> Friendly</label>
                <label><input type="radio" name="att-${n.id}" value="Dominated" ${n.attitude==='Dominated'?'checked':''} data-group="npcs" data-field="attitude"> Dominated</label>
            </div>
            <input type="text" class="w-full bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Key Notes" value="${n.notes}" data-group="npcs" data-field="notes">
        </div>`;

    const sceneRow = (s, idx) => `
        <div class="mb-2 scene-row">
            <div class="flex justify-between text-[9px] text-gray-500 font-bold uppercase mb-1">
                <span>Scene ${idx + 1}</span>
                ${idx > 0 ? `<button class="hover:text-red-500" onclick="this.closest('.scene-row').remove()">Remove</button>` : ''}
            </div>
            <textarea class="w-full bg-[#111] border border-[#333] text-white text-[10px] p-1 h-16 resize-none" placeholder="Description..." data-group="scenes">${s.text}</textarea>
        </div>`;

    const clueRow = (c, idx) => `
        <div class="mb-1 flex gap-1 items-center clue-row">
            <span class="text-[9px] text-gray-500 w-4">${idx + 1}.</span>
            <input type="text" class="flex-1 bg-[#111] border border-[#333] text-white px-1 text-[10px]" placeholder="Clue / Objective / Secret..." value="${c.text}" data-group="investigation">
            <button class="text-gray-600 hover:text-red-500 font-bold px-1" onclick="this.closest('.clue-row').remove()">×</button>
        </div>`;

    // --- MAIN RENDER ---

    area.innerHTML = `
        <div class="bg-black border border-[#444] p-4 text-xs font-serif min-h-full relative" id="active-log-form">
            <datalist id="npc-list">${npcOptions}</datalist>
            
            <div class="flex justify-between items-start border-b-2 border-double border-gold pb-2 mb-4">
                <div>
                    <h2 class="text-lg text-white font-bold uppercase tracking-wider">V20 Player Session Journal</h2>
                    <div class="text-gold text-[10px]">Character: ${data.charName} | Chronicle: ${data.chronicle}</div>
                </div>
                <div class="flex gap-2">
                    <button id="btn-save-log" class="bg-green-700 hover:bg-green-600 text-white px-3 py-1 text-[10px] font-bold uppercase rounded">Save Log</button>
                    ${!data.isNew ? `<button id="btn-delete-log" class="bg-red-900 hover:bg-red-700 text-white px-3 py-1 text-[10px] font-bold uppercase rounded">Delete</button>` : ''}
                </div>
            </div>

            <!-- SESSION DETAILS -->
            <div class="mb-4">
                <div class="text-[10px] font-bold text-gray-500 uppercase mb-1">Session Details</div>
                <div class="grid grid-cols-3 gap-2 mb-2">
                    <input type="text" id="log-sess-num" class="bg-transparent border-b border-[#333] text-white focus:border-gold outline-none" placeholder="Session #" value="${data.sessionNum}">
                    <input type="date" id="log-date" class="bg-transparent border-b border-[#333] text-gray-300 focus:border-gold outline-none" value="${data.datePlayed}">
                    <input type="text" id="log-game-date" class="bg-transparent border-b border-[#333] text-white focus:border-gold outline-none" placeholder="In-Game Date" value="${data.gameDate}">
                </div>
                <input type="text" id="log-title" class="w-full bg-transparent border-b border-[#333] text-white font-bold text-sm focus:border-gold outline-none" placeholder="Session Title" value="${data.title}">
            </div>

            <!-- STATUS SNAPSHOT -->
            <div class="mb-4 bg-[#111] p-2 border border-[#333]">
                <div class="text-[10px] font-bold text-gray-500 uppercase mb-1">Status Snapshot (Start)</div>
                <div class="grid grid-cols-3 gap-4 text-[10px] text-gray-300">
                    <div>Blood: <span class="text-red-500 font-bold">${data.status.blood}</span> / 10</div>
                    <div>Willpower: <span class="text-blue-400 font-bold">${data.status.willpower}</span></div>
                    <div>Health: <span class="text-white font-bold">${data.status.health}</span></div>
                </div>
                <div class="mt-1 flex items-center gap-2">
                    <span class="text-[10px] text-gray-500">Active Effects:</span>
                    <input type="text" id="log-effects" class="flex-1 bg-transparent border-b border-[#333] text-white text-[10px]" value="${data.status.effects}">
                </div>
            </div>

            <!-- THE LEDGER -->
            <div class="mb-4">
                <div class="text-[10px] font-bold text-gold uppercase mb-1 border-b border-gold/30">The Ledger: Boons & Favors</div>
                
                <div class="mb-2">
                    <div class="text-[9px] text-green-400 font-bold mb-1">[+] Boons Owed To Me (Assets) <button class="ml-2 text-gray-500 hover:text-white" onclick="window.addLogBoon('boonsOwed')">+</button></div>
                    <div id="container-boonsOwed">${data.boonsOwed.map(b => boonRow(b, 'boonsOwed')).join('')}</div>
                </div>

                <div>
                    <div class="text-[9px] text-red-400 font-bold mb-1">[-] Boons I Owe (Liabilities) <button class="ml-2 text-gray-500 hover:text-white" onclick="window.addLogBoon('boonsIOwe')">+</button></div>
                    <div id="container-boonsIOwe">${data.boonsIOwe.map(b => boonRow(b, 'boonsIOwe')).join('')}</div>
                </div>
            </div>

            <!-- KEY NPCS -->
            <div class="mb-4">
                <div class="text-[10px] font-bold text-gold uppercase mb-1 border-b border-gold/30">Key NPCs <button class="ml-2 text-gray-500 hover:text-white" onclick="window.addLogNPC()">+</button></div>
                <div id="container-npcs">${data.npcs.map(n => { n.id = n.id || Math.random().toString(36).substr(2, 5); return npcRow(n); }).join('')}</div>
            </div>

            <!-- SESSION NOTES (SCENES) -->
            <div class="mb-4">
                <div class="text-[10px] font-bold text-gray-500 uppercase mb-1 border-b border-gray-700/30">Session Scenes <button class="ml-2 text-gray-500 hover:text-white" onclick="window.addLogScene()">+</button></div>
                <div id="container-scenes" class="space-y-2">
                    ${(data.scenes || [{id:1, text:''}]).map((s, i) => sceneRow(s, i)).join('')}
                </div>
            </div>

            <!-- INVESTIGATION -->
            <div class="mb-4">
                <div class="text-[10px] font-bold text-purple-400 uppercase mb-1 border-b border-purple-500/30">Investigation & Secrets <button class="ml-2 text-gray-500 hover:text-white" onclick="window.addLogClue()">+</button></div>
                <div id="container-investigation" class="space-y-1">
                    ${(data.investigation || [{id:1, text:''}]).map((c, i) => clueRow(c, i)).join('')}
                </div>
            </div>

            <!-- DOWNTIME -->
            <div class="mb-10">
                <div class="text-[10px] font-bold text-blue-400 uppercase mb-1 border-b border-blue-500/30">Downtime Actions</div>
                <textarea id="log-downtime" class="w-full bg-[#111] border border-[#333] text-white text-[10px] p-1 h-16 resize-none">${data.downtime}</textarea>
            </div>
        </div>
    `;

    // --- DOM HANDLERS ---

    window.addLogBoon = (type) => {
        const cont = document.getElementById(`container-${type}`);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = boonRow({name:'', type:'Trivial', reason:''}, type);
        cont.appendChild(tempDiv.firstElementChild);
    };

    window.addLogNPC = () => {
        const cont = document.getElementById(`container-npcs`);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = npcRow({name:'', clan:'', attitude:'Neutral', notes:'', id: Math.random().toString(36).substr(2, 5)});
        cont.appendChild(tempDiv.firstElementChild);
    };

    window.autofillNPC = (input) => {
        const name = input.value;
        // Search previous logs for this NPC to autofill details
        for (const log of window.state.sessionLogs) {
            if (log.npcs) {
                const found = log.npcs.find(n => n.name === name);
                if (found) {
                    const row = input.closest('.npc-row');
                    const clanInput = row.querySelector('[data-field="clan"]');
                    const noteInput = row.querySelector('[data-field="notes"]');
                    const radios = row.querySelectorAll('input[type="radio"]');
                    
                    if(clanInput && !clanInput.value) clanInput.value = found.clan;
                    if(noteInput && !noteInput.value) noteInput.value = found.notes; // Optional: maybe don't autofill notes?
                    
                    radios.forEach(r => {
                        if (r.value === found.attitude) r.checked = true;
                    });
                    break;
                }
            }
        }
    };

    window.addLogScene = () => {
        const cont = document.getElementById('container-scenes');
        const count = cont.children.length;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sceneRow({text:''}, count);
        cont.appendChild(tempDiv.firstElementChild);
    };

    window.addLogClue = () => {
        const cont = document.getElementById('container-investigation');
        const count = cont.children.length;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = clueRow({text:''}, count);
        cont.appendChild(tempDiv.firstElementChild);
    };

    // SAVE HANDLER
    const saveBtn = document.getElementById('btn-save-log');
    if (saveBtn) {
        saveBtn.onclick = () => {
            const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };

            const readBoons = (type) => {
                const container = document.getElementById(`container-${type}`);
                if(!container) return [];
                return Array.from(container.children).map(r => ({
                    name: r.querySelector('[data-field="name"]').value,
                    type: r.querySelector('[data-field="type"]').value,
                    reason: r.querySelector('[data-field="reason"]').value
                })).filter(b => b.name);
            };

            const readNPCs = () => {
                const container = document.getElementById('container-npcs');
                if(!container) return [];
                return Array.from(container.children).map(r => {
                    const att = r.querySelector('input[type="radio"]:checked')?.value || 'Neutral';
                    return {
                        name: r.querySelector('[data-field="name"]').value,
                        clan: r.querySelector('[data-field="clan"]').value,
                        attitude: att,
                        notes: r.querySelector('[data-field="notes"]').value,
                        id: r.querySelector('input[type="radio"]').name.split('-')[1] 
                    };
                }).filter(n => n.name);
            };

            const readScenes = () => {
                const container = document.getElementById('container-scenes');
                if(!container) return [];
                return Array.from(container.children).map((r, i) => ({
                    id: i + 1,
                    text: r.querySelector('textarea').value
                })).filter(s => s.text.trim() !== "");
            };

            const readClues = () => {
                const container = document.getElementById('container-investigation');
                if(!container) return [];
                return Array.from(container.children).map((r, i) => ({
                    id: i + 1,
                    text: r.querySelector('input').value
                })).filter(c => c.text.trim() !== "");
            };

            const updated = {
                id: data.id,
                sessionNum: getVal('log-sess-num'),
                datePlayed: getVal('log-date'),
                gameDate: getVal('log-game-date'),
                title: getVal('log-title'),
                status: { ...data.status, effects: getVal('log-effects') },
                boonsOwed: readBoons('boonsOwed'),
                boonsIOwe: readBoons('boonsIOwe'),
                npcs: readNPCs(),
                scenes: readScenes(),
                investigation: readClues(),
                downtime: getVal('log-downtime')
            };

            if (data.isNew) {
                delete updated.isNew;
                window.state.sessionLogs.push(updated);
            } else {
                const idx = window.state.sessionLogs.findIndex(l => l.id === data.id);
                if (idx !== -1) window.state.sessionLogs[idx] = updated;
            }

            renderJournalHistoryList();
            renderSessionLogForm(updated);
            showNotification("Journal Saved!");
        };
    }

    // DELETE HANDLER
    const delBtn = document.getElementById('btn-delete-log');
    if (delBtn) {
        delBtn.onclick = () => {
            if(confirm("Delete this session log?")) {
                window.state.sessionLogs = window.state.sessionLogs.filter(l => l.id !== data.id);
                renderJournalTab(); 
            }
        };
    }
}
