import { 
    ATTRIBUTES, ABILITIES, VIRTUES, BACKGROUNDS, 
    STEPS_CONFIG, DERANGEMENTS, VIT, CLAN_WEAKNESSES, 
    SPECIALTY_EXAMPLES, HEALTH_STATES, V20_WEAPONS_LIST, V20_ARMOR_LIST
} from "./data.js";

import { checkStepComplete } from "./v20-rules.js";

import { 
    renderDots, renderBoxes, setSafeText, 
    renderInventoryList, showNotification 
} from "./ui-common.js";

import { 
    updatePools, renderRow, setDots, rollCombat, rollFrenzy, rollRotschreck
} from "./ui-mechanics.js";

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
    const buildRow = (name = "") => {
        const row = document.createElement('div'); 
        row.className = 'flex items-center justify-between gap-1 mb-2 advantage-row w-full';
        
        let inputField;
        const isLocked = !window.state.freebieMode && !window.state.xpMode && !!name; 
        
        if (isAbil) { 
            inputField = document.createElement('input'); 
            inputField.type = 'text'; 
            inputField.placeholder = "Write-in..."; 
            inputField.className = 'font-bold uppercase !bg-black/20 !border-b !border-[#333] text-[11px] w-24 flex-shrink-0'; 
            inputField.value = name;
            inputField.disabled = isLocked;
        } else { 
            inputField = document.createElement('select'); 
            inputField.className = 'font-bold uppercase text-[11px] w-24 flex-shrink-0'; 
            inputField.innerHTML = `<option value="">-- Choose ${type} --</option>` + list.map(item => `<option value="${item}" ${item === name ? 'selected' : ''}>${item}</option>`).join(''); 
            inputField.disabled = isLocked;
             if (name && list.includes(name)) inputField.value = name;
             else if (name) {
                 const opt = document.createElement('option');
                 opt.value = name;
                 opt.innerText = name;
                 opt.selected = true;
                 inputField.add(opt);
             }
        }

        let showSpecialty = false;
        if (name && (isAbil || type === 'attr')) { 
             const currentVal = window.state.dots[type][name] || 0;
             if (currentVal >= 1) showSpecialty = true;
        }

        const specWrapper = document.createElement('div');
        specWrapper.className = 'flex-1 mx-2 relative'; 
        
        if (showSpecialty) {
             const specVal = window.state.specialties[name] || "";
             if (window.state.isPlayMode && !specVal) specWrapper.innerHTML = ''; 
             else {
                 const listId = `list-${name.replace(/[^a-zA-Z0-9]/g, '')}`;
                 let optionsHTML = '';
                 if (SPECIALTY_EXAMPLES[name]) optionsHTML = SPECIALTY_EXAMPLES[name].map(s => `<option value="${s}">`).join('');
                 specWrapper.innerHTML = `<input type="text" list="${listId}" class="specialty-input w-full text-[10px] italic bg-transparent border-b border-gray-700 text-[#d4af37] text-center" placeholder="Specialty..." value="${specVal}"><datalist id="${listId}">${optionsHTML}</datalist>`;
                 const inp = specWrapper.querySelector('input');
                 inp.onblur = (e) => { window.state.specialties[name] = e.target.value; renderPrintSheet(); };
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
                if (type === 'disc') { baseCost = 10; costType = 'New Discipline'; }
                else if (isAbil) { baseCost = 3; costType = 'New Ability'; }
                
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
    
    const appendRow = (data = null) => {
        const row = document.createElement('div'); row.className = 'flex gap-2 items-center mb-2 trait-row';
        let options = `<option value="">-- Select ${type} --</option>`;
        list.forEach(item => { options += `<option value="${item.n}" data-val="${item.v}" data-var="${item.variable||false}">${item.n} (${item.range ? item.range + 'pt' : item.v + 'pt'})</option>`; });
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
    
    // Clear to prevent duplicate rows on load
    container.innerHTML = ''; 

    const buildRow = (data = null) => {
        const row = document.createElement('div'); 
        row.className = 'border-b border-[#222] pb-4 advantage-row';
        
        const nameVal = data ? data.name : "";
        const locVal = data ? data.loc : "";
        const descVal = data ? data.desc : "";

        row.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <input type="text" placeholder="Haven Title..." class="flex-1 text-[10px] font-bold text-gold uppercase !border-b !border-[#333]" value="${nameVal}">
                <div class="remove-btn">&times;</div>
            </div>
            <input type="text" placeholder="Location..." class="text-xs mb-2 !border-b !border-[#333]" value="${locVal}">
            <textarea class="h-16 text-xs" placeholder="Details...">${descVal}</textarea>
        `;
        
        const nameIn = row.querySelectorAll('input')[0]; 
        const locIn = row.querySelectorAll('input')[1]; 
        const descIn = row.querySelector('textarea'); 
        const del = row.querySelector('.remove-btn');
        
        if (!data) del.style.visibility = 'hidden';

        const onUpd = () => {
            window.state.havens = Array.from(container.querySelectorAll('.advantage-row')).map(r => ({ 
                name: r.querySelectorAll('input')[0].value, 
                loc: r.querySelectorAll('input')[1].value, 
                desc: r.querySelector('textarea').value 
            })).filter(h => h.name || h.loc);
            
            if (container.lastElementChild === row && nameIn.value !== "") {
                del.style.visibility = 'visible';
                renderDynamicHavenRow(); 
            }
            
            updatePools(); 
            renderPrintSheet();
        };
        
        [nameIn, locIn, descIn].forEach(el => el.onblur = onUpd); 
        
        del.onclick = () => { 
            row.remove(); 
            if(container.children.length === 0) buildRow();
            onUpd(); 
        };
        
        container.appendChild(row);
    };

    // 1. Rebuild from state
    if (window.state.havens && Array.isArray(window.state.havens)) {
        window.state.havens.forEach(h => buildRow(h));
    }
    
    // 2. Append trailing blank row
    buildRow();
}
window.renderDynamicHavenRow = renderDynamicHavenRow;

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
    
    const log = window.state.xpLog || [];
    let spentAttr = 0, spentAbil = 0, spentDisc = 0, spentVirt = 0, spentHuman = 0, spentWill = 0;
    
    log.forEach(entry => {
        if (entry.type === 'attr') spentAttr += entry.cost;
        else if (entry.type === 'abil') spentAbil += entry.cost;
        else if (entry.type === 'disc') spentDisc += entry.cost;
        else if (entry.type === 'virt') spentVirt += entry.cost;
        else if (entry.type === 'humanity' || (entry.type === 'status' && entry.trait === 'Humanity')) spentHuman += entry.cost;
        else if (entry.type === 'willpower' || (entry.type === 'status' && entry.trait === 'Willpower')) spentWill += entry.cost;
    });
    
    setSafeText('sb-xp-attr', spentAttr);
    setSafeText('sb-xp-abil', spentAbil);
    setSafeText('sb-xp-disc', spentDisc);
    setSafeText('sb-xp-virt', spentVirt);
    setSafeText('sb-xp-human', spentHuman);
    setSafeText('sb-xp-will', spentWill);
    
    const totalSpent = spentAttr + spentAbil + spentDisc + spentVirt + spentHuman + spentWill;
    setSafeText('sb-xp-spent', totalSpent);
    setSafeText('x-total-spent', totalSpent);
    
    const totalEarned = parseInt(document.getElementById('c-xp-total')?.value) || 0;
    setSafeText('sb-xp-remaining', totalEarned - totalSpent);
    
    const logDiv = document.getElementById('xp-log-recent');
    if(logDiv) {
        logDiv.innerHTML = log.slice().reverse().map(l => {
            const d = new Date(l.date).toLocaleDateString();
            return `<div>[${d}] ${l.trait} -> ${l.new} (${l.cost}xp)</div>`;
        }).join('');
    }
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
    const target = document.getElementById(prefix + s);
    if (target) { target.classList.add('active'); window.state.currentPhase = s; }
    
    // Update Nav
    const nav = document.getElementById('sheet-nav');
    if (nav) {
        nav.innerHTML = '';
        if (window.state.isPlayMode) {
             const steps = ["Sheet", "Traits", "Social", "Biography"];
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
    
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (['save-filename', 'char-select', 'roll-diff', 'use-specialty', 'c-path-name', 'c-path-name-create', 'c-bearing-name', 'c-bearing-value', 'custom-weakness-input', 'xp-points-input', 'blood-per-turn-input', 'custom-dice-input', 'spend-willpower', 'c-xp-total', 'frenzy-diff', 'rotschreck-diff', 'play-merit-notes', 'dmg-input-val', 'tray-use-armor'].includes(el.id) || el.classList.contains('merit-flaw-desc')) {
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
            if (clan === "Tremere") {
                pb.innerHTML += `<div class="text-[#a855f7] text-[9px] font-bold mb-2 uppercase border-b border-[#a855f7]/30 pb-1 italic"><i class="fas fa-flask mr-1"></i> Weakness: 1st Drink = 2 Steps</div>`;
            }

            window.state.bloodBonds.forEach(b => { const label = b.type === 'Bond' ? (b.rating == 3 ? 'Full Bond' : `Drink ${b.rating}`) : `Vinculum ${b.rating}`; pb.innerHTML += `<div class="flex justify-between border-b border-[#222] py-1 text-xs"><span>${b.name}</span><span class="text-gold font-bold">${label}</span></div>`; });
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

        if(document.getElementById('rituals-list-play')) document.getElementById('rituals-list-play').innerText = document.getElementById('rituals-list-create-ta').value;
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

// --- PRINT SHEET RENDERER ---

export function renderPrintSheet() {
    if (!window.state) return;

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
