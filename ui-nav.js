import { 
    ATTRIBUTES, ABILITIES, VIRTUES, BACKGROUNDS, 
    STEPS_CONFIG, DERANGEMENTS, VIT, CLAN_WEAKNESSES, 
    SPECIALTY_EXAMPLES, HEALTH_STATES, V20_WEAPONS_LIST, V20_ARMOR_LIST,
    CLAN_DISCIPLINES
} from "./data.js";

import { DISCIPLINES_DATA } from "./disciplines-data.js";
import { THAUMATURGY_DATA } from "./thaumaturgy-data.js";
import { NECROMANCY_DATA } from "./necromancy-data.js";

import { checkStepComplete } from "./v20-rules.js";

import { 
    renderDots, renderBoxes, setSafeText, 
    renderInventoryList, showNotification 
} from "./ui-common.js";

import { 
    updatePools, renderRow, setDots, rollCombat, rollFrenzy, rollRotschreck, rollDiscipline
} from "./ui-mechanics.js";

// --- IMPORT JOURNAL MODULE ---
import { renderJournalTab } from "./ui-journal.js";

// --- IMPORT NPC CREATOR ---
import { openNpcCreator, openNpcSheet } from "./npc-creator.js";

// Ensure Global Access for HTML Strings
window.openNpcCreator = openNpcCreator;
window.openNpcSheet = openNpcSheet;

// --- DYNAMIC ADVANTAGES (Disciplines, Backgrounds, etc.) ---

export function renderDynamicAdvantageRow(containerId, type, list, isAbil = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    let existingItems = [];
    if (type === 'abil') {
        let category = '';
        if (containerId === 'custom-talents') category = 'Talents';
        else if (containerId === 'custom-skills') category = 'Skills';
        else if (containerId === 'custom-knowledges') category = 'Knowledges';
        if (window.state.customAbilityCategories) { existingItems = Object.keys(window.state.dots.abil).filter(k => window.state.customAbilityCategories[k] === category); }
    } else { if (window.state.dots[type]) existingItems = Object.keys(window.state.dots[type]); }

    // RENDER FUNCTION
window.togglePlayMode = function() {
    console.log("Toggling Play Mode...");

    // 1. Sync Text Fields to State before switching
    // We use a safe helper to avoid "property of null" errors if elements are missing
    const safeVal = (id) => {
        const el = document.getElementById(id);
        if (el) return el.value;
        // Fallback: keep existing value in state, or empty string
        return window.state.textFields[id] || "";
    };

    // List of standard text fields to sync
    const fieldsToSync = [
        'c-name', 'c-nature', 'c-demeanor', 'c-clan', 'c-gen', 
        'c-player', 'c-concept', 'c-sire', 'c-chronicle', 
        'c-path-name', 'c-path-rating', 'c-xp-total', 'c-freebie-total'
    ];

    fieldsToSync.forEach(id => {
        window.state.textFields[id] = safeVal(id);
    });

    // Handle Clan Weakness specifically (TextArea)
    const wEl = document.getElementById('c-clan-weakness');
    if (wEl) window.state.textFields['c-clan-weakness'] = wEl.value;

    // 2. Validate essential fields (Generation)
    // Ensure Generation is a valid number for pool calculations
    let gen = parseInt(window.state.textFields['c-gen']);
    if (isNaN(gen) || gen < 3 || gen > 15) {
        console.warn("Invalid Generation detected (" + gen + "), defaulting to 13");
        gen = 13;
        window.state.textFields['c-gen'] = "13";
    }

    // 3. Toggle Mode State
    window.state.isPlayMode = !window.state.isPlayMode;

    // 4. Trigger Full Refresh (Handles DOM reconstruction)
    if (window.fullRefresh) {
        window.fullRefresh();
    } else {
        console.error("window.fullRefresh is missing!");
    }
    
    // 5. Scroll to top for UX
    window.scrollTo(0, 0);
};
                 inp.disabled = window.state.isPlayMode;
             }
        }

        const dotCont = document.createElement('div'); 
        dotCont.className = 'dot-row flex-shrink-0';
        const val = name ? (window.state.dots[type][name] || 0) : 0;
        dotCont.innerHTML = renderDots(val, 5);
        if (name) { dotCont.dataset.n = name; dotCont.dataset.t = type; }

        const removeBtn = document.createElement('div'); 
        removeBtn.className = 'remove-btn flex-shrink-0 ml-1'; 
        removeBtn.innerHTML = '&times;';
        if (!name || (window.state.xpMode && val > 0)) removeBtn.style.visibility = 'hidden';

        let curName = name;
        let category = null;
        if (containerId === 'custom-talents') category = 'Talents'; else if (containerId === 'custom-skills') category = 'Skills'; else if (containerId === 'custom-knowledges') category = 'Knowledges';
        
        const onUpdate = (newVal) => {
            if (!newVal) return;

            if (window.state.xpMode && !curName) {
                let baseCost = 0;
                let costType = '';
                
                // --- XP COSTS FOR NEW TRAITS ---
                if (type === 'disc') { 
                    // V20 Rules: New Path is 7, New Discipline is 10
                    // Check against known Paths or string heuristic
                    const isThaumPath = THAUMATURGY_DATA && THAUMATURGY_DATA[newVal];
                    const isNecroPath = NECROMANCY_DATA && NECROMANCY_DATA[newVal];
                    const hasPathName = newVal.toLowerCase().includes('path');

                    if (isThaumPath || isNecroPath || hasPathName) {
                        baseCost = 7;
                        costType = 'New Path';
                    } else {
                        baseCost = 10; 
                        costType = 'New Discipline'; 
                    }
                }
                else if (isAbil) { 
                    baseCost = 3; 
                    costType = 'New Ability'; 
                }
                
                const totalXP = parseInt(document.getElementById('c-xp-total')?.value) || 0;
                let spentXP = window.state.xpLog ? window.state.xpLog.reduce((acc, log) => acc + log.cost, 0) : 0;
                
                if (baseCost > (totalXP - spentXP)) {
                    showNotification(`Need ${baseCost} XP for ${costType}.`);
                    inputField.value = ""; 
                    return;
                }

                if (!confirm(`Spend ${baseCost} XP to learn ${newVal}?`)) {
                    inputField.value = "";
                    return;
                }
                
                 if (!window.state.xpLog) window.state.xpLog = [];
                 window.state.xpLog.push({
                    trait: newVal,
                    old: 0,
                    new: 1, 
                    cost: baseCost,
                    type: type,
                    date: new Date().toISOString()
                });
                
                 window.state.dots[type][newVal] = 1; 
                 showNotification(`Learned ${newVal} (${baseCost} XP)`);
            }
            else if (curName && curName !== newVal) { 
                const dots = window.state.dots[type][curName]; delete window.state.dots[type][curName]; 
                if (window.state.customAbilityCategories && window.state.customAbilityCategories[curName]) delete window.state.customAbilityCategories[curName];
                if (newVal) window.state.dots[type][newVal] = dots || 0; 
                if(window.state.specialties[curName]) { window.state.specialties[newVal] = window.state.specialties[curName]; delete window.state.specialties[curName]; }
            } else if (!curName && newVal && !window.state.xpMode) {
                 window.state.dots[type][newVal] = 0; 
            }
            
            curName = newVal;
            if (newVal) { 
                if (window.state.dots[type][newVal] === undefined) window.state.dots[type][newVal] = window.state.xpMode ? 1 : 0;

                dotCont.innerHTML = renderDots(window.state.dots[type][newVal], 5);
                dotCont.dataset.n = newVal; dotCont.dataset.t = type;
                if (category) { if (!window.state.customAbilityCategories) window.state.customAbilityCategories = {}; window.state.customAbilityCategories[newVal] = category; }
                
                if (row === container.lastElementChild) { 
                    removeBtn.style.visibility = window.state.xpMode ? 'hidden' : 'visible'; 
                    buildRow(); 
                }
            }
            updatePools();
            renderPrintSheet();
        };
        
        if (isAbil) inputField.onblur = (e) => onUpdate(e.target.value); else inputField.onchange = (e) => onUpdate(e.target.value);
        removeBtn.onclick = () => { if (curName) { delete window.state.dots[type][curName]; if (window.state.customAbilityCategories && window.state.customAbilityCategories[curName]) delete window.state.customAbilityCategories[curName]; } row.remove(); updatePools(); if(type==='back') renderSocialProfile(); renderPrintSheet(); };
        
        dotCont.onclick = (e) => { 
            if (!curName || !e.target.dataset.v) return; 
            setDots(curName, type, parseInt(e.target.dataset.v), 0, 5);
        };

        row.appendChild(inputField);
        row.appendChild(specWrapper);
        row.appendChild(dotCont);
        row.appendChild(removeBtn);
        container.appendChild(row);
    };
    existingItems.forEach(item => buildRow(item));
    buildRow(); 
}
window.renderDynamicAdvantageRow = renderDynamicAdvantageRow;

export function renderDynamicTraitRow(containerId, type, list) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const stateArray = type === 'Merit' ? (window.state.merits || []) : (window.state.flaws || []);
    container.innerHTML = '';
    
    // --- CAITIFF CHECK FOR MERITS ---
    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";

    const appendRow = (data = null) => {
        const row = document.createElement('div'); row.className = 'flex gap-2 items-center mb-2 trait-row';
        let options = `<option value="">-- Select ${type} --</option>`;
        
        list.forEach(item => { 
            let disabledAttr = "";
            let styleAttr = "";
            
            // Restriction: Caitiff cannot take Additional Discipline
            if (type === 'Merit' && clan === "Caitiff" && item.n === "Additional Discipline") {
                disabledAttr = "disabled";
                styleAttr = "color: #555; font-style: italic;";
            }
            
            options += `<option value="${item.n}" data-val="${item.v}" data-var="${item.variable||false}" ${disabledAttr} style="${styleAttr}">${item.n} (${item.range ? item.range + 'pt' : item.v + 'pt'})</option>`; 
        });
        
        options += '<option value="Custom">-- Custom / Write-in --</option>';
        row.innerHTML = `<div class="flex-1 relative"><select class="w-full text-[11px] font-bold uppercase bg-[#111] text-white border-b border-[#444]">${options}</select><input type="text" placeholder="Custom Name..." class="hidden w-full text-[11px] font-bold uppercase border-b border-[#444] bg-transparent text-white"></div><input type="number" class="w-10 text-center text-[11px] !border !border-[#444] font-bold" min="1"><div class="remove-btn">&times;</div>`;
        container.appendChild(row);
        
        const selectEl = row.querySelector('select');
        const textEl = row.querySelector('input[type="text"]');
        const numEl = row.querySelector('input[type="number"]');
        const removeBtn = row.querySelector('.remove-btn');
        const isLocked = !window.state.freebieMode;
        
        selectEl.disabled = isLocked; textEl.disabled = isLocked; numEl.disabled = isLocked;
        if(isLocked) { selectEl.classList.add('opacity-50'); textEl.classList.add('opacity-50'); numEl.classList.add('opacity-50'); }
        
        if (data) {
            const exists = list.some(l => l.n === data.name);
            if (exists) {
                selectEl.value = data.name; numEl.value = data.val;
                const itemData = list.find(l => l.n === data.name);
                if (itemData && !itemData.variable) { numEl.disabled = true; numEl.classList.add('opacity-50'); }
            } else { selectEl.value = "Custom"; selectEl.classList.add('hidden'); textEl.classList.remove('hidden'); textEl.value = data.name; numEl.value = data.val; }
        } else { numEl.value = ""; removeBtn.style.visibility = 'hidden'; }
        
        const syncState = () => {
            const allRows = container.querySelectorAll('.trait-row');
            const newState = [];
            allRows.forEach(r => {
                const s = r.querySelector('select');
                const t = r.querySelector('input[type="text"]');
                const n = r.querySelector('input[type="number"]');
                let name = s.value === 'Custom' ? t.value : s.value;
                let val = parseInt(n.value) || 0;
                // Preserve description if it exists in current state
                let desc = "";
                const existing = (type === 'Merit' ? window.state.merits : window.state.flaws).find(i => i.name === name);
                if (existing) desc = existing.desc || "";

                if (name && name !== 'Custom') newState.push({ name, val, desc });
            });
            if (type === 'Merit') window.state.merits = newState; else window.state.flaws = newState;
            updatePools();
            renderPrintSheet();
        };
        
        selectEl.addEventListener('change', () => {
            if (selectEl.value === 'Custom') { selectEl.classList.add('hidden'); textEl.classList.remove('hidden'); textEl.focus(); numEl.value = 1; numEl.disabled = false; numEl.classList.remove('opacity-50'); } 
            else if (selectEl.value) {
                const opt = selectEl.options[selectEl.selectedIndex];
                numEl.value = opt.dataset.val;
                if (opt.dataset.var !== "true") { numEl.disabled = true; numEl.classList.add('opacity-50'); } else { numEl.disabled = false; numEl.classList.remove('opacity-50'); }
                if (row === container.lastElementChild) { removeBtn.style.visibility = 'visible'; appendRow(); }
            }
            syncState();
        });
        textEl.addEventListener('blur', () => { if (textEl.value === "") { textEl.classList.add('hidden'); selectEl.classList.remove('hidden'); selectEl.value = ""; } else { if (row === container.lastElementChild) { removeBtn.style.visibility = 'visible'; appendRow(); } } syncState(); });
        numEl.addEventListener('change', syncState);
        removeBtn.addEventListener('click', () => { row.remove(); syncState(); });
    };
    if (stateArray.length > 0) stateArray.forEach(d => appendRow(d));
    appendRow();
}
window.renderDynamicTraitRow = renderDynamicTraitRow;

