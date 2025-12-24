import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- IMPORT V20 DATA ---
import { 
    APP_VERSION, CLANS, ARCHETYPES, ATTRIBUTES, ABILITIES, BACKGROUNDS, 
    DISCIPLINES, VIRTUES, PATHS, VIT, HEALTH_STATES, GEN_LIMITS, 
    SPECIALTY_EXAMPLES, DERANGEMENTS, V20_MERITS_LIST, V20_FLAWS_LIST, 
    V20_WEAPONS_LIST, V20_ARMOR_LIST, V20_VEHICLE_LIST 
} from './data.js';

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

const setSafeText = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
function showNotification(msg) { const el = document.getElementById('notification'); if (el) { el.innerText = msg; el.style.display = 'block'; setTimeout(() => { el.style.display = 'none'; }, 3000); } }

function syncInputs() {
    document.querySelectorAll('input:not([type="checkbox"]), select, textarea').forEach(el => {
        if (el.id && !el.id.startsWith('inv-') && !el.id.startsWith('merit-') && !el.id.startsWith('flaw-') && !el.id.startsWith('save-') && !el.closest('.combat-row') && !el.classList.contains('specialty-input')) window.state.textFields[el.id] = el.value;
    });
}

function hydrateInputs() {
    Object.entries(window.state.textFields || {}).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val; });
}

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

// --- RESTORED setDots FUNCTION ---
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
    
    // Force refresh if potential specialty triggered
    if (newVal >= 4 || currentVal >= 4) window.changeStep(window.state.currentPhase);
}

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

const STEPS_CONFIG = [
    { id: 1, icon: 'fa-id-card', label: 'Concept', msg: 'Define your Identity' },
    { id: 2, icon: 'fa-hand-fist', label: 'Attributes', msg: 'Assign Attribute Points' },
    { id: 3, icon: 'fa-graduation-cap', label: 'Abilities', msg: 'Assign Ability Points' },
    { id: 4, icon: 'fa-bolt', label: 'Advantages', msg: 'Select Advantages' },
    { id: 5, icon: 'fa-users', label: 'Social', msg: 'Detail Backgrounds' },
    { id: 6, icon: 'fa-box-open', label: 'Gear', msg: 'Manage Inventory' },
    { id: 7, icon: 'fa-brain', label: 'Bio', msg: 'Flesh out History' },
    { id: 8, icon: 'fa-check-circle', label: 'Finish', msg: 'Finalize Character' }
];

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

