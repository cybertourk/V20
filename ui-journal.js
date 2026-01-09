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
        boonsOwed: [], // {name, type, reason}
        boonsIOwe: [],
        npcs: [], // {name, clan, attitude, notes}
        notes: { scene1: '', scene2: '', scene3: '' },
        investigation: { objective: '', clues: '', secrets: '' },
        downtime: ''
    };
    renderSessionLogForm(newLog);
};

function renderSessionLogForm(data) {
    const area = document.getElementById('journal-content-area');
    if(!area) return;

    // Helper for rows
    const boonRow = (b, type) => `
        <div class="grid grid-cols-12 gap-1 mb-1 text-[9px]">
            <input type="text" class="col-span-4 bg-black/50 border border-[#333] text-white px-1" placeholder="Name" value="${b.name}" data-group="${type}" data-field="name">
            <select class="col-span-3 bg-black/50 border border-[#333] text-white px-1" data-group="${type}" data-field="type">
                <option value="Trivial" ${b.type==='Trivial'?'selected':''}>Trivial</option>
                <option value="Minor" ${b.type==='Minor'?'selected':''}>Minor</option>
                <option value="Major" ${b.type==='Major'?'selected':''}>Major</option>
                <option value="Life" ${b.type==='Life'?'selected':''}>Life</option>
            </select>
            <input type="text" class="col-span-5 bg-black/50 border border-[#333] text-white px-1" placeholder="Reason" value="${b.reason}" data-group="${type}" data-field="reason">
        </div>`;

    const npcRow = (n) => `
        <div class="bg-[#111] p-2 mb-2 border border-[#333]">
            <div class="grid grid-cols-2 gap-2 mb-1">
                <input type="text" class="bg-black/50 border border-[#333] text-white px-1 text-[10px]" placeholder="Name" value="${n.name}" data-group="npcs" data-field="name">
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

    area.innerHTML = `
        <div class="bg-black border border-[#444] p-4 text-xs font-serif min-h-full relative" id="active-log-form">
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

            <!-- SESSION NOTES -->
            <div class="mb-4 space-y-2">
                <div class="text-[10px] font-bold text-gray-500 uppercase">Session Notes & Events</div>
                <textarea id="log-scene1" class="w-full bg-[#111] border border-[#333] text-white text-[10px] p-1 h-16 resize-none" placeholder="Scene 1...">${data.notes.scene1}</textarea>
                <textarea id="log-scene2" class="w-full bg-[#111] border border-[#333] text-white text-[10px] p-1 h-16 resize-none" placeholder="Scene 2...">${data.notes.scene2}</textarea>
                <textarea id="log-scene3" class="w-full bg-[#111] border border-[#333] text-white text-[10px] p-1 h-16 resize-none" placeholder="Scene 3...">${data.notes.scene3}</textarea>
            </div>

            <!-- INVESTIGATION -->
            <div class="mb-4">
                <div class="text-[10px] font-bold text-purple-400 uppercase mb-1 border-b border-purple-500/30">Investigation & Secrets</div>
                <div class="space-y-1">
                    <input type="text" id="log-obj" class="w-full bg-[#111] border border-[#333] text-white px-1 text-[10px]" placeholder="Current Objective" value="${data.investigation.objective}">
                    <input type="text" id="log-clues" class="w-full bg-[#111] border border-[#333] text-white px-1 text-[10px]" placeholder="New Clues Found" value="${data.investigation.clues}">
                    <input type="text" id="log-secrets" class="w-full bg-[#111] border border-[#333] text-white px-1 text-[10px]" placeholder="Secrets / Blackmail Material" value="${data.investigation.secrets}">
                </div>
            </div>

            <!-- DOWNTIME -->
            <div class="mb-10">
                <div class="text-[10px] font-bold text-blue-400 uppercase mb-1 border-b border-blue-500/30">Downtime Actions</div>
                <textarea id="log-downtime" class="w-full bg-[#111] border border-[#333] text-white text-[10px] p-1 h-16 resize-none">${data.downtime}</textarea>
            </div>
        </div>
    `;

    // ADD BOON HANDLER
    window.addLogBoon = (type) => {
        const cont = document.getElementById(`container-${type}`);
        const div = document.createElement('div');
        div.innerHTML = boonRow({name:'', type:'Trivial', reason:''}, type);
        cont.appendChild(div.firstElementChild);
    };

    // ADD NPC HANDLER
    window.addLogNPC = () => {
        const cont = document.getElementById(`container-npcs`);
        const div = document.createElement('div');
        div.innerHTML = npcRow({name:'', clan:'', attitude:'Neutral', notes:'', id: Math.random().toString(36).substr(2, 5)});
        cont.appendChild(div.firstElementChild);
    };

    // SAVE HANDLER
    const saveBtn = document.getElementById('btn-save-log');
    if (saveBtn) {
        saveBtn.onclick = () => {
            const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };

            // Simplified DOM reading for lists
            const readBoons = (type) => {
                const container = document.getElementById(`container-${type}`);
                if(!container) return [];
                const rows = container.children;
                return Array.from(rows).map(r => ({
                    name: r.querySelector('[data-field="name"]').value,
                    type: r.querySelector('[data-field="type"]').value,
                    reason: r.querySelector('[data-field="reason"]').value
                })).filter(b => b.name);
            };

            const readNPCs = () => {
                const container = document.getElementById('container-npcs');
                if(!container) return [];
                const rows = container.children;
                return Array.from(rows).map(r => {
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
                notes: {
                    scene1: getVal('log-scene1'),
                    scene2: getVal('log-scene2'),
                    scene3: getVal('log-scene3')
                },
                investigation: {
                    objective: getVal('log-obj'),
                    clues: getVal('log-clues'),
                    secrets: getVal('log-secrets')
                },
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
            renderSessionLogForm(updated); // Refresh view
            showNotification("Journal Saved!");
        };
    }

    // DELETE HANDLER
    const delBtn = document.getElementById('btn-delete-log');
    if (delBtn) {
        delBtn.onclick = () => {
            if(confirm("Delete this session log?")) {
                window.state.sessionLogs = window.state.sessionLogs.filter(l => l.id !== data.id);
                renderJournalTab(); // Reset view
            }
        };
    }
}