export function renderBloodBondRow() {
    const cont = document.getElementById('blood-bond-list'); 
    if (!cont) return;
    
    // Clear list to prevent dupes on reload
    cont.innerHTML = ''; 

    // --- TREMERE WARNING (Edit Mode) ---
    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    if (clan === "Tremere") {
        const wDiv = document.createElement('div');
        wDiv.className = "text-[#a855f7] text-[9px] font-bold mb-2 uppercase border border-[#a855f7]/50 p-1 rounded bg-[#a855f7]/10 text-center";
        wDiv.innerHTML = "<i class='fas fa-flask mr-1'></i> Weakness: 1st Drink = Step 2 Bond";
        cont.appendChild(wDiv);
    }

    // Define Builder
    const buildRow = (data = null) => {
        const row = document.createElement('div'); 
        row.className = 'flex gap-2 items-center border-b border-[#222] pb-2 advantage-row';
        
        const typeVal = data ? data.type : "Bond";
        const nameVal = data ? data.name : "";
        const ratVal = data ? data.rating : "";

        row.innerHTML = `
            <select class="w-24 text-[10px] uppercase font-bold mr-2 border-b border-[#333] bg-transparent">
                <option value="Bond" ${typeVal === 'Bond' ? 'selected' : ''}>Bond</option>
                <option value="Vinculum" ${typeVal === 'Vinculum' ? 'selected' : ''}>Vinculum</option>
            </select>
            <input type="text" placeholder="Bound to..." class="flex-1 text-xs" value="${nameVal}">
            <input type="number" placeholder="Lvl" class="w-10 text-center text-xs" min="1" max="3" value="${ratVal}">
            <div class="remove-btn">&times;</div>
        `;
        
        const typeSel = row.querySelector('select'); 
        const nI = row.querySelector('input[type="text"]'); 
        const rI = row.querySelector('input[type="number"]'); 
        const del = row.querySelector('.remove-btn');
        
        // Hide delete on empty row until used
        if (!data) del.style.visibility = 'hidden';

        const onUpd = () => {
            if (typeSel.value === 'Bond') { rI.max = 3; if(parseInt(rI.value) > 3) rI.value = 3; }
            if (typeSel.value === 'Vinculum') { rI.max = 10; if(parseInt(rI.value) > 10) rI.value = 10; }
            
            window.state.bloodBonds = Array.from(cont.querySelectorAll('.advantage-row')).map(r => ({ 
                type: r.querySelector('select').value, 
                name: r.querySelector('input[type="text"]').value, 
                rating: r.querySelector('input[type="number"]').value 
            })).filter(b => b.name);
            
            if (cont.lastElementChild === row && nI.value !== "") {
                del.style.visibility = 'visible';
                buildRow();
            }
            
            updatePools(); 
            renderPrintSheet();
        };
        
        typeSel.onchange = onUpd; 
        nI.onblur = onUpd; 
        rI.onblur = onUpd; 
        
        del.onclick = () => { 
            row.remove(); 
            if(cont.children.length === 0) buildRow();
            onUpd(); 
        };
        
        cont.appendChild(row);
    };

    // Initialize from State
    if(window.state.bloodBonds && Array.isArray(window.state.bloodBonds)) {
        window.state.bloodBonds.forEach(b => buildRow(b));
    }
    // Add trailing empty row
    buildRow();
}
window.renderBloodBondRow = renderBloodBondRow;

export function renderDerangementsList() {
    const cont = document.getElementById('derangements-list'); if (!cont) return;
    cont.innerHTML = '';
    
    // --- MALKAVIAN CHECK ---
    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    const isMalk = clan === "Malkavian";

    window.state.derangements.forEach((d, idx) => {
        const row = document.createElement('div'); row.className = "flex justify-between items-center text-xs text-white border-b border-[#333] py-1";
        
        let labelHTML = `<span>${d}</span>`;
        let deleteBtnHTML = `<span class="remove-btn text-red-500" onclick="window.state.derangements.splice(${idx}, 1); renderDerangementsList(); window.updatePools(); renderPrintSheet();">&times;</span>`;
        
        // Lock 1st Derangement for Malkavians
        if (isMalk && idx === 0) {
            labelHTML = `<span class="text-[#a855f7] font-bold" title="Incurable Weakness">${d}</span>`;
            deleteBtnHTML = `<span class="text-[#a855f7] text-[10px]"><i class="fas fa-lock"></i></span>`;
        }

        row.innerHTML = `${labelHTML}${deleteBtnHTML}`;
        cont.appendChild(row);
    });
    
    const addRow = document.createElement('div'); addRow.className = "flex gap-2 mt-2";
    let options = `<option value="">+ Add Derangement</option>` + DERANGEMENTS.map(d => `<option value="${d}">${d}</option>`).join('');
    addRow.innerHTML = `<select id="derangement-select" class="flex-1 text-[10px] uppercase font-bold bg-black/40 border border-[#444] text-white p-1">${options}<option value="Custom">Custom...</option></select><input type="text" id="derangement-custom" class="hidden flex-1 text-[10px] bg-black/40 border border-[#444] text-white p-1" placeholder="Type name..."><button id="add-derangement-btn" class="bg-[#8b0000] text-white px-2 py-1 text-[10px] font-bold hover:bg-red-700">ADD</button>`;
    cont.appendChild(addRow);
    const sel = document.getElementById('derangement-select'); const inp = document.getElementById('derangement-custom'); const btn = document.getElementById('add-derangement-btn');
    sel.onchange = () => { if (sel.value === 'Custom') { sel.classList.add('hidden'); inp.classList.remove('hidden'); inp.focus(); } };
    btn.onclick = () => {
        let val = sel.value === 'Custom' ? inp.value : sel.value;
        if (val && val !== 'Custom') { window.state.derangements.push(val); renderDerangementsList(); updatePools(); renderPrintSheet(); }
    };
}
window.renderDerangementsList = renderDerangementsList;

export function renderDynamicHavenRow() {
    const container = document.getElementById('multi-haven-list'); 
    if (!container) return;
    container.innerHTML = ''; 
    const buildRow = (data = null) => {
        const row = document.createElement('div'); 
        row.className = 'border-b border-[#222] pb-4 advantage-row';
        const nameVal = data ? data.name : "";
        const locVal = data ? data.loc : "";
        const descVal = data ? data.desc : "";
        row.innerHTML = `<div class="flex justify-between items-center mb-2"><input type="text" placeholder="Haven Title..." class="flex-1 text-[10px] font-bold text-gold uppercase !border-b !border-[#333]" value="${nameVal}"><div class="remove-btn">&times;</div></div><input type="text" placeholder="Location..." class="text-xs mb-2 !border-b !border-[#333]" value="${locVal}"><textarea class="h-16 text-xs" placeholder="Details...">${descVal}</textarea>`;
        const nameIn = row.querySelectorAll('input')[0]; const locIn = row.querySelectorAll('input')[1]; const descIn = row.querySelector('textarea'); const del = row.querySelector('.remove-btn');
        if (!data) del.style.visibility = 'hidden';
        const onUpd = () => {
            window.state.havens = Array.from(container.querySelectorAll('.advantage-row')).map(r => ({ name: r.querySelectorAll('input')[0].value, loc: r.querySelectorAll('input')[1].value, desc: r.querySelector('textarea').value })).filter(h => h.name || h.loc);
            if (container.lastElementChild === row && nameIn.value !== "") { del.style.visibility = 'visible'; renderDynamicHavenRow(); }
            updatePools(); renderPrintSheet();
        };
        [nameIn, locIn, descIn].forEach(el => el.onblur = onUpd); 
        del.onclick = () => { row.remove(); if(container.children.length === 0) buildRow(); onUpd(); };
        container.appendChild(row);
    };
    if (window.state.havens && Array.isArray(window.state.havens)) { window.state.havens.forEach(h => buildRow(h)); }
    buildRow();
}
window.renderDynamicHavenRow = renderDynamicHavenRow;

// --- NEW DYNAMIC RITUALS RENDERER ---
export function renderRitualsEdit() {
    const container = document.getElementById('rituals-list-create');
    if (!container) return;

    // Check if we need to replace the old Textarea with the new container
    if (container.querySelector('textarea')) {
        container.innerHTML = '<div id="dynamic-rituals-list" class="space-y-2"></div>';
        if (!window.state.rituals) window.state.rituals = [];
    }

    const listCont = document.getElementById('dynamic-rituals-list');
    if (!listCont) return;
    listCont.innerHTML = '';

    // Initialize state if missing
    if (!window.state.rituals) window.state.rituals = [];

    // Helper to build a row
    const buildRow = (data = null) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 border-b border-[#333] pb-1 mb-1 ritual-row';
        
        const nameVal = data ? data.name : "";
        const lvlVal = data ? data.level : 1;

        row.innerHTML = `
            <div class="flex-1">
                <input type="text" placeholder="Ritual Name..." class="w-full text-xs bg-transparent border-none text-white focus:border-gold" value="${nameVal}">
            </div>
            <div class="w-12">
                <input type="number" min="1" max="10" class="w-full text-center text-xs bg-[#111] border border-[#333] text-gold font-bold" value="${lvlVal}" title="Level">
            </div>
            <div class="remove-btn cursor-pointer text-red-500 hover:text-red-300">&times;</div>
        `;

        const nameInput = row.querySelector('input[type="text"]');
        const lvlInput = row.querySelector('input[type="number"]');
        const delBtn = row.querySelector('.remove-btn');

        if (!data) delBtn.style.visibility = 'hidden';

        const sync = () => {
            const rows = listCont.querySelectorAll('.ritual-row');
            const newData = [];
            rows.forEach(r => {
                const n = r.querySelector('input[type="text"]').value;
                const l = parseInt(r.querySelector('input[type="number"]').value) || 1;
                if (n) newData.push({ name: n, level: l });
            });
            window.state.rituals = newData;
            
            // Add new row if last one is used
            if (row === listCont.lastElementChild && nameInput.value !== "") {
                delBtn.style.visibility = 'visible';
                buildRow();
            }
            
            renderPrintSheet();
            // Update Play Mode view if active (handled by renderPrintSheet largely or specific call)
            updateRitualsPlayView();
        };

        nameInput.onblur = sync;
        lvlInput.onchange = sync;
        delBtn.onclick = () => {
            row.remove();
            if(listCont.children.length === 0) buildRow();
            sync();
        };

        listCont.appendChild(row);
    };

    // Populate existing
    window.state.rituals.forEach(r => buildRow(r));
    // Add empty row
    buildRow();
}
window.renderRitualsEdit = renderRitualsEdit;

function updateRitualsPlayView() {
    const playCont = document.getElementById('rituals-list-play');
    if (!playCont) return;
    
    if (!window.state.rituals || window.state.rituals.length === 0) {
        playCont.innerHTML = '<span class="text-gray-500 italic">No Rituals learned.</span>';
        return;
    }

    // Group by Level
    const byLevel = {};
    window.state.rituals.forEach(r => {
        if (!byLevel[r.level]) byLevel[r.level] = [];
        byLevel[r.level].push(r.name);
    });

    let html = '';
    Object.keys(byLevel).sort((a,b) => a-b).forEach(lvl => {
        html += `<div class="mb-2"><span class="text-[#d4af37] font-bold text-[10px] uppercase block border-b border-[#333] mb-1">Level ${lvl}</span>`;
        byLevel[lvl].forEach(name => {
            html += `<div class="text-xs text-gray-300 ml-2">• ${name}</div>`;
        });
        html += `</div>`;
    });
    playCont.innerHTML = html;
    playCont.className = ""; // Remove default styling that might conflict
}

// --- NAVIGATION & MODES ---

export function toggleXpMode() {
    window.state.xpMode = !window.state.xpMode;
    document.body.classList.toggle('xp-mode', window.state.xpMode);
    
    // Toggle Button Visuals
    const btn = document.getElementById('toggle-xp-btn');
    if(btn) {
        btn.classList.toggle('bg-purple-900/40', window.state.xpMode);
        btn.classList.toggle('border-purple-500', window.state.xpMode);
        btn.classList.toggle('text-purple-200', window.state.xpMode);
        const txt = document.getElementById('xp-btn-text');
        if(txt) txt.innerText = window.state.xpMode ? "Exit Experience" : "Experience";
    }

    // Ensure Freebie Mode is OFF
    if (window.state.xpMode && window.state.freebieMode) toggleFreebieMode();

    // Show/Hide Sidebar
    const sb = document.getElementById('xp-sidebar');
    if(sb) {
        if(window.state.xpMode) {
            sb.classList.remove('hidden');
            setTimeout(() => sb.classList.add('open'), 10);
            renderXpSidebar();
        } else {
            sb.classList.remove('open');
            setTimeout(() => sb.classList.add('hidden'), 300);
        }
    }
    
    if(window.fullRefresh) window.fullRefresh();
}
window.toggleXpMode = toggleXpMode;

