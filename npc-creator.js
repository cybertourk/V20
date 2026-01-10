import { GhoulTemplate } from "./npc-ghoul.js";
import { 
    ATTRIBUTES, ABILITIES, VIRTUES, DISCIPLINES, BACKGROUNDS, 
    ARCHETYPES, CLANS, SPECIALTY_EXAMPLES as SPECIALTIES,
    V20_MERITS_LIST, V20_FLAWS_LIST, VIT 
} from "./data.js";
import { renderDots, showNotification } from "./ui-common.js";

// Registry of available templates
const TEMPLATES = {
    'ghoul': GhoulTemplate
    // Future: 'mortal': MortalTemplate, 'animal': AnimalTemplate
};

// State
let activeNpc = null;
let currentTemplate = null;
let activeIndex = null;
let currentTab = 'step1';
let modes = { xp: false, freebie: false };
let localPriorities = {
    attr: { Physical: null, Social: null, Mental: null },
    abil: { Talents: null, Skills: null, Knowledges: null }
};

// --- INITIALIZATION ---

export function openNpcCreator(typeKey = 'ghoul', dataOrEvent = null, index = null) {
    console.log(`Opening NPC Creator for type: ${typeKey}`);
    
    currentTemplate = TEMPLATES[typeKey];
    if (!currentTemplate) {
        console.error("Unknown NPC Template:", typeKey);
        return;
    }

    let incomingData = null;
    const isEvent = dataOrEvent && (typeof dataOrEvent.preventDefault === 'function');
    if (dataOrEvent && !isEvent) incomingData = dataOrEvent;

    activeIndex = (typeof index === 'number') ? index : null;
    currentTab = 'step1';
    modes = { xp: false, freebie: false };
    resetPriorities();

    if (incomingData) {
        // Edit Mode
        activeNpc = JSON.parse(JSON.stringify(incomingData));
        sanitizeNpcData(activeNpc);
        if (activeNpc.priorities) localPriorities = JSON.parse(JSON.stringify(activeNpc.priorities));
        else autoDetectPriorities();
    } else {
        // Create Mode
        activeNpc = JSON.parse(JSON.stringify(currentTemplate.defaults));
        activeNpc.template = typeKey;
        sanitizeNpcData(activeNpc);
        recalcStatus();
    }

    renderEditorModal();
}

function sanitizeNpcData(npc) {
    ['attributes', 'abilities', 'disciplines', 'backgrounds', 'specialties', 'merits', 'flaws', 'bio'].forEach(k => { 
        if (!npc[k]) npc[k] = {}; 
    });
    if (!npc.experience) npc.experience = { total: 0, spent: 0, log: [] };
    
    // Ensure defaults from global data exist
    if (ATTRIBUTES) Object.values(ATTRIBUTES).flat().forEach(a => { if (npc.attributes[a] === undefined) npc.attributes[a] = 1; });
    if (ABILITIES) Object.values(ABILITIES).flat().forEach(a => { if (npc.abilities[a] === undefined) npc.abilities[a] = 0; });
}

function resetPriorities() {
    localPriorities = {
        attr: { Physical: null, Social: null, Mental: null },
        abil: { Talents: null, Skills: null, Knowledges: null }
    };
}

function autoDetectPriorities() {
    // Helper to reverse engineer priorities from existing data
    const sumGroup = (cat, groupList, isAttr) => {
        let sum = 0;
        groupList.forEach(k => {
            const val = isAttr ? (activeNpc.attributes[k] || 1) : (activeNpc.abilities[k] || 0);
            sum += isAttr ? Math.max(0, val - 1) : val;
        });
        return sum;
    };

    const pConfig = currentTemplate.getPriorities();

    ['attr', 'abil'].forEach(cat => {
        const groups = cat === 'attr' ? ['Physical', 'Social', 'Mental'] : ['Talents', 'Skills', 'Knowledges'];
        const sums = groups.map(g => ({ 
            grp: g, 
            val: sumGroup(cat, cat === 'attr' ? ATTRIBUTES[g] : ABILITIES[g], cat === 'attr') 
        })).sort((a, b) => b.val - a.val);

        sums.forEach((item, idx) => {
            if (pConfig[cat][idx] !== undefined) {
                localPriorities[cat][item.grp] = pConfig[cat][idx];
            }
        });
    });
}

function recalcStatus() {
    // Basic sync for Conscience/Self-Control -> Humanity
    const baseHum = (activeNpc.virtues.Conscience || 1) + (activeNpc.virtues["Self-Control"] || 1);
    const baseWill = activeNpc.virtues.Courage || 1;
    
    if (activeNpc.humanity < baseHum) activeNpc.humanity = baseHum;
    if (activeNpc.willpower < baseWill) activeNpc.willpower = baseWill;
}

