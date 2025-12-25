import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- DATA IMPORT (V20 Rules) ---
import { 
    APP_VERSION, CLANS, ARCHETYPES, ATTRIBUTES, ABILITIES, BACKGROUNDS, DISCIPLINES, 
    VIRTUES, PATHS, VIT, HEALTH_STATES, GEN_LIMITS, SPECIALTY_EXAMPLES, DERANGEMENTS, 
    V20_MERITS_LIST, V20_FLAWS_LIST, V20_WEAPONS_LIST, V20_ARMOR_LIST, V20_VEHICLE_LIST, 
    STEPS_CONFIG 
} from "./data.js";

// --- ERROR HANDLER ---
window.onerror = function(msg, url, line) {
    const notif = document.getElementById('notification');
    if(notif) {
        notif.innerText = "ERROR: " + msg;
        notif.style.display = 'block';
        notif.style.backgroundColor = 'red';
    }
    console.error("Global Error:", msg, "Line:", line);
};

// YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyB8qLWOiC3csqPnucbj3XOtireOgPjjL_k",
  authDomain: "v20-character-creator.firebaseapp.com",
  projectId: "v20-character-creator",
  storageBucket: "v20-character-creator.firebasestorage.app",
  messagingSenderId: "110220382386",
  appId: "1:110220382386:web:81b5d203c2bc4f81f5b9ab",
  measurementId: "G-RWPX9139HB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'v20-neonate-sheet';

// --- STATE MANAGEMENT ---
window.state = {
    isPlayMode: false, freebieMode: false, activePool: [], currentPhase: 1, furthestPhase: 1,
    dots: { attr: {}, abil: {}, disc: {}, back: {}, virt: {}, other: {} },
    prios: { attr: {}, abil: {} },
    // status.health_states: Array of 7 integers. 0=Empty, 1=Bashing(/), 2=Lethal(X), 3=Aggravated(*)
    status: { humanity: 7, willpower: 5, tempWillpower: 5, health_states: [0,0,0,0,0,0,0], blood: 0 },
    specialties: {}, 
    socialExtras: {}, textFields: {}, havens: [], bloodBonds: [], vehicles: [], customAbilityCategories: {},
    derangements: [], merits: [], flaws: [], inventory: [],
    meta: { filename: "", folder: "" } 
};

let user = null;

// --- CONSTANTS FOR RULES ---
const BROAD_ABILITIES = ["Crafts", "Science"];

const setSafeText = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
function showNotification(msg) { const el = document.getElementById('notification'); if (el) { el.innerText = msg; el.style.display = 'block'; setTimeout(() => { el.style.display = 'none'; }, 4000); } }

function syncInputs() {
    document.querySelectorAll('input:not([type="checkbox"]), select, textarea').forEach(el => {
        if (el.id && !el.id.startsWith('inv-') && !el.id.startsWith('merit-') && !el.id.startsWith('flaw-') && !el.id.startsWith('save-') && !el.closest('.combat-row') && !el.classList.contains('specialty-input')) window.state.textFields[el.id] = el.value;
    });
}

function hydrateInputs() {
    Object.entries(window.state.textFields || {}).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val; });
}

// MOVED UP FOR SAFETY
window.renderInventoryList = function() {
    const listCarried = document.getElementById('inv-list-carried');
    const listOwned = document.getElementById('inv-list-owned');
    const listVehicles = document.getElementById('vehicle-list');
    if(listCarried) listCarried.innerHTML = '';
    if(listOwned) listOwned.innerHTML = '';
    if(listVehicles) listVehicles.innerHTML = '';
    if(!listCarried || !listOwned || !listVehicles) return;
    (window.state.inventory || []).forEach((item, idx) => {
        const d = document.createElement('div');
        d.className = "flex justify-between items-center bg-black/40 border border-[#333] p-1 text-[10px] mb-1";
        let displayName = item.displayName || item.name;
        if(item.type === 'Weapon' && item.baseType && item.baseType !== displayName) displayName += ` <span class="text-gray-500">[${item.baseType}]</span>`;
        let details = "";
        if(item.type === 'Weapon') details = `<div class="text-gray-400 text-[9px] mt-0.5 ml-1">Diff:${item.stats.diff} Dmg:${item.stats.dmg} Rng:${item.stats.range}</div>`;
        else if(item.type === 'Armor') details = `<div class="text-gray-400 text-[9px] mt-0.5 ml-1">Rating:${item.stats.rating} Penalty:${item.stats.penalty}</div>`;
        else if(item.type === 'Vehicle') details = `<div class="text-gray-400 text-[9px] mt-0.5 ml-1">Safe:${item.stats.safe} Max:${item.stats.max} Man:${item.stats.man}</div>`;
        const statusColor = item.status === 'carried' ? 'text-green-400' : 'text-gray-500';
        const statusLabel = item.status === 'carried' ? 'CARRIED' : 'OWNED';
        d.innerHTML = `
            <div class="flex-1 overflow-hidden mr-2"><div class="font-bold text-white uppercase truncate" title="${item.displayName || item.name}">${displayName}</div>${details}</div>
            <div class="flex items-center gap-2 flex-shrink-0">
                ${item.type !== 'Vehicle' ? `<button class="${statusColor} font-bold text-[8px] border border-[#333] px-1 hover:bg-[#222]" onclick="window.toggleInvStatus(${idx})">${statusLabel}</button>` : ''}
                <button class="text-red-500 font-bold px-1 hover:text-red-300" onclick="window.removeInventory(${idx})">&times;</button>
            </div>`;
        if (item.type === 'Vehicle') listVehicles.appendChild(d);
        else { if (item.status === 'carried') listCarried.appendChild(d); else listOwned.appendChild(d); }
    });
    window.updatePools();
};

window.removeInventory = (idx) => { window.state.inventory.splice(idx, 1); window.renderInventoryList(); };
window.toggleInvStatus = (idx) => { const item = window.state.inventory[idx]; item.status = item.status === 'carried' ? 'owned' : 'carried'; window.renderInventoryList(); };

function renderDots(count, max = 5) { let h = ''; for(let i=1; i<=max; i++) h += `<span class="dot ${i <= count ? 'filled' : ''}" data-v="${i}"></span>`; return h; }
function renderBoxes(count, checked = 0, type = '') { let h = ''; for(let i=1; i<=count; i++) h += `<span class="box ${i <= checked ? 'checked' : ''}" data-v="${i}" data-type="${type}"></span>`; return h; }

// --- PLAY MODE INTERACTION ---
document.addEventListener('click', function(e) {
    if (!window.state.isPlayMode) return;
    if (!e.target.classList.contains('box')) return;
    
    const type = e.target.dataset.type;
    const val = parseInt(e.target.dataset.v);
    if (!type || isNaN(val)) return;

    if (type === 'wp') {
        if (window.state.status.tempWillpower === val) window.state.status.tempWillpower = val - 1;
        else window.state.status.tempWillpower = val;
    } else if (type === 'blood') {
        if (window.state.status.blood === val) window.state.status.blood = val - 1;
        else window.state.status.blood = val;
    } else if (type === 'health') {
        const idx = val - 1; 
        if (window.state.status.health_states === undefined) window.state.status.health_states = [0,0,0,0,0,0,0];
        const current = window.state.status.health_states[idx] || 0;
        window.state.status.health_states[idx] = (current + 1) % 4;
    }
    window.updatePools();
});

// --- FILE MANAGER LOGIC ---

window.handleNew = function() {
    if(!confirm("Create new character? Unsaved changes will be lost.")) return;
    window.location.reload(); 
};

window.handleSaveClick = function() {
    if(!user) return showNotification("Login Required");
    syncInputs();
    
    // Pre-fill inputs if existing
    const nameIn = document.getElementById('save-name-input');
    const folderIn = document.getElementById('save-folder-input');
    
    if(window.state.meta.filename) nameIn.value = window.state.meta.filename;
    else nameIn.value = document.getElementById('c-name').value || "Unnamed Vampire";
    
    if(window.state.meta.folder) folderIn.value = window.state.meta.folder;
    
    document.getElementById('save-modal').classList.add('active');
};

window.handleLoadClick = async function() {
    if(!user) return showNotification("Login Required");
    document.getElementById('load-modal').classList.add('active');
    await renderFileBrowser();
};

window.performSave = async function() {
    const nameIn = document.getElementById('save-name-input');
    const folderIn = document.getElementById('save-folder-input');
    
    let rawName = nameIn.value.trim();
    let folder = folderIn.value.trim() || "Unsorted";
    
    if(!rawName) return showNotification("Filename required");
    
    // Sanitize ID
    const safeId = rawName.replace(/[^a-zA-Z0-9 _-]/g, "");
    
    window.state.meta.filename = safeId;
    window.state.meta.folder = folder;
    
    try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'characters', safeId);
        await setDoc(docRef, { 
            ...window.state, 
            lastSaved: Date.now() 
        });
        showNotification("Inscribed.");
        document.getElementById('save-modal').classList.remove('active');
        
        // Update Datalist
        const dl = document.getElementById('folder-datalist');
        if(dl && !Array.from(dl.options).some(o => o.value === folder)) {
            const opt = document.createElement('option');
            opt.value = folder;
            dl.appendChild(opt);
        }
    } catch (e) { 
        showNotification("Save Error."); 
        console.error(e); 
    }
};