export function renderXpSidebar() {
    if (!window.state.xpMode) return;
    
    // Calculate Spending Buckets from XP Log
    const log = window.state.xpLog || [];
    let buckets = {
        newAbil: 0,
        newDisc: 0,
        newPath: 0,
        attr: 0,
        abil: 0,
        clanDisc: 0,
        otherDisc: 0,
        caitiffDisc: 0, // Catch-all for Caitiff
        secPath: 0,
        virt: 0,
        humanity: 0,
        willpower: 0
    };

    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    const isCaitiff = clan === "Caitiff";
    const clanDiscs = CLAN_DISCIPLINES[clan] || [];

    log.forEach(entry => {
        // Logic to categorize XP spend
        const isNew = entry.old === 0;
        const name = entry.trait || "";
        const type = entry.type;
        const cost = entry.cost;

        if (type === 'abil') {
            if (isNew) buckets.newAbil += cost;
            else buckets.abil += cost;
        } 
        else if (type === 'attr') {
            buckets.attr += cost;
        }
        else if (type === 'disc') {
            const isPath = name.toLowerCase().includes('path');
            if (isPath) {
                if (isNew) buckets.newPath += cost; 
                else buckets.secPath += cost; 
            } else {
                if (isNew) buckets.newDisc += cost;
                else {
                    // Raising Discipline
                    if (isCaitiff) buckets.caitiffDisc += cost;
                    else if (clanDiscs.includes(name)) buckets.clanDisc += cost;
                    else buckets.otherDisc += cost;
                }
            }
        }
        else if (type === 'virt') buckets.virt += cost;
        else if (type === 'humanity' || (type === 'status' && name === 'Humanity')) buckets.humanity += cost;
        else if (type === 'willpower' || (type === 'status' && name === 'Willpower')) buckets.willpower += cost;
        else if (type === 'path') buckets.secPath += cost; // Catch-all for path upgrades
    });

    const sb = document.getElementById('xp-sidebar');
    if (!sb) return;

    // Clear existing content except the toggle button
    const toggleBtn = document.getElementById('xp-sb-toggle-btn');
    sb.innerHTML = '';
    if (toggleBtn) sb.appendChild(toggleBtn);

    const title = document.createElement('h3');
    title.className = "heading text-purple-400 text-sm border-b border-purple-500 pb-2 mb-4 text-center";
    title.innerText = "Experience Ledger";
    sb.appendChild(title);

    const listDiv = document.createElement('div');
    listDiv.className = "space-y-2 text-xs";

    // Helper to add row
    const addRow = (label, val, highlight = false) => {
        const row = document.createElement('div');
        row.className = "cost-row";
        const valClass = highlight ? "text-purple-300 font-bold" : "text-gray-400 font-bold";
        
        row.innerHTML = `<span class="text-gray-400">${label}</span><span class="cost-val ${valClass} bg-black/95 z-10 shrink-0">${val}</span>`;
        listDiv.appendChild(row);
    };

    // --- RENDER ROWS BASED ON USER SPECS ---
    addRow("New Ability (3)", buckets.newAbil);
    addRow("New Discipline (10)", buckets.newDisc);
    addRow("New Path (7)", buckets.newPath);
    
    addRow("Attribute (Cur x4)", buckets.attr);
    addRow("Ability (Cur x2)", buckets.abil);
    
    if (isCaitiff) {
        // Caitiff Special Rule
        addRow("Discipline (Cur x6)*", buckets.caitiffDisc, true); // Highlight
    } else {
        // Standard
        addRow("Clan Disc (Cur x5)*", buckets.clanDisc);
        addRow("Other Disc (Cur x7)*", buckets.otherDisc);
    }
    
    addRow("Sec. Path (Cur x4)", buckets.secPath);
    addRow("Virtue (Cur x2)**", buckets.virt);
    addRow("Humanity/Path (Cur x2)", buckets.humanity);
    addRow("Willpower (Cur x1)", buckets.willpower);

    // Totals
    const totalSpent = Object.values(buckets).reduce((a,b) => a+b, 0);
    const totalEarned = parseInt(document.getElementById('c-xp-total')?.value) || 0;
    
    const divTotal = document.createElement('div');
    divTotal.className = "mt-4 pt-2 border-t border-[#444] flex justify-between font-bold text-sm";
    divTotal.innerHTML = `<span>Total Spent:</span><span class="text-purple-400">${totalSpent}</span>`;
    listDiv.appendChild(divTotal);

    const divRemain = document.createElement('div');
    divRemain.className = "flex justify-between font-bold text-sm";
    divRemain.innerHTML = `<span>Remaining:</span><span class="text-white">${totalEarned - totalSpent}</span>`;
    listDiv.appendChild(divRemain);

    sb.appendChild(listDiv);

    // Recent Log (Scrollable)
    const logContainer = document.createElement('div');
    logContainer.className = "mt-4";
    logContainer.innerHTML = `<h4 class="text-[9px] uppercase text-gray-500 font-bold mb-1 tracking-wider">Session Log</h4>`;
    const logInner = document.createElement('div');
    logInner.id = "xp-log-recent";
    logInner.className = "text-[9px] text-gray-400 h-24 overflow-y-auto border border-[#333] p-1 font-mono bg-white/5";
    
    if(log.length > 0) {
        logInner.innerHTML = log.slice().reverse().map(l => {
            const d = new Date(l.date).toLocaleDateString();
            return `<div>[${d}] ${l.trait} -> ${l.new} (${l.cost}xp)</div>`;
        }).join('');
    }
    
    logContainer.appendChild(logInner);
    sb.appendChild(logContainer);

    // Explanation Footnotes
    const footer = document.createElement('div');
    footer.className = "mt-4 pt-2 border-t border-[#444] text-[8px] text-gray-500 italic leading-tight";
    
    let footerText = `
        <div>** Virtues do not raise Traits.</div>
    `;
    
    if (isCaitiff) {
        footerText += `<div class="mt-1 text-purple-400">* Caitiff cost is x6 (Curse/Blessing).</div>`;
    } else {
        footerText += `<div class="mt-1">* In-Clan/Out-of-Clan multiplier.</div>`;
    }
    
    footer.innerHTML = footerText;
    sb.appendChild(footer);
}
window.renderXpSidebar = renderXpSidebar;

export function toggleXpSidebarLedger() {
    document.getElementById('xp-sidebar').classList.toggle('open');
}
window.toggleXpSidebarLedger = toggleXpSidebarLedger;

// --- WALKTHROUGH & STEPS ---

export function updateWalkthrough() {
    if (!window.state) return;
    
    const nav = document.getElementById('sheet-nav');
    if (nav && !window.state.isPlayMode) {
         const current = window.state.currentPhase;
         const furthest = window.state.furthestPhase || 1;
         
         if (checkStepComplete(current, window.state)) {
             if (current === furthest && current < 8) {
                 window.state.furthestPhase = current + 1;
                 changeStep(current);
             }
         }
         
         const guideMsg = document.getElementById('guide-message');
         const guideIcon = document.getElementById('guide-icon');
         if (guideMsg && guideIcon) {
             const isComplete = checkStepComplete(current, window.state);
             if (isComplete) {
                 guideMsg.innerText = "Step Complete! Proceed...";
                 guideMsg.classList.add('text-green-400');
                 guideIcon.classList.add('ready');
             } else {
                 guideMsg.classList.remove('text-green-400');
                 guideIcon.classList.remove('ready');
                 if (current === 1) guideMsg.innerText = "Enter Name & Clan...";
                 else if (current === 2) guideMsg.innerText = "Select Attributes...";
                 else guideMsg.innerText = "Complete Requirements...";
             }
         }
    }
    renderPrintSheet();
    // Update Walkthrough Modal content if open
    if (document.getElementById('walkthrough-modal') && !document.getElementById('walkthrough-modal').classList.contains('hidden')) {
        renderWalkthroughModalContent();
    }
}
window.updateWalkthrough = updateWalkthrough;

export function nextStep() {
    const current = window.state.currentPhase;
    const furthest = window.state.furthestPhase || 1;
    if (current < furthest) changeStep(furthest);
    else if (checkStepComplete(current, window.state)) { if (current < 8) changeStep(current + 1); else showNotification("Character Ready!"); } 
    else showNotification("Complete current step first!");
}
window.nextStep = nextStep;

export function changeStep(s) {
    if (!window.state.furthestPhase || s > window.state.furthestPhase) { if (s > (window.state.furthestPhase || 0)) window.state.furthestPhase = s; }
    document.querySelectorAll('.step-container').forEach(c => c.classList.remove('active'));
    
    const prefix = window.state.isPlayMode ? 'play-mode-' : 'phase-';
    
    // --- SPECIAL JOURNAL INJECTION FOR PLAY MODE ---
    if (window.state.isPlayMode && s === 5) {
        let pm5 = document.getElementById('play-mode-5');
        if (!pm5) {
            pm5 = document.createElement('div');
            pm5.id = 'play-mode-5';
            pm5.className = 'step-container p-4 hidden'; 
            document.getElementById('play-mode-sheet').appendChild(pm5);
        }
        renderJournalTab();
    }

    // --- NEW: SPECIAL NPC INJECTION FOR PLAY MODE ---
    if (window.state.isPlayMode && s === 6) {
        let pm6 = document.getElementById('play-mode-6');
        if (!pm6) {
            pm6 = document.createElement('div');
            pm6.id = 'play-mode-6';
            pm6.className = 'step-container p-4 hidden';
            document.getElementById('play-mode-sheet').appendChild(pm6);
        }
        renderNpcTab();
    }
    
    // --- SPECIAL: RITUALS INJECTION FOR PHASE 6 ---
    if (!window.state.isPlayMode && s === 6) {
        renderRitualsEdit();
    }

    const target = document.getElementById(prefix + s);
    if (target) { target.classList.add('active'); window.state.currentPhase = s; }
    
    // Update Nav
    const nav = document.getElementById('sheet-nav');
    if (nav) {
        nav.innerHTML = '';
        if (window.state.isPlayMode) {
             // RENAMED "Retainers" to "NPCs"
             const steps = ["Sheet", "Traits", "Social", "Biography", "Journal", "NPCs"];
             steps.forEach((text, i) => {
                 const it = document.createElement('div'); it.className = `nav-item ${window.state.currentPhase === (i+1) ? 'active' : ''}`;
                 it.innerHTML = `<i class="fas fa-scroll"></i><span style="display:block; font-size:9px; margin-top:2px;">${text}</span>`;
                 it.onclick = () => changeStep(i+1); nav.appendChild(it);
             });
        } else {
            const furthest = window.state.furthestPhase || 1;
            STEPS_CONFIG.forEach(step => {
                const it = document.createElement('div'); let statusClass = '';
                if (step.id === s) statusClass = 'active'; else if (step.id < s) statusClass = 'completed'; else if (step.id <= furthest) statusClass = 'unlocked'; else statusClass = 'locked';
                it.className = `nav-item ${statusClass}`;
                it.innerHTML = `<div class="flex flex-col items-center justify-center w-full h-full"><i class="fas ${step.icon}"></i><span style="display:block !important; font-size:7px; text-transform:uppercase; margin-top:2px; opacity:1;">${step.label}</span></div>`;
                it.onclick = () => { if (step.id <= furthest) changeStep(step.id); };
                nav.appendChild(it);
            });
        }
    }
    updatePools();
    updateWalkthrough(); // Update button states/modal if active
}
window.changeStep = changeStep;

export function toggleFreebieMode() {
     window.state.freebieMode = !window.state.freebieMode;
     
     if (window.state.freebieMode && window.state.xpMode) toggleXpMode();
     
     document.body.classList.toggle('freebie-mode', window.state.freebieMode);
     const fbBtn = document.getElementById('toggle-freebie-btn');
     const fbBtnText = document.getElementById('freebie-btn-text');
     if (fbBtnText) fbBtnText.innerText = window.state.freebieMode ? "Exit Freebies" : "Freebies";
     if (fbBtn) { fbBtn.classList.toggle('bg-blue-900/40', window.state.freebieMode); fbBtn.classList.toggle('border-blue-500', window.state.freebieMode); fbBtn.classList.toggle('text-blue-200', window.state.freebieMode); }
     const mMsg = document.getElementById('merit-locked-msg'); const fMsg = document.getElementById('flaw-locked-msg');
     if(mMsg) mMsg.style.display = window.state.freebieMode ? 'none' : 'block';
     if(fMsg) fMsg.style.display = window.state.freebieMode ? 'none' : 'block';
     
     if(window.fullRefresh) window.fullRefresh();
}
window.toggleFreebieMode = toggleFreebieMode;

export function toggleSidebarLedger() { document.getElementById('freebie-sidebar').classList.toggle('open'); }
window.toggleSidebarLedger = toggleSidebarLedger;

// --- PLAY MODE ---