// --- RENDER UI ---

function renderEditorModal() {
    let modal = document.getElementById('npc-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'npc-modal';
        modal.className = 'fixed inset-0 bg-black/90 z-[100] flex items-center justify-center hidden';
        document.body.appendChild(modal);
    }

    // Common Options
    const archOptions = (ARCHETYPES || []).sort().map(a => `<option value="${a}">${a}</option>`).join('');
    const clanOptions = (CLANS || []).sort().map(c => `<option value="${c}">${c}</option>`).join('');

    // Specific Template HTML
    const extrasHtml = currentTemplate.renderIdentityExtras ? currentTemplate.renderIdentityExtras(activeNpc, clanOptions) : '';

    modal.innerHTML = `
        <div class="w-[95%] max-w-7xl h-[95%] bg-[#0a0a0a] border-2 border-[#8b0000] shadow-[0_0_50px_rgba(139,0,0,0.5)] flex flex-col relative font-serif">
            
            <!-- HEADER -->
            <div class="bg-[#1a0505] p-4 border-b border-[#444] flex justify-between items-center shrink-0">
                <div class="flex items-center gap-4">
                    <h2 class="text-2xl font-cinzel text-[#d4af37] font-bold tracking-widest uppercase shadow-black drop-shadow-md">
                        <i class="fas fa-user-edit mr-2 text-[#8b0000]"></i>${currentTemplate.label}
                    </h2>
                    <div class="ml-6 flex items-center gap-2 border-l border-[#444] pl-4">
                         <button id="toggle-fb-mode" class="text-[10px] uppercase font-bold px-3 py-1 border border-[#444] rounded transition-all">
                            <i class="fas fa-star mr-1"></i> Freebie Mode
                        </button>
                        <button id="toggle-xp-mode" class="text-[10px] uppercase font-bold px-3 py-1 border border-[#444] rounded transition-all">
                            <i class="fas fa-hourglass-half mr-1"></i> XP Mode
                        </button>
                    </div>
                </div>
                <button id="close-npc-modal" class="text-gray-400 hover:text-white text-xl px-2"><i class="fas fa-times"></i></button>
            </div>

            <!-- TABS -->
            <div class="flex border-b border-[#333] bg-[#050505] text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                ${renderTabButton('step1', '1. Concept')}
                ${renderTabButton('step2', '2. Attributes')}
                ${renderTabButton('step3', '3. Abilities')}
                ${renderTabButton('step4', '4. Advantages')}
                ${renderTabButton('stepBio', '5. Biography')}
            </div>

            <!-- CONTENT AREA -->
            <div class="flex-1 overflow-hidden relative flex">
                <div class="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar bg-[#050505] bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]">
                    
                    <!-- STEP 1: IDENTITY -->
                    <div id="step1" class="npc-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Concept & Identity</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div class="space-y-6">
                                    <div><label class="label-text text-[#d4af37]">Name</label><input type="text" id="npc-name" value="${activeNpc.name || ''}" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"></div>
                                    <div><label class="label-text text-[#d4af37]">Player</label><input type="text" id="npc-player" value="${activeNpc.player || ''}" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"></div>
                                    <div><label class="label-text text-[#d4af37]">Domitor Name</label><input type="text" id="npc-domitor" value="${activeNpc.domitor || ''}" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"></div>
                                </div>
                                <div class="space-y-6">
                                    <div>
                                        <label class="label-text text-[#d4af37]">Nature</label>
                                        <select id="npc-nature" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"><option value="">Select...</option>${archOptions}</select>
                                    </div>
                                    <div>
                                        <label class="label-text text-[#d4af37]">Demeanor</label>
                                        <select id="npc-demeanor" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"><option value="">Select...</option>${archOptions}</select>
                                    </div>
                                    <div><label class="label-text text-[#d4af37]">Concept</label><input type="text" id="npc-concept" value="${activeNpc.concept || ''}" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"></div>
                                </div>
                                <!-- Template Extras -->
                                ${extrasHtml}
                            </div>
                        </div>
                    </div>

                    <!-- STEP 2: ATTRIBUTES -->
                    <div id="step2" class="npc-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Attributes</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                                ${renderAttributeColumn('Physical')}
                                ${renderAttributeColumn('Social')}
                                ${renderAttributeColumn('Mental')}
                            </div>
                        </div>
                    </div>

                    <!-- STEP 3: ABILITIES -->
                    <div id="step3" class="npc-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Abilities</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                                ${renderAbilityColumn('Talents')}
                                ${renderAbilityColumn('Skills')}
                                ${renderAbilityColumn('Knowledges')}
                            </div>
                        </div>
                    </div>

                    <!-- STEP 4: ADVANTAGES -->
                    <div id="step4" class="npc-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Advantages</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div>
                                    <h3 class="column-title">Disciplines</h3>
                                    <div id="npc-disc-list" class="space-y-1 mt-2"></div>
                                    <div class="mt-3"><select id="npc-disc-select" class="w-full bg-transparent border border-[#444] text-[10px] text-gray-300 p-2 uppercase font-bold"><option value="">+ Add Discipline</option>${(DISCIPLINES||[]).map(d=>`<option value="${d}">${d}</option>`).join('')}</select></div>
                                    
                                    <h3 class="column-title mt-8">Backgrounds</h3>
                                    <div id="npc-back-list" class="space-y-1 mt-2"></div>
                                    <div class="mt-3"><select id="npc-back-select" class="w-full bg-transparent border border-[#444] text-[10px] text-gray-300 p-2 uppercase font-bold"><option value="">+ Add Background</option>${(BACKGROUNDS||[]).map(b=>`<option value="${b}">${b}</option>`).join('')}</select></div>
                                </div>
                                <div>
                                    <h3 class="column-title">Virtues <span id="virtue-limit-display" class="text-xs text-gray-500"></span></h3>
                                    <div id="npc-virtue-list" class="space-y-3 mt-4 mb-4"></div>
                                    <div class="mt-8 border-t border-[#333] pt-4">
                                        <div class="flex justify-between items-center text-xs mb-4">
                                            <span class="font-bold text-[#d4af37]">HUMANITY</span>
                                            <div class="dot-row-direct cursor-pointer" id="npc-humanity-row">${renderDots(activeNpc.humanity, 10)}</div>
                                        </div>
                                        <div class="flex justify-between items-center text-xs mb-4">
                                            <span class="font-bold text-[#d4af37]">WILLPOWER</span>
                                            <div class="dot-row-direct cursor-pointer" id="npc-willpower-row">${renderDots(activeNpc.willpower, 10)}</div>
                                        </div>
                                        <div class="flex justify-between items-center text-xs">
                                            <span class="font-bold text-[#d4af37]">BLOOD POOL</span>
                                            <input type="number" id="npc-blood" value="${activeNpc.bloodPool}" class="w-12 bg-transparent border-b border-[#444] text-center text-white p-1 font-bold text-lg focus:border-[#d4af37] outline-none">
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 class="column-title">Merits & Flaws</h3>
                                    <select id="npc-merit-select" class="w-full bg-transparent border-b border-[#444] text-[10px] text-gray-300 p-1 mb-2"><option value="">Add Merit...</option>${(V20_MERITS_LIST||[]).map(m=>`<option value="${m.n}|${m.v}">${m.n} (${m.v})</option>`).join('')}</select>
                                    <div id="npc-merits-list" class="space-y-1"></div>
                                    
                                    <select id="npc-flaw-select" class="w-full bg-transparent border-b border-[#444] text-[10px] text-gray-300 p-1 mb-2 mt-4"><option value="">Add Flaw...</option>${(V20_FLAWS_LIST||[]).map(f=>`<option value="${f.n}|${f.v}">${f.n} (${f.v})</option>`).join('')}</select>
                                    <div id="npc-flaws-list" class="space-y-1"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 5: BIO -->
                    <div id="stepBio" class="npc-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Biography</div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div class="space-y-4">
                                    ${VIT.map(v => `<div class="flex justify-between items-center border-b border-[#333] pb-1"><label class="label-text text-[#d4af37] w-1/3">${v}</label><input type="text" class="npc-bio w-2/3 bg-transparent text-white text-xs text-right focus:outline-none" data-field="${v}" value="${activeNpc.bio[v]||''}"></div>`).join('')}
                                </div>
                                <div class="space-y-4">
                                    <div><label class="label-text text-[#d4af37] mb-2">Description</label><textarea id="npc-desc" class="w-full h-32 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none">${activeNpc.bio.Description||''}</textarea></div>
                                    <div><label class="label-text text-[#d4af37] mb-2">Notes</label><textarea id="npc-notes" class="w-full h-32 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none">${activeNpc.bio.Notes||''}</textarea></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SIDEBAR: XP LEDGER -->
                <div id="xp-sidebar" class="hidden w-64 bg-[#080808] border-l border-[#333] flex-col shrink-0">
                    <div class="p-3 bg-[#111] border-b border-[#333] text-center"><h3 class="text-purple-400 font-cinzel font-bold">XP Log</h3></div>
                    <div class="p-3 text-xs flex justify-between"><span>Total XP</span><input type="number" id="xp-total" value="${activeNpc.experience.total}" class="w-16 bg-black border border-[#333] text-purple-400 text-center font-bold"></div>
                    <div id="xp-list" class="flex-1 overflow-y-auto p-2 text-[9px] font-mono text-gray-400 space-y-1"></div>
                    <div class="p-3 bg-[#111] border-t border-[#333] text-xs"><div class="flex justify-between"><span>Spent</span><span id="xp-spent">0</span></div><div class="flex justify-between mt-1 pt-1 border-t border-[#333]"><span>Remaining</span><span id="xp-remain" class="text-green-400">0</span></div></div>
                </div>

                <!-- SIDEBAR: FREEBIE LEDGER -->
                <div id="fb-sidebar" class="hidden w-64 bg-[#080808] border-l border-[#333] flex-col shrink-0">
                    <div class="p-3 bg-[#111] border-b border-[#333] text-center"><h3 class="text-[#d4af37] font-cinzel font-bold">Freebie Log</h3></div>
                    <div id="fb-calc-list" class="flex-1 p-4 space-y-2 text-[10px] font-mono text-gray-400"></div>
                    <div class="p-4 bg-[#d4af37]/10 border-t border-[#d4af37]/30 text-center">
                        <div class="uppercase text-[9px] font-bold text-[#d4af37]">Freebies Remaining</div>
                        <div id="fb-final" class="text-4xl font-black text-white mt-2 font-cinzel">21</div>
                    </div>
                </div>
            </div>

            <!-- FOOTER -->
            <div class="p-4 border-t border-[#444] bg-[#050505] flex justify-between items-center shrink-0">
                <div class="text-[10px] text-gray-500 italic">Mode: ${activeNpc.type} Template</div>
                <div class="flex gap-4">
                    <button id="npc-cancel" class="border border-[#444] text-gray-400 px-6 py-2 uppercase font-bold text-xs hover:bg-[#222] hover:text-white transition">Cancel</button>
                    <button id="npc-save" class="bg-[#8b0000] text-white px-8 py-2 uppercase font-bold text-xs hover:bg-red-700 shadow-lg tracking-widest transition flex items-center gap-2">
                        <i class="fas fa-check"></i> Save & Close
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    // Populate standard Selects
    if(activeNpc.nature) document.getElementById('npc-nature').value = activeNpc.nature;
    if(activeNpc.demeanor) document.getElementById('npc-demeanor').value = activeNpc.demeanor;

    // --- SETUP LISTENERS ---
    
    // Tab Switching
    modal.querySelectorAll('.npc-tab').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
    
    // Mode Toggles
    document.getElementById('toggle-xp-mode').onclick = () => toggleMode('xp');
    document.getElementById('toggle-fb-mode').onclick = () => toggleMode('freebie');
    
    // Save/Cancel
    document.getElementById('npc-cancel').onclick = () => { modal.style.display = 'none'; };
    document.getElementById('npc-save').onclick = saveNpc;

    // Dynamic Adders
    const setupAdd = (id, type, renderFn) => {
        const el = document.getElementById(id);
        if(el) el.onchange = (e) => {
            const val = e.target.value;
            if(val) {
                if(!activeNpc[type]) activeNpc[type] = {};
                // If strictly in a mode, allow 0 dot add. Else default 1.
                activeNpc[type][val] = (modes.xp || modes.freebie) ? 0 : 1;
                renderFn();
                bindDotClicks();
                e.target.value = "";
            }
        };
    };
    setupAdd('npc-disc-select', 'disciplines', renderDisciplines);
    setupAdd('npc-back-select', 'backgrounds', renderBackgrounds);

    // Merits/Flaws
    const setupMF = (id, type) => {
        const el = document.getElementById(id);
        if(el) el.onchange = (e) => {
            if(!e.target.value) return;
            const [name, val] = e.target.value.split('|');
            activeNpc[type][name] = parseInt(val);
            renderMeritsFlaws();
            updateFreebieCalc();
            e.target.value = "";
        };
    };
    setupMF('npc-merit-select', 'merits');
    setupMF('npc-flaw-select', 'flaws');

    // XP Total Input
    document.getElementById('xp-total').onchange = (e) => {
        activeNpc.experience.total = parseInt(e.target.value) || 0;
        updateXpLog();
    };

    // Template Specific Listeners (Delegated)
    if (currentTemplate.setupListeners) {
        currentTemplate.setupListeners(modal, activeNpc, () => {
             // Callback for UI updates triggered by template logic
             updateVirtueDisplay();
             renderAllDots(); 
        });
    }

    // Initial Renders
    switchTab('step1');
    updateModeUI();
    renderAllDots();
    renderDisciplines();
    renderBackgrounds();
    renderMeritsFlaws();
    updateVirtueDisplay();
    updatePrioritiesUI();
    updateXpLog();
    updateFreebieCalc();
}

function renderTabButton(id, label) {
    return `<button class="npc-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="${id}">${label}</button>`;
}

