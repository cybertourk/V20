import { 
    db, auth, collection, doc, setDoc, getDoc, getDocs, query, where, addDoc, onSnapshot, deleteDoc, updateDoc, arrayUnion, arrayRemove, orderBy, limit, writeBatch
} from "./firebase-config.js";
import { showNotification, notifPrefs, saveNotificationPrefs } from "./ui-common.js";
import { BESTIARY } from "./bestiary-data.js";
import { 
    combatState, startCombat, endCombat, nextTurn, 
    addCombatant, removeCombatant, updateInitiative, rollNPCInitiative
} from "./combat-tracker.js";

import { renderStorytellerJournal, updateJournalList } from "./ui-journal.js";

import { 
    initChatSystem, startChatListener, sendChronicleMessage, 
    stClearChat, stExportChat, stSetWhisperTarget, renderMessageList, refreshChatUI
} from "./chat-model.js";

import { renderCoterieMap } from "./coterie-map.js";
import { renderDots } from "./ui-common.js";

// We access stState via the global window object to avoid circular dependencies
// stState is initialized and managed in ui-storyteller.js

// ==========================================================================
// 1. ROSTER VIEW
// ==========================================================================

export function renderRosterView() {
    const viewport = document.getElementById('st-viewport');
    if (!viewport || window.stState.currentView !== 'roster') return;

    const players = Object.entries(window.stState.players)
        .filter(([id, p]) => !p.metadataType || p.metadataType !== 'journal')
        .map(([id, p]) => ({...p, id})); 
    
    if (players.length === 0) {
        viewport.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500">
                <i class="fas fa-users-slash text-4xl mb-4 opacity-50"></i>
                <p>No players connected.</p>
                <p class="text-xs mt-2">Share ID: <span class="text-gold font-mono font-bold">${window.stState.activeChronicleId}</span></p>
            </div>`;
        return;
    }

    let html = `<div class="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 overflow-y-auto h-full pb-20 custom-scrollbar">`;

    players.forEach(p => {
        const health = p.live_stats?.health || [];
        const dmgCount = health.filter(x => x > 0).length;
        const healthText = dmgCount >= 7 ? "INC" : (7 - dmgCount);
        const healthColor = dmgCount >= 7 ? "text-red-600 font-black animate-pulse" : (dmgCount > 3 ? "text-red-400" : "text-green-400");
        const wp = p.live_stats?.willpower || 0;
        const bp = p.live_stats?.blood || 0;

        const now = new Date();
        const lastActive = p.last_active ? new Date(p.last_active) : new Date(0); 
        const diffSeconds = (now - lastActive) / 1000;
        const isOnline = diffSeconds < 90 && p.status !== 'Offline';

        const statusColor = isOnline ? 'bg-green-500 shadow-[0_0_5px_lime]' : 'bg-red-500 opacity-50';
        const statusTitle = isOnline ? 'Online' : `Offline (Last seen: ${lastActive.toLocaleTimeString()})`;
        
        const hasSheet = !!p.full_sheet;
        const sheetBtnClass = hasSheet 
            ? "text-blue-400 hover:text-white border-blue-900/30 hover:bg-blue-900" 
            : "text-gray-600 border-gray-800 cursor-not-allowed opacity-50";

        html += `
            <div class="bg-[#1a1a1a] border border-[#333] rounded p-3 shadow-lg relative group hover:border-[#d4af37] transition-all flex flex-col justify-between aspect-square">
                <div class="flex justify-between items-start mb-1">
                    <div class="overflow-hidden mr-1 cursor-pointer" onclick="window.stSetWhisperTarget('${p.id}', '${p.character_name}')" title="Click to Whisper">
                        <h3 class="font-bold text-sm text-white truncate w-full font-cinzel text-shadow hover:text-[#d4af37] transition-colors">${p.character_name || "Unknown"}</h3>
                        <div class="text-[10px] text-gray-500 truncate font-mono">${p.player_name || "Player"}</div>
                    </div>
                    <div class="flex items-center gap-1">
                        <div class="w-3 h-3 rounded-full ${statusColor}" title="${statusTitle}"></div>
                        <button onclick="event.stopPropagation(); window.stRemovePlayer('${p.id}', '${p.character_name}')" class="text-gray-600 hover:text-red-500 text-[10px] ml-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove Player">
                            <i class="fas fa-user-times"></i>
                        </button>
                    </div>
                </div>

                <div class="flex flex-col justify-center gap-1 flex-1 my-2 text-[10px] font-bold">
                    <div class="flex justify-between items-center bg-black/40 px-2 py-1 rounded border border-[#222]">
                        <span class="text-gray-500 uppercase">Health</span>
                        <span class="${healthColor}">${healthText}</span>
                    </div>
                    <div class="flex justify-between items-center bg-black/40 px-2 py-1 rounded border border-[#222]">
                        <span class="text-gray-500 uppercase">Willpower</span>
                        <span class="text-blue-300">${wp}</span>
                    </div>
                    <div class="flex justify-between items-center bg-black/40 px-2 py-1 rounded border border-[#222]">
                        <span class="text-gray-500 uppercase">Blood</span>
                        <span class="text-red-400">${bp}</span>
                    </div>
                </div>

                <div class="mt-auto flex gap-1">
                    <button class="flex-1 border text-[9px] py-1 uppercase font-bold rounded transition-colors ${sheetBtnClass}" 
                            onclick="${hasSheet ? `window.stViewPlayerSheet('${p.id}')` : ''}" title="${hasSheet ? 'View Sheet' : 'Waiting for Sync...'}">
                        <i class="fas fa-eye"></i> Sheet
                    </button>
                    <button class="flex-1 bg-[#2a0a0a] border border-red-900/30 text-[9px] py-1 text-red-400 hover:text-white hover:bg-red-900 hover:border-red-500 uppercase font-bold rounded transition-colors" onclick="window.stAddToCombat({id:'${p.id}', name:'${p.character_name}'}, 'Player')">
                        <i class="fas fa-swords"></i> Fight
                    </button>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    viewport.innerHTML = html;
}

export function stViewPlayerSheet(playerId) {
    const player = window.stState.players[playerId];
    if (!player || !player.full_sheet) {
        showNotification("Sheet data not yet synced. Wait for player update.", "error");
        return;
    }

    // 1. Backup current ST state
    window.stSavedLocalState = JSON.parse(JSON.stringify(window.state));

    // 2. Load Player Data into State
    window.state = JSON.parse(JSON.stringify(player.full_sheet));
    
    // Force Play Mode
    window.state.isPlayMode = true;
    
    // 3. Hide Dashboard
    const dashboard = document.getElementById('st-dashboard-view');
    if (dashboard) dashboard.classList.add('hidden');

    // 4. Update UI
    if (window.fullRefresh) window.fullRefresh();
    if (window.applyPlayModeUI) window.applyPlayModeUI();

    // 5. Show Return Button
    let btn = document.getElementById('st-return-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'st-return-btn';
        btn.className = 'fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999] bg-[#8b0000] text-white px-6 py-3 rounded-full font-bold uppercase shadow-[0_0_20px_red] border-2 border-[#d4af37] animate-pulse hover:scale-105 transition-transform flex items-center gap-2';
        btn.innerHTML = '<i class="fas fa-crown"></i> Return to Dashboard';
        btn.onclick = window.returnToStoryteller;
        document.body.appendChild(btn);
    }
    btn.classList.remove('hidden');
    
    showNotification(`Viewing ${player.character_name}'s Sheet`);
}

export function returnToStoryteller() {
    // 1. Restore State
    if (window.stSavedLocalState) {
        window.state = window.stSavedLocalState;
        window.stSavedLocalState = null;
    }

    // 2. Hide Button
    const btn = document.getElementById('st-return-btn');
    if (btn) btn.classList.add('hidden');

    // 3. Show Dashboard
    const dashboard = document.getElementById('st-dashboard-view');
    if (dashboard) dashboard.classList.remove('hidden');

    // 4. Refresh UI back to ST's character (background)
    if (window.fullRefresh) window.fullRefresh();
    
    // 5. Ensure ST view is correct
    if (window.renderStorytellerDashboard) window.renderStorytellerDashboard();
}

// ==========================================================================
// 2. COMBAT VIEW
// ==========================================================================

export function renderCombatView() {
    const viewport = document.getElementById('st-viewport');
    if (!viewport || window.stState.currentView !== 'combat') return;

    const { isActive, turn, phase, combatants } = combatState; 

    if (!isActive) {
        viewport.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500">
                <i class="fas fa-peace text-6xl mb-6 opacity-30"></i>
                <h3 class="text-xl font-bold text-gray-400 mb-2">No Active Combat</h3>
                <button onclick="window.stStartCombat()" class="bg-[#8b0000] hover:bg-red-700 text-white font-bold py-3 px-8 uppercase tracking-widest shadow-lg rounded transition-transform hover:scale-105">Start Encounter</button>
            </div>
        `;
        return;
    }

    let phaseTitle = phase === 'declare' ? 'Declaration Phase' : 'Action Phase';
    let phaseSubtitle = phase === 'declare' ? 'Slowest to Fastest (State Intentions)' : 'Fastest to Slowest (Roll & Resolve)';
    let phaseColor = phase === 'declare' ? 'text-blue-400' : 'text-red-500';

    const activeCombatant = combatants.find(c => c.id === combatState.activeCombatantId);
    const activeName = activeCombatant ? activeCombatant.name : "None";
    const promptLabel = phase === 'declare' ? 'Declaring' : 'Acting';

    let html = `
        <div class="flex flex-col h-full">
            <!-- TOP STATUS BAR -->
            <div class="bg-[#111] border-b border-[#333] p-4 flex justify-between items-center shadow-md z-20 shrink-0">
                <div class="flex items-center gap-4">
                    <div class="text-center">
                        <div class="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Round</div>
                        <div class="text-3xl font-black text-[#d4af37] leading-none">${turn}</div>
                    </div>
                    
                    <div class="border-l border-[#333] pl-4 py-1">
                        <div class="text-base ${phaseColor} uppercase font-bold tracking-widest">${phaseTitle}</div>
                        <div class="text-[10px] text-gray-400 italic">${phaseSubtitle}</div>
                        <div class="text-sm text-white mt-1 uppercase font-bold tracking-wider">${promptLabel}: <span class="text-[#d4af37]">${activeName}</span></div>
                    </div>
                </div>

                <!-- CONTROLS -->
                <div class="flex flex-col gap-2 items-end">
                    <div class="flex items-center gap-2 mb-1" title="If checked, initiatives reset to 0 at the end of the round.">
                        <input type="checkbox" id="reroll-init-toggle" class="accent-[#d4af37] cursor-pointer w-3 h-3" ${combatState.rerollInitiative ? 'checked' : ''} onchange="window.combatTracker.toggleReroll()">
                        <label for="reroll-init-toggle" class="text-[9px] text-gray-400 font-bold uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors">Reroll Each Round</label>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.stNextTurn()" class="bg-[#222] hover:bg-[#333] border border-[#444] text-white px-4 py-2 text-xs font-bold uppercase rounded flex items-center gap-2 transition-colors shadow-sm hover:shadow-[#d4af37]/20">
                            Next <i class="fas fa-step-forward"></i>
                        </button>
                        <button onclick="window.combatTracker.rollAllNPCs()" class="bg-[#1a1a1a] hover:bg-[#333] border border-[#444] text-gray-300 hover:text-white px-3 py-2 text-xs font-bold uppercase rounded transition-colors" title="Roll All NPC Initiatives">
                            <i class="fas fa-dice-d10"></i> NPCs
                        </button>
                    </div>
                    <button onclick="window.stEndCombat()" class="text-red-500 hover:text-red-300 text-[10px] font-bold uppercase transition-colors">End Combat</button>
                </div>
            </div>

            <!-- LIST -->
            <div class="flex-1 overflow-y-auto p-4 space-y-2 bg-black/50 pb-20 custom-scrollbar">
    `;

    if (combatants.length === 0) {
        html += `<div class="text-center text-gray-500 italic mt-10">Waiting for combatants...</div>`;
    } else {
        combatants.forEach(c => {
            const isNPC = c.type === 'NPC';
            const activeClass = c.active ? 'border-[#d4af37] bg-[#2a2a2a] shadow-[0_0_15px_rgba(212,175,55,0.2)] transform scale-[1.01]' : 'border-[#333] bg-[#111] opacity-80';
            const activeIndicator = c.active ? `<div class="absolute left-0 top-0 bottom-0 w-1 bg-[#d4af37]"></div>` : '';

            let statusColor = 'text-gray-400';
            if (c.status === 'held') statusColor = 'text-yellow-500';
            if (c.status === 'defending') statusColor = 'text-blue-400';
            if (c.status === 'multiple') statusColor = 'text-purple-400';
            if (c.status === 'done') statusColor = 'text-gray-600';

            const safeName = c.name.replace(/'/g, "\\'");
            
            let visIconClass = "fa-eye text-gray-500";
            let visTitle = "Visible to All. Click to Hide. Right-click for Targeted Hide.";
            if (c.hidden === true) {
                visIconClass = "fa-eye-slash text-red-500";
                visTitle = "Hidden from All Players. Click to show.";
            } else if (Array.isArray(c.hidden)) {
                visIconClass = "fa-user-secret text-[#d4af37]";
                visTitle = `Hidden from ${c.hidden.length} players. Click to Show All. Right-click to Edit.`;
            }

            html += `
                <div class="${activeClass} p-2 rounded flex items-center justify-between group hover:border-[#555] transition-all relative overflow-hidden">
                    ${activeIndicator}
                    <div class="flex items-center gap-4 flex-1 pl-3">
                        <div class="flex flex-col items-center w-12">
                            <input type="number" value="${c.init}" onchange="window.stUpdateInit('${c.id}', this.value)" class="w-10 bg-black border border-[#444] text-center text-lg font-bold text-[#d4af37] focus:outline-none focus:border-[#d4af37] rounded">
                            <span class="text-[8px] text-gray-600 uppercase font-bold mt-0.5">Init</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-white font-bold text-sm cursor-pointer hover:text-[#d4af37] hover:underline transition-colors ${c.status === 'done' ? 'line-through opacity-50' : ''}" onclick="window.stViewCombatantSheet('${c.id}', '${c.type}', '${c.sourceId}', '${safeName}')" title="Click to View Sheet">${c.name}</span>
                            <span class="text-[9px] text-gray-500 uppercase">${c.type}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        
                        <button class="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded transition-colors" 
                                onclick="window.stToggleCombatVisibility('${c.id}')" 
                                oncontextmenu="window.stOpenCombatVisibilityModal(event, '${c.id}')"
                                title="${visTitle}">
                            <i class="fas ${visIconClass}"></i>
                        </button>

                        <select onchange="window.combatTracker.setStatus('${c.id}', this.value)" class="bg-[#050505] border border-[#333] text-[9px] uppercase font-bold ${statusColor} rounded px-1 py-1 focus:outline-none focus:border-[#d4af37]">
                            <option value="pending" class="text-gray-400" ${c.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="held" class="text-yellow-500" ${c.status === 'held' ? 'selected' : ''}>Held Action</option>
                            <option value="defending" class="text-blue-400" ${c.status === 'defending' ? 'selected' : ''}>Defending</option>
                            <option value="multiple" class="text-purple-400" ${c.status === 'multiple' ? 'selected' : ''}>Multiple Actions</option>
                            <option value="done" class="text-gray-600" ${c.status === 'done' ? 'selected' : ''}>Done</option>
                        </select>
                        ${isNPC ? `<button onclick="window.stRollInit('${c.id}')" class="text-gray-500 hover:text-white" title="Roll Initiative"><i class="fas fa-dice-d10"></i></button>` : ''}
                        <button onclick="window.stRemoveCombatant('${c.id}')" class="text-red-900 hover:text-red-500 px-2 transition-colors" title="Remove from Combat"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            `;
        });
    }
    html += `</div></div>`;
    viewport.innerHTML = html;
}

export function stViewCombatantSheet(id, type, sourceId, name) {
    if (type === 'Player') {
        window.stViewPlayerSheet(id);
    } else {
        let npcData = null;
        if (sourceId && window.stState.bestiary && window.stState.bestiary[sourceId]) {
            npcData = window.stState.bestiary[sourceId].data;
            if(npcData) npcData.id = id; 
        } else {
            for (const cat in BESTIARY) {
                if (BESTIARY[cat][name]) {
                    npcData = JSON.parse(JSON.stringify(BESTIARY[cat][name])); 
                    npcData.id = id;
                    break;
                }
            }
        }
        
        if (npcData && window.openNpcSheet) {
            window.openNpcSheet(npcData);
        } else {
            showNotification("Detailed sheet not found for this NPC.", "error");
        }
    }
}

export function stToggleCombatVisibility(id) {
    const c = combatState.combatants.find(x => x.id === id);
    if (!c) return;
    const newVal = (c.hidden === true) ? false : true;
    if (window.combatTracker && window.combatTracker.setHidden) {
        window.combatTracker.setHidden(id, newVal);
    }
}

export function stOpenCombatVisibilityModal(e, id) {
    if(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    const c = combatState.combatants.find(x => x.id === id);
    if (!c) return;

    const modal = document.getElementById('st-combat-vis-modal');
    const list = document.getElementById('st-combat-vis-player-list');
    const idField = document.getElementById('st-combat-vis-id');
    const saveBtn = document.getElementById('st-combat-vis-save');
    
    if (!modal || !list) return;

    idField.value = id;
    list.innerHTML = '';

    const currentHidden = Array.isArray(c.hidden) ? c.hidden : [];

    Object.entries(window.stState.players).forEach(([uid, p]) => {
        if (p.metadataType === 'journal') return;
        
        const isChecked = currentHidden.includes(uid);
        const row = document.createElement('label');
        row.className = "flex items-center justify-between p-2 hover:bg-[#222] rounded cursor-pointer group";
        row.innerHTML = `
            <div class="flex items-center gap-3">
                <input type="checkbox" class="vis-recipient-checkbox w-4 h-4 accent-[#d4af37]" value="${uid}" ${isChecked ? 'checked' : ''}>
                <span class="text-xs text-gray-300 group-hover:text-white">${p.character_name || "Unknown"}</span>
            </div>
            <span class="text-[8px] text-gray-600 font-mono uppercase">${uid.substring(0, 8)}</span>
        `;
        list.appendChild(row);
    });

    saveBtn.onclick = () => {
        const selected = Array.from(list.querySelectorAll('.vis-recipient-checkbox:checked')).map(cb => cb.value);
        if (window.combatTracker && window.combatTracker.setHidden) {
            const finalVal = selected.length > 0 ? selected : false;
            window.combatTracker.setHidden(id, finalVal);
        }
        modal.classList.add('hidden');
    };

    modal.classList.remove('hidden');
}

// ==========================================================================
// 3. BESTIARY VIEW
// ==========================================================================

export function renderBestiaryView() {
    const viewport = document.getElementById('st-viewport');
    if (!viewport || window.stState.currentView !== 'bestiary') return;

    let html = `
        <div class="flex h-full">
            <div class="w-64 bg-[#080808] border-r border-[#333] flex flex-col">
                <div class="p-3 border-b border-[#333]">
                    <input type="text" id="bestiary-search" placeholder="Search..." class="w-full bg-[#111] border border-[#333] text-xs p-2 text-white outline-none focus:border-[#d4af37]">
                </div>
                <div class="flex-1 overflow-y-auto p-2" id="bestiary-categories">
                    <div class="text-[10px] font-bold text-gray-500 uppercase mb-1">Custom</div>
                    <div id="cat-custom" class="space-y-1 mb-4"></div>
                    
                    <div class="text-[10px] font-bold text-gray-500 uppercase mb-1">Core Rulebook</div>
                    ${Object.keys(BESTIARY).map(cat => `
                        <div class="cursor-pointer hover:bg-[#222] px-2 py-1 text-xs text-gray-300 flex justify-between group" onclick="document.getElementById('cat-group-${cat}').classList.toggle('hidden')">
                            <span>${cat}</span><i class="fas fa-chevron-down text-[8px] text-gray-600"></i>
                        </div>
                        <div id="cat-group-${cat}" class="hidden pl-2 border-l border-[#222] ml-1">
                            ${Object.keys(BESTIARY[cat]).map(key => `<div class="cursor-pointer hover:text-[#d4af37] px-2 py-1 text-[10px] text-gray-500" onclick="window.previewStaticNpc('${cat}', '${key}')">${key}</div>`).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="flex-1 overflow-y-auto p-6 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] pb-20">
                <div id="bestiary-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"></div>
            </div>
        </div>
    `;
    viewport.innerHTML = html;
    
    // Search Filter Logic
    const searchInput = document.getElementById('bestiary-search');
    if(searchInput) {
        searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#bestiary-grid > div').forEach(card => {
                const name = card.querySelector('.npc-card-name')?.innerText.toLowerCase() || "";
                card.style.display = name.includes(term) ? 'flex' : 'none';
            });
        };
    }
    
    renderCustomBestiaryList();
}

function renderCustomBestiaryList() {
    const container = document.getElementById('cat-custom');
    const grid = document.getElementById('bestiary-grid');
    if (!container || !grid) return;

    container.innerHTML = '';
    grid.innerHTML = ''; 

    const customNPCs = Object.values(window.stState.bestiary);
    
    if(customNPCs.length === 0) {
        container.innerHTML = `<div class="px-2 py-1 text-[10px] italic text-gray-600">Empty</div>`;
        grid.innerHTML = `<div class="col-span-full text-center text-gray-500 italic mt-10">Bestiary is empty. Use "Character Creator" -> "NPC" tab to build one, then "Push to Bestiary".</div>`;
    }

    customNPCs.forEach(entry => {
        const id = Object.keys(window.stState.bestiary).find(key => window.stState.bestiary[key] === entry);
        
        const item = document.createElement('div');
        item.className = "cursor-pointer hover:text-blue-300 px-2 py-1 text-[11px] text-blue-500 truncate";
        item.innerText = entry.name;
        item.onclick = () => renderNpcCard(entry, id, true, grid, true);
        container.appendChild(item);

        renderNpcCard(entry, id, true, grid);
    });
}

function renderNpcCard(entry, id, isCustom, container, clearFirst = false) {
    if (clearFirst) container.innerHTML = '';
    
    const npc = entry.data || entry;
    const name = entry.name || npc.name;
    const type = entry.type || npc.template || "Mortal";
    const phys = (npc.attributes?.Strength||1) + (npc.attributes?.Dexterity||1) + (npc.attributes?.Stamina||1);
    
    const card = document.createElement('div');
    card.className = "bg-[#111] border border-[#333] p-3 rounded shadow-lg hover:border-[#555] transition-all group relative flex flex-col";
    
    let actionsHtml = '';
    if (isCustom) {
        actionsHtml = `
            <button onclick="event.stopPropagation(); window.deleteCloudNpc('${id}')" class="text-red-900 hover:text-red-500 p-1" title="Delete"><i class="fas fa-trash"></i></button>
            <button class="bg-[#222] hover:bg-[#333] text-gray-300 px-2 py-1 text-[9px] font-bold uppercase rounded border border-[#444]" onclick='event.stopPropagation(); window.editCloudNpc("${id}")'>Edit</button>
        `;
    } else {
        actionsHtml = `<button class="bg-blue-900/30 hover:bg-blue-900/50 text-blue-200 px-2 py-1 text-[9px] font-bold uppercase rounded border border-blue-800" onclick='event.stopPropagation(); window.copyStaticNpc("${name}")'>Copy</button>`;
    }

    card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <div class="overflow-hidden">
                <div class="text-[#d4af37] font-bold text-sm truncate cursor-pointer hover:text-white hover:underline transition-colors npc-card-name" title="Click to View Stats">${name}</div>
                <div class="text-[9px] text-gray-500 uppercase tracking-wider">${type}</div>
            </div>
            ${isCustom ? `<i class="fas fa-cloud text-[10px] text-blue-500"></i>` : `<i class="fas fa-book text-[10px] text-gray-600"></i>`}
        </div>
        <div class="grid grid-cols-3 gap-1 text-[8px] text-gray-400 mb-3 bg-black/30 p-1 rounded">
            <div class="text-center"><div class="font-bold text-gray-300">${phys}</div><div>Phys</div></div>
            <div class="text-center"><div class="font-bold text-gray-300">${Object.keys(npc.disciplines||{}).length}</div><div>Disc</div></div>
            <div class="text-center"><div class="font-bold text-gray-300">${npc.willpower||1}</div><div>Will</div></div>
        </div>
        <div class="flex justify-between items-center border-t border-[#222] pt-2 mt-auto">
            <div class="flex gap-1">${actionsHtml}</div>
            <button class="bg-[#8b0000] hover:bg-red-700 text-white px-3 py-1 text-[9px] font-bold uppercase rounded shadow-md" onclick="event.stopPropagation(); window.stAddToCombat({id:'${id||name}', name:'${name}', health:${isCustom?'null':'{damage:0}'}, sourceId:'${id}'}, 'NPC')">Spawn</button>
        </div>
    `;
    
    card.onclick = (e) => { 
        if (e.target.closest('button')) return;
        if (id && npc && typeof npc === 'object') npc.id = id;
        if(window.openNpcSheet) window.openNpcSheet(npc); 
    };
    
    container.appendChild(card);
}

export function handleAddToCombat(entity, type) {
    if (!window.stState.activeChronicleId) { showNotification("No active chronicle.", "error"); return; }
    if (!entity.health) entity.health = { damage: 0, track: [0,0,0,0,0,0,0] };
    addCombatant(entity, type);
}

export async function copyStaticNpc(name) {
    let found = null;
    for (const cat in BESTIARY) { 
        if (BESTIARY[cat][name]) { found = { ...BESTIARY[cat][name] }; break; }
    }

    if (found && window.stState.activeChronicleId) { 
        const newId = "npc_" + Date.now();
        const customName = `${found.name} (Copy)`;
        try {
            await setDoc(doc(db, 'chronicles', window.stState.activeChronicleId, 'bestiary', newId), {
                name: customName,
                type: "Custom",
                data: { ...found, name: customName, template: 'bestiary' }
            });
            showNotification(`Created customizable copy: ${customName}`);
        } catch(e) { console.error(e); }
    }
}

export async function deleteCloudNpc(id) {
    if(!confirm("Delete?")) return;
    try { 
        await deleteDoc(doc(db, 'chronicles', window.stState.activeChronicleId, 'bestiary', id)); 
        showNotification("Deleted."); 
    } catch(e) {}
}

export function editCloudNpc(id) {
    const entry = window.stState.bestiary[id];
    if(entry && entry.data && window.openNpcCreator) {
        const type = entry.data.template || 'mortal'; 
        window.openNpcCreator(type, entry.data, null, id);
        if(window.exitStorytellerDashboard) window.exitStorytellerDashboard(); 
    }
}

export function previewStaticNpc(category, key) {
    const npc = BESTIARY[category][key];
    const grid = document.getElementById('bestiary-grid');
    if (grid && npc) {
        grid.innerHTML = '';
        renderNpcCard({ data: npc, name: key, type: npc.template }, null, false, grid);
    }
}

// ==========================================================================
// 4. CHAT VIEW
// ==========================================================================

export function renderChatView(container) {
    let playerOptions = '';
    Object.entries(window.stState.players).forEach(([id, p]) => {
        if (p.character_name) {
            playerOptions += `
            <label class="flex items-center gap-2 p-1 hover:bg-[#222] cursor-pointer">
                <input type="checkbox" class="st-recipient-checkbox accent-[#d4af37]" value="${id}">
                <span class="text-xs text-gray-300">${p.character_name} (${p.player_name || 'Player'})</span>
            </label>`;
        }
    });

    const moodOptions = `<option value="">Mood (Optional)</option><option value="Angrily">Angrily</option><option value="Sadness">Sadness</option><option value="Pained">Pained</option><option value="Whispering">Whispering</option><option value="Shouting">Shouting</option><option value="Joyful">Joyful</option><option value="Sarcastic">Sarcastic</option><option value="Fearful">Fearful</option><option value="Serious">Serious</option><option value="Joking">Joking</option>`;

    container.innerHTML = `
        <div class="flex flex-col h-full relative">
            <div class="bg-[#1a1a1a] border-b border-[#333] p-2 flex justify-between items-center">
                <div class="text-[10px] text-gray-500 uppercase font-bold tracking-widest flex items-center gap-2"><i class="fas fa-history"></i> History</div>
                <div class="flex gap-2">
                    <button onclick="window.stExportChat()" class="text-xs bg-[#222] hover:bg-[#333] text-gray-300 border border-[#444] px-3 py-1 rounded uppercase font-bold transition-colors"><i class="fas fa-download mr-1"></i> Export</button>
                    <button onclick="window.stClearChat()" class="text-xs bg-red-900/20 hover:bg-red-900/50 text-red-500 border border-red-900/50 px-3 py-1 rounded uppercase font-bold transition-colors"><i class="fas fa-trash-alt mr-1"></i> Clear</button>
                </div>
            </div>
            <div id="st-chat-history" class="flex-1 overflow-y-auto p-4 space-y-3 font-serif bg-[#080808]"></div>
            <div class="p-4 bg-[#111] border-t border-[#333] space-y-2 relative">
                <div class="flex gap-2 mb-2">
                    <div class="relative">
                        <button id="st-chat-recipient-btn" class="bg-[#050505] border border-[#333] text-gray-300 text-xs px-3 py-2 text-left flex items-center gap-2 hover:border-[#d4af37] transition-colors min-w-[140px]" onclick="document.getElementById('st-chat-recipients-dropdown').classList.toggle('hidden')">
                            <span id="st-chat-recipient-label">Everyone</span><i class="fas fa-chevron-down text-[10px] ml-auto"></i>
                        </button>
                        <div id="st-chat-recipients-dropdown" class="hidden absolute bottom-full left-0 w-64 bg-[#1a1a1a] border border-[#333] shadow-xl p-2 max-h-48 overflow-y-auto custom-scrollbar z-50 mb-1 rounded">
                            <label class="flex items-center gap-2 p-1 hover:bg-[#222] cursor-pointer border-b border-[#333] mb-1 pb-1">
                                <input type="checkbox" id="st-chat-all-checkbox" class="accent-[#d4af37]" checked>
                                <span class="text-xs text-gold font-bold">Broadcast to Everyone</span>
                            </label>
                            <div id="st-chat-player-list" class="space-y-1">${playerOptions}</div>
                        </div>
                    </div>
                    <div class="relative flex-1">
                         <input list="st-mood-list" id="st-chat-mood" class="w-full bg-[#050505] border border-[#333] text-gray-300 text-xs px-3 py-2 outline-none focus:border-[#d4af37] rounded" placeholder="Mood (Optional)">
                         <datalist id="st-mood-list">${moodOptions}</datalist>
                    </div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="st-chat-input" placeholder="Enter message..." class="flex-1 bg-[#050505] border border-[#333] text-white p-3 text-sm focus:border-[#d4af37] outline-none rounded">
                    <button id="st-chat-send" class="bg-[#d4af37] text-black font-bold uppercase px-6 py-2 hover:bg-[#fcd34d] rounded">Send</button>
                    <button onclick="window.stSendEvent()" class="bg-[#222] border border-[#d4af37] text-[#d4af37] font-bold px-3 py-2 text-xs uppercase hover:bg-[#333] hover:text-white transition-colors rounded" title="Send as Major Event Announcement"><i class="fas fa-bullhorn"></i></button>
                </div>
            </div>
        </div>
    `;

    const sendBtn = document.getElementById('st-chat-send');
    const input = document.getElementById('st-chat-input');
    const moodInput = document.getElementById('st-chat-mood');
    const allCheck = document.getElementById('st-chat-all-checkbox');
    const label = document.getElementById('st-chat-recipient-label');
    const dropdown = document.getElementById('st-chat-recipients-dropdown');
    
    const updateSelection = () => {
        const checks = document.querySelectorAll('.st-recipient-checkbox');
        if (allCheck.checked) {
            checks.forEach(c => { c.checked = false; c.disabled = true; });
            label.innerText = "Everyone";
        } else {
            checks.forEach(c => c.disabled = false);
            const selected = Array.from(checks).filter(c => c.checked);
            label.innerText = selected.length === 0 ? "Select Recipients..." : `Whisper (${selected.length})`;
        }
    };

    allCheck.onchange = updateSelection;
    document.querySelectorAll('.st-recipient-checkbox').forEach(c => c.onchange = updateSelection);

    const sendHandler = () => {
        const txt = input.value.trim();
        if (txt) {
            const isAll = allCheck.checked;
            const selected = Array.from(document.querySelectorAll('.st-recipient-checkbox:checked')).map(c => c.value);
            const moodVal = moodInput.value.trim();
            if (!isAll && selected.length === 0) { showNotification("Select at least one recipient.", "error"); return; }
            const options = {};
            if (!isAll) { options.recipients = selected; options.isWhisper = true; }
            if (moodVal) options.mood = moodVal;
            sendChronicleMessage('chat', txt, null, options);
            input.value = ''; moodInput.value = ''; dropdown.classList.add('hidden');
        }
    };

    if(sendBtn) sendBtn.onclick = sendHandler;
    if(input) input.onkeydown = (e) => { if(e.key === 'Enter') sendHandler(); };

    startChatListener(window.stState.activeChronicleId);
}

// ==========================================================================
// 5. SETTINGS VIEW
// ==========================================================================

// --- UTILITY: TIME FORMATTERS & STATUS HANDLERS ---
function format12h(time24) {
    if (!time24) return "00:00 AM";
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getStatusInfo(time24) {
    if (!time24) return { label: "Midnight", icon: "fa-moon", color: "text-blue-500" };
    const h = parseInt(time24.split(':')[0]);
    if (h >= 5 && h < 8) return { label: "Dawn", icon: "fa-cloud-sun", color: "text-orange-400" };
    if (h >= 8 && h < 12) return { label: "Morning", icon: "fa-sun", color: "text-yellow-400" };
    if (h >= 12 && h < 17) return { label: "Daylight", icon: "fa-sun", color: "text-yellow-500" };
    if (h >= 17 && h < 20) return { label: "Dusk", icon: "fa-cloud-moon", color: "text-orange-500" };
    if (h >= 20 && h < 23) return { label: "Nightfall", icon: "fa-moon", color: "text-blue-300" };
    return { label: "Deep Night", icon: "fa-moon", color: "text-blue-500" };
}

export async function renderSettingsView(container) {
    if(!container) return;
    const docRef = doc(db, 'chronicles', window.stState.activeChronicleId);
    let data = window.stState.settings || {};
    try {
        const snap = await getDoc(docRef);
        if(snap.exists()) { data = snap.data(); window.stState.settings = data; }
    } catch(e) { console.error(e); }

    const curTime = data.inGameTime || '22:00';
    const status = getStatusInfo(curTime);

    container.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto pb-20 overflow-y-auto h-full custom-scrollbar">
            <h2 class="text-2xl text-[#d4af37] font-cinzel font-bold mb-6 border-b border-[#333] pb-2 uppercase tracking-wider">Chronicle Configuration</h2>
            
            <!-- CHRONICLE TIME & DATE TRACKER -->
            <div class="bg-[#1a1a1a] border border-[#d4af37]/30 p-6 rounded mb-8 relative overflow-hidden group">
                <div class="absolute -top-1 -right-1 opacity-10 group-hover:opacity-20 transition-opacity">
                    <i class="fas fa-hourglass-half text-8xl text-gold"></i>
                </div>
                <h3 class="text-sm font-bold text-gold uppercase mb-4 tracking-widest flex items-center gap-2">
                    <i class="fas fa-calendar-alt"></i> Chronicle Time & Date
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    <div>
                        <label class="label-text text-gray-400">In-Game Date</label>
                        <input type="text" id="st-set-date" class="w-full bg-[#050505] border border-[#333] text-white p-3 text-sm focus:border-gold outline-none rounded font-mono" placeholder="e.g. Oct 14, 1993" value="${data.inGameDate || ''}">
                    </div>
                    <div>
                        <label class="label-text text-gray-400">Clock & Period</label>
                        <div class="relative">
                            <input type="time" id="st-set-time" class="w-full bg-[#050505] border border-[#333] text-white p-3 text-sm focus:border-gold outline-none rounded font-mono pr-10" value="${curTime}">
                            <div class="absolute right-3 top-1/2 -translate-y-1/2">
                                <i id="st-time-preview-icon" class="fas ${status.icon} ${status.color}"></i>
                            </div>
                        </div>
                        <div class="flex justify-between mt-1 px-1">
                            <span id="st-time-preview-12h" class="text-[10px] text-gray-400 font-bold">${format12h(curTime)}</span>
                            <span id="st-time-preview-label" class="text-[10px] ${status.color} font-bold uppercase tracking-widest">${status.label}</span>
                        </div>
                    </div>
                    <div class="flex items-start">
                        <button onclick="window.stAnnounceTime()" class="w-full bg-blue-900/50 hover:bg-blue-700 text-blue-100 font-bold py-3 rounded uppercase text-[10px] tracking-widest border border-blue-500 shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                            <i class="fas fa-bullhorn"></i> Announce Time
                        </button>
                    </div>
                </div>
                <p class="text-[9px] text-gray-500 mt-3 italic">Maintain atmospheric tension. Kindred typical wake around 6 PM and seek shelter by 6 AM.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div><label class="label-text text-gray-400">Chronicle Name</label><input type="text" id="st-set-name" class="w-full bg-[#111] border border-[#333] text-white p-3 text-sm focus:border-[#d4af37] outline-none rounded" value="${data.name || ''}"></div>
                <div><label class="label-text text-gray-400">Time Period / Setting</label><input type="text" id="st-set-time-period" class="w-full bg-[#111] border border-[#333] text-white p-3 text-sm focus:border-[#d4af37] outline-none rounded" value="${data.timePeriod || ''}"></div>
            </div>
            <div class="mb-6"><label class="label-text text-gray-400">Passcode</label><input type="text" id="st-set-pass" class="w-full bg-[#111] border border-[#333] text-white p-3 text-sm focus:border-[#d4af37] outline-none rounded" value="${data.passcode || ''}"></div>
            <div class="mb-6"><label class="label-text text-gray-400">Synopsis</label><textarea id="st-set-synopsis" class="w-full bg-[#111] border border-[#333] text-gray-300 p-3 text-xs focus:border-[#d4af37] outline-none resize-none h-32 leading-relaxed rounded">${data.synopsis || ''}</textarea></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div><label class="label-text text-gray-400">House Rules</label><textarea id="st-set-rules" class="w-full bg-[#1a0505] border border-red-900/30 text-gray-300 p-3 text-xs focus:border-red-500 outline-none resize-none h-48 leading-relaxed rounded">${data.houseRules || ''}</textarea></div>
                <div><label class="label-text text-gray-400">Lore / Setting Details</label><textarea id="st-set-lore" class="w-full bg-[#0a0a0a] border border-[#d4af37]/30 text-gray-300 p-3 text-xs focus:border-[#d4af37] outline-none resize-none h-48 leading-relaxed rounded">${data.lore || ''}</textarea></div>
            </div>
            <div class="text-right border-b border-[#333] pb-6 mb-6"><button onclick="window.stSaveSettings()" class="bg-[#d4af37] text-black font-bold px-8 py-3 rounded uppercase hover:bg-[#fcd34d] shadow-lg tracking-widest transition-transform hover:scale-105">Save Changes</button></div>
            
            <div class="bg-[#111] p-4 border border-[#333] rounded">
                <h3 class="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider"><i class="fas fa-bell mr-2"></i> Local Interface Settings</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs text-white font-bold">Sound Effects</span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="pref-master-sound" class="sr-only peer" ${notifPrefs.masterSound ? 'checked' : ''}>
                                <div class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold"></div>
                            </label>
                        </div>
                        <div class="space-y-2 pl-2 border-l border-[#333]">
                            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="pref-sound-chat" class="accent-gold w-3 h-3" ${notifPrefs.chatSound ? 'checked' : ''}><span class="text-xs text-gray-400">Chat Messages</span></label>
                            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="pref-sound-combat" class="accent-gold w-3 h-3" ${notifPrefs.combatSound ? 'checked' : ''}><span class="text-xs text-gray-400">Combat & Rolls</span></label>
                            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="pref-sound-journal" class="accent-gold w-3 h-3" ${notifPrefs.journalSound ? 'checked' : ''}><span class="text-xs text-gray-400">Journal & Events</span></label>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs text-white font-bold block mb-2">Audio Cooldown</label>
                        <select id="pref-cooldown" class="w-full bg-[#050505] border border-[#333] text-gray-300 text-xs p-2 focus:border-gold outline-none">
                            <option value="0" ${notifPrefs.cooldown === 0 ? 'selected' : ''}>None (Instant)</option>
                            <option value="5" ${notifPrefs.cooldown === 5 ? 'selected' : ''}>5 Seconds</option>
                            <option value="20" ${notifPrefs.cooldown === 20 ? 'selected' : ''}>20 Seconds</option>
                            <option value="30" ${notifPrefs.cooldown === 30 ? 'selected' : ''}>30 Seconds</option>
                        </select>
                    </div>
                </div>
                <div class="mt-4 pt-4 border-t border-[#333] text-right"><button onclick="window.stSaveLocalPrefs()" class="text-xs bg-[#222] hover:bg-[#333] text-gray-300 border border-[#444] px-4 py-2 rounded uppercase font-bold transition-colors">Save Preferences</button></div>
            </div>
        </div>
    `;

    // Internal binding for live preview update
    const timeIn = document.getElementById('st-set-time');
    if (timeIn) {
        timeIn.oninput = (e) => {
            const val = e.target.value;
            const s = getStatusInfo(val);
            const iconEl = document.getElementById('st-time-preview-icon');
            const labelEl = document.getElementById('st-time-preview-label');
            const preview12h = document.getElementById('st-time-preview-12h');
            
            if (iconEl) iconEl.className = `fas ${s.icon} ${s.color}`;
            if (labelEl) {
                labelEl.innerText = s.label;
                labelEl.className = `text-[10px] ${s.color} font-bold uppercase tracking-widest`;
            }
            if (preview12h) preview12h.innerText = format12h(val);
        };
    }
}

export function stSaveLocalPrefs() {
    const newPrefs = {
        masterSound: document.getElementById('pref-master-sound').checked,
        chatSound: document.getElementById('pref-sound-chat').checked,
        combatSound: document.getElementById('pref-sound-combat').checked,
        journalSound: document.getElementById('pref-sound-journal').checked,
        cooldown: parseInt(document.getElementById('pref-cooldown').value) || 0
    };
    saveNotificationPrefs(newPrefs);
    showNotification("Local preferences saved.");
}

export async function stSaveSettings() {
    if(!window.stState.activeChronicleId) return;
    const updates = {
        name: document.getElementById('st-set-name').value,
        timePeriod: document.getElementById('st-set-time-period').value,
        passcode: document.getElementById('st-set-pass').value,
        synopsis: document.getElementById('st-set-synopsis').value,
        houseRules: document.getElementById('st-set-rules').value,
        lore: document.getElementById('st-set-lore').value,
        inGameDate: document.getElementById('st-set-date').value,
        inGameTime: document.getElementById('st-set-time').value
    };
    try {
        await updateDoc(doc(db, 'chronicles', window.stState.activeChronicleId), updates);
        window.stState.settings = { ...window.stState.settings, ...updates };
        showNotification("Settings Updated");
    } catch(e) { console.error(e); }
}

// --- NEW: REFINED TIME ANNOUNCEMENT BROADCASTER ---
export function stAnnounceTime() {
    const dateStr = document.getElementById('st-set-date')?.value || "Modern Nights";
    const time24 = document.getElementById('st-set-time')?.value || "00:00";
    
    const time12 = format12h(time24);
    const status = getStatusInfo(time24);

    const msg = `
        <div class="flex flex-col items-center py-4 border-t border-b border-[#333] my-4 bg-black/40 relative overflow-hidden">
            <!-- Background Watermark Icon -->
            <div class="absolute -top-4 -right-4 opacity-5 pointer-events-none">
                <i class="fas ${status.icon} text-9xl"></i>
            </div>
            
            <div class="flex items-center gap-3 mb-2">
                <div class="w-12 h-12 rounded-full border border-[#333] bg-[#050505] flex items-center justify-center shadow-lg">
                    <i class="fas ${status.icon} text-2xl ${status.color} drop-shadow-[0_0_8px_currentColor]"></i>
                </div>
            </div>
            
            <div class="text-[9px] text-gray-500 uppercase font-black tracking-[0.3em] mb-2 border-b border-gray-800 pb-1">Chronicle State</div>
            
            <div class="text-xl font-cinzel font-bold text-white mb-1 drop-shadow-md">${dateStr}</div>
            
            <div class="flex items-center gap-3">
                <div class="text-3xl font-mono text-white font-black tracking-tighter">${time12}</div>
                <div class="h-8 w-px bg-gray-800"></div>
                <div class="flex flex-col items-start">
                    <span class="${status.color} font-black text-xs uppercase tracking-widest leading-none">${status.label}</span>
                    <span class="text-[8px] text-gray-600 uppercase font-bold">Atmosphere</span>
                </div>
            </div>
        </div>
    `;

    sendChronicleMessage('event', msg);
    showNotification("Chronicle Time Announced.");
}

// --- DELEGATED JOURNAL HELPERS ---
export async function pushHandoutToPlayers(id, recipients = null) {
    if (!id) return;
    try {
        const safeId = id.startsWith('journal_') ? id : 'journal_' + id;
        await setDoc(doc(db, 'chronicles', window.stState.activeChronicleId, 'players', safeId), { pushed: true, pushTime: Date.now(), recipients }, { merge: true });
        showNotification(recipients ? `Pushed to ${recipients.length} Player(s)` : "Pushed to Everyone!");
    } catch(e) { console.error(e); }
}

export async function stDeleteJournalEntry(id) {
    if(!confirm("Delete this handout?")) return;
    try {
        const safeId = id.startsWith('journal_') ? id : 'journal_' + id;
        await deleteDoc(doc(db, 'chronicles', window.stState.activeChronicleId, 'players', safeId));
        showNotification("Handout Deleted.");
    } catch(e) { console.error(e); }
}

// Global Exports for Storyteller UI
window.renderRosterView = renderRosterView;
window.renderCombatView = renderCombatView;
window.renderBestiaryView = renderBestiaryView;
window.renderChatView = renderChatView;
window.renderSettingsView = renderSettingsView;
window.stViewPlayerSheet = stViewPlayerSheet;
window.returnToStoryteller = returnToStoryteller;
window.stViewCombatantSheet = stViewCombatantSheet;
window.stToggleCombatVisibility = stToggleCombatVisibility;
window.stOpenCombatVisibilityModal = stOpenCombatVisibilityModal;
window.stAddToCombat = handleAddToCombat;
window.copyStaticNpc = copyStaticNpc;
window.deleteCloudNpc = deleteCloudNpc;
window.editCloudNpc = editCloudNpc;
window.previewStaticNpc = previewStaticNpc;
window.pushHandoutToPlayers = pushHandoutToPlayers;
window.stDeleteJournalEntry = stDeleteJournalEntry;
window.stSaveSettings = stSaveSettings;
window.stSaveLocalPrefs = stSaveLocalPrefs;
window.stAnnounceTime = stAnnounceTime;