function renderInventoryList() {
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

function renderRow(contId, label, type, min, max = 5) {
    const cont = typeof contId === 'string' ? document.getElementById(contId) : contId;
    if (!cont) return;
    const val = window.state.dots[type][label] || min;
    const div = document.createElement('div'); div.className = 'flex flex-col py-1';
    
    // Updated HTML structure for renderRow to include specialty input
    
    let labelHtml = `<span class="trait-label uppercase text-sm font-bold">${label}</span>`;
    
    // Play Mode: Inline display of Specialty
    if (window.state.isPlayMode && val >= 4 && window.state.specialties && window.state.specialties[label]) {
        labelHtml = `
            <div class="flex items-center gap-1">
                <span class="trait-label uppercase text-sm font-bold">${label}</span>
                <span class="text-xs italic text-gray-400">(${window.state.specialties[label]})</span>
            </div>
        `;
    }

    div.innerHTML = `
        <div class="flex justify-between items-center w-full">
            ${labelHtml}
            <div class="dot-row" data-n="${label}" data-t="${type}">${renderDots(val, max)}</div>
        </div>
    `;
    
    // Specialty Input Logic (V1.13 - Filtered Edit Mode Only)
    // Only show input if in Edit Mode (NOT play mode) AND rating is 4+
    if (val >= 4 && !window.state.isPlayMode) {
        const specDiv = document.createElement('div');
        specDiv.className = 'w-full mt-1';
        const specVal = window.state.specialties[label] || "";
        const listId = `list-${label.replace(/\s+/g, '')}`;
        
        let optionsHTML = '';
        if (SPECIALTY_EXAMPLES[label]) {
            optionsHTML = SPECIALTY_EXAMPLES[label].map(s => `<option value="${s}">`).join('');
        }
        
        specDiv.innerHTML = `
            <input type="text" list="${listId}" class="specialty-input w-full text-[9px] bg-transparent border-b border-gray-700 text-[#d4af37] italic pl-2" placeholder="Select or type Specialty..." value="${specVal}">
            <datalist id="${listId}">${optionsHTML}</datalist>
        `;
        
        const input = specDiv.querySelector('input');
        input.onblur = (e) => {
            window.state.specialties[label] = e.target.value;
            window.updatePools(); // Refresh to ensure data state is saved/synced
        };
        
        div.appendChild(specDiv);
    }

    div.querySelector('.trait-label').onclick = () => { if(window.state.isPlayMode) window.handleTraitClick(label, type); };
    div.querySelector('.dot-row').onclick = (e) => { if (e.target.dataset.v) setDots(label, type, parseInt(e.target.dataset.v), min, max); };
    cont.appendChild(div);
}

window.handleTraitClick = function(name, type) {
    const val = window.state.dots[type][name] || 0;
    const existingIdx = window.state.activePool.findIndex(p => p.name === name);
    if (existingIdx > -1) window.state.activePool.splice(existingIdx, 1);
    else { if (window.state.activePool.length >= 2) window.state.activePool.shift(); window.state.activePool.push({name, val}); }
    document.querySelectorAll('.trait-label').forEach(el => el.classList.toggle('selected', window.state.activePool.some(p => p.name === el.innerText)));
    const display = document.getElementById('pool-display');
    if (window.state.activePool.length > 0) {
        setSafeText('pool-display', window.state.activePool.map(p => `${p.name} (${p.val})`).join(' + '));
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
        const row = document.createElement('div'); row.className = 'flex flex-col gap-1 mb-2 advantage-row';
        const head = document.createElement('div'); head.className = 'flex justify-between items-center';
        let inputField;
        
        // V1.13 Change: Only apply bold styling to label text for consistency
        let labelClass = "flex-1 mr-4 text-[11px] font-bold uppercase";
        
        if (isAbil) { 
            // Play Mode inline specialty display logic for Custom Abilities
             if (window.state.isPlayMode && name && (window.state.dots[type][name] || 0) >= 4 && window.state.specialties[name]) {
                 // Inline Display mode
                 inputField = document.createElement('div');
                 inputField.className = labelClass;
                 inputField.innerHTML = `${name} <span class="text-[9px] italic text-gray-400">(${window.state.specialties[name]})</span>`;
             } else {
                 // Standard Input mode
                inputField = document.createElement('input'); inputField.type = 'text'; inputField.placeholder = "Write-in..."; inputField.className = labelClass + ' !bg-black/20 !border-b !border-[#333]'; inputField.value = name; 
             }
        } 
        else { 
            inputField = document.createElement('select'); inputField.className = labelClass; inputField.innerHTML = `<option value="">-- Choose ${type} --</option>` + list.map(item => `<option value="${item}" ${item === name ? 'selected' : ''}>${item}</option>`).join(''); 
        }
        
        const dotCont = document.createElement('div'); dotCont.className = 'dot-row';
        const val = name ? (window.state.dots[type][name] || 0) : 0;
        dotCont.innerHTML = renderDots(val, 5);
        if (name) { dotCont.dataset.n = name; dotCont.dataset.t = type; }
        const removeBtn = document.createElement('div'); removeBtn.className = 'remove-btn'; removeBtn.innerHTML = '&times;';
        if (!name) removeBtn.style.visibility = 'hidden';
        let curName = name;
        let category = null;
        if (containerId === 'custom-talents') category = 'Talents'; else if (containerId === 'custom-skills') category = 'Skills'; else if (containerId === 'custom-knowledges') category = 'Knowledges';
        
        const onUpdate = (newVal) => {
            if (curName && curName !== newVal) { 
                const dots = window.state.dots[type][curName]; delete window.state.dots[type][curName]; 
                if (window.state.customAbilityCategories && window.state.customAbilityCategories[curName]) delete window.state.customAbilityCategories[curName];
                if (newVal) window.state.dots[type][newVal] = dots || 0; 
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
        
        if (isAbil) {
             if(inputField.tagName === 'INPUT') inputField.onblur = (e) => onUpdate(e.target.value); 
        } else {
            inputField.onchange = (e) => onUpdate(e.target.value);
        }
        
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
        head.appendChild(inputField); head.appendChild(dotCont); head.appendChild(removeBtn);
        row.appendChild(head); 
        
        // Custom trait specialty injection logic (V1.13 - Filtered for Abilities only)
        // Ensure this ONLY runs for 'abil' type and NOT 'disc' or 'back' or 'virt'
        if (type === 'abil' && curName && (window.state.dots[type][curName] || 0) >= 4 && !window.state.isPlayMode) {
             const specDiv = document.createElement('div');
             specDiv.className = 'w-full mt-1 ml-1';
             const specVal = window.state.specialties[curName] || "";
             // Use generic list for custom items
             const listId = `list-${curName.replace(/[^a-zA-Z0-9]/g, '')}`;
             let optionsHTML = '';
             if (SPECIALTY_EXAMPLES[curName]) {
                 optionsHTML = SPECIALTY_EXAMPLES[curName].map(s => `<option value="${s}">`).join('');
             }
             
             specDiv.innerHTML = `
                <input type="text" list="${listId}" class="specialty-input w-full text-[9px] bg-transparent border-b border-gray-700 text-[#d4af37] italic pl-2" placeholder="Specialty..." value="${specVal}">
                <datalist id="${listId}">${optionsHTML}</datalist>
             `;
             
             const input = specDiv.querySelector('input');
             input.onblur = (e) => { window.state.specialties[curName] = e.target.value; window.updatePools(); };
             row.appendChild(specDiv);
        }
        
        container.appendChild(row);
    };
    existingItems.forEach(item => buildRow(item));
    buildRow();
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