async function renderFileBrowser() {
    const browser = document.getElementById('file-browser');
    browser.innerHTML = '<div class="text-center text-gray-500 italic mt-10">Consulting Archives...</div>';
    
    try {
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'characters'));
        const snap = await getDocs(q);
        
        const structure = {};
        
        snap.forEach(d => {
            const data = d.data();
            const f = data.meta?.folder || "Unsorted";
            if(!structure[f]) structure[f] = [];
            structure[f].push({ id: d.id, ...data });
        });
        
        browser.innerHTML = '';
        
        // Sort folders (Unsorted last)
        const folders = Object.keys(structure).sort((a,b) => a === "Unsorted" ? 1 : b === "Unsorted" ? -1 : a.localeCompare(b));
        
        const dl = document.getElementById('folder-datalist');
        if(dl) dl.innerHTML = ''; // Reset datalist
        
        folders.forEach(f => {
            if(dl) { const opt = document.createElement('option'); opt.value = f; dl.appendChild(opt); }
            
            const header = document.createElement('div');
            header.className = 'folder-header';
            header.innerHTML = `<i class="fas fa-folder mr-2"></i> ${f}`;
            browser.appendChild(header);
            
            structure[f].forEach(char => {
                const row = document.createElement('div');
                row.className = 'file-row';
                const date = new Date(char.lastSaved || Date.now()).toLocaleDateString();
                row.innerHTML = `
                    <div class="flex-1">
                        <div class="file-info text-white">${char.meta?.filename || char.id}</div>
                        <div class="file-meta">${char.textFields['c-clan'] || 'Unknown Clan'} • ${char.textFields['c-nature'] || 'Unknown Nature'}</div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="file-meta">${date}</div>
                        <button class="file-delete-btn" title="Delete" onclick="window.deleteCharacter('${char.id}', '${char.meta?.filename || char.id}', event)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                row.onclick = async (e) => {
                    if(e.target.closest('.file-delete-btn')) return;
                    await loadSelectedChar(char);
                };
                browser.appendChild(row);
            });
        });
        
        if(folders.length === 0) browser.innerHTML = '<div class="text-center text-gray-500 italic mt-10">No Archives Found.</div>';
        
    } catch (e) {
        console.error(e);
        browser.innerHTML = '<div class="text-red-500 text-center mt-10">Archive Error.</div>';
    }
}

window.deleteCharacter = async function(id, name, event) {
    if(event) event.stopPropagation();
    if(!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'characters', id));
        showNotification("Deleted.");
        await renderFileBrowser(); // Refresh list
    } catch (e) {
        console.error("Delete Error:", e);
        showNotification("Delete Failed.");
    }
};

async function loadSelectedChar(data) {
    if(!confirm(`Recall ${data.meta?.filename}? Unsaved progress will be lost.`)) return;
    
    window.state = data;
    if(!window.state.specialties) window.state.specialties = {}; 
    if (!window.state.furthestPhase) window.state.furthestPhase = 1;
    if (window.state.status && window.state.status.tempWillpower === undefined) {
        window.state.status.tempWillpower = window.state.status.willpower || 5;
    }
    if (window.state.status && (window.state.status.health_states === undefined || !Array.isArray(window.state.status.health_states))) {
        const oldDamage = window.state.status.health || 0;
        window.state.status.health_states = [0,0,0,0,0,0,0];
        for(let i=0; i<oldDamage && i<7; i++) {
            window.state.status.health_states[i] = 2;
        }
    }
    
    // UI Refresh
    hydrateInputs();
    const mList = document.getElementById('merits-list-create');
    if(mList) { mList.innerHTML = ''; renderDynamicTraitRow('merits-list-create', 'Merit', V20_MERITS_LIST); }
    const fList = document.getElementById('flaws-list-create');
    if(fList) { fList.innerHTML = ''; renderDynamicTraitRow('flaws-list-create', 'Flaw', V20_FLAWS_LIST); }
    
    renderDynamicAdvantageRow('list-disc', 'disc', DISCIPLINES);
    renderDynamicAdvantageRow('list-back', 'back', BACKGROUNDS);
    renderDynamicAdvantageRow('custom-talents', 'abil', [], true);
    renderDynamicAdvantageRow('custom-skills', 'abil', [], true);
    renderDynamicAdvantageRow('custom-knowledges', 'abil', [], true);
    renderDerangementsList();
    renderBloodBondRow();
    renderDynamicHavenRow();
    
    window.renderInventoryList();
    window.updatePools();
    
    // Close Modal
    document.getElementById('load-modal').classList.remove('active');
    showNotification("Recalled.");
    
    if (window.state.isPlayMode) { window.togglePlayMode(); window.togglePlayMode(); } // Quick refresh
    window.changeStep(window.state.furthestPhase || 1);
}

// --- DICE & CORE LOGIC ---

window.clearPool = function() {
    window.state.activePool = [];
    document.querySelectorAll('.trait-label').forEach(el => el.classList.remove('selected'));
    setSafeText('pool-display', "Select traits to build pool...");
    const hint = document.getElementById('specialty-hint'); if(hint) hint.innerHTML = '';
    document.getElementById('dice-tray').classList.remove('open');
};

window.rollPool = function() {
    const poolSize = window.state.activePool.reduce((a,b) => a + b.val, 0);
    if (poolSize <= 0) { showNotification("Pool Empty"); return; }
    const diff = parseInt(document.getElementById('roll-diff').value) || 6;
    const isSpec = document.getElementById('use-specialty').checked;
    let results = [], ones = 0, rawSuccesses = 0;
    for(let i=0; i<poolSize; i++) {
        const die = Math.floor(Math.random() * 10) + 1;
        results.push(die);
        if (die === 1) ones++;
        if (die >= diff) { if (isSpec && die === 10) rawSuccesses += 2; else rawSuccesses += 1; }
    }
    let net = rawSuccesses - ones;
    let outcome = "", outcomeClass = "";
    if (rawSuccesses === 0 && ones > 0) { outcome = "BOTCH"; outcomeClass = "dice-botch"; } 
    else if (net <= 0) { outcome = "FAILURE"; outcomeClass = "text-gray-400"; } 
    else { outcome = `${net} SUCCESS${net > 1 ? 'ES' : ''}`; outcomeClass = "dice-success"; }
    const tray = document.getElementById('roll-results');
    const row = document.createElement('div');
    row.className = 'bg-black/60 p-2 border border-[#333] text-[10px] mb-2 animate-in fade-in slide-in-from-right-4 duration-300';
    // Updated Dice Styling: Bigger Font (text-3xl) and spacing
    const diceRender = results.map(d => {
        let c = 'text-gray-500';
        if (d === 1) c = 'text-[#ff0000] font-bold';
        else if (d >= diff) { c = 'text-[#d4af37] font-bold'; if (d === 10 && isSpec) c = 'text-[#4ade80] font-black'; }
        return `<span class="${c} text-3xl mx-1">${d}</span>`;
    }).join(' ');
    row.innerHTML = `<div class="flex justify-between border-b border-[#444] pb-1 mb-1"><span class="text-gray-400">Diff ${diff}${isSpec ? '*' : ''}</span><span class="${outcomeClass} font-black text-sm">${outcome}</span></div><div class="tracking-widest flex flex-wrap justify-center py-2">${diceRender}</div>`;
    tray.insertBefore(row, tray.firstChild);
};

function calculateTotalFreebiesSpent(tempState = window.state) {
    let attrDots = 0; Object.keys(ATTRIBUTES).forEach(cat => ATTRIBUTES[cat].forEach(a => attrDots += (tempState.dots.attr[a] || 1)));
    const attrCost = Math.max(0, attrDots - 24) * 5;
    let abilDots = 0;
    Object.keys(ABILITIES).forEach(cat => {
        ABILITIES[cat].forEach(a => abilDots += (tempState.dots.abil[a] || 0));
        if (tempState.customAbilityCategories) { Object.entries(tempState.customAbilityCategories).forEach(([name, c]) => { if (c === cat && tempState.dots.abil[name]) abilDots += tempState.dots.abil[name]; }); }
    });
    const abilCost = Math.max(0, abilDots - 27) * 2;
    let discDots = Object.values(tempState.dots.disc || {}).reduce((a,b)=>a+b,0);
    const discCost = Math.max(0, discDots - 3) * 7;
    let backDots = Object.values(tempState.dots.back || {}).reduce((a,b)=>a+b,0);
    const backCost = Math.max(0, backDots - 5) * 1;
    let virtDots = VIRTUES.reduce((a,v) => a + (tempState.dots.virt[v] || 1), 0);
    const virtCost = Math.max(0, virtDots - 10) * 2;
    const bH = (tempState.dots.virt?.Conscience || 1) + (tempState.dots.virt?.["Self-Control"] || 1);
    const bW = (tempState.dots.virt?.Courage || 1);
    const curH = tempState.status.humanity !== undefined ? tempState.status.humanity : bH;
    const curW = tempState.status.willpower !== undefined ? tempState.status.willpower : bW;
    const humCost = Math.max(0, curH - bH) * 2;
    const willCost = Math.max(0, curW - bW) * 1;
    let mfCost = 0, mfBonus = 0;
    if (tempState.merits) tempState.merits.forEach(m => mfCost += (parseInt(m.val) || 0));
    if (tempState.flaws) tempState.flaws.forEach(f => mfBonus += (parseInt(f.val) || 0));
    const cappedBonus = Math.min(mfBonus, 7);
    return (attrCost + abilCost + discCost + backCost + virtCost + humCost + willCost + mfCost) - cappedBonus;
}

function checkStepComplete(step) {
    syncInputs();
    const s = window.state;
    if (!s.prios) s.prios = { attr: {}, abil: {} };
    if (!s.dots) s.dots = { attr: {}, abil: {}, disc: {}, back: {}, virt: {} };
    if (step === 1) return !!(s.textFields['c-name'] && s.textFields['c-nature'] && s.textFields['c-demeanor'] && s.textFields['c-clan']);
    if (step === 2) {
        const prios = Object.values(s.prios.attr || {});
        if (prios.length !== 3 || !prios.includes(7) || !prios.includes(5) || !prios.includes(3)) return false;
        return ['Physical', 'Social', 'Mental'].every(cat => {
            const limit = s.prios.attr[cat] || 0;
            let spent = 0;
            ATTRIBUTES[cat].forEach(a => { const val = parseInt(s.dots.attr[a] || 1); spent += (val - 1); });
            return spent === limit;
        });
    }
    if (step === 3) {
        const prios = Object.values(s.prios.abil || {});
        if (prios.length !== 3 || !prios.includes(13) || !prios.includes(9) || !prios.includes(5)) return false;
        return ['Talents', 'Skills', 'Knowledges'].every(cat => {
            const limit = s.prios.abil[cat] || 0;
            let spent = 0;
            ABILITIES[cat].forEach(a => spent += parseInt(s.dots.abil[a] || 0));
            if (s.customAbilityCategories) { Object.entries(s.customAbilityCategories).forEach(([name, c]) => { if (c === cat) spent += parseInt(s.dots.abil[name] || 0); }); }
            return spent === limit;
        });
    }
    if (step === 4) {
        const discSpent = Object.values(s.dots.disc || {}).reduce((a, b) => a + parseInt(b||0), 0);
        const backSpent = Object.values(s.dots.back || {}).reduce((a, b) => a + parseInt(b||0), 0);
        const virtTotal = VIRTUES.reduce((a, v) => a + parseInt(s.dots.virt[v] || 1), 0);
        return discSpent === 3 && backSpent === 5 && virtTotal === 10;
    }
    return true;
}

function checkCreationComplete() { return checkStepComplete(1) && checkStepComplete(2) && checkStepComplete(3) && checkStepComplete(4); }

window.updateWalkthrough = function() {
    if (window.state.isPlayMode) { document.getElementById('walkthrough-guide').classList.add('opacity-0', 'pointer-events-none'); return; } 
    else { document.getElementById('walkthrough-guide').classList.remove('opacity-0', 'pointer-events-none'); }
    const current = window.state.currentPhase;
    const furthest = window.state.furthestPhase || 1;
    const isComplete = checkStepComplete(current);
    const msgEl = document.getElementById('guide-message');
    const iconEl = document.getElementById('guide-icon');
    const stepData = STEPS_CONFIG.find(s => s.id === current);
    if (current < furthest) {
        msgEl.innerText = `Return to Step ${furthest}`;
        msgEl.className = "bg-gray-900/90 border border-gray-500 text-gray-300 px-4 py-2 rounded text-xs font-bold shadow-lg w-48 text-right";
        iconEl.classList.add('ready'); 
    } else {
        if (isComplete) {
            msgEl.innerText = "Step Complete! Next >>";
            msgEl.className = "bg-green-900/90 border border-green-500 text-green-100 px-4 py-2 rounded text-xs font-bold shadow-lg w-48 text-right";
            iconEl.classList.add('ready');
        } else {
            msgEl.innerText = stepData ? stepData.msg : "Continue...";
            msgEl.className = "bg-black/90 border border-[#d4af37] text-[#f0e6d2] px-4 py-2 rounded text-xs font-bold shadow-lg w-48 text-right";
            iconEl.classList.remove('ready');
        }
    }
};

window.nextStep = function() {
    const current = window.state.currentPhase;
    const furthest = window.state.furthestPhase || 1;
    if (current < furthest) window.changeStep(furthest);
    else if (checkStepComplete(current)) { if (current < 8) window.changeStep(current + 1); else showNotification("Character Ready!"); } 
    else showNotification("Complete current step first!");
};

window.updatePools = function() {
    if (!window.state.status) window.state.status = { humanity: 7, willpower: 5, tempWillpower: 5, health_states: [0,0,0,0,0,0,0], blood: 0 };
    // Init temporary willpower if missing (backward compatibility)
    if (window.state.status.tempWillpower === undefined) window.state.status.tempWillpower = window.state.status.willpower || 5;
    // Init health states if missing
    if (window.state.status.health_states === undefined || !Array.isArray(window.state.status.health_states)) window.state.status.health_states = [0,0,0,0,0,0,0];

    if (!window.state.freebieMode && !window.state.isPlayMode) {
        const bH = (window.state.dots.virt?.Conscience || 1) + (window.state.dots.virt?.["Self-Control"] || 1);
        const bW = (window.state.dots.virt?.Courage || 1);
        window.state.status.humanity = bH;
        window.state.status.willpower = bW;
        // In creation, temp syncs with permanent unless deliberately changed later
        window.state.status.tempWillpower = bW;
    }
    const curH = window.state.status.humanity;
    const curW = window.state.status.willpower; // Permanent rating
    const tempW = window.state.status.tempWillpower; // Current pool
    const gen = parseInt(document.getElementById('c-gen')?.value) || 13;
    const lim = GEN_LIMITS[gen] || GEN_LIMITS[13];

    Object.keys(ATTRIBUTES).forEach(cat => {
        let cs = 0; ATTRIBUTES[cat].forEach(a => cs += ((window.state.dots.attr[a] || 1) - 1));
        const targetId = (cat === 'Social') ? 'p-social' : (cat === 'Mental') ? 'p-mental' : 'p-phys';
        setSafeText(targetId, `[${Math.max(0, (window.state.prios.attr[cat] || 0) - cs)}]`);
    });
    Object.keys(ABILITIES).forEach(cat => {
        let cs = 0; ABILITIES[cat].forEach(a => cs += (window.state.dots.abil[a] || 0));
        if (window.state.customAbilityCategories) { Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => { if (c === cat && window.state.dots.abil[name]) cs += window.state.dots.abil[name]; }); }
        setSafeText('p-' + cat.toLowerCase().slice(0,3), `[${Math.max(0, (window.state.prios.abil[cat] || 0) - cs)}]`);
    });
    const discSpent = Object.values(window.state.dots.disc || {}).reduce((a, b) => a + b, 0);
    setSafeText('p-disc', `[${Math.max(0, 3 - discSpent)}]`);
    const backSpent = Object.values(window.state.dots.back || {}).reduce((a, b) => a + b, 0);
    setSafeText('p-back', `[${Math.max(0, 5 - backSpent)}]`);
    const virtTotalDots = VIRTUES.reduce((a, v) => a + (window.state.dots.virt[v] || 1), 0);
    setSafeText('p-virt', `[${Math.max(0, 7 - (virtTotalDots - 3))}]`);

    if (window.state.freebieMode) {
         const totalSpent = calculateTotalFreebiesSpent(window.state);
         setSafeText('f-total-top', totalSpent); 
         let attrDots = 0; Object.keys(ATTRIBUTES).forEach(cat => ATTRIBUTES[cat].forEach(a => attrDots += (window.state.dots.attr[a] || 1)));
         setSafeText('sb-attr', Math.max(0, attrDots - 24) * 5);
         let abilDots = 0; Object.keys(ABILITIES).forEach(cat => { ABILITIES[cat].forEach(a => abilDots += (window.state.dots.abil[a] || 0)); if (window.state.customAbilityCategories) { Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => { if (c === cat && window.state.dots.abil[name]) abilDots += window.state.dots.abil[name]; }); } });
         setSafeText('sb-abil', Math.max(0, abilDots - 27) * 2);
         setSafeText('sb-disc', Math.max(0, discSpent - 3) * 7);
         setSafeText('sb-back', Math.max(0, backSpent - 5) * 1);
         setSafeText('sb-virt', Math.max(0, (virtTotalDots-3) - 7) * 2);
         const bH = (window.state.dots.virt?.Conscience || 1) + (window.state.dots.virt?.["Self-Control"] || 1);
         const bW = (window.state.dots.virt?.Courage || 1);
         const cH = window.state.status.humanity !== undefined ? window.state.status.humanity : bH;
         const cW = window.state.status.willpower !== undefined ? window.state.status.willpower : bW;
         setSafeText('sb-human', Math.max(0, cH - bH) * 2);
         setSafeText('sb-will', Math.max(0, cW - bW) * 1);
         let mfCost = 0, mfBonus = 0;
         if (window.state.merits) window.state.merits.forEach(m => mfCost += (parseInt(m.val) || 0));
         if (window.state.flaws) window.state.flaws.forEach(f => mfBonus += (parseInt(f.val) || 0));
         const cappedBonus = Math.min(mfBonus, 7);
         setSafeText('sb-merit', mfCost);
         setSafeText('sb-flaw', `+${cappedBonus}`);
         const limit = parseInt(document.getElementById('c-freebie-total')?.value) || 15;
         setSafeText('sb-total', limit - totalSpent);
         document.getElementById('freebie-sidebar').classList.add('active'); 
    } else {
         document.getElementById('freebie-sidebar').classList.remove('active');
    }

    const fbBtn = document.getElementById('toggle-freebie-btn');
    if (fbBtn) {
        const complete = checkCreationComplete();
        if (!window.state.freebieMode) fbBtn.disabled = !complete; else fbBtn.disabled = false; 
    }

    document.querySelectorAll('.dot-row').forEach(el => {
        const name = el.dataset.n;
        const type = el.dataset.t;
        if (name && type && window.state.dots[type]) {
            const val = window.state.dots[type][name] || 0; 
            el.innerHTML = renderDots(val, 5);
        }
    });

    const p8h = document.getElementById('phase8-humanity-dots');
    if(p8h) {
        p8h.innerHTML = renderDots(curH, 10);
        p8h.onclick = (e) => { if (window.state.freebieMode && e.target.dataset.v) setDots('Humanity', 'status', parseInt(e.target.dataset.v), 1, 10); };
    }
    const p8w = document.getElementById('phase8-willpower-dots');
    if(p8w) {
        p8w.innerHTML = renderDots(curW, 10);
        p8w.onclick = (e) => { if (window.state.freebieMode && e.target.dataset.v) setDots('Willpower', 'status', parseInt(e.target.dataset.v), 1, 10); };
    }

    document.querySelectorAll('#humanity-dots-play').forEach(el => el.innerHTML = renderDots(curH, 10));
    document.querySelectorAll('#willpower-dots-play').forEach(el => el.innerHTML = renderDots(curW, 10));
    
    // UPDATED PLAY MODE BOX RENDERING
    // Willpower: Max count = Permanent Rating (curW). Checked = Temp Rating (tempW).
    document.querySelectorAll('#willpower-boxes-play').forEach(el => el.innerHTML = renderBoxes(curW, tempW, 'wp'));
    
    // --- 20 BOX BLOOD POOL IMPLEMENTATION ---
    const bpContainer = document.querySelectorAll('#blood-boxes-play');
    bpContainer.forEach(el => {
        let h = '';
        const currentBlood = window.state.status.blood || 0;
        const maxBloodForGen = lim.m;
        
        for (let i = 1; i <= 20; i++) {
            let classes = "box";
            if (i <= currentBlood) classes += " checked";
            
            // Visual locking for blood exceeding Gen limit
            // Changed from opacity-20 to opacity-50 for better visibility per user request
            // Added explicit styling to ensure they look like 'empty slots' rather than missing
            if (i > maxBloodForGen) {
                classes += " cursor-not-allowed opacity-50 bg-[#1a1a1a]"; 
            } else {
                classes += " cursor-pointer";
            }
            // Pointer events none prevents clicking, but we keep them visible
            if (i > maxBloodForGen) classes += " pointer-events-none";
            
            h += `<span class="${classes}" data-v="${i}" data-type="blood"></span>`;
        }
        el.innerHTML = h;
    });
    // ----------------------------------------
    
    const healthCont = document.getElementById('health-chart-play');
    if(healthCont && healthCont.children.length === 0) {
         HEALTH_STATES.forEach((h, i) => {
            const d = document.createElement('div'); d.className = 'flex justify-between items-center text-[10px] uppercase border-b border-[#333] py-2 font-bold';
            d.innerHTML = `<span>${h.l}</span><div class="flex gap-3"><span>${h.p !== 0 ? h.p : ''}</span><div class="box" data-v="${i+1}" data-type="health"></div></div>`;
            healthCont.appendChild(d);
        });
    }
    // Update Health Boxes (Clicking box N means "Damage Level N" reached)
    const healthStates = window.state.status.health_states || [0,0,0,0,0,0,0];
    document.querySelectorAll('#health-chart-play .box').forEach((box, i) => {
        box.classList.remove('checked'); // Remove old check logic
        box.dataset.state = healthStates[i] || 0; // Apply new cycle logic
    });
    
    const cList = document.getElementById('combat-list-create');
    if(cList && window.state.inventory) {
        cList.innerHTML = '';
        window.state.inventory.filter(i => i.type === 'Weapon' && i.status === 'carried').forEach(w => {
             let display = w.displayName || w.name;
             const r = document.createElement('div');
             r.className = "grid grid-cols-6 gap-2 text-[10px] border-b border-[#222] py-1 text-center text-white items-center";
             r.innerHTML = `
                <div class="col-span-2 text-left pl-2 font-bold text-gold truncate">${display}</div>
                <div>${w.stats.diff}</div>
                <div class="text-gold font-bold">${w.stats.dmg}</div>
                <div>${w.stats.range}</div>
                <div>${w.stats.clip}</div>
             `;
             cList.appendChild(r);
        });
        
        let totalArmor = 0; let totalPenalty = 0; let activeArmor = [];
        window.state.inventory.filter(i => i.type === 'Armor' && i.status === 'carried').forEach(a => {
            totalArmor += parseInt(a.stats?.rating) || 0;
            totalPenalty += parseInt(a.stats?.penalty) || 0;
            activeArmor.push(a.displayName || a.name);
        });
        setSafeText('total-armor-rating', totalArmor);
        setSafeText('total-armor-penalty', totalPenalty);
        setSafeText('active-armor-names', activeArmor.length > 0 ? activeArmor.join(', ') : "None");
    }
    window.updateWalkthrough();
};

function setDots(name, type, val, min, max = 5) {
    if (window.state.isPlayMode) return;
    if (type === 'status') {
        if (!window.state.freebieMode) return;
        if (name === 'Humanity') window.state.status.humanity = val;
        else if (name === 'Willpower') {
            window.state.status.willpower = val;
            window.state.status.tempWillpower = val; // Sync temp when permanent changes
        }
        if (calculateTotalFreebiesSpent(window.state) > (parseInt(document.getElementById('c-freebie-total')?.value) || 15)) { showNotification("Freebie Limit Exceeded!"); return; }
        window.updatePools(); return;
    }
    const currentVal = window.state.dots[type][name] || min;
    let newVal = val;
    if (val === currentVal) newVal = val - 1;
    if (newVal < min) newVal = min;
    if (window.state.freebieMode) {
        const tempState = JSON.parse(JSON.stringify(window.state));
        if (!tempState.dots[type]) tempState.dots[type] = {};
        tempState.dots[type][name] = newVal;
        const projectedCost = calculateTotalFreebiesSpent(tempState);
        const limit = parseInt(document.getElementById('c-freebie-total')?.value) || 15;
        if (projectedCost > limit) { showNotification("Freebie Limit Exceeded!"); return; }
    } else {
        if (type === 'attr') {
            let group = null; Object.keys(ATTRIBUTES).forEach(k => { if(ATTRIBUTES[k].includes(name)) group = k; });
            if (group) {
                 const limit = window.state.prios.attr[group];
                 if (limit === undefined) { showNotification(`Select priority for ${group}!`); return; }
                 let currentSpent = 0;
                 ATTRIBUTES[group].forEach(a => { if (a !== name) { const v = window.state.dots.attr[a] || 1; currentSpent += (v - 1); } });
                 if (currentSpent + (newVal - 1) > limit) { showNotification("Limit Exceeded!"); return; }
            }
        } else if (type === 'abil') {
            if (newVal > 3) { showNotification("Max 3 dots in Abilities during creation!"); return; }
            let group = null; Object.keys(ABILITIES).forEach(k => { if(ABILITIES[k].includes(name)) group = k; });
            if (!group && window.state.customAbilityCategories && window.state.customAbilityCategories[name]) group = window.state.customAbilityCategories[name];
            if (group) {
                const limit = window.state.prios.abil[group];
                if (limit === undefined) { showNotification(`Select priority for ${group}!`); return; }
                let currentSpent = 0; ABILITIES[group].forEach(a => { if (a !== name) currentSpent += (window.state.dots.abil[a] || 0); });
                if (window.state.customAbilityCategories) { Object.keys(window.state.dots.abil).forEach(k => { if (k !== name && window.state.customAbilityCategories[k] === group) currentSpent += (window.state.dots.abil[k] || 0); }); }
                if (currentSpent + newVal > limit) { showNotification("Limit Exceeded!"); return; }
            }
        } else if (type === 'disc') {
            let currentSpent = 0; Object.keys(window.state.dots.disc).forEach(d => { if (d !== name) currentSpent += (window.state.dots.disc[d] || 0); });
            if (currentSpent + newVal > 3) { showNotification("Max 3 Creation Dots!"); return; }
        } else if (type === 'back') {
            let currentSpent = 0; Object.keys(window.state.dots.back).forEach(b => { if (b !== name) currentSpent += (window.state.dots.back[b] || 0); });
            if (currentSpent + newVal > 5) { showNotification("Max 5 Creation Dots!"); return; }
        } else if (type === 'virt') {
            let currentSpent = 0; VIRTUES.forEach(v => { if (v !== name) currentSpent += (window.state.dots.virt[v] || 1); });
            if ((currentSpent + newVal) > 10) { showNotification("Max 7 Creation Dots!"); return; }
        }
    }
    window.state.dots[type][name] = newVal;
    if (type === 'virt' && !window.state.isPlayMode && !window.state.freebieMode) {
         const con = window.state.dots.virt.Conscience || 1;
         const self = window.state.dots.virt["Self-Control"] || 1;
         const cou = window.state.dots.virt.Courage || 1;
         window.state.status.humanity = con + self;
         window.state.status.willpower = cou;
         window.state.status.tempWillpower = cou;
    }
    document.querySelectorAll(`.dot-row[data-n="${name}"][data-t="${type}"]`).forEach(el => el.innerHTML = renderDots(newVal, max));
    window.updatePools();
}

function renderRow(contId, label, type, min, max = 5) {
    const cont = typeof contId === 'string' ? document.getElementById(contId) : contId;
    if (!cont) return;
    const val = window.state.dots[type][label] || min;
    const div = document.createElement('div'); 
    
    // Check for specialty eligibility
    let showSpecialty = false;
    let warningMsg = "";

    if (type !== 'virt') {
        if (type === 'attr') {
            if (val >= 4) showSpecialty = true;
        } else if (type === 'abil') {
            if (val >= 1) {
                showSpecialty = true;
                if (!BROAD_ABILITIES.includes(label) && val < 4) {
                    warningMsg = "Rule Note: Standard V20 requires 4 dots for specialties, but you may override.";
                } else if (BROAD_ABILITIES.includes(label)) {
                    warningMsg = "Rule Note: This ability is too broad to be used without a specialty.";
                }
            }
        }
    }

    // HTML Construction: Flex row to handle "Name - Specialty - Dots"
    div.className = 'flex items-center justify-between w-full py-1';
    
    let specInputHTML = '';
    if (showSpecialty) {
        const specVal = window.state.specialties[label] || "";
        const listId = `list-${label.replace(/\s+/g, '')}`;
        let optionsHTML = '';
        if (SPECIALTY_EXAMPLES[label]) {
            optionsHTML = SPECIALTY_EXAMPLES[label].map(s => `<option value="${s}">`).join('');
        }
        
        specInputHTML = `
            <div class="flex-1 mx-2 relative">
                <input type="text" list="${listId}" class="specialty-input w-full text-[10px] italic bg-transparent border-b border-gray-700 text-[#d4af37] text-center" placeholder="Specialty..." value="${specVal}">
                <datalist id="${listId}">${optionsHTML}</datalist>
            </div>
        `;
    } else {
        // Spacer to keep layout somewhat consistent if desired, or just nothing for "Name .... Dots"
        specInputHTML = '<div class="flex-1"></div>'; 
    }

    div.innerHTML = `
        <span class="trait-label font-bold uppercase text-[11px] whitespace-nowrap cursor-pointer hover:text-gold">${label}</span>
        ${specInputHTML}
        <div class="dot-row flex-shrink-0" data-n="${label}" data-t="${type}">${renderDots(val, max)}</div>
    `;

    div.querySelector('.trait-label').onclick = () => { if(window.state.isPlayMode) window.handleTraitClick(label, type); };
    div.querySelector('.dot-row').onclick = (e) => { if (e.target.dataset.v) setDots(label, type, parseInt(e.target.dataset.v), min, max); };
    
    // Attach specialty input listeners if present
    if(showSpecialty) {
        const input = div.querySelector('input');
        if(input) {
            input.onblur = (e) => { window.state.specialties[label] = e.target.value; };
            if (warningMsg) { input.onfocus = () => showNotification(warningMsg); }
            input.disabled = window.state.isPlayMode;
        }
    }

    cont.appendChild(div);
}

window.handleTraitClick = function(name, type) {
    const val = window.state.dots[type][name] || 0;
    const existingIdx = window.state.activePool.findIndex(p => p.name === name);
    if (existingIdx > -1) window.state.activePool.splice(existingIdx, 1);
    else { if (window.state.activePool.length >= 2) window.state.activePool.shift(); window.state.activePool.push({name, val}); }
    document.querySelectorAll('.trait-label').forEach(el => el.classList.toggle('selected', window.state.activePool.some(p => p.name === el.innerText)));
    const display = document.getElementById('pool-display');
    const hint = document.getElementById('specialty-hint');
    
    // Create specialty hint container if missing (dynamic insertion)
    if (!hint && display) {
        const hDiv = document.createElement('div');
        hDiv.id = 'specialty-hint';
        hDiv.className = 'text-[9px] text-[#4ade80] mt-1 h-3';
        display.parentNode.insertBefore(hDiv, display.nextSibling);
    }
    
    if (window.state.activePool.length > 0) {
        setSafeText('pool-display', window.state.activePool.map(p => `${p.name} (${p.val})`).join(' + '));
        
        // Scan for potential specialties
        const specs = window.state.activePool
            .map(p => window.state.specialties[p.name])
            .filter(s => s); // remove empty/undefined
            
        if (specs.length > 0 && document.getElementById('specialty-hint')) {
             document.getElementById('specialty-hint').innerText = `Possible Specialty: ${specs.join(', ')}`;
        } else if (document.getElementById('specialty-hint')) {
             document.getElementById('specialty-hint').innerText = '';
        }
        
        document.getElementById('dice-tray').classList.add('open');
    } else { window.clearPool(); }
};

function renderDynamicAdvantageRow(containerId, type, list, isAbil = false) {
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

    const buildRow = (name = "") => {
        const row = document.createElement('div'); 
        // Layout: Flex Row for Name - Specialty - Dots - Remove
        row.className = 'flex items-center justify-between gap-1 mb-2 advantage-row w-full';
        
        // 1. Input/Select (Name)
        let inputField;
        if (isAbil) { 
            inputField = document.createElement('input'); 
            inputField.type = 'text'; 
            inputField.placeholder = "Write-in..."; 
            // Name should be bold, font slightly larger than specialty
            inputField.className = 'font-bold uppercase !bg-black/20 !border-b !border-[#333] text-[11px] w-24 flex-shrink-0'; 
            inputField.value = name; 
        } else { 
            inputField = document.createElement('select'); 
            inputField.className = 'font-bold uppercase text-[11px] w-24 flex-shrink-0'; 
            inputField.innerHTML = `<option value="">-- Choose ${type} --</option>` + list.map(item => `<option value="${item}" ${item === name ? 'selected' : ''}>${item}</option>`).join(''); 
        }

        // 2. Specialty Logic
        let showSpecialty = false;
        let warningMsg = "";
        if (name && (isAbil || type === 'attr')) { // Logic for custom/dynamic rows
             const currentVal = window.state.dots[type][name] || 0;
             if (currentVal >= 1) {
                 showSpecialty = true;
                 if (currentVal < 4) {
                     warningMsg = "Rule Note: Standard V20 requires 4 dots for specialties, but you may override.";
                 }
                 // Custom abilities check for broadness if name matches standard list, but these are custom writes usually
                 if (BROAD_ABILITIES.includes(name)) warningMsg = "Rule Note: This ability is too broad to be used without a specialty.";
             }
        }

        // 3. Specialty Input HTML
        const specWrapper = document.createElement('div');
        specWrapper.className = 'flex-1 mx-2 relative'; // Takes remaining middle space
        
        if (showSpecialty) {
             const specVal = window.state.specialties[name] || "";
             const listId = `list-${name.replace(/[^a-zA-Z0-9]/g, '')}`;
             let optionsHTML = '';
             if (SPECIALTY_EXAMPLES[name]) {
                 optionsHTML = SPECIALTY_EXAMPLES[name].map(s => `<option value="${s}">`).join('');
             }
             
             specWrapper.innerHTML = `
                <input type="text" list="${listId}" class="specialty-input w-full text-[10px] italic bg-transparent border-b border-gray-700 text-[#d4af37] text-center" placeholder="Specialty..." value="${specVal}">
                <datalist id="${listId}">${optionsHTML}</datalist>
             `;
             const inp = specWrapper.querySelector('input');
             inp.onblur = (e) => { window.state.specialties[name] = e.target.value; };
             if(warningMsg) inp.onfocus = () => showNotification(warningMsg);
             inp.disabled = window.state.isPlayMode;
        }

        // 4. Dots
        const dotCont = document.createElement('div'); 
        dotCont.className = 'dot-row flex-shrink-0';
        const val = name ? (window.state.dots[type][name] || 0) : 0;
        dotCont.innerHTML = renderDots(val, 5);
        if (name) { dotCont.dataset.n = name; dotCont.dataset.t = type; }

        // 5. Remove Button
        const removeBtn = document.createElement('div'); 
        removeBtn.className = 'remove-btn flex-shrink-0 ml-1'; 
        removeBtn.innerHTML = '&times;';
        if (!name) removeBtn.style.visibility = 'hidden';

        // Event Listeners for Update Logic (Same as before)
        let curName = name;
        let category = null;
        if (containerId === 'custom-talents') category = 'Talents'; else if (containerId === 'custom-skills') category = 'Skills'; else if (containerId === 'custom-knowledges') category = 'Knowledges';
        
        const onUpdate = (newVal) => {
            if (curName && curName !== newVal) { 
                const dots = window.state.dots[type][curName]; delete window.state.dots[type][curName]; 
                if (window.state.customAbilityCategories && window.state.customAbilityCategories[curName]) delete window.state.customAbilityCategories[curName];
                if (newVal) window.state.dots[type][newVal] = dots || 0; 
                // Migrate specialty if name changes
                if(window.state.specialties[curName]) {
                    window.state.specialties[newVal] = window.state.specialties[curName];
                    delete window.state.specialties[curName];
                }
            }
            curName = newVal;
            if (newVal) { 
                window.state.dots[type][newVal] = window.state.dots[type][newVal] || 0; 
                dotCont.innerHTML = renderDots(window.state.dots[type][newVal], 5);
                dotCont.dataset.n = newVal; dotCont.dataset.t = type;
                if (category) { if (!window.state.customAbilityCategories) window.state.customAbilityCategories = {}; window.state.customAbilityCategories[newVal] = category; }
                if (row === container.lastElementChild) { removeBtn.style.visibility = 'visible'; buildRow(); }
            }
            window.updatePools();
        };
        
        if (isAbil) inputField.onblur = (e) => onUpdate(e.target.value); else inputField.onchange = (e) => onUpdate(e.target.value);
        
        removeBtn.onclick = () => { if (curName) { delete window.state.dots[type][curName]; if (window.state.customAbilityCategories && window.state.customAbilityCategories[curName]) delete window.state.customAbilityCategories[curName]; } row.remove(); window.updatePools(); };
        
        dotCont.onclick = (e) => { 
            if (!curName || !e.target.dataset.v) return; 
            let val = parseInt(e.target.dataset.v);
            const currentVal = window.state.dots[type][curName] || 0;
            if (val === currentVal) val = val - 1;
            if (window.state.freebieMode) {
                const tempState = JSON.parse(JSON.stringify(window.state)); if (!tempState.dots[type]) tempState.dots[type] = {}; tempState.dots[type][curName] = val;
                if (calculateTotalFreebiesSpent(tempState) > (parseInt(document.getElementById('c-freebie-total')?.value) || 15)) { showNotification("Freebie Limit Exceeded!"); return; }
            } else {
                if (category) {
                    if (val > 3) { showNotification("Max 3 dots in Abilities during creation!"); return; }
                    if (window.state.prios.abil[category] === undefined) { showNotification(`Select a priority for ${category} first!`); return; }
                    const limit = window.state.prios.abil[category]; let currentSpent = 0; ABILITIES[category].forEach(t => currentSpent += (window.state.dots.abil[t] || 0));
                    if (window.state.customAbilityCategories) { Object.keys(window.state.dots.abil).forEach(k => { if (k !== curName && window.state.customAbilityCategories[k] === category) currentSpent += (window.state.dots.abil[k] || 0); }); }
                    if (currentSpent + val > limit) { showNotification("Limit exceeded!"); return; }
                } else if (type === 'disc') {
                    const currentSpent = Object.values(window.state.dots.disc || {}).reduce((a,b)=>a+b,0) - (window.state.dots.disc[curName]||0);
                    if (currentSpent + val > 3) { showNotification("Max 3 Creation Dots for Disciplines!"); return; }
                } else if (type === 'back') {
                    const currentSpent = Object.values(window.state.dots.back || {}).reduce((a,b)=>a+b,0) - (window.state.dots.back[curName]||0);
                    if (currentSpent + val > 5) { showNotification("Max 5 Creation Dots for Backgrounds!"); return; }
                }
            }
            window.state.dots[type][curName] = val; dotCont.innerHTML = renderDots(val, 5); window.updatePools(); 
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

function renderDynamicTraitRow(containerId, type, list) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const stateArray = type === 'Merit' ? (window.state.merits || []) : (window.state.flaws || []);
    container.innerHTML = '';
    const appendRow = (data = null) => {
        const row = document.createElement('div'); row.className = 'flex gap-2 items-center mb-2 trait-row';
        let options = `<option value="">-- Select ${type} --</option>`;
        list.forEach(item => {
            const rangeText = item.range ? `(${item.range}pt)` : `(${item.v}pt)`;
            options += `<option value="${item.n}" data-val="${item.v}" data-var="${item.variable||false}">${item.n} ${rangeText}</option>`;
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
                if (name && name !== 'Custom') newState.push({ name, val });
            });
            if (type === 'Merit') window.state.merits = newState; else window.state.flaws = newState;
            window.updatePools();
        };
        selectEl.addEventListener('change', (e) => {
            if (selectEl.value === 'Custom') { selectEl.classList.add('hidden'); textEl.classList.remove('hidden'); textEl.focus(); numEl.value = 1; numEl.disabled = false; numEl.classList.remove('opacity-50'); } 
            else if (selectEl.value) {
                const opt = selectEl.options[selectEl.selectedIndex];
                const baseVal = opt.dataset.val;
                const isVar = opt.dataset.var === "true";
                numEl.value = baseVal;
                if (!isVar) { numEl.disabled = true; numEl.classList.add('opacity-50'); } else { numEl.disabled = false; numEl.classList.remove('opacity-50'); }
                if (row === container.lastElementChild) { removeBtn.style.visibility = 'visible'; appendRow(); }
            } else { numEl.value = ""; numEl.disabled = false; }
            syncState();
        });
        textEl.addEventListener('blur', () => { if (textEl.value === "") { textEl.classList.add('hidden'); selectEl.classList.remove('hidden'); selectEl.value = ""; } else { if (row === container.lastElementChild) { removeBtn.style.visibility = 'visible'; appendRow(); } } syncState(); });
        numEl.addEventListener('change', syncState);
        removeBtn.addEventListener('click', () => { row.remove(); syncState(); });
    };
    if (stateArray.length > 0) stateArray.forEach(d => appendRow(d));
    appendRow();
}

// Inventory UI Setup
const invType = document.getElementById('inv-type');
const invName = document.getElementById('inv-name');
const invBaseWrapper = document.getElementById('inv-base-wrapper');
const invBaseSelect = document.getElementById('inv-base-select');
const statsRow = document.getElementById('inv-stats-row');
const armorRow = document.getElementById('inv-armor-row');
const vehicleRow = document.getElementById('inv-vehicle-row');
const addBtn = document.getElementById('add-inv-btn');

if(invType) {
    const updateFormState = () => {
        const t = invType.value;
        invBaseWrapper.classList.add('hidden'); statsRow.classList.add('hidden'); armorRow.classList.add('hidden'); vehicleRow.classList.add('hidden');
        if(t === 'Weapon') { invBaseWrapper.classList.remove('hidden'); let wOpts = `<option value="">-- Choose Base Type --</option>`; V20_WEAPONS_LIST.forEach(w => wOpts += `<option value="${w.n}" data-diff="${w.diff}" data-dmg="${w.dmg}" data-range="${w.range}" data-rate="${w.rate}" data-clip="${w.clip}">${w.n}</option>`); invBaseSelect.innerHTML = wOpts; statsRow.classList.remove('hidden'); } 
        else if(t === 'Armor') { invBaseWrapper.classList.remove('hidden'); let aOpts = `<option value="">-- Choose Armor Class --</option>`; V20_ARMOR_LIST.forEach(a => aOpts += `<option value="${a.n}" data-rating="${a.r}" data-penalty="${a.p}">${a.n}</option>`); invBaseSelect.innerHTML = aOpts; armorRow.classList.remove('hidden'); } 
        else if(t === 'Vehicle') { invBaseWrapper.classList.remove('hidden'); let vOpts = `<option value="">-- Choose Vehicle Type --</option>`; V20_VEHICLE_LIST.forEach(v => vOpts += `<option value="${v.n}" data-safe="${v.safe}" data-max="${v.max}" data-man="${v.man}">${v.n}</option>`); invBaseSelect.innerHTML = vOpts; vehicleRow.classList.remove('hidden'); }
        invBaseSelect.value = ""; invName.value = ""; 
        document.querySelectorAll('#inv-stats-row input, #inv-armor-row input, #inv-vehicle-row input').forEach(i => i.value = "");
    };
    updateFormState();
    invType.addEventListener('change', updateFormState);
    invBaseSelect.addEventListener('change', () => {
        const t = invType.value;
        if(invBaseSelect.value) {
            const opt = invBaseSelect.options[invBaseSelect.selectedIndex];
            if(t === 'Weapon') { document.getElementById('inv-diff').value = opt.dataset.diff; document.getElementById('inv-dmg').value = opt.dataset.dmg; document.getElementById('inv-range').value = opt.dataset.range; document.getElementById('inv-rate').value = opt.dataset.rate; document.getElementById('inv-clip').value = opt.dataset.clip; } 
            else if(t === 'Armor') { document.getElementById('inv-rating').value = opt.dataset.rating; document.getElementById('inv-penalty').value = opt.dataset.penalty; } 
            else if(t === 'Vehicle') { document.getElementById('inv-safe').value = opt.dataset.safe; document.getElementById('inv-max').value = opt.dataset.max; document.getElementById('inv-man').value = opt.dataset.man; }
        }
    });
    addBtn.addEventListener('click', () => {
        const type = invType.value;
        let specificName = invName.value.trim();
        let baseType = invBaseSelect.value;
        let finalName = specificName || baseType; 
        let stats = {};
        if (!finalName) return showNotification("Enter a name or select a type.");
        if(type === 'Weapon') { stats = { diff: document.getElementById('inv-diff').value, dmg: document.getElementById('inv-dmg').value, range: document.getElementById('inv-range').value, rate: document.getElementById('inv-rate').value, clip: document.getElementById('inv-clip').value }; } 
        else if(type === 'Armor') { stats = { rating: document.getElementById('inv-rating').value || 0, penalty: document.getElementById('inv-penalty').value || 0 }; } 
        else if(type === 'Vehicle') { stats = { safe: document.getElementById('inv-safe').value || 0, max: document.getElementById('inv-max').value || 0, man: document.getElementById('inv-man').value || 0 }; }
        if(!window.state.inventory) window.state.inventory = [];
        window.state.inventory.push({ name: baseType || finalName, displayName: finalName, baseType: baseType, type, stats, status: document.getElementById('inv-carried').checked ? 'carried' : 'owned' });
        invName.value = ""; invBaseSelect.value = "";
        document.querySelectorAll('#inv-stats-row input, #inv-armor-row input, #inv-vehicle-row input').forEach(i => i.value = "");
        window.renderInventoryList();
    });
}

function renderBloodBondRow() {
    const cont = document.getElementById('blood-bond-list'); if (!cont) return;
    const row = document.createElement('div'); row.className = 'flex gap-2 items-center border-b border-[#222] pb-2 advantage-row';
    row.innerHTML = `<select class="w-24 text-[10px] uppercase font-bold mr-2 border-b border-[#333] bg-transparent"><option value="Bond">Bond</option><option value="Vinculum">Vinculum</option></select><input type="text" placeholder="Bound to..." class="flex-1 text-xs"><input type="number" placeholder="Lvl" class="w-10 text-center text-xs" min="1" max="3"><div class="remove-btn">&times;</div>`;
    const typeSel = row.querySelector('select'); const nI = row.querySelector('input[type="text"]'); const rI = row.querySelector('input[type="number"]'); const del = row.querySelector('.remove-btn');
    if (cont.children.length === 0) del.style.visibility = 'hidden';
    const onUpd = () => {
        if (typeSel.value === 'Bond') { rI.max = 3; if(parseInt(rI.value) > 3) rI.value = 3; }
        if (typeSel.value === 'Vinculum') { rI.max = 10; if(parseInt(rI.value) > 10) rI.value = 10; }
        window.state.bloodBonds = Array.from(cont.querySelectorAll('.advantage-row')).map(r => ({ type: r.querySelector('select').value, name: r.querySelector('input[type="text"]').value, rating: r.querySelector('input[type="number"]').value })).filter(b => b.name);
        if (cont.lastElementChild === row && nI.value !== "") renderBloodBondRow();
        window.updatePools(); 
    };
    typeSel.onchange = onUpd; nI.onblur = onUpd; rI.onblur = onUpd; del.onclick = () => { row.remove(); onUpd(); };
    cont.appendChild(row);
}

// --- RESTORED FUNCTION ---
function renderDerangementsList() {
    const cont = document.getElementById('derangements-list');
    if (!cont) return;
    cont.innerHTML = '';

    window.state.derangements.forEach((d, idx) => {
        const row = document.createElement('div');
        row.className = "flex justify-between items-center text-xs text-white border-b border-[#333] py-1";
        row.innerHTML = `<span>${d}</span><span class="remove-btn text-red-500" onclick="window.removeDerangement(${idx})">&times;</span>`;
        cont.appendChild(row);
    });

    const addRow = document.createElement('div');
    addRow.className = "flex gap-2 mt-2";
    let options = `<option value="">+ Add Derangement</option>` + DERANGEMENTS.map(d => `<option value="${d}">${d}</option>`).join('');
    addRow.innerHTML = `
        <select id="derangement-select" class="flex-1 text-[10px] uppercase font-bold bg-black/40 border border-[#444] text-white p-1">
            ${options}
            <option value="Custom">Custom...</option>
        </select>
        <input type="text" id="derangement-custom" class="hidden flex-1 text-[10px] bg-black/40 border border-[#444] text-white p-1" placeholder="Type name...">
        <button id="add-derangement-btn" class="bg-[#8b0000] text-white px-2 py-1 text-[10px] font-bold hover:bg-red-700">ADD</button>
    `;
    cont.appendChild(addRow);

    const sel = document.getElementById('derangement-select');
    const inp = document.getElementById('derangement-custom');
    const btn = document.getElementById('add-derangement-btn');

    sel.onchange = () => {
        if (sel.value === 'Custom') {
            sel.classList.add('hidden');
            inp.classList.remove('hidden');
            inp.focus();
        }
    };

    btn.onclick = () => {
        let val = sel.value === 'Custom' ? inp.value : sel.value;
        if (val && val !== 'Custom') {
            window.state.derangements.push(val);
            renderDerangementsList();
            window.updatePools(); 
        }
    };
}

window.removeDerangement = (idx) => {
    window.state.derangements.splice(idx, 1);
    renderDerangementsList();
    window.updatePools();
};

function renderDynamicHavenRow() {
    const cont = document.getElementById('multi-haven-list'); if (!cont) return;
    const row = document.createElement('div'); row.className = 'border-b border-[#222] pb-4 advantage-row';
    row.innerHTML = `<div class="flex justify-between items-center mb-2"><input type="text" placeholder="Haven Title..." class="flex-1 text-[10px] font-bold text-gold uppercase !border-b !border-[#333]"><div class="remove-btn">&times;</div></div><input type="text" placeholder="Location..." class="text-xs mb-2 !border-b !border-[#333]"><textarea class="h-16 text-xs" placeholder="Details..."></textarea>`;
    const nameIn = row.querySelectorAll('input')[0]; const locIn = row.querySelectorAll('input')[1]; const descIn = row.querySelector('textarea'); const del = row.querySelector('.remove-btn');
    if (cont.children.length === 0) del.style.visibility = 'hidden';
    const onUpd = () => {
        window.state.havens = Array.from(cont.querySelectorAll('.advantage-row')).map(r => ({ name: r.querySelectorAll('input')[0].value, loc: r.querySelectorAll('input')[1].value, desc: r.querySelector('textarea').value })).filter(h => h.name || h.loc);
        if (cont.lastElementChild === row && nameIn.value !== "") renderDynamicHavenRow();
        window.updatePools(); 
    };
    [nameIn, locIn, descIn].forEach(el => el.onblur = onUpd); del.onclick = () => { row.remove(); onUpd(); };
    cont.appendChild(row);
}

function renderSocialProfileDescription(containerId, name) {
    const cont = document.getElementById(containerId); if (!cont) return;
    const safeId = 'desc-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const row = document.createElement('div'); row.className = 'mb-4 pb-2 border-b border-[#222]';
    row.innerHTML = `<label class="label-text text-gold">${name}</label><textarea id="${safeId}" class="h-16 text-xs" placeholder="Identity details for ${name}..."></textarea>`;
    cont.appendChild(row);
}

function updateBackgroundDescriptions() {
    const cont = document.getElementById('social-profile-list'); if (!cont) return;
    cont.innerHTML = ''; let hasBackgrounds = false;
    if (window.state.dots.back) { Object.entries(window.state.dots.back).forEach(([name, val]) => { if (val > 0) { renderSocialProfileDescription('social-profile-list', name); hasBackgrounds = true; } }); }
    if (!hasBackgrounds) cont.innerHTML = `<div class="col-span-1 md:col-span-2 text-center text-gray-500 italic py-10">Select Backgrounds in the Advantages section to add descriptions here.</div>`;
    hydrateInputs();
}

window.changeStep = function(s) {
    if (!window.state.furthestPhase || s > window.state.furthestPhase) { if (s > (window.state.furthestPhase || 0)) window.state.furthestPhase = s; }
    document.querySelectorAll('.step-container').forEach(c => c.classList.remove('active'));
    const prefix = window.state.isPlayMode ? 'play-mode-' : 'phase-';
    const target = document.getElementById(prefix + s);
    if (target) { target.classList.add('active'); window.state.currentPhase = s; }
    if (s === 5) updateBackgroundDescriptions();
    const nav = document.getElementById('sheet-nav');
    if (nav) {
        nav.innerHTML = '';
        if (window.state.isPlayMode) {
             const steps = ["Sheet", "Traits", "Social", "Biography"];
             steps.forEach((text, i) => {
                const it = document.createElement('div'); it.className = `nav-item ${window.state.currentPhase === (i+1) ? 'active' : ''}`;
                // Fallback text added in case FontAwesome fails
                it.innerHTML = `<i class="fas fa-scroll"></i><span style="display:block; font-size:9px; margin-top:2px;">${text}</span>`;
                it.onclick = () => window.changeStep(i+1); nav.appendChild(it);
            });
        } else {
            const furthest = window.state.furthestPhase || 1;
            STEPS_CONFIG.forEach(step => {
                const it = document.createElement('div'); let statusClass = '';
                if (step.id === s) statusClass = 'active'; else if (step.id < s) statusClass = 'completed'; else if (step.id <= furthest) statusClass = 'unlocked'; else statusClass = 'locked';
                it.className = `nav-item ${statusClass}`;
                // FORCE DISPLAY: Inline style to ensure visibility if icons fail
                it.innerHTML = `<div class="flex flex-col items-center justify-center w-full h-full"><i class="fas ${step.icon}"></i><span style="display:block !important; font-size:7px; text-transform:uppercase; margin-top:2px; opacity:1;">${step.label}</span></div>`;
                it.onclick = () => { if (step.id <= furthest) window.changeStep(step.id); };
                nav.appendChild(it);
            });
        }
    }
    window.updatePools();
};

window.toggleFreebieMode = function() {
     window.state.freebieMode = !window.state.freebieMode;
     document.body.classList.toggle('freebie-mode', window.state.freebieMode);
     const fbBtn = document.getElementById('toggle-freebie-btn');
     const fbBtnText = document.getElementById('freebie-btn-text');
     if (fbBtnText) fbBtnText.innerText = window.state.freebieMode ? "Exit Freebies" : "Freebies";
     if (fbBtn) { fbBtn.classList.toggle('bg-blue-900/40', window.state.freebieMode); fbBtn.classList.toggle('border-blue-500', window.state.freebieMode); fbBtn.classList.toggle('text-blue-200', window.state.freebieMode); }
     const mMsg = document.getElementById('merit-locked-msg'); const fMsg = document.getElementById('flaw-locked-msg');
     if(mMsg) mMsg.style.display = window.state.freebieMode ? 'none' : 'block';
     if(fMsg) fMsg.style.display = window.state.freebieMode ? 'none' : 'block';
     renderDynamicTraitRow('merits-list-create', 'Merit', V20_MERITS_LIST);
     renderDynamicTraitRow('flaws-list-create', 'Flaw', V20_FLAWS_LIST);
     window.updatePools(); 
};

window.toggleSidebarLedger = function() { document.getElementById('freebie-sidebar').classList.toggle('open'); };

window.togglePlayMode = function() {
    window.state.isPlayMode = !window.state.isPlayMode;
    document.body.classList.toggle('play-mode', window.state.isPlayMode);
    const pBtn = document.getElementById('play-mode-btn'); const pBtnText = document.getElementById('play-btn-text');
    if(pBtnText) pBtnText.innerText = window.state.isPlayMode ? "Edit" : "Play";
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (['save-filename', 'char-select', 'roll-diff', 'use-specialty', 'c-path-name', 'c-path-name-create', 'c-bearing-name', 'c-bearing-value'].includes(el.id)) return;
        el.disabled = window.state.isPlayMode;
    });
    if (window.state.isPlayMode) {
        const row = document.getElementById('play-concept-row');
        if (row) row.innerHTML = `<div><span class="label-text">Name:</span> <span class="text-white font-bold">${document.getElementById('c-name').value}</span></div><div><span class="label-text">Nature:</span> <span class="text-white font-bold">${document.getElementById('c-nature').value}</span></div><div><span class="label-text">Clan:</span> <span class="text-white font-bold">${document.getElementById('c-clan').value}</span></div><div><span class="label-text">Player:</span> <span class="text-white font-bold">${document.getElementById('c-player').value}</span></div><div><span class="label-text">Demeanor:</span> <span class="text-white font-bold">${document.getElementById('c-demeanor').value}</span></div><div><span class="label-text">Generation:</span> <span class="text-white font-bold">${document.getElementById('c-gen').value}</span></div>`;
        const ra = document.getElementById('play-row-attr'); ra.innerHTML = '';
        Object.entries(ATTRIBUTES).forEach(([c,l]) => { const s = document.createElement('div'); s.className='sheet-section !mt-0'; s.innerHTML=`<div class="column-title">${c}</div>`; l.forEach(a=>renderRow(s,a,'attr',1)); ra.appendChild(s); });
        const rb = document.getElementById('play-row-abil'); rb.innerHTML = '';
        Object.entries(ABILITIES).forEach(([c,l]) => { const s = document.createElement('div'); s.className='sheet-section !mt-0'; s.innerHTML=`<div class="column-title">${c}</div>`; l.forEach(a=>renderRow(s,a,'abil',0)); rb.appendChild(s); });
        const rc = document.getElementById('play-row-adv'); rc.innerHTML = '';
        const ds = document.createElement('div'); ds.className='sheet-section !mt-0'; ds.innerHTML='<div class="column-title">Disciplines</div>';
        Object.entries(window.state.dots.disc).forEach(([n,v]) => { if(v>0) renderRow(ds,n,'disc',0); }); rc.appendChild(ds);
        const bs = document.createElement('div'); bs.className='sheet-section !mt-0'; bs.innerHTML='<div class="column-title">Backgrounds</div>';
        Object.entries(window.state.dots.back).forEach(([n,v]) => { if(v>0) renderRow(bs,n,'back',0); }); rc.appendChild(bs);
        const vs = document.createElement('div'); vs.className='sheet-section !mt-0'; vs.innerHTML='<div class="column-title">Virtues</div>';
        VIRTUES.forEach(v => renderRow(vs, v, 'virt', 1)); rc.appendChild(vs);
        const pg = document.getElementById('play-social-grid'); if(pg) {
            pg.innerHTML = ''; BACKGROUNDS.forEach(s => { const dots = window.state.dots.back[s] || 0; const safeId = 'desc-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-'); const el = document.getElementById(safeId); const txt = el ? el.value : ""; if(dots || txt) pg.innerHTML += `<div class="border-l-2 border-[#333] pl-4 mb-4"><div class="flex justify-between items-center"><label class="label-text text-gold">${s}</label><div class="text-[8px] font-bold text-white">${renderDots(dots,5)}</div></div><div class="text-xs text-gray-200 mt-1">${txt || "No description."}</div></div>`; });
        }
        const pb = document.getElementById('play-blood-bonds'); if(pb) {
            pb.innerHTML = ''; window.state.bloodBonds.forEach(b => { const label = b.type === 'Bond' ? (b.rating == 3 ? 'Full Bond' : `Drink ${b.rating}`) : `Vinculum ${b.rating}`; pb.innerHTML += `<div class="flex justify-between border-b border-[#222] py-1 text-xs"><span>${b.name}</span><span class="text-gold font-bold">${label}</span></div>`; });
        }
        const mf = document.getElementById('merit-flaw-rows-play'); if(mf) {
            mf.innerHTML = ''; if(window.state.merits) window.state.merits.forEach(m => { mf.innerHTML += `<div class="flex justify-between text-xs py-1 border-b border-[#222]"><span>${m.name}</span><span class="text-red-400 font-bold">${m.val}</span></div>`; }); if(window.state.flaws) window.state.flaws.forEach(f => { mf.innerHTML += `<div class="flex justify-between text-xs py-1 border-b border-[#222]"><span>${f.name}</span><span class="text-green-400 font-bold">${f.val}</span></div>`; });
        }
        const ot = document.getElementById('other-traits-rows-play'); if(ot) {
            ot.innerHTML = ''; Object.entries(window.state.dots.other).forEach(([n,v]) => { if(v>0) renderRow(ot, n, 'other', 0); });
        }
        const plv = document.getElementById('play-vitals-list'); if(plv) {
            plv.innerHTML = ''; VIT.forEach(v => { const val = document.getElementById('bio-' + v)?.value; if(val) plv.innerHTML += `<div class="flex justify-between border-b border-[#222] py-1 font-bold"><span class="text-gray-400">${v.replace('-',' ')}:</span> <span>${val}</span></div>`; });
        }
        const cp = document.getElementById('combat-rows-play'); if(cp) {
            cp.innerHTML = ''; const standards = [{n:'Bite',diff:5,dmg:'Str+1(A)'}, {n:'Clinch',diff:6,dmg:'Str(B)'}, {n:'Grapple',diff:6,dmg:'Str(B)'}, {n:'Kick',diff:7,dmg:'Str+1(B)'}, {n:'Punch',diff:6,dmg:'Str(B)'}, {n:'Tackle',diff:7,dmg:'Str+1(B)'}];
            standards.forEach(s => { const r = document.createElement('tr'); r.className='border-b border-[#222] text-[10px] text-gray-500'; r.innerHTML = `<td class="p-2 font-bold text-white">${s.n}</td><td class="p-2">${s.diff}</td><td class="p-2">${s.dmg}</td><td class="p-2">-</td><td class="p-2">-</td><td class="p-2">-</td>`; cp.appendChild(r); });
            if(window.state.inventory) { window.state.inventory.filter(i => i.type === 'Weapon' && i.status === 'carried').forEach(w => { let display = w.displayName || w.name; const r = document.createElement('tr'); r.className='border-b border-[#222] text-[10px]'; r.innerHTML = `<td class="p-2 font-bold text-gold">${display}</td><td class="p-2 text-white">${w.stats.diff}</td><td class="p-2 text-white">${w.stats.dmg}</td><td class="p-2">${w.stats.range}</td><td class="p-2">${w.stats.rate}</td><td class="p-2">${w.stats.clip}</td>`; cp.appendChild(r); }); }
        }
        if(document.getElementById('rituals-list-play')) document.getElementById('rituals-list-play').innerText = document.getElementById('rituals-list-create-ta').value;
        let carried = []; let owned = []; if(window.state.inventory) { window.state.inventory.forEach(i => { const str = `${i.displayName || i.name} ${i.type === 'Armor' ? `(R:${i.stats.rating} P:${i.stats.penalty})` : ''}`; if(i.status === 'carried') carried.push(str); else owned.push(str); }); }
        setSafeText('play-gear-carried', carried.join(', ')); setSafeText('play-gear-owned', owned.join(', '));
        if(document.getElementById('play-bio-desc')) document.getElementById('play-bio-desc').innerText = document.getElementById('bio-desc').value;
        if(document.getElementById('play-derangements')) { const pd = document.getElementById('play-derangements'); pd.innerHTML = window.state.derangements.length > 0 ? window.state.derangements.map(d => `<div>• ${d}</div>`).join('') : '<span class="text-gray-500 italic">None</span>'; }
        if(document.getElementById('play-languages')) document.getElementById('play-languages').innerText = document.getElementById('bio-languages').value;
        if(document.getElementById('play-goals-st')) document.getElementById('play-goals-st').innerText = document.getElementById('bio-goals-st').value;
        if(document.getElementById('play-goals-lt')) document.getElementById('play-goals-lt').innerText = document.getElementById('bio-goals-lt').value;
        if(document.getElementById('play-history')) document.getElementById('play-history').innerText = document.getElementById('char-history').value;
        const feedSrc = document.getElementById('inv-feeding-grounds'); if (feedSrc) setSafeText('play-feeding-grounds', feedSrc.value);
        if(document.getElementById('armor-rating-play')) { let totalA = 0; let totalP = 0; let names = []; if(window.state.inventory) { window.state.inventory.filter(i => i.type === 'Armor' && i.status === 'carried').forEach(a => { totalA += parseInt(a.stats?.rating)||0; totalP += parseInt(a.stats?.penalty)||0; names.push(a.displayName || a.name); }); } setSafeText('armor-rating-play', totalA); setSafeText('armor-penalty-play', totalP); setSafeText('armor-desc-play', names.join(', ')); }
        if (document.getElementById('play-vehicles')) { const pv = document.getElementById('play-vehicles'); pv.innerHTML = ''; if (window.state.inventory) { window.state.inventory.filter(i => i.type === 'Vehicle').forEach(v => { let display = v.displayName || v.name; pv.innerHTML += `<div class="mb-2 border-b border-[#333] pb-1"><div class="font-bold text-white uppercase text-[10px]">${display}</div><div class="text-[9px] text-gray-400">Safe:${v.stats.safe} | Max:${v.stats.max} | Man:${v.stats.man}</div></div>`; }); } }
        if (document.getElementById('play-havens-list')) { const ph = document.getElementById('play-havens-list'); ph.innerHTML = ''; window.state.havens.forEach(h => { ph.innerHTML += `<div class="border-l-2 border-gold pl-4 mb-4"><div class="flex justify-between"><div><div class="font-bold text-white uppercase text-[10px]">${h.name}</div><div class="text-[9px] text-gold italic">${h.loc}</div></div></div><div class="text-xs text-gray-400 mt-1">${h.desc}</div></div>`; }); }
        
        // --- SWITCH TO PLAY MODE START ---
        window.changeStep(1);
    } else {
        // --- RESTORE EDIT MODE VIEW ---
        // If coming back from play mode, restore the last known edit phase (or 1)
        window.changeStep(window.state.furthestPhase || 1);
    }
};

// --- INITIALIZATION (Safeguarded) ---

// 1. Initial UI Setup (Runs Immediately)
try {
    // --- SAFEGUARD: CHECK IF NAV EXISTS ---
    if (!document.getElementById('sheet-nav')) throw new Error("Navigation container 'sheet-nav' is missing from HTML.");

    // --- VERSION CHECK ---
    const vSpan = document.getElementById('app-version');
    if(vSpan) vSpan.innerText = APP_VERSION;

    // --- SAFEGUARD: Wrap DOM logic ---
    const s1 = document.getElementById('list-attr-physical');
    if (s1) {
        Object.keys(ATTRIBUTES).forEach(c => ATTRIBUTES[c].forEach(a => { window.state.dots.attr[a] = 1; renderRow('list-attr-'+c.toLowerCase(), a, 'attr', 1); }));
        Object.keys(ABILITIES).forEach(c => ABILITIES[c].forEach(a => { window.state.dots.abil[a] = 0; renderRow('list-abil-'+c.toLowerCase(), a, 'abil', 0); }));
    }
    
    renderDynamicAdvantageRow('list-disc', 'disc', DISCIPLINES);
    renderDynamicAdvantageRow('list-back', 'back', BACKGROUNDS);
    renderDynamicAdvantageRow('custom-talents', 'abil', [], true);
    renderDynamicAdvantageRow('custom-skills', 'abil', [], true);
    renderDynamicAdvantageRow('custom-knowledges', 'abil', [], true);
    renderDerangementsList(); 
    VIRTUES.forEach(v => { window.state.dots.virt[v] = 1; renderRow('list-virt', v, 'virt', 1); });
    const vitalCont = document.getElementById('vitals-create-inputs');
    if(vitalCont) VIT.forEach(v => { const d = document.createElement('div'); d.innerHTML = `<label class="label-text">${v}</label><input type="text" id="bio-${v}">`; vitalCont.appendChild(d); });
    renderDynamicTraitRow('merits-list-create', 'Merit', V20_MERITS_LIST);
    renderDynamicTraitRow('flaws-list-create', 'Flaw', V20_FLAWS_LIST);
    window.renderInventoryList();
    
    const otherT = document.getElementById('other-traits-rows-create');
    if(otherT) for(let i=0; i<8; i++) {
        const d2 = document.createElement('div'); d2.className = 'flex items-center gap-2 mb-2';
        d2.innerHTML = `<input type="text" id="ot-n-${i}" placeholder="Other..." class="w-40 text-[11px] font-bold"><div class="dot-row" id="ot-dr-${i}"></div>`;
        otherT.appendChild(d2);
        const dr = d2.querySelector('.dot-row'); dr.innerHTML = renderDots(0, 5);
        dr.onclick = (e) => { const n = document.getElementById(`ot-n-${i}`).value || `Other_${i}`; if(e.target.classList.contains('dot')) { let v = parseInt(e.target.dataset.v); const currentVal = window.state.dots.other[n] || 0; if (v === currentVal) v = v - 1; window.state.dots.other[n] = v; dr.innerHTML = renderDots(v, 5); } };
    }
    
    document.querySelectorAll('.prio-btn').forEach(b => b.onclick = (e) => {
        const {cat, group, v} = e.target.dataset;
        const catGroups = cat === 'attr' ? ['Physical', 'Social', 'Mental'] : ['Talents', 'Skills', 'Knowledges'];
        catGroups.forEach(g => {
            if (window.state.prios[cat][g] === parseInt(v)) {
                window.state.prios[cat][g] = null;
                if (cat === 'attr') { ATTRIBUTES[g].forEach(a => window.state.dots.attr[a] = 1); ATTRIBUTES[g].forEach(a => { const row = document.querySelector(`.dot-row[data-n="${a}"][data-t="attr"]`); if(row) row.innerHTML = renderDots(1, 5); }); } 
                else { ABILITIES[g].forEach(a => window.state.dots.abil[a] = 0); if (window.state.customAbilityCategories) { Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => { if (c === g) window.state.dots.abil[name] = 0; }); } ABILITIES[g].forEach(a => { const row = document.querySelector(`.dot-row[data-n="${a}"][data-t="abil"]`); if(row) row.innerHTML = renderDots(0, 5); }); const allCustom = document.querySelectorAll('#custom-talents .advantage-row, #custom-skills .advantage-row, #custom-knowledges .advantage-row'); allCustom.forEach(r => { const dot = r.querySelector('.dot-row'); if(dot) dot.innerHTML = renderDots(0,5); }); }
            }
        });
        window.state.prios[cat][group] = parseInt(v);
        document.querySelectorAll(`.prio-btn[data-cat="${cat}"]`).forEach(el => { const isActive = window.state.prios[cat][el.dataset.group] == el.dataset.v; el.classList.toggle('active', isActive); });
        window.updatePools();
    });
    renderBloodBondRow();
    renderDynamicHavenRow();
    
    // BIND NEW FILE MANAGER BUTTONS
    const cmdNew = document.getElementById('cmd-new');
    if(cmdNew) cmdNew.onclick = window.handleNew;
    
    const cmdSave = document.getElementById('cmd-save');
    if(cmdSave) cmdSave.onclick = window.handleSaveClick;
    
    const cmdLoad = document.getElementById('cmd-load');
    if(cmdLoad) cmdLoad.onclick = window.handleLoadClick;
    
    const confirmSave = document.getElementById('confirm-save-btn');
    if(confirmSave) confirmSave.onclick = window.performSave;
    
    // --- NEW: WIRE UP TOP TOGGLE BUTTONS ---
    const topPlayBtn = document.getElementById('play-mode-btn');
    if(topPlayBtn) topPlayBtn.onclick = window.togglePlayMode;
    
    const topFreebieBtn = document.getElementById('toggle-freebie-btn');
    if(topFreebieBtn) topFreebieBtn.onclick = window.toggleFreebieMode;
    // ---------------------------------------
    
    // Render the initial UI
    window.changeStep(1); 
} catch(e) {
    console.error("UI Init Error:", e);
    const notif = document.getElementById('notification');
    if(notif) { notif.innerText = "CRITICAL INIT ERROR: " + e.message; notif.style.display = 'block'; }
}

// 2. Auth & Database (Runs Async)
onAuthStateChanged(auth, async (u) => {
    if(u) {
        user = u;
        const loader = document.getElementById('loading-overlay');
        if(loader) loader.style.display = 'none';

        try {
            // SAFEGUARDED UI POPULATION
            const ns = document.getElementById('c-nature');
            const ds = document.getElementById('c-demeanor');
            const cs = document.getElementById('c-clan');

            // Only populate if elements exist
            if(ns && ds && typeof ARCHETYPES !== 'undefined') {
                const sortedArch = [...ARCHETYPES].sort(); 
                ns.innerHTML = ''; ds.innerHTML = ''; 
                sortedArch.forEach(a => { 
                    ns.add(new Option(a,a)); 
                    if(ds) ds.add(new Option(a,a)); 
                });
            }

            if(cs && typeof CLANS !== 'undefined') {
                const sortedClans = [...CLANS].sort();
                cs.innerHTML = '';
                sortedClans.forEach(c => cs.add(new Option(c,c)));
            }

            const ps1 = document.getElementById('c-path-name');
            const ps2 = document.getElementById('c-path-name-create');
            
            if (typeof PATHS !== 'undefined') {
                if(ps1) { ps1.innerHTML = ''; PATHS.forEach(p => ps1.add(new Option(p,p))); }
                if(ps2) { ps2.innerHTML = ''; PATHS.forEach(p => ps2.add(new Option(p,p))); }
            }

            // Safe Event Listeners
            if(ps1) ps1.addEventListener('change', (e) => { 
                if(ps2) ps2.value = e.target.value; 
                if(window.state.textFields) window.state.textFields['c-path-name'] = e.target.value; 
            });
            
            if(ps2) ps2.addEventListener('change', (e) => { 
                if(ps1) ps1.value = e.target.value; 
                if(window.state.textFields) window.state.textFields['c-path-name'] = e.target.value; 
            });

            const freebieInp = document.getElementById('c-freebie-total');
            if(freebieInp) freebieInp.oninput = window.updatePools;

        } catch (dbErr) {
            console.error("DB Init Error:", dbErr);
            showNotification("DB Conn Error (UI Active)");
        }
    } else {
        // Anonymous Sign In
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
    }
});