function switchTab(id) {
    currentTab = id;
    document.querySelectorAll('.npc-step').forEach(d => d.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.querySelectorAll('.npc-tab').forEach(b => {
        if(b.dataset.tab === id) b.classList.add('text-[#d4af37]', 'bg-[#111]');
        else b.classList.remove('text-[#d4af37]', 'bg-[#111]');
    });
}

function toggleMode(mode) {
    if (mode === 'xp') {
        modes.xp = !modes.xp;
        if(modes.xp) modes.freebie = false;
    } else {
        modes.freebie = !modes.freebie;
        if(modes.freebie) modes.xp = false;
    }
    updateModeUI();
}

function updateModeUI() {
    const xpBtn = document.getElementById('toggle-xp-mode');
    const fbBtn = document.getElementById('toggle-fb-mode');
    const xpBar = document.getElementById('xp-sidebar');
    const fbBar = document.getElementById('fb-sidebar');

    const setActive = (btn, isActive, color) => {
        if (isActive) btn.className = `text-[10px] uppercase font-bold px-3 py-1 border rounded transition-all bg-${color}-900/40 text-${color}-300 border-${color}-500 shadow-[0_0_10px_rgba(255,255,255,0.2)]`;
        else btn.className = "text-[10px] uppercase font-bold px-3 py-1 border border-[#444] rounded transition-all text-gray-500 hover:text-white";
    };

    setActive(xpBtn, modes.xp, 'purple');
    setActive(fbBtn, modes.freebie, 'yellow'); // approximation

    if(modes.xp) {
        xpBar.classList.remove('hidden');
        xpBar.classList.add('flex');
    } else {
        xpBar.classList.add('hidden');
        xpBar.classList.remove('flex');
    }

    if(modes.freebie) {
        fbBar.classList.remove('hidden');
        fbBar.classList.add('flex');
        updateFreebieCalc();
    } else {
        fbBar.classList.add('hidden');
        fbBar.classList.remove('flex');
    }
}

// --- DOT RENDERING & INTERACTION ---

function renderAttributeColumn(group) {
    const list = ATTRIBUTES[group];
    return `
        <div>
            <h3 class="column-title">${group} <span id="cnt-attr-${group}" class="text-[10px] text-gray-500 ml-1"></span></h3>
            <div class="flex justify-center gap-2 mb-4">${renderPrioButtons('attr', group)}</div>
            <div id="list-attr-${group}">${list.map(k => renderDotRow('attributes', k, activeNpc.attributes[k], group)).join('')}</div>
        </div>
    `;
}

function renderAbilityColumn(group) {
    const list = ABILITIES[group];
    return `
        <div>
            <h3 class="column-title">${group} <span id="cnt-abil-${group}" class="text-[10px] text-gray-500 ml-1"></span></h3>
            <div class="flex justify-center gap-2 mb-4">${renderPrioButtons('abil', group)}</div>
            <div id="list-abil-${group}">${list.map(k => renderDotRow('abilities', k, activeNpc.abilities[k], group)).join('')}</div>
        </div>
    `;
}

function renderDotRow(type, key, val, group) {
    return `
        <div class="flex justify-between items-center mb-1 dot-interactive" data-type="${type}" data-key="${key}" data-group="${group}">
            <span class="text-[10px] uppercase font-bold text-gray-300 tracking-tight">${key}</span>
            <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(val || 0, 5)}</div>
        </div>
    `;
}

function renderAllDots() {
    // Re-render Attributes/Abilities lists to update visual dots
    // Note: We are doing full innerHTML replacement for simplicity in this prototype.
    // In a React app, this would be state-driven.
    ['Physical', 'Social', 'Mental'].forEach(g => document.getElementById(`list-attr-${g}`).innerHTML = ATTRIBUTES[g].map(k => renderDotRow('attributes', k, activeNpc.attributes[k], g)).join(''));
    
    ['Talents', 'Skills', 'Knowledges'].forEach(g => document.getElementById(`list-abil-${g}`).innerHTML = ABILITIES[g].map(k => renderDotRow('abilities', k, activeNpc.abilities[k], g)).join(''));
    
    // Virtues
    const vList = document.getElementById('npc-virtue-list');
    if(vList) vList.innerHTML = VIRTUES.map(k => `
        <div class="flex justify-between items-center mb-1 dot-interactive" data-type="virtues" data-key="${k}">
            <span class="text-[10px] uppercase font-bold text-gray-300 tracking-tight">${k}</span>
            <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(activeNpc.virtues[k] || 1, 5)}</div>
        </div>
    `).join('');

    // Update Direct Dots (Humanity/Willpower)
    document.getElementById('npc-humanity-row').innerHTML = renderDots(activeNpc.humanity, 10);
    document.getElementById('npc-willpower-row').innerHTML = renderDots(activeNpc.willpower, 10);
    
    bindDotClicks();
    updatePrioritiesUI();
}

function renderDisciplines() {
    const list = document.getElementById('npc-disc-list');
    if(!list) return;
    list.innerHTML = Object.entries(activeNpc.disciplines).map(([k,v]) => `
        <div class="flex justify-between items-center mb-1 dot-interactive" data-type="disciplines" data-key="${k}">
            <div class="flex gap-2 items-center">
                <i class="fas fa-times text-red-500 cursor-pointer text-xs hover:text-white" onclick="window.removeNpcItem('disciplines', '${k}')"></i>
                <span class="text-[10px] uppercase font-bold text-white">${k}</span>
            </div>
            <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(v, 5)}</div>
        </div>
    `).join('');
    bindDotClicks();
}

function renderBackgrounds() {
    const list = document.getElementById('npc-back-list');
    if(!list) return;
    list.innerHTML = Object.entries(activeNpc.backgrounds).map(([k,v]) => `
        <div class="flex justify-between items-center mb-1 dot-interactive" data-type="backgrounds" data-key="${k}">
            <div class="flex gap-2 items-center">
                <i class="fas fa-times text-red-500 cursor-pointer text-xs hover:text-white" onclick="window.removeNpcItem('backgrounds', '${k}')"></i>
                <span class="text-[10px] uppercase font-bold text-white">${k}</span>
            </div>
            <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(v, 5)}</div>
        </div>
    `).join('');
    bindDotClicks();
}

function renderMeritsFlaws() {
    const mList = document.getElementById('npc-merits-list');
    const fList = document.getElementById('npc-flaws-list');
    
    mList.innerHTML = Object.entries(activeNpc.merits).map(([k,v]) => 
        `<div class="flex justify-between text-[9px] text-gray-300 bg-black/50 p-1 rounded"><span>${k}</span><span>${v} pts <i class="fas fa-times text-red-500 ml-2 cursor-pointer" onclick="window.removeNpcItem('merits', '${k}')"></i></span></div>`
    ).join('');
    
    fList.innerHTML = Object.entries(activeNpc.flaws).map(([k,v]) => 
        `<div class="flex justify-between text-[9px] text-red-300 bg-black/50 p-1 rounded"><span>${k}</span><span>${v} pts <i class="fas fa-times text-red-500 ml-2 cursor-pointer" onclick="window.removeNpcItem('flaws', '${k}')"></i></span></div>`
    ).join('');
}

window.removeNpcItem = function(type, key) {
    if(activeNpc[type]) delete activeNpc[type][key];
    renderDisciplines();
    renderBackgrounds();
    renderMeritsFlaws();
    updateFreebieCalc();
}

function bindDotClicks() {
    document.querySelectorAll('.dot-interactive').forEach(row => {
        row.onclick = (e) => {
            if(!e.target.classList.contains('dot')) return;
            const { type, key } = row.dataset;
            const newVal = parseInt(e.target.dataset.v);
            handleValueChange(type, key, newVal);
        };
    });

    const bindDirect = (id, type) => {
        const el = document.getElementById(id);
        if(el) el.onclick = (e) => {
            if(!e.target.classList.contains('dot')) return;
            handleValueChange(type, null, parseInt(e.target.dataset.v));
        }
    };
    bindDirect('npc-humanity-row', 'humanity');
    bindDirect('npc-willpower-row', 'willpower');
}

// --- LOGIC HUB ---

function handleValueChange(type, key, newVal) {
    let currentVal = (key) ? (activeNpc[type][key] || 0) : activeNpc[type];
    
    // Handle Min Values (usually 1 for Attr/Virtue unless XP mode allows 0?)
    // Standard V20: Attr min 1. Virtue min 1.
    if (!modes.xp && !modes.freebie) {
        if ((type === 'attributes' || type === 'virtues') && newVal < 1) return; // Cannot go below 1 in creation
        if (newVal === currentVal) newVal = newVal - 1; // Toggle down
    }

    if (modes.xp) {
        // XP SPEND
        const cost = currentTemplate.getCost('xp', type, key, currentVal, newVal, activeNpc);
        if (cost === -1) { showNotification("XP purchase invalid (one dot at a time?)"); return; }
        if (cost === 0) return; // Refund not supported in simple XP mode
        
        const rem = activeNpc.experience.total - activeNpc.experience.spent;
        if (cost > rem) { showNotification(`Not enough XP. Need ${cost}, Have ${rem}`); return; }

        if(confirm(`Spend ${cost} XP for ${key||type} ${newVal}?`)) {
            activeNpc.experience.spent += cost;
            activeNpc.experience.log.push({ date: Date.now(), trait: key||type, from: currentVal, to: newVal, cost });
            applyChange(type, key, newVal);
        }
    } 
    else if (modes.freebie) {
        // FREEBIE MODE (Calculated, so we just allow it and the sidebar updates)
        applyChange(type, key, newVal);
    } 
    else {
        // CREATION MODE (Validate against Priorities/Limits)
        const valid = currentTemplate.validateChange(type, key, newVal, currentVal, activeNpc, localPriorities);
        if (valid === true) {
            applyChange(type, key, newVal);
        } else {
            showNotification(valid); // Error message
        }
    }
}

function applyChange(type, key, val) {
    if (key) activeNpc[type][key] = val;
    else activeNpc[type] = val;

    // Derived Updates
    if (type === 'virtues') recalcStatus();

    renderAllDots();
    renderDisciplines();
    renderBackgrounds();
    updateXpLog();
    updateFreebieCalc();
}

// --- PRIORITIES UI ---

function renderPrioButtons(cat, group) {
    const vals = currentTemplate.getPriorities()[cat];
    return vals.map(v => `
        <button class="npc-prio-btn w-6 h-6 rounded-full border border-gray-600 text-[9px] font-bold text-gray-400 hover:text-white hover:border-[#d4af37] transition-all"
            data-cat="${cat}" data-group="${group}" data-val="${v}">${v}</button>
    `).join('');
}

function updatePrioritiesUI() {
    const btns = document.querySelectorAll('.npc-prio-btn');
    btns.forEach(btn => {
        const { cat, group, val } = btn.dataset;
        const v = parseInt(val);
        const current = localPriorities[cat][group];

        // Reset classes
        btn.className = "npc-prio-btn w-6 h-6 rounded-full border text-[9px] font-bold transition-all mr-1 ";
        
        if (current === v) {
            btn.classList.add('bg-[#d4af37]', 'text-black', 'border-[#d4af37]');
        } else if (Object.values(localPriorities[cat]).includes(v)) {
            // Taken by someone else
            btn.classList.add('border-gray-800', 'text-gray-600', 'opacity-30', 'cursor-not-allowed');
        } else {
            // Available
            btn.classList.add('border-gray-600', 'text-gray-400', 'hover:border-[#d4af37]', 'hover:text-white');
            btn.onclick = () => {
                if(modes.xp || modes.freebie) return;
                // Logic to swap
                const existingOwner = Object.keys(localPriorities[cat]).find(k => localPriorities[cat][k] === v);
                if(existingOwner) localPriorities[cat][existingOwner] = null;
                
                localPriorities[cat][group] = v;
                updatePrioritiesUI();
                renderAllDots(); // To update counters
            };
        }
    });

    // Update Counters
    ['attr', 'abil'].forEach(cat => {
        const spread = currentTemplate.getPriorities()[cat];
        Object.keys(localPriorities[cat]).forEach(grp => {
            const limit = localPriorities[cat][grp];
            const el = document.getElementById(`cnt-${cat}-${grp}`);
            if(!el) return;
            
            // Calculate spent
            let spent = 0;
            const list = (cat === 'attr') ? ATTRIBUTES[grp] : ABILITIES[grp];
            list.forEach(k => {
                const val = (cat === 'attr') ? activeNpc.attributes[k] : activeNpc.abilities[k];
                spent += (cat === 'attr') ? Math.max(0, (val||1)-1) : (val||0);
            });

            if (limit) {
                const color = spent > limit ? 'text-red-500' : (spent === limit ? 'text-green-500' : 'text-gray-500');
                el.innerHTML = `<span class="${color}">${spent}/${limit}</span>`;
            } else {
                el.innerHTML = `[${spent}]`;
            }
        });
    });
}

function updateVirtueDisplay() {
    const limit = currentTemplate.getVirtueLimit(activeNpc);
    const el = document.getElementById('virtue-limit-display');
    if(el) el.innerText = `(Max ${limit} Dots)`;
}

// --- LOGGING ---

function updateXpLog() {
    if(!modes.xp) return;
    const logDiv = document.getElementById('xp-list');
    const spentDiv = document.getElementById('xp-spent');
    const remDiv = document.getElementById('xp-remain');
    
    if(spentDiv) spentDiv.innerText = activeNpc.experience.spent;
    if(remDiv) remDiv.innerText = activeNpc.experience.total - activeNpc.experience.spent;

    if(logDiv) {
        logDiv.innerHTML = activeNpc.experience.log.slice().reverse().map(l => `
            <div class="border-b border-[#222] pb-1">
                <div class="flex justify-between text-white"><span>${l.trait}</span><span class="text-purple-400">-${l.cost}</span></div>
                <div class="text-[8px] opacity-50">${l.from} -> ${l.to}</div>
            </div>
        `).join('');
    }
}

function updateFreebieCalc() {
    if(!modes.freebie) return;
    
    // Calculate costs relative to Creation state (priorities)
    // This is complex because we need to know what the "Base" was.
    // For simplicity in this generic engine, we assume anything ABOVE the Priority Limit is a Freebie cost.
    
    let totalCost = 0;
    let report = [];

    // Attributes
    Object.entries(localPriorities.attr).forEach(([grp, limit]) => {
        if(!limit) return;
        let spent = 0;
        ATTRIBUTES[grp].forEach(k => spent += Math.max(0, (activeNpc.attributes[k]||1)-1));
        if(spent > limit) {
            const diff = spent - limit;
            const cost = currentTemplate.getCost('freebie', 'attributes', null, 0, diff, activeNpc);
            totalCost += cost;
            report.push(`Attr (${grp}): ${cost}`);
        }
    });

    // Abilities
    Object.entries(localPriorities.abil).forEach(([grp, limit]) => {
        if(!limit) return;
        let spent = 0;
        ABILITIES[grp].forEach(k => spent += (activeNpc.abilities[k]||0));
        if(spent > limit) {
            const diff = spent - limit;
            const cost = currentTemplate.getCost('freebie', 'abilities', null, 0, diff, activeNpc);
            totalCost += cost;
            report.push(`Abil (${grp}): ${cost}`);
        }
    });

    // Backgrounds (Base 5)
    let bgTotal = 0;
    Object.values(activeNpc.backgrounds).forEach(v => bgTotal += v);
    if(bgTotal > 5) {
        const cost = currentTemplate.getCost('freebie', 'backgrounds', null, 0, bgTotal - 5, activeNpc);
        totalCost += cost;
        report.push(`Backgrounds: ${cost}`);
    }

    // Disciplines (Base 2)
    let discTotal = 0;
    Object.values(activeNpc.disciplines).forEach(v => discTotal += v);
    if(discTotal > 2) {
        const cost = currentTemplate.getCost('freebie', 'disciplines', null, 0, discTotal - 2, activeNpc);
        totalCost += cost;
        report.push(`Disciplines: ${cost}`);
    }

    // Virtues
    let virtTotal = 0;
    VIRTUES.forEach(v => virtTotal += Math.max(0, (activeNpc.virtues[v]||1)-1));
    const vLimit = currentTemplate.getVirtueLimit(activeNpc);
    if(virtTotal > vLimit) {
        const cost = currentTemplate.getCost('freebie', 'virtues', null, 0, virtTotal - vLimit, activeNpc);
        totalCost += cost;
        report.push(`Virtues: ${cost}`);
    }
    
    // Merits/Flaws
    let meritCost = 0;
    Object.values(activeNpc.merits).forEach(v => meritCost += v);
    let flawBonus = 0;
    Object.values(activeNpc.flaws).forEach(v => flawBonus += v);
    if(flawBonus > 7) flawBonus = 7; // Cap

    totalCost += meritCost;
    report.push(`Merits: ${meritCost}`);
    report.push(`Flaws (Bonus): -${flawBonus}`);

    const final = (21 + flawBonus) - totalCost;

    document.getElementById('fb-calc-list').innerHTML = report.map(r => `<div>${r}</div>`).join('');
    const el = document.getElementById('fb-final');
    if(el) {
        el.innerText = final;
        el.className = final >= 0 ? "text-4xl font-black text-white mt-2 font-cinzel" : "text-4xl font-black text-red-500 mt-2 font-cinzel";
    }
}

// --- SAVE ---

function saveNpc() {
    // Gather Text Inputs
    activeNpc.name = document.getElementById('npc-name').value;
    activeNpc.player = document.getElementById('npc-player').value;
    activeNpc.domitor = document.getElementById('npc-domitor').value;
    activeNpc.concept = document.getElementById('npc-concept').value;
    activeNpc.nature = document.getElementById('npc-nature').value;
    activeNpc.demeanor = document.getElementById('npc-demeanor').value;
    
    const bioInputs = document.querySelectorAll('.npc-bio');
    bioInputs.forEach(i => activeNpc.bio[i.dataset.field] = i.value);
    activeNpc.bio.Description = document.getElementById('npc-desc').value;
    activeNpc.bio.Notes = document.getElementById('npc-notes').value;
    activeNpc.bloodPool = parseInt(document.getElementById('npc-blood').value) || 10;

    activeNpc.priorities = JSON.parse(JSON.stringify(localPriorities));

    // Save to State (Retainers)
    if (!window.state.retainers) window.state.retainers = [];
    if (activeIndex !== null && activeIndex >= 0) window.state.retainers[activeIndex] = activeNpc;
    else window.state.retainers.push(activeNpc);

    if (window.renderRetainersTab) window.renderRetainersTab(document.getElementById('play-content'));
    showNotification(`${currentTemplate.label} Saved.`);
    document.getElementById('npc-modal').style.display = 'none';
}