export function togglePlayMode() {
    window.state.isPlayMode = !window.state.isPlayMode;
    document.body.classList.toggle('play-mode', window.state.isPlayMode);
    
    // Disable Edit Modes
    if (window.state.isPlayMode) {
        if (window.state.freebieMode) toggleFreebieMode();
        if (window.state.xpMode) toggleXpMode();
    }
    
    const pBtn = document.getElementById('play-mode-btn'); const pBtnText = document.getElementById('play-btn-text');
    if(pBtnText) pBtnText.innerText = window.state.isPlayMode ? "Edit" : "Play";
    
    // Toggle Walkthrough Button Visibility
    const guideBtn = document.getElementById('walkthrough-btn');
    if(guideBtn) {
        if(window.state.isPlayMode) guideBtn.classList.add('hidden');
        else guideBtn.classList.remove('hidden');
    }
    
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (['save-filename', 'char-select', 'roll-diff', 'use-specialty', 'c-path-name', 'c-path-name-create', 'c-bearing-name', 'c-bearing-value', 'custom-weakness-input', 'xp-points-input', 'blood-per-turn-input', 'custom-dice-input', 'spend-willpower', 'c-xp-total', 'frenzy-diff', 'rotschreck-diff', 'play-merit-notes', 'dmg-input-val', 'tray-use-armor',
        // Journal Inputs Exemption
        'log-sess-num', 'log-date', 'log-game-date', 'log-title', 'log-effects', 'log-scene1', 'log-scene2', 'log-scene3', 'log-obj', 'log-clues', 'log-secrets', 'log-downtime'
        ].includes(el.id) || el.classList.contains('merit-flaw-desc') || el.closest('#active-log-form')) {
            el.disabled = false;
            return;
        }
        el.disabled = window.state.isPlayMode;
    });

    const playSheet = document.getElementById('play-mode-sheet');
    const phases = document.querySelectorAll('.step-container');

    if (window.state.isPlayMode) {
        phases.forEach(el => el.classList.add('hidden'));
        phases.forEach(el => el.classList.remove('active')); 

        if (playSheet) {
            playSheet.classList.remove('hidden');
            playSheet.style.display = 'block'; 
        }

        const row = document.getElementById('play-concept-row');
        if (row) {
            const getVal = (id) => document.getElementById(id)?.value || '';
            row.innerHTML = `
                <div><span class="label-text">Name:</span> <span class="text-white font-bold">${getVal('c-name')}</span></div>
                <div><span class="label-text">Player:</span> <span class="text-white font-bold">${getVal('c-player')}</span></div>
                <div><span class="label-text">Chronicle:</span> <span class="text-white font-bold">${getVal('c-chronicle')}</span></div>
                <div><span class="label-text">Nature:</span> <span class="text-white font-bold">${getVal('c-nature')}</span></div>
                <div><span class="label-text">Demeanor:</span> <span class="text-white font-bold">${getVal('c-demeanor')}</span></div>
                <div><span class="label-text">Concept:</span> <span class="text-white font-bold">${getVal('c-concept')}</span></div>
                <div><span class="label-text">Clan:</span> <span class="text-white font-bold">${getVal('c-clan')}</span></div>
                <div><span class="label-text">Generation:</span> <span class="text-white font-bold">${getVal('c-gen')}</span></div>
                <div><span class="label-text">Sire:</span> <span class="text-white font-bold">${getVal('c-sire')}</span></div>
            `;
        }
        
        const ra = document.getElementById('play-row-attr'); 
        if (ra) {
            ra.innerHTML = '';
            Object.entries(ATTRIBUTES).forEach(([c,l]) => { 
                const s = document.createElement('div'); 
                s.className='sheet-section !mt-0'; 
                s.innerHTML=`<div class="column-title">${c}</div>`; 
                ra.appendChild(s); 
                l.forEach(a=>renderRow(s,a,'attr',1)); 
            });
        }
        
        const rb = document.getElementById('play-row-abil'); 
        if (rb) {
            rb.innerHTML = '';
            Object.entries(ABILITIES).forEach(([c,l]) => { 
                const s = document.createElement('div'); 
                s.className='sheet-section !mt-0'; 
                s.innerHTML=`<div class="column-title">${c}</div>`; 
                rb.appendChild(s);
                l.forEach(a=>renderRow(s,a,'abil',0)); 
            });
        }
        
        // --- RESTORE SIMPLE ADVANTAGES ROW (Dots Only) FOR PHASE 1 ---
        const rc = document.getElementById('play-row-adv'); 
        if (rc) {
            rc.innerHTML = '';
            const ds = document.createElement('div'); ds.className='sheet-section !mt-0'; ds.innerHTML='<div class="column-title">Disciplines</div>';
            rc.appendChild(ds);
            Object.entries(window.state.dots.disc).forEach(([n,v]) => { if(v>0) renderRow(ds,n,'disc',0); }); 
            
            const bs = document.createElement('div'); bs.className='sheet-section !mt-0'; bs.innerHTML='<div class="column-title">Backgrounds</div>';
            rc.appendChild(bs);
            Object.entries(window.state.dots.back).forEach(([n,v]) => { if(v>0) renderRow(bs,n,'back',0); }); 
            
            const vs = document.createElement('div'); vs.className='sheet-section !mt-0'; vs.innerHTML='<div class="column-title">Virtues</div>';
            rc.appendChild(vs);
            VIRTUES.forEach(v => renderRow(vs, v, 'virt', 1)); 
        }
        
        const pg = document.getElementById('play-social-grid'); if(pg) {
            pg.innerHTML = ''; BACKGROUNDS.forEach(s => { const dots = window.state.dots.back[s] || 0; const safeId = 'desc-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-'); const el = document.getElementById(safeId); const txt = el ? el.value : ""; if(dots || txt) pg.innerHTML += `<div class="border-l-2 border-[#333] pl-4 mb-4"><div class="flex justify-between items-center"><label class="label-text text-gold">${s}</label><div class="text-[8px] font-bold text-white">${renderDots(dots,5)}</div></div><div class="text-xs text-gray-200 mt-1">${txt || "No description."}</div></div>`; });
        }

        const pb = document.getElementById('play-blood-bonds'); if(pb) {
            pb.innerHTML = ''; 
            
            // --- TREMERE WEAKNESS NOTE (PLAY MODE) ---
            const clan = window.state.textFields['c-clan'] || "None";
            const isTremere = clan === "Tremere";

            if (isTremere) {
                pb.innerHTML += `<div class="text-[#a855f7] text-[9px] font-bold mb-2 uppercase border-b border-[#a855f7]/30 pb-1 italic"><i class="fas fa-flask mr-1"></i> Weakness: 1st Drink = 2 Steps</div>`;
            }

            window.state.bloodBonds.forEach(b => { 
                let label = "";
                if (b.type === 'Bond') {
                    let r = parseInt(b.rating) || 0;
                    
                    // Apply Tremere Weakness Logic
                    if (isTremere) {
                        if (r === 1) {
                            label = `<span class="text-[#a855f7]">Step 2</span> (1 Drink)`;
                        } else if (r >= 2) {
                            label = `<span class="text-[#a855f7] font-black">Full Bond</span>`; 
                        } else {
                            label = `Step ${r}`; // Should effectively be 0
                        }
                    } else {
                        // Standard
                        if (r >= 3) label = 'Full Bond';
                        else label = `Drink ${r}`;
                    }
                } else {
                    label = `Vinculum ${b.rating}`;
                }
                
                pb.innerHTML += `<div class="flex justify-between border-b border-[#222] py-1 text-xs"><span>${b.name}</span><span class="text-gold font-bold">${label}</span></div>`; 
            });
        }

        // --- UPDATED MERITS & FLAWS (Name | Value | Editable Description) ---
        const mf = document.getElementById('merit-flaw-rows-play'); 
        if(mf) {
            mf.innerHTML = ''; 
            
            // Helper to render editable row
            const renderMFRow = (item, type, index) => {
                const row = document.createElement('div');
                row.className = "flex flex-col border-b border-[#222] py-2 mb-1";
                const valueColor = type === 'Merit' ? 'text-red-400' : 'text-green-400'; // Cost vs Bonus logic
                
                row.innerHTML = `
                    <div class="flex justify-between text-xs mb-1">
                        <span class="font-bold text-white">${item.name}</span>
                        <span class="${valueColor} font-bold text-[10px]">${item.val} pts</span>
                    </div>
                    <textarea class="merit-flaw-desc bg-transparent border-none text-[10px] text-gray-400 w-full italic focus:text-white focus:not-italic resize-none overflow-hidden" 
                            placeholder="Description / Note..." rows="1" style="min-height: 20px;">${item.desc || ''}</textarea>
                `;
                
                // Bind Listener
                const input = row.querySelector('textarea');
                // Auto-resize function
                const resize = () => {
                    input.style.height = 'auto';
                    input.style.height = (input.scrollHeight) + 'px';
                };
                // Initial resize
                requestAnimationFrame(resize);
                
                input.oninput = resize;
                input.onblur = (e) => {
                    const arr = type === 'Merit' ? window.state.merits : window.state.flaws;
                    if(arr[index]) {
                        arr[index].desc = e.target.value;
                    }
                };
                
                mf.appendChild(row);
            };

            if(window.state.merits) window.state.merits.forEach((m, i) => renderMFRow(m, 'Merit', i));
            if(window.state.flaws) window.state.flaws.forEach((f, i) => renderMFRow(f, 'Flaw', i));
            
            if (!window.state.merits?.length && !window.state.flaws?.length) {
                mf.innerHTML = '<div class="text-[10px] text-gray-600 italic text-center">No Merits or Flaws selected.</div>';
            }
        }

        const ot = document.getElementById('other-traits-rows-play'); if(ot) {
            ot.innerHTML = ''; Object.entries(window.state.dots.other).forEach(([n,v]) => { if(v>0) renderRow(ot, n, 'other', 0); });
        }
        
        const plv = document.getElementById('play-vitals-list'); if(plv) {
            plv.innerHTML = ''; VIT.forEach(v => { const val = document.getElementById('bio-' + v)?.value; if(val) plv.innerHTML += `<div class="flex justify-between border-b border-[#222] py-1 font-bold"><span class="text-gray-400">${v.replace('-',' ')}:</span> <span>${val}</span></div>`; });
        }

        const cp = document.getElementById('combat-rows-play'); 
        if(cp) {
            cp.innerHTML = ''; 
            
            // --- INITIATIVE ROLL (UPDATED) ---
            // Calc Rating: Dex + Wits (V20 p.253)
            const dexVal = window.state.dots.attr['Dexterity'] || 1;
            const witsVal = window.state.dots.attr['Wits'] || 1;
            const initRating = dexVal + witsVal;
            
            const initRow = document.createElement('tr');
            initRow.className = 'bg-[#222] border-b border-[#444]';
            initRow.innerHTML = `
                <td colspan="6" class="p-2 text-center">
                    <button class="bg-[#d97706] hover:bg-[#b45309] text-white text-[10px] font-bold py-1 px-6 rounded uppercase tracking-wider flex items-center justify-center mx-auto gap-2 transition-all" onclick="window.rollInitiative(${initRating})">
                        <i class="fas fa-bolt text-yellow-200"></i> Roll Initiative (Rating: ${initRating})
                    </button>
                </td>
            `;
            cp.appendChild(initRow);
            // -------------------------------

            const standards = [
                {n:'Bite', diff:6, dmg:'Str+1(A)', attr:'Dexterity', abil:'Brawl'},
                {n:'Block', diff:6, dmg:'None (R)', attr:'Dexterity', abil:'Brawl'},
                {n:'Claw', diff:6, dmg:'Str+1(A)', attr:'Dexterity', abil:'Brawl'},
                {n:'Clinch', diff:6, dmg:'Str(C)', attr:'Strength', abil:'Brawl'},
                {n:'Disarm', diff:7, dmg:'Special', attr:'Dexterity', abil:'Melee'},
                {n:'Dodge', diff:6, dmg:'None (R)', attr:'Dexterity', abil:'Athletics'},
                {n:'Hold', diff:6, dmg:'None (C)', attr:'Strength', abil:'Brawl'},
                {n:'Kick', diff:7, dmg:'Str+1', attr:'Dexterity', abil:'Brawl'},
                {n:'Parry', diff:6, dmg:'None (R)', attr:'Dexterity', abil:'Melee'},
                {n:'Strike', diff:6, dmg:'Str', attr:'Dexterity', abil:'Brawl'},
                {n:'Sweep', diff:7, dmg:'Str(K)', attr:'Dexterity', abil:'Brawl'},
                {n:'Tackle', diff:7, dmg:'Str+1(K)', attr:'Strength', abil:'Brawl'},
                {n:'Weapon Strike', diff:6, dmg:'Weapon', attr:'Dexterity', abil:'Melee'},
                {n:'Auto Fire', diff:8, dmg:'Special', attr:'Dexterity', abil:'Firearms'},
                {n:'Multi Shot', diff:6, dmg:'Weapon', attr:'Dexterity', abil:'Firearms'},
                {n:'Strafing', diff:8, dmg:'Special', attr:'Dexterity', abil:'Firearms'},
                {n:'3-Rnd Burst', diff:7, dmg:'Weapon', attr:'Dexterity', abil:'Firearms'},
                {n:'Two Weapons', diff:7, dmg:'Weapon', attr:'Dexterity', abil:'Firearms'}
            ];
            
             standards.forEach(s => { 
                const r = document.createElement('tr'); 
                r.className='border-b border-[#222] text-[10px] text-gray-500 hover:bg-[#1a1a1a]'; 
                r.innerHTML = `
                    <td class="p-2 font-bold text-white flex items-center gap-2">
                        <button class="bg-[#8b0000] hover:bg-red-600 text-white rounded px-1.5 py-0.5 text-[9px] font-bold" onclick="window.rollCombat('${s.n}', ${s.diff}, '${s.attr}', '${s.abil}')" title="Roll ${s.n}">
                            <i class="fas fa-dice-d10"></i>
                        </button>
                        ${s.n}
                    </td>
                    <td class="p-2">${s.diff}</td>
                    <td class="p-2">${s.dmg}</td>
                    <td class="p-2 text-center">-</td>
                    <td class="p-2 text-center">-</td>
                    <td class="p-2 text-center">-</td>
                `; 
                cp.appendChild(r); 
            });

            // Update Inventory Weapons to use rollCombat
            const firearms = ['Pistol', 'Revolver', 'Rifle', 'SMG', 'Shotgun', 'Crossbow'];
            if(window.state.inventory) { 
                window.state.inventory.filter(i => i.type === 'Weapon' && i.status === 'carried').forEach(w => { 
                    let display = w.displayName || w.name;
                    const isFirearm = firearms.some(f => (w.name && w.name.includes(f)) || (w.baseType && w.baseType.includes(f)));
                    const ability = isFirearm ? 'Firearms' : 'Melee';
                    const r = document.createElement('tr'); 
                    r.className='border-b border-[#222] text-[10px] hover:bg-[#1a1a1a]'; 
                    r.innerHTML = `
                        <td class="p-2 font-bold text-gold flex items-center gap-2">
                             <button class="bg-[#8b0000] hover:bg-red-600 text-white rounded px-1.5 py-0.5 text-[9px] font-bold" onclick="window.rollCombat('${display}', ${w.stats.diff}, 'Dexterity', '${ability}')" title="Roll ${display}">
                                <i class="fas fa-dice-d10"></i>
                            </button>
                            ${display}
                        </td>
                        <td class="p-2 text-white">${w.stats.diff}</td>
                        <td class="p-2 text-white">${w.stats.dmg}</td>
                        <td class="p-2 text-center">${w.stats.range}</td>
                        <td class="p-2 text-center">${w.stats.rate}</td>
                        <td class="p-2 text-center">${w.stats.clip}</td>
                    `; 
                    cp.appendChild(r); 
                }); 
            }
        }
        
        // --- MOVEMENT SPEED SECTION (PLAY MODE 2) ---
        renderMovementSection();
        
        // --- INJECT DETAILED DISCIPLINES (PHASE 2 / TRAITS TAB) ---
        renderDetailedDisciplines();
        
        // --- UPDATE RITUALS LIST (PHASE 2 / TRAITS TAB) ---
        updateRitualsPlayView();

        if(document.getElementById('rituals-list-play')) document.getElementById('rituals-list-play').innerText = document.getElementById('rituals-list-create-ta').value; // Keeping fallback but handled by updateRitualsPlayView now
        let carried = []; let owned = []; if(window.state.inventory) { window.state.inventory.forEach(i => { const str = `${i.displayName || i.name} ${i.type === 'Armor' ? `(R:${i.stats.rating} P:${i.stats.penalty})` : ''}`; if(i.status === 'carried') carried.push(str); else owned.push(str); }); }
        setSafeText('play-gear-carried', carried.join(', ')); setSafeText('play-gear-owned', owned.join(', '));
        if(document.getElementById('play-bio-desc')) document.getElementById('play-bio-desc').innerText = document.getElementById('bio-desc').value;
        
        // --- UPDATED MALKAVIAN LOGIC FOR PLAY MODE ---
        if(document.getElementById('play-derangements')) { 
            const pd = document.getElementById('play-derangements'); 
            const clan = window.state.textFields['c-clan'] || "None";
            const isMalk = clan === "Malkavian";
            
            let contentHtml = window.state.derangements.length > 0 
                ? window.state.derangements.map((d, i) => {
                    if (isMalk && i === 0) return `<div class="text-[#a855f7] font-bold"><i class="fas fa-lock text-[8px] mr-1"></i>${d} (Incurable)</div>`;
                    return `<div>• ${d}</div>`;
                }).join('') 
                : '<span class="text-gray-500 italic">None</span>';
                
            if (isMalk) {
                contentHtml += `
                    <div class="mt-2 pt-2 border-t border-[#333] flex items-center justify-between">
                        <span class="text-[9px] text-[#a855f7] uppercase font-bold">Weakness</span>
                        <button onclick="window.suppressDerangement()" class="bg-[#a855f7] hover:bg-[#c084fc] text-white text-[9px] font-bold px-2 py-1 rounded flex items-center gap-1">
                            <i class="fas fa-power-off"></i> Suppress (1 WP)
                        </button>
                    </div>
                `;
            }
            pd.innerHTML = contentHtml; 
        }
        
        if(document.getElementById('play-languages')) document.getElementById('play-languages').innerText = document.getElementById('bio-languages').value;
        if(document.getElementById('play-goals-st')) document.getElementById('play-goals-st').innerText = document.getElementById('bio-goals-st').value;
        if(document.getElementById('play-goals-lt')) document.getElementById('play-goals-lt').innerText = document.getElementById('bio-goals-lt').value;
        if(document.getElementById('play-history')) document.getElementById('play-history').innerText = document.getElementById('char-history').value;
        const feedSrc = document.getElementById('inv-feeding-grounds'); if (feedSrc) setSafeText('play-feeding-grounds', feedSrc.value);
        if(document.getElementById('armor-rating-play')) { let totalA = 0; let totalP = 0; let names = []; if(window.state.inventory) { window.state.inventory.filter(i => i.type === 'Armor' && i.status === 'carried').forEach(a => { totalA += parseInt(a.stats?.rating)||0; totalP += parseInt(a.stats?.penalty)||0; names.push(a.displayName || a.name); }); } setSafeText('armor-rating-play', totalA); setSafeText('armor-penalty-play', totalP); setSafeText('armor-desc-play', names.join(', ')); }
        if (document.getElementById('play-vehicles')) { const pv = document.getElementById('play-vehicles'); pv.innerHTML = ''; if (window.state.inventory) { window.state.inventory.filter(i => i.type === 'Vehicle').forEach(v => { let display = v.displayName || v.name; pv.innerHTML += `<div class="mb-2 border-b border-[#333] pb-1"><div class="font-bold text-white uppercase text-[10px]">${display}</div><div class="text-[9px] text-gray-400">Safe:${v.stats.safe} | Max:${v.stats.max} | Man:${v.stats.man}</div></div>`; }); } }
        if (document.getElementById('play-havens-list')) { const ph = document.getElementById('play-havens-list'); ph.innerHTML = ''; window.state.havens.forEach(h => { ph.innerHTML += `<div class="border-l-2 border-gold pl-4 mb-4"><div class="flex justify-between"><div><div class="font-bold text-white uppercase text-[10px]">${h.name}</div><div class="text-[9px] text-gold italic">${h.loc}</div></div></div><div class="text-xs text-gray-400 mt-1">${h.desc}</div></div>`; }); }
        
        // --- CLAN SPECIFIC WEAKNESS & FRENZY ---
        const weaknessCont = document.getElementById('weakness-play-container');
        if (weaknessCont) {
            weaknessCont.innerHTML = '';
            const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
            const weaknessText = CLAN_WEAKNESSES[clan] || "Select a Clan to see weakness.";
            const customNote = window.state.textFields['custom-weakness'] || "";
            
            // REMOVED FRENZY BUTTON FROM HERE
            weaknessCont.innerHTML = `
                <div class="section-title">Weakness</div>
                <div class="bg-[#111] p-3 border border-[#333] h-full flex flex-col mt-2">
                    <div class="text-[11px] text-gray-300 italic mb-3 leading-snug flex-1">${weaknessText}</div>
                    <div class="text-[9px] font-bold text-gray-500 mb-1 uppercase">Specifics / Notes</div>
                    <textarea id="custom-weakness-input" class="w-full h-16 bg-black border border-[#444] text-[10px] text-white p-2 focus:border-gold outline-none resize-none" placeholder="e.g. 'Only Brunettes'">${customNote}</textarea>
                </div>
            `;
            const ta = document.getElementById('custom-weakness-input');
            if(ta) {
                ta.addEventListener('blur', (e) => {
                    if(!window.state.textFields) window.state.textFields = {};
                    window.state.textFields['custom-weakness'] = e.target.value;
                });
            }
        }
        
        // --- THE BEAST (FRENZY / RÖTSCHRECK) ---
        if (weaknessCont && weaknessCont.parentNode) {
            let beastCont = document.getElementById('beast-play-container');
            if (!beastCont) {
                beastCont = document.createElement('div');
                beastCont.id = 'beast-play-container';
                beastCont.className = 'sheet-section';
                weaknessCont.parentNode.insertBefore(beastCont, weaknessCont);
            }
            
            beastCont.innerHTML = `
                <div class="section-title">The Beast</div>
                <div class="bg-[#111] p-3 border border-[#333] mt-2 space-y-4">
                    <!-- Frenzy -->
                    <div>
                        <div class="flex justify-between items-center text-[10px] uppercase font-bold text-gray-400 mb-1">
                            <span>Frenzy Check</span>
                            <input type="number" id="frenzy-diff" placeholder="Diff (Auto)" class="w-16 bg-black border border-[#444] text-center text-white p-1 text-[10px]">
                        </div>
                        <button onclick="window.rollFrenzy()" class="w-full bg-[#8b0000] hover:bg-red-700 text-white font-bold py-1 text-[10px] uppercase transition-colors flex items-center justify-center">
                            <i class="fas fa-bolt mr-1"></i> Check Frenzy
                        </button>
                    </div>
                    <!-- Rötschreck -->
                    <div class="border-t border-[#333] pt-2">
                        <div class="flex justify-between items-center text-[10px] uppercase font-bold text-gray-400 mb-1">
                            <span>Rötschreck (Fire/Sun)</span>
                            <input type="number" id="rotschreck-diff" placeholder="Diff (6)" value="6" class="w-16 bg-black border border-[#444] text-center text-white p-1 text-[10px]">
                        </div>
                        <button onclick="window.rollRotschreck()" class="w-full bg-[#d97706] hover:bg-orange-600 text-white font-bold py-1 text-[10px] uppercase transition-colors flex items-center justify-center">
                            <i class="fas fa-fire mr-1"></i> Check Fear
                        </button>
                    </div>
                </div>
            `;
        }

        const xpCont = document.getElementById('experience-play-container');
        if (xpCont) {
            xpCont.innerHTML = '';
            const xpVal = document.getElementById('c-xp-total')?.value || 0;
            const log = window.state.xpLog || [];
            const spent = log.reduce((a,b)=>a+b.cost,0);
            
            // Reduced padding and font size to prevent overflow
            xpCont.innerHTML = `
                <div class="section-title mt-6">Experience</div>
                <div class="bg-[#111] p-2 border border-[#333] mt-2">
                    <div class="flex justify-between text-[10px] mb-1"><span>Earned:</span> <span class="text-purple-400 font-bold">${xpVal}</span></div>
                    <div class="flex justify-between text-[10px] mb-1"><span>Spent:</span> <span class="text-gray-400 font-bold">${spent}</span></div>
                    <div class="flex justify-between text-[10px] border-t border-[#333] pt-1 mt-1"><span>Remain:</span> <span class="text-white font-bold">${xpVal - spent}</span></div>
                </div>
            `;
        }
        
        const bptInput = document.getElementById('blood-per-turn-input');
        if (bptInput) {
            const savedBPT = window.state.status.blood_per_turn || 1;
            bptInput.value = savedBPT;
            bptInput.onchange = (e) => {
                window.state.status.blood_per_turn = parseInt(e.target.value) || 1;
            };
        }

        changeStep(1); 
    } else {
        if (playSheet) {
            playSheet.classList.add('hidden');
            playSheet.style.display = 'none'; 
        }
        const current = window.state.currentPhase || 1;
        const currentPhaseEl = document.getElementById(`phase-${current}`);
        if (currentPhaseEl) {
            currentPhaseEl.classList.remove('hidden');
            currentPhaseEl.classList.add('active');
        }
        changeStep(window.state.furthestPhase || 1);
    }
}
window.togglePlayMode = togglePlayMode;

// --- DEDICATED MOVEMENT RENDERER ---

export function renderMovementSection() {
    if (!window.state.isPlayMode) return;
    const pm2 = document.getElementById('play-mode-2');
    if (!pm2) return;

    let moveSection = document.getElementById('play-movement-section');
    if (!moveSection) {
        moveSection = document.createElement('div');
        moveSection.id = 'play-movement-section';
        moveSection.className = 'sheet-section mt-6';
        
        // Ensure inserted before combat maneuvers if possible
        const combatSection = pm2.querySelector('.sheet-section:last-child');
        if(combatSection && combatSection.parentNode === pm2) pm2.insertBefore(moveSection, combatSection);
        else pm2.appendChild(moveSection);
    }
    
    // Calculate Movement
    const dex = window.state.dots.attr['Dexterity'] || 1;
    const dmgBoxes = (window.state.status.health_states || []).filter(x => x > 0).length;
    
    let w = 7;
    let j = 12 + dex;
    let r = 20 + (3 * dex);
    let note = "Normal Movement";
    let noteColor = "text-gray-500";
    
    // Health Penalties (V20 p.282)
    if (dmgBoxes === 4) { // Wounded
        r = 0; 
        note = "Wounded: Cannot Run"; 
        noteColor = "text-orange-400";
    } else if (dmgBoxes === 5) { // Mauled
        j = 0; r = 0;
        if(w > 3) w = 3;
        note = "Mauled: Max 3 yds/turn";
        noteColor = "text-red-400";
    } else if (dmgBoxes === 6) { // Crippled
        w = 1; j = 0; r = 0;
        note = "Crippled: Crawl 1 yd/turn";
        noteColor = "text-red-600 font-bold";
    } else if (dmgBoxes >= 7) { // Incapacitated
        w = 0; j = 0; r = 0;
        note = "Incapacitated: Immobile";
        noteColor = "text-red-700 font-black";
    }

    // Render with Units
    moveSection.innerHTML = `
        <div class="section-title">Movement (Yards/Turn)</div>
        <div class="grid grid-cols-3 gap-4 text-center mt-2">
            <div>
                <div class="text-[10px] uppercase font-bold text-gray-400">Walk</div>
                <div class="text-xl font-bold text-white">${w > 0 ? w : '-'} <span class="text-[9px] text-gray-500 font-normal">yds</span></div>
            </div>
            <div>
                <div class="text-[10px] uppercase font-bold text-gray-400">Jog</div>
                <div class="text-xl font-bold text-gold">${j > 0 ? j : '-'} <span class="text-[9px] text-gray-500 font-normal">yds</span></div>
            </div>
            <div>
                <div class="text-[10px] uppercase font-bold text-gray-400">Run</div>
                <div class="text-xl font-bold text-red-500">${r > 0 ? r : '-'} <span class="text-[9px] text-gray-500 font-normal">yds</span></div>
            </div>
        </div>
        <div class="text-[10px] text-center mt-2 border-t border-[#333] pt-1 ${noteColor} font-bold uppercase">${note}</div>
    `;
}
window.renderMovementSection = renderMovementSection;

// --- NEW FUNCTION: RENDER DETAILED DISCIPLINES (PHASE 2) ---
function renderDetailedDisciplines() {
    const pm2 = document.getElementById('play-mode-2');
    if (!pm2) return;

    let container = document.getElementById('detailed-disciplines-list');
    if (!container) {
        // Create the wrapper section if it doesn't exist
        const section = document.createElement('div');
        section.className = 'sheet-section !mt-0 mb-8';
        section.innerHTML = '<div class="section-title">Disciplines & Powers</div>';
        
        container = document.createElement('div');
        container.id = 'detailed-disciplines-list';
        // CHANGE 1: Grid Layout (2 Columns)
        container.className = 'grid grid-cols-1 md:grid-cols-2 gap-6 mt-4';
        
        section.appendChild(container);
        
        // Insert at the VERY TOP of Phase 2
        pm2.insertBefore(section, pm2.firstChild);
    }

    container.innerHTML = '';
    
    // Safety check for data
    const safeData = typeof DISCIPLINES_DATA !== 'undefined' ? DISCIPLINES_DATA : {};

    // Get learned disciplines
    const learned = Object.entries(window.state.dots.disc).filter(([name, val]) => val > 0);

    if (learned.length === 0) {
        container.innerHTML = '<div class="col-span-1 md:col-span-2 text-gray-500 italic text-xs text-center py-4">No Disciplines learned.</div>';
        return;
    }

    learned.forEach(([name, val]) => {
        // Normalize lookup
        const cleanName = name.trim();
        let data = safeData[cleanName];
        
        // Case-insensitive fallback
        if (!data) {
             const key = Object.keys(safeData).find(k => k.toLowerCase() === cleanName.toLowerCase());
             if(key) data = safeData[key];
        }

        const discBlock = document.createElement('div');
        discBlock.className = 'bg-black/40 border border-[#333] p-3 rounded flex flex-col h-fit';
        
        // Header (Name + Dots)
        discBlock.innerHTML = `
            <div class="flex justify-between items-center border-b border-[#555] pb-2 mb-2">
                <h3 class="text-base text-[#d4af37] font-cinzel font-bold uppercase tracking-widest truncate mr-2">${name}</h3>
                <div class="text-white font-bold text-xs bg-[#8b0000] px-2 py-0.5 rounded flex-shrink-0">${val} Dots</div>
            </div>
        `;

        // Powers List
        if (data) {
            const listContainer = document.createElement('div');
            listContainer.className = "space-y-1";

            for (let i = 1; i <= val; i++) {
                const power = data[i];
                if (power) {
                    const pDiv = document.createElement('div');
                    pDiv.className = 'border border-[#333] bg-[#111] rounded overflow-hidden';
                    
                    // Power Header (Always Visible)
                    const pHeader = document.createElement('div');
                    pHeader.className = "flex justify-between items-center p-2 cursor-pointer hover:bg-[#222] transition-colors";
                    
                    // Roll Button Logic
                    let rollHtml = '';
                    if (power.roll) {
                         const poolStr = JSON.stringify(power.roll.pool).replace(/"/g, "'");
                         // Note: e.stopPropagation() is crucial here so clicking roll doesn't toggle accordion
                         rollHtml = `<button onclick="event.stopPropagation(); window.rollDiscipline('${power.name}', ${poolStr}, ${power.roll.defaultDiff})" class="bg-[#333] border border-gray-600 text-gray-300 hover:text-white hover:border-[#d4af37] text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider transition-all shadow-sm hover:shadow-gold flex-shrink-0 ml-2"><i class="fas fa-dice-d20"></i></button>`;
                    }

                    pHeader.innerHTML = `
                        <div class="flex items-center gap-2 overflow-hidden">
                            <i class="fas fa-chevron-right text-[9px] text-gray-500 transition-transform duration-200 chevron"></i>
                            <div class="font-bold text-white text-xs truncate">
                                <span class="text-[#8b0000] text-[10px] mr-1">●${i}</span> ${power.name}
                            </div>
                        </div>
                        ${rollHtml}
                    `;

                    // Power Details (Hidden by Default)
                    const pDetails = document.createElement('div');
                    pDetails.className = "hidden p-2 border-t border-[#333] bg-black/50 text-[10px]";
                    pDetails.innerHTML = `
                        <div class="text-gray-300 italic leading-snug mb-2">${power.desc}</div>
                        <div class="text-gray-500 font-mono"><span class="text-[#d4af37] font-bold">System:</span> ${power.system}</div>
                    `;

                    // Toggle Logic
                    pHeader.onclick = () => {
                        const isHidden = pDetails.classList.contains('hidden');
                        if (isHidden) {
                            pDetails.classList.remove('hidden');
                            pHeader.querySelector('.chevron').classList.add('rotate-90');
                            pHeader.querySelector('.chevron').classList.replace('text-gray-500', 'text-gold');
                        } else {
                            pDetails.classList.add('hidden');
                            pHeader.querySelector('.chevron').classList.remove('rotate-90');
                            pHeader.querySelector('.chevron').classList.replace('text-gold', 'text-gray-500');
                        }
                    };

                    pDiv.appendChild(pHeader);
                    pDiv.appendChild(pDetails);
                    listContainer.appendChild(pDiv);
                }
            }
            discBlock.appendChild(listContainer);
        } else {
            discBlock.innerHTML += `<div class="text-xs text-gray-500 italic">Detailed data not available.</div>`;
        }
        
        container.appendChild(discBlock);
    });
}

// --- NPC TAB RENDERER (Was Retainers) ---

export function renderNpcTab() {
    const container = document.getElementById('play-mode-6');
    if (!container) return;
    
    // Ensure data exists
    const retainers = window.state.retainers || [];

    let html = `
        <div class="max-w-3xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-serif text-red-500">NPCs & Retainers</h2>
                <button onclick="window.openNpcCreator('ghoul')" class="bg-red-900 hover:bg-red-800 text-white px-4 py-2 rounded text-sm flex items-center gap-2">
                    <span>+</span> Add NPC
                </button>
            </div>
    `;

    if (retainers.length === 0) {
        html += `
            <div class="text-center p-8 border border-dashed border-gray-700 rounded bg-gray-900/50">
                <p class="text-gray-400 mb-4">You have no recorded NPCs or Retainers.</p>
                <button onclick="window.openNpcCreator('ghoul')" class="text-red-400 hover:text-red-300 underline">Add one now</button>
            </div>
        </div>`;
        container.innerHTML = html;
        return;
    }

    html += `<div class="grid grid-cols-1 gap-4">`;

    retainers.forEach((npc, index) => {
        // Safely handle potentially missing fields
        const name = npc.name || "Unnamed";
        
        let displayType = "Unknown";
        if (npc.template === 'animal') {
            displayType = npc.ghouled ? "Ghouled Animal" : "Animal";
            if (npc.species) displayType += ` (${npc.species})`;
        } else if (npc.template === 'mortal') {
            displayType = "Mortal";
        } else {
            // Default/Ghoul
            displayType = npc.type || "Ghoul";
        }
        
        const concept = npc.concept || "";
        
        // Removed Quick stats for summary per user request
        
        html += `
            <div class="bg-gray-900 border border-gray-700 rounded p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-red-900/50 transition-colors">
                <div class="flex-grow">
                    <h3 class="text-xl font-bold text-gray-200">${name} <span class="text-xs text-gray-500 font-normal ml-2 uppercase tracking-wider border border-gray-700 px-1 rounded">${displayType}</span></h3>
                    <div class="text-sm text-gray-400 mt-1 flex flex-wrap gap-4">
                        <span>Concept: <span class="text-gray-300">${concept || 'N/A'}</span></span>
                    </div>
                </div>
                
                <div class="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button onclick="window.viewNpc(${index})" 
                        class="flex-1 md:flex-none bg-blue-900/40 hover:bg-blue-900/60 text-blue-200 border border-blue-800 px-3 py-1 rounded text-sm font-bold">
                        <i class="fas fa-eye mr-1"></i> View Sheet
                    </button>
                    <button onclick="window.editNpc(${index})" 
                        class="flex-1 md:flex-none bg-yellow-900/40 hover:bg-yellow-900/60 text-yellow-200 border border-yellow-700 px-3 py-1 rounded text-sm font-bold">
                        <i class="fas fa-edit mr-1"></i> Edit
                    </button>
                    <button onclick="window.deleteNpc(${index})" 
                        class="flex-1 md:flex-none bg-red-900/20 hover:bg-red-900/50 text-red-500 border border-red-900/30 px-3 py-1 rounded text-sm" title="Delete">
                        &times;
                    </button>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}
window.renderNpcTab = renderNpcTab; // Assign to window for call by changeStep
// Backwards compatibility alias if needed by other modules
window.renderRetainersTab = renderNpcTab; 

// --- NPC HELPERS ---
window.editNpc = function(index) {
    if (window.state.retainers && window.state.retainers[index]) {
        // Pass the actual object and the index
        // Default to 'ghoul' template if not specified (backward compatibility)
        const npc = window.state.retainers[index];
        const type = npc.template || 'ghoul';
        if(window.openNpcCreator) window.openNpcCreator(type, npc, index);
    }
};
// Backward compat alias
window.editRetainer = window.editNpc;

window.viewNpc = function(index) {
    if (window.state.retainers && window.state.retainers[index]) {
        const npc = window.state.retainers[index];
        if(window.openNpcSheet) window.openNpcSheet(npc, index);
        else console.error("openNpcSheet not found on window object.");
    }
}

window.deleteNpc = function(index) {
    if(confirm("Permanently release this NPC? This cannot be undone.")) {
        if(window.state.retainers) {
            window.state.retainers.splice(index, 1);
            // Re-render
            renderNpcTab();
            // Trigger auto-save if available
            if(window.performSave) window.performSave(true); 
        }
    }
};
// Backward compat alias
window.deleteRetainer = window.deleteNpc;

// --- PRINT SHEET RENDERER ---

export function renderPrintSheet() {
    if (!window.state) return;
    
    // Refresh Movement if in Play Mode
    if (window.state.isPlayMode) renderMovementSection();

    // 1. Header Fields
    const map = {
        'c-name': 'pr-name', 'c-nature': 'pr-nature', 'c-clan': 'pr-clan',
        'c-player': 'pr-player', 'c-demeanor': 'pr-demeanor', 'c-gen': 'pr-gen',
        'c-chronicle': 'pr-chronicle', 'c-concept': 'pr-concept', 'c-sire': 'pr-sire'
    };
    for (const [src, dest] of Object.entries(map)) {
        const val = window.state.textFields[src] || "";
        const el = document.getElementById(dest);
        if (el) el.innerText = val;
    }

    // 2. Attributes
    ['Physical', 'Social', 'Mental'].forEach(cat => {
        let destId = "";
        if(cat === 'Physical') destId = 'pr-attr-phys';
        if(cat === 'Social') destId = 'pr-attr-soc';
        if(cat === 'Mental') destId = 'pr-attr-men';
        
        const container = document.getElementById(destId);
        if (container) {
            // Preserve Header (h4), clear rows
            const header = container.querySelector('h4');
            container.innerHTML = '';
            if(header) container.appendChild(header);

            ATTRIBUTES[cat].forEach(attr => {
                const val = window.state.dots.attr[attr] || 1;
                const row = document.createElement('div');
                row.className = "flex justify-between border-b border-black text-xs mb-1";
                row.innerHTML = `<span class="font-bold uppercase">${attr}</span><span>${renderDots(val, 5)}</span>`; 
                container.appendChild(row);
            });
        }
    });

    // 3. Abilities
    ['Talents', 'Skills', 'Knowledges'].forEach(cat => {
        let destId = "";
        if(cat === 'Talents') destId = 'pr-abil-tal';
        if(cat === 'Skills') destId = 'pr-abil-ski';
        if(cat === 'Knowledges') destId = 'pr-abil-kno';

        const container = document.getElementById(destId);
        if (container) {
            const header = container.querySelector('h4');
            container.innerHTML = '';
            if(header) container.appendChild(header);

            ABILITIES[cat].forEach(abil => {
                const val = window.state.dots.abil[abil] || 0;
                const row = document.createElement('div');
                row.className = "flex justify-between border-b border-black text-xs mb-1";
                row.innerHTML = `<span class="font-bold uppercase">${abil}</span><span>${renderDots(val, 5)}</span>`;
                container.appendChild(row);
            });
            
            // Custom Abilities
            if(window.state.customAbilityCategories) {
                Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => {
                    if (c === cat) {
                        const val = window.state.dots.abil[name] || 0;
                        const row = document.createElement('div');
                        row.className = "flex justify-between border-b border-black text-xs mb-1";
                        row.innerHTML = `<span class="font-bold uppercase text-gray-700">${name}</span><span>${renderDots(val, 5)}</span>`;
                        container.appendChild(row);
                    }
                });
            }
        }
    });

    // 4. Advantages (Disciplines, Backgrounds)
    const renderAdvSection = (src, destId, max = 5) => {
        const container = document.getElementById(destId);
        if (container) {
            container.innerHTML = '';
            Object.entries(src).forEach(([name, val]) => {
                if(val > 0) { // Only print dots > 0
                    const row = document.createElement('div');
                    row.className = "flex justify-between border-b border-black text-xs mb-1";
                    row.innerHTML = `<span class="font-bold uppercase">${name}</span><span>${renderDots(val, max)}</span>`;
                    container.appendChild(row);
                }
            });
        }
    };
    renderAdvSection(window.state.dots.disc, 'pr-disc-list');
    renderAdvSection(window.state.dots.back, 'pr-back-list');

    // Virtues
    const vCont = document.getElementById('pr-virt-list');
    if(vCont) {
        vCont.innerHTML = '';
        VIRTUES.forEach(v => {
            const val = window.state.dots.virt[v] || 1;
            const row = document.createElement('div');
            row.className = "flex justify-between border-b border-black text-xs mb-1";
            row.innerHTML = `<span class="font-bold uppercase">${v}</span><span>${renderDots(val, 5)}</span>`;
            vCont.appendChild(row);
        });
    }

    // 5. Merits / Flaws / Other Traits
    const mfCont = document.getElementById('pr-merits-flaws');
    if(mfCont) {
        mfCont.innerHTML = '';
        
        const renderItem = (item, type) => {
            const div = document.createElement('div');
            div.className = "mb-1";
            // Format: Name (Val pt Type): Description
            const header = document.createElement('span');
            header.className = "font-bold";
            header.innerText = `${item.name} (${item.val} pt ${type})`;
            
            div.appendChild(header);
            
            if (item.desc) {
                const descSpan = document.createElement('span');
                descSpan.className = "italic ml-1";
                descSpan.innerText = `- ${item.desc}`;
                div.appendChild(descSpan);
            }
            mfCont.appendChild(div);
        };

        (window.state.merits || []).forEach(m => renderItem(m, 'Merit'));
        (window.state.flaws || []).forEach(f => renderItem(f, 'Flaw'));
    }
    
    const otCont = document.getElementById('pr-other-traits');
    if(otCont) {
        otCont.innerHTML = '';
        Object.entries(window.state.dots.other || {}).forEach(([k,v]) => {
            if(v > 0) {
                 const row = document.createElement('div');
                 row.className = "flex justify-between border-b border-black text-xs mb-1";
                 row.innerHTML = `<span>${k}</span><span>${renderDots(v,5)}</span>`;
                 otCont.appendChild(row);
            }
        });
    }

    // 6. Humanity / Willpower / Blood
    const hCont = document.getElementById('pr-humanity');
    const bName = document.getElementById('pr-bearing');
    if(hCont) {
        // Calculate humanity if not set, or use stored
        const baseH = (window.state.dots.virt?.Conscience || 1) + (window.state.dots.virt?.["Self-Control"] || 1);
        const currentH = window.state.status.humanity !== undefined ? window.state.status.humanity : baseH;
        hCont.innerHTML = renderDots(currentH, 10);
    }
    if(bName) bName.innerText = `${window.state.textFields['c-bearing-name']||''} (${window.state.textFields['c-bearing-value']||''})`;

    const wDots = document.getElementById('pr-willpower-dots');
    const wBox = document.getElementById('pr-willpower-boxes');
    if(wDots) {
        const baseW = window.state.dots.virt?.Courage || 1;
        const currentW = window.state.status.willpower !== undefined ? window.state.status.willpower : baseW;
        wDots.innerHTML = renderDots(currentW, 10);
    }
    if(wBox) {
        let html = '';
        // Temp willpower boxes
        const temp = window.state.status.tempWillpower !== undefined ? window.state.status.tempWillpower : 5;
        for(let i=0; i<10; i++) {
             html += `<span class="box ${i < temp ? 'checked' : ''}"></span>`;
        }
        wBox.innerHTML = html;
    }

    const bBox = document.getElementById('pr-blood-boxes');
    if(bBox) {
        // Max blood based on Gen
        const gen = 13 - (window.state.dots.back['Generation']||0);
        // Simple approximation or use Rules
        let html = '';
        const currentB = window.state.status.blood || 0;
        for(let i=0; i<20; i++) { // Max 20 boxes on sheet usually
             html += `<span class="box ${i < currentB ? 'checked' : ''}"></span>`;
        }
        bBox.innerHTML = html;
    }

    // 7. Health
    const healthCont = document.getElementById('pr-health');
    if(healthCont) {
        healthCont.innerHTML = '';
        const levels = ['Bruised', 'Hurt -1', 'Injured -1', 'Wounded -2', 'Mauled -2', 'Crippled -5', 'Incapacitated'];
        levels.forEach((l, i) => {
            const state = (window.state.status.health_states && window.state.status.health_states[i]) || 0;
            const row = document.createElement('div');
            row.className = "flex justify-between items-center border-b border-black";
            row.innerHTML = `<span>${l}</span><span class="box" data-state="${state}"></span>`;
            healthCont.appendChild(row);
        });
    }

    // 8. Combat & Inventory
    const combatTbl = document.getElementById('pr-combat-table');
    if (combatTbl) {
        // Use a single string buffer to construct the innerHTML
        let tblHTML = '';
        
        // Add Maneuvers (Extended V20 List)
        const manuevers = [
            {n: 'Bite', d: 6, dmg: 'Str+1 (A)'},
            {n: 'Block', d: 6, dmg: 'None (R)'},
            {n: 'Claw', d: 6, dmg: 'Str+1 (A)'},
            {n: 'Clinch', d: 6, dmg: 'Str (B)'},
            {n: 'Disarm', d: 7, dmg: 'Special'},
            {n: 'Dodge', d: 6, dmg: 'None (R)'},
            {n: 'Hold', d: 6, dmg: 'None (C)'},
            {n: 'Kick', d: 7, dmg: 'Str+1 (B)'},
            {n: 'Parry', d: 6, dmg: 'None (R)'},
            {n: 'Strike', d: 6, dmg: 'Str (B)'},
            {n: 'Sweep', d: 7, dmg: 'Str (K)'},
            {n: 'Tackle', d: 7, dmg: 'Str+1 (K)'},
            {n: 'Weapon Str.', d: 6, dmg: 'Weapon'}
        ];
        manuevers.forEach(m => {
            tblHTML += `<tr><td class="py-1 border-b border-gray-300 font-bold">${m.n}</td><td class="border-b border-gray-300">${m.d}</td><td class="border-b border-gray-300">${m.dmg}</td></tr>`;
        });
        
        // Add Weapons from Inventory
        if(window.state.inventory && Array.isArray(window.state.inventory)) {
            window.state.inventory.filter(i => i.type === 'Weapon' && i.status === 'carried').forEach(w => {
                const name = w.displayName || w.name;
                const stats = w.stats || {};
                tblHTML += `<tr><td class="py-1 border-b border-gray-300 font-bold italic">${name}</td><td class="border-b border-gray-300">${stats.diff||6}</td><td class="border-b border-gray-300">${stats.dmg||'-'}</td></tr>`;
            });
        }
        
        combatTbl.innerHTML = tblHTML;
    }

    // Armor Info
    const armorInfo = document.getElementById('pr-armor-info');
    if (armorInfo) {
        let armorHTML = "None";
        if (window.state.inventory && Array.isArray(window.state.inventory)) {
            const armors = window.state.inventory.filter(i => i.type === 'Armor' && i.status === 'carried');
            if (armors.length > 0) {
                const names = armors.map(a => a.name).join(', ');
                const rating = armors.reduce((a, b) => a + (parseInt(b.stats?.rating)||0), 0);
                const penalty = armors.reduce((a, b) => a + (parseInt(b.stats?.penalty)||0), 0);
                armorHTML = `<strong>Worn:</strong> ${names}<br><strong>Rating:</strong> ${rating} | <strong>Penalty:</strong> ${penalty}`;
            }
        }
        armorInfo.innerHTML = armorHTML;
    }

    // Gear Lists
    const gearCarried = document.getElementById('pr-gear-carried');
    const gearOwned = document.getElementById('pr-gear-owned');
    const vehicles = document.getElementById('pr-vehicles');
    
    if (window.state.inventory && Array.isArray(window.state.inventory)) {
        if (gearCarried) gearCarried.innerHTML = window.state.inventory.filter(i => i.status === 'carried' && i.type !== 'Vehicle' && i.type !== 'Armor' && i.type !== 'Weapon').map(i => i.name).join(', ');
        if (gearOwned) gearOwned.innerHTML = window.state.inventory.filter(i => i.status === 'owned' && i.type !== 'Vehicle').map(i => i.name).join(', ');
        if (vehicles) vehicles.innerHTML = window.state.inventory.filter(i => i.type === 'Vehicle').map(i => `${i.name} (Safe:${i.stats?.safe} Max:${i.stats?.max})`).join('<br>');
    }

    // --- NEW: Update Edit Mode (Phase 6) Combat/Armor ---
    const armorRatingEl = document.getElementById('total-armor-rating');
    const armorPenaltyEl = document.getElementById('total-armor-penalty');
    const armorNamesEl = document.getElementById('active-armor-names');
    const combatListEl = document.getElementById('combat-list-create');

    // 1. Calculate Armor for Edit Mode
    if (window.state.inventory && Array.isArray(window.state.inventory)) {
        const armors = window.state.inventory.filter(i => i.type === 'Armor' && i.status === 'carried');
        let totalR = 0, totalP = 0, names = [];
        armors.forEach(a => {
            totalR += parseInt(a.stats?.rating) || 0;
            totalP += parseInt(a.stats?.penalty) || 0;
            names.push(a.displayName || a.name);
        });
        if (armorRatingEl) armorRatingEl.innerText = totalR;
        if (armorPenaltyEl) armorPenaltyEl.innerText = totalP;
        if (armorNamesEl) armorNamesEl.innerText = names.length > 0 ? names.join(', ') : "None";
    }

    // 2. Full Update of Edit Mode Combat List
    if (combatListEl) {
        // Get the parent container (the column flex container)
        const combatContainer = combatListEl.parentElement;
        if (combatContainer) {
            // Rebuild the ENTIRE content of the parent to replace hardcoded items
            let html = `
                <div class="grid grid-cols-7 gap-1 text-[9px] uppercase text-gray-400 font-bold border-b border-[#555] pb-1 mb-2 text-center">
                    <div class="col-span-2 text-left pl-2">Attack</div>
                    <div>Diff</div>
                    <div>Dmg</div>
                    <div>Rng</div>
                    <div>Rate</div>
                    <div>Clip</div>
                </div>
            `;

            // Standard V20 Maneuvers (Same list as Play Mode)
            const standards = [
                {n:'Bite', diff:6, dmg:'Str+1(A)', rng:'-', rate:'-', clip:'-'},
                {n:'Block', diff:6, dmg:'None (R)', rng:'-', rate:'-', clip:'-'},
                {n:'Claw', diff:6, dmg:'Str+1(A)', rng:'-', rate:'-', clip:'-'},
                {n:'Clinch', diff:6, dmg:'Str(C)', rng:'-', rate:'-', clip:'-'},
                {n:'Disarm', diff:7, dmg:'Special', rng:'-', rate:'-', clip:'-'},
                {n:'Dodge', diff:6, dmg:'None (R)', rng:'-', rate:'-', clip:'-'},
                {n:'Hold', diff:6, dmg:'None (C)', rng:'-', rate:'-', clip:'-'},
                {n:'Kick', diff:7, dmg:'Str+1', rng:'-', rate:'-', clip:'-'},
                {n:'Parry', diff:6, dmg:'None (R)', rng:'-', rate:'-', clip:'-'},
                {n:'Strike', diff:6, dmg:'Str', rng:'-', rate:'-', clip:'-'},
                {n:'Sweep', diff:7, dmg:'Str(K)', rng:'-', rate:'-', clip:'-'},
                {n:'Tackle', diff:7, dmg:'Str+1(K)', rng:'-', rate:'-', clip:'-'},
                {n:'Weapon Strike', diff:6, dmg:'Weapon', rng:'-', rate:'-', clip:'-'},
                {n:'Auto Fire', diff:8, dmg:'Special', rng:'-', rate:'-', clip:'-'},
                {n:'Multi Shot', diff:6, dmg:'Weapon', rng:'-', rate:'-', clip:'-'},
                {n:'Strafing', diff:8, dmg:'Special', rng:'-', rate:'-', clip:'-'},
                {n:'3-Rnd Burst', diff:7, dmg:'Weapon', rng:'-', rate:'-', clip:'-'},
                {n:'Two Weapons', diff:7, dmg:'Weapon', rng:'-', rate:'-', clip:'-'}
            ];

            standards.forEach(s => {
                html += `
                    <div class="grid grid-cols-7 gap-1 text-[9px] border-b border-[#222] py-1 text-center text-gray-500 hover:bg-[#1a1a1a]">
                        <div class="col-span-2 text-left pl-2 font-bold text-white">${s.n}</div>
                        <div>${s.diff}</div>
                        <div>${s.dmg}</div>
                        <div>${s.rng}</div>
                        <div>${s.rate}</div>
                        <div>${s.clip}</div>
                    </div>
                `;
            });

            // Add Equipped Weapons
            if (window.state.inventory && Array.isArray(window.state.inventory)) {
                window.state.inventory.filter(i => i.type === 'Weapon' && i.status === 'carried').forEach(w => {
                    const name = w.displayName || w.name;
                    html += `
                        <div class="grid grid-cols-7 gap-1 text-[9px] border-b border-[#222] py-1 text-center text-gray-500 hover:bg-[#1a1a1a]">
                            <div class="col-span-2 text-left pl-2 font-bold text-gold truncate" title="${name}">${name}</div>
                            <div>${w.stats.diff || 6}</div>
                            <div>${w.stats.dmg || '-'}</div>
                            <div>${w.stats.range || '-'}</div>
                            <div>${w.stats.rate || '-'}</div>
                            <div>${w.stats.clip || '-'}</div>
                        </div>
                    `;
                });
            }

            // Restore the empty container div for future use (though we are overwriting parent)
            html += '<div id="combat-list-create" class="space-y-1 mt-2"></div>';
            
            combatContainer.innerHTML = html;
        }
    }

    // 9. Expanded Backgrounds & Havens
    const bgDetails = document.getElementById('pr-background-details');
    if (bgDetails) {
        bgDetails.innerHTML = '';
        Object.keys(window.state.dots.back).forEach(bgName => {
            if(window.state.dots.back[bgName] > 0) {
                const safeId = 'desc-' + bgName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                const txt = window.state.textFields[safeId] || "";
                if(txt) {
                    bgDetails.innerHTML += `<div><strong>${bgName}:</strong> ${txt}</div>`;
                }
            }
        });
    }

    const havens = document.getElementById('pr-havens');
    if(havens && window.state.havens) {
        havens.innerHTML = window.state.havens.map(h => `<div><strong>${h.name}</strong> (${h.loc}): ${h.desc}</div>`).join('');
    }

    const bonds = document.getElementById('pr-blood-bonds');
    if(bonds && window.state.bloodBonds) {
        bonds.innerHTML = window.state.bloodBonds.map(b => `<div><strong>${b.type}:</strong> ${b.name} (${b.rating})</div>`).join('');
    }

    // 10. Bio / Psychology
    const appearance = document.getElementById('pr-appearance');
    if(appearance) appearance.innerText = document.getElementById('bio-desc')?.value || "";

    const derangements = document.getElementById('pr-derangements');
    if(derangements && window.state.derangements) derangements.innerText = window.state.derangements.join(', ');

    const langs = document.getElementById('pr-languages');
    if(langs) langs.innerText = document.getElementById('bio-languages')?.value || "";

    const gst = document.getElementById('pr-goals-st');
    if(gst) gst.innerText = document.getElementById('bio-goals-st')?.value || "";

    const glt = document.getElementById('pr-goals-lt');
    if(glt) glt.innerText = document.getElementById('bio-goals-lt')?.value || "";

    const hist = document.getElementById('pr-history');
    if(hist) hist.innerText = document.getElementById('char-history')?.value || "";
}
window.renderPrintSheet = renderPrintSheet;

// --- UNSAVED CHANGES PROTECTION ---
window.addEventListener('beforeunload', (e) => {
    // Only warn if a character name exists (implies work has been done)
    const name = window.state?.textFields?.['c-name'];
    if (name) {
        e.preventDefault();
        e.returnValue = ''; // Legacy support for Chrome
        return "Unsaved changes may be lost.";
    }
});

// ==========================================
// --- WALKTHROUGH / GUIDE SYSTEM ---
// ==========================================

const STEP_FOUR_TEXT = `
    <p>Advantages make the vampire a contender in the hierarchy of the night.</p>
    
    <h4 class="text-gold mt-2 font-bold uppercase">Disciplines (3 Dots)</h4>
    <p>Each character begins with <strong>3 dots</strong> of Disciplines. These must be from your Clan Disciplines (unless Caitiff). You may spend all three on one, or spread them out.</p>
    
    <h4 class="text-gold mt-2 font-bold uppercase">Backgrounds (5 Dots)</h4>
    <p>A starting character has <strong>5 dots</strong> worth of Backgrounds to distribute at your discretion.</p>
    <p class="mt-2 text-sm italic">Optional: At Storyteller discretion, Sabbat vampires may take 4 dots in Disciplines instead of Backgrounds.</p>
    
    <h4 class="text-gold mt-2 font-bold uppercase">Virtues (7 Dots)</h4>
    <p>Virtues determine how well the character resists the Beast. Every character starts with 1 dot in Conscience and Self-Control (or Conviction/Instinct for Sabbat).</p>
    <p>You have <strong>7 additional dots</strong> to distribute.</p>
    <ul class="list-disc pl-4 mt-1 text-[11px]">
        <li><strong>Conscience/Conviction:</strong> Sense of right/wrong.</li>
        <li><strong>Self-Control/Instinct:</strong> Composure and hunger resistance.</li>
        <li><strong>Courage:</strong> Gumption and resistance to fear (Rötschreck).</li>
    </ul>
`;

const GUIDE_TEXT = {
    1: { // Phase 1: Concept
        title: "Step One: Character Concept",
        body: `
            <p>Concept is the birthing chamber for who a character will become. It only needs to be a general idea — brute; slick mobster; manic Malkavian kidnapper — but it should be enough to ignite your imagination.</p>
            <p>This stage involves the selection of the character’s concept, Clan, Nature, and Demeanor.</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Concept</h4>
            <p>Refers to who the character was before becoming a vampire. Echoes of their mortal lives are all that stand between many Kindred and madness.</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Clan</h4>
            <p>A character’s Clan is her vampire “family.” Vampires are always of the same Clan as their sires. If you wish to be clanless, write “Caitiff”.</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Nature & Demeanor</h4>
            <ul class="list-disc pl-4 mt-1">
                <li><strong>Demeanor:</strong> The mask worn for the world. The attitude adopted most often.</li>
                <li><strong>Nature:</strong> The character's true self. Used to regain Willpower points.</li>
            </ul>
        `
    },
    2: { // Phase 2: Attributes
        title: "Step Two: Select Attributes",
        body: `
            <p>Attributes are the natural abilities and raw capabilities a character is made of. All Vampire characters have nine Attributes divided into Physical, Social, and Mental.</p>
            <p>First, prioritize your categories:</p>
            <ul class="list-disc pl-4 mt-1">
                <li><strong>Primary:</strong> 7 dots</li>
                <li><strong>Secondary:</strong> 5 dots</li>
                <li><strong>Tertiary:</strong> 3 dots</li>
            </ul>
            <p class="mt-2 text-sm italic">Note: All characters start with one dot in each Attribute automatically (except Nosferatu Appearance).</p>
        `
    },
    3: { // Phase 3: Abilities
        title: "Step Three: Select Abilities",
        body: `
            <p>Abilities are divided into Talents (intuitive), Skills (trained), and Knowledges (academic).</p>
            <p>Prioritize your categories:</p>
            <ul class="list-disc pl-4 mt-1">
                <li><strong>Primary:</strong> 13 dots</li>
                <li><strong>Secondary:</strong> 9 dots</li>
                <li><strong>Tertiary:</strong> 5 dots</li>
            </ul>
            <p class="mt-2 text-sm italic">Note: No Ability may be purchased above 3 dots during this stage. You may raise them higher with freebie points later.</p>
        `
    },
    4: { // Phase 4: Advantages (Disciplines, Backgrounds, Virtues)
        title: "Step Four: Select Advantages",
        body: STEP_FOUR_TEXT
    },
    5: { // Phase 5: Last Touches (Currently mapped to Step 4 logic in Guide for safety if app steps through)
        title: "Step Four: Select Advantages",
        body: STEP_FOUR_TEXT
    },
    6: { // Phase 6: Last Touches (Real Step 5)
        title: "Step Five: Last Touches",
        body: `
            <h4 class="text-gold mt-2 font-bold uppercase">Calculated Traits</h4>
            <ul class="list-disc pl-4 mt-1">
                <li><strong>Humanity:</strong> Conscience + Self-Control (5-10).</li>
                <li><strong>Willpower:</strong> Equals Courage rating (1-5).</li>
                <li><strong>Blood Pool:</strong> Determined by generation (roll d10 for starting pool).</li>
            </ul>
        `
    },
    7: { // Phase 7: Freebies (Real Step 5 part 2)
        title: "Step Five: Freebie Points",
        body: `
            <p>The player may spend <strong>15 freebie points</strong> to purchase additional dots.</p>
            <p>You may also take up to 7 points of Flaws to gain more freebie points.</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Spark of Life</h4>
            <p>Breathe life into the traits! Why does she have Appearance 3? Did she want to be a movie star? Is her Ally an ex-lover? Make your character unique, fascinating, and passionate.</p>
        `
    },
    8: { // Phase 8: Backup for Freebies if app iterates
        title: "Step Five: Freebie Points",
        body: `
            <p>The player may spend <strong>15 freebie points</strong> to purchase additional dots.</p>
            <p>You may also take up to 7 points of Flaws to gain more freebie points.</p>
        `
    }
};

function createWalkthroughButton() {
    if (document.getElementById('walkthrough-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'walkthrough-btn';
    btn.className = "fixed bottom-5 left-5 z-[100] w-10 h-10 rounded-full bg-[#333] border border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-black transition-all flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.8)]";
    btn.innerHTML = '<i class="fas fa-question text-lg"></i>';
    btn.title = "Character Creation Walkthrough";
    btn.onclick = window.toggleWalkthrough;
    document.body.appendChild(btn);
}

function createWalkthroughModal() {
    if (document.getElementById('walkthrough-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'walkthrough-modal';
    modal.className = "fixed inset-0 bg-black/80 z-[101] hidden flex items-center justify-center p-4 backdrop-blur-sm";
    
    modal.innerHTML = `
        <div class="bg-[#1a1a1a] border-2 border-[#d4af37] rounded-lg max-w-lg w-full max-h-[80vh] flex flex-col shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <div class="p-3 border-b border-[#333] flex justify-between items-center bg-[#111]">
                <h3 id="wt-title" class="text-gold font-serif font-bold text-lg uppercase tracking-wider">Walkthrough</h3>
                <button onclick="window.toggleWalkthrough()" class="text-gray-400 hover:text-white text-xl">&times;</button>
            </div>
            <div id="wt-body" class="p-5 overflow-y-auto text-gray-300 text-sm leading-relaxed flex-1 font-serif">
                <!-- Content goes here -->
            </div>
            <div class="p-3 border-t border-[#333] bg-[#111] flex justify-between items-center">
                <span class="text-[10px] text-gray-500 italic">V20 Core Rules</span>
                <button onclick="window.toggleWalkthrough()" class="px-4 py-1 bg-[#8b0000] hover:bg-red-700 text-white text-xs font-bold rounded uppercase">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function renderWalkthroughModalContent() {
    const titleEl = document.getElementById('wt-title');
    const bodyEl = document.getElementById('wt-body');
    if (!titleEl || !bodyEl) return;

    // Determine current phase
    const phase = window.state.currentPhase || 1;
    // Fallback to Phase 4 if active phase is mapped to empty/undefined, 
    // ensuring Advantages text shows if sub-phases are technically active
    const data = GUIDE_TEXT[phase] || GUIDE_TEXT[1];

    titleEl.innerText = data.title;
    bodyEl.innerHTML = data.body;
}

window.toggleWalkthrough = function() {
    createWalkthroughModal(); // Ensure it exists
    const modal = document.getElementById('walkthrough-modal');
    const isHidden = modal.classList.contains('hidden');
    
    if (isHidden) {
        renderWalkthroughModalContent();
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
};

// Initialize the button on load
document.addEventListener('DOMContentLoaded', () => {
    createWalkthroughButton();
});
