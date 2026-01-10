import { 
    ATTRIBUTES, ABILITIES, DISCIPLINES, VIRTUES, BACKGROUNDS, ARCHETYPES, CLANS, 
    SPECIALTY_EXAMPLES as SPECIALTIES, 
    V20_MERITS_LIST, V20_FLAWS_LIST, VIT 
} from "./data.js";
import { renderDots, showNotification } from "./ui-common.js";

// --- CONSTANTS & CONFIG ---

const REVENANT_FAMILIES = ["Bratovitch", "Grimaldi", "Obertus", "Zantosa"];

const CLAN_DISCIPLINES = {
    "Assamite": ["Celerity", "Obfuscate", "Quietus"],
    "Brujah": ["Celerity", "Potence", "Presence"],
    "Followers of Set": ["Obfuscate", "Presence", "Serpentis"],
    "Gangrel": ["Animalism", "Fortitude", "Protean"],
    "Giovanni": ["Dominate", "Necromancy", "Potence"],
    "Lasombra": ["Dominate", "Obtenebration", "Potence"],
    "Malkavian": ["Auspex", "Dominate", "Obfuscate"],
    "Nosferatu": ["Animalism", "Obfuscate", "Potence"],
    "Ravnos": ["Animalism", "Chimerstry", "Fortitude"],
    "Toreador": ["Auspex", "Celerity", "Presence"],
    "Tremere": ["Auspex", "Dominate", "Thaumaturgy"],
    "Tzimisce": ["Animalism", "Auspex", "Vicissitude"],
    "Ventrue": ["Dominate", "Fortitude", "Presence"],
    "Caitiff": [],
    "Baali": ["Demonism", "Obfuscate", "Presence"],
    "Cappadocian": ["Auspex", "Fortitude", "Necromancy"]
};

const FAMILY_DISCIPLINES = {
    "Bratovitch": ["Animalism", "Potence", "Vicissitude"],
    "Grimaldi": ["Celerity", "Dominate", "Fortitude"],
    "Obertus": ["Auspex", "Obfuscate", "Vicissitude"],
    "Zantosa": ["Auspex", "Presence", "Vicissitude"]
};

// V20 Ghouls p. 499 (Experience Costs)
const XP_COSTS = {
    newAbility: 3,         
    newDiscipline: 20,     
    attribute: 4,          
    ability: 2,            
    clanDiscipline: 15,    
    otherDiscipline: 25,   
    virtue: 2,             
    humanity: 2,           
    willpower: 1,          
    background: 3          
};

// V20 Ghouls p. 499 (Freebie Costs)
const FREEBIE_COSTS = {
    attribute: 5,
    ability: 2,
    discipline: 10,
    background: 1,
    virtue: 2,
    humanity: 1,
    willpower: 1
};

const PRIO_CONFIG = {
    attr: [6, 4, 3],
    abil: [11, 7, 4]
};

// --- STATE ---
let activeGhoul = null;
let activeIndex = null;
let currentTab = 'step1';
let xpMode = false;
let freebieMode = false;

let localPriorities = {
    attr: { Physical: null, Social: null, Mental: null },
    abil: { Talents: null, Skills: null, Knowledges: null }
};

// --- HELPER FUNCTIONS ---

function renderPrioButtons(cat, group) {
    const vals = PRIO_CONFIG[cat];
    return vals.map(v => `
        <button type="button" 
            class="w-6 h-6 rounded-full border border-gray-600 text-[9px] font-bold text-gray-400 hover:text-white hover:border-[#d4af37] hover:bg-[#d4af37] hover:text-black transition-all ghoul-prio-btn"
            data-cat="${cat}" data-group="${group}" data-val="${v}">
            ${v}
        </button>
    `).join('');
}

function updatePriorityUI() {
    document.querySelectorAll('.ghoul-prio-btn').forEach(btn => {
        const { cat, group, val } = btn.dataset;
        const v = parseInt(val);
        
        if (localPriorities[cat][group] === v) {
            btn.classList.add('bg-[#d4af37]', 'text-black', 'border-[#d4af37]', 'font-black');
            btn.classList.remove('border-gray-600', 'text-gray-400');
        } else {
            const isTaken = Object.values(localPriorities[cat]).includes(v);
            
            btn.classList.remove('bg-[#d4af37]', 'text-black', 'border-[#d4af37]', 'font-black');
            if (isTaken) {
                btn.classList.add('opacity-20', 'cursor-not-allowed', 'border-gray-800');
                btn.classList.remove('border-gray-600', 'hover:border-[#d4af37]');
            } else {
                btn.classList.add('border-gray-600', 'text-gray-400', 'hover:border-[#d4af37]');
                btn.classList.remove('opacity-20', 'cursor-not-allowed', 'border-gray-800');
            }
        }
        btn.onclick = handlePrioClick;
    });
}

function handlePrioClick(e) {
    if (xpMode || freebieMode) return; 
    const btn = e.target;
    const { cat, group, val } = btn.dataset;
    const v = parseInt(val);

    const currentAssignment = Object.entries(localPriorities[cat]).find(([g, assignedVal]) => assignedVal === v);
    if (currentAssignment) {
        const [otherGroup, otherVal] = currentAssignment;
        localPriorities[cat][otherGroup] = null;
    }

    if (localPriorities[cat][group] === v) {
        localPriorities[cat][group] = null;
    } else {
        localPriorities[cat][group] = v;
    }

    updatePriorityUI();
    updateTracker(); 
}

function renderGroup(id, title, list, type) {
    const el = document.getElementById(id);
    if(!el) return;
    let html = ''; 
    if (list) {
        list.forEach(item => {
            const val = activeGhoul[type][item] || 0;
            const dispVal = (type === 'attributes' && val < 1) ? 1 : val;
            
            let specialtyHtml = '';
            if ((type === 'attributes' || type === 'abilities') && val >= 4) {
                const specVal = (activeGhoul.specialties && activeGhoul.specialties[item]) || '';
                const datalistId = `spec-list-${item.replace(/\s/g, '-')}`;
                specialtyHtml = `
                    <datalist id="${datalistId}">
                        ${(SPECIALTIES[item] || []).map(opt => `<option value="${opt}">`).join('')}
                    </datalist>
                    <input type="text" 
                        class="specialty-input bg-transparent border-b border-[#333] text-[9px] text-[#d4af37] w-20 ml-2 focus:outline-none focus:border-[#d4af37] placeholder-gray-600" 
                        placeholder="Specialty" 
                        list="${datalistId}"
                        data-key="${item}" 
                        value="${specVal}">
                `;
            }
            
            html += `
                <div class="flex justify-between items-center mb-1 dot-row-interactive" data-type="${type}" data-key="${item}">
                    <div class="flex items-center">
                        <span class="text-[10px] uppercase font-bold text-gray-300 tracking-tight">${item}</span>
                        ${specialtyHtml}
                    </div>
                    <div class="dot-row cursor-pointer hover:opacity-80 transition-opacity">
                        ${renderDots(dispVal, 5)}
                    </div>
                </div>
            `;
        });
    }
    el.innerHTML = html;
}

// --- INITIALIZER ---

export function openGhoulCreator(dataOrEvent = null, index = null) {
    console.log("Creating/Editing Ghoul...", dataOrEvent); 

    let incomingData = null;
    const isEvent = dataOrEvent && (typeof dataOrEvent.preventDefault === 'function' || typeof dataOrEvent.stopPropagation === 'function');
    
    if (dataOrEvent && !isEvent) {
        incomingData = dataOrEvent;
    }

    activeIndex = (typeof index === 'number') ? index : null;
    currentTab = 'step1';
    xpMode = false;
    freebieMode = false;
    
    localPriorities = {
        attr: { Physical: null, Social: null, Mental: null },
        abil: { Talents: null, Skills: null, Knowledges: null }
    };

    if (incomingData) {
        activeGhoul = JSON.parse(JSON.stringify(incomingData));
        // Patch missing objects
        ['attributes', 'abilities', 'disciplines', 'backgrounds', 'specialties', 'merits', 'flaws', 'bio'].forEach(k => { if (!activeGhoul[k]) activeGhoul[k] = {}; });
        if (!activeGhoul.virtues) activeGhoul.virtues = { Conscience: 1, "Self-Control": 1, Courage: 1 };
        if (!activeGhoul.disciplines.Potence) activeGhoul.disciplines.Potence = 1;
        if (!activeGhoul.experience) activeGhoul.experience = { total: 0, spent: 0, log: [] };
        if (!activeGhoul.freebies) activeGhoul.freebies = { spent: 0, log: [] };

        initBaseDots(activeGhoul);
        
        if (activeGhoul.priorities) {
            localPriorities = JSON.parse(JSON.stringify(activeGhoul.priorities));
        } else {
            autoDetectPriorities();
        }

    } else {
        const defaultChronicle = (window.character && window.character.chronicle) ? window.character.chronicle : "";

        activeGhoul = {
            name: "", player: "", chronicle: defaultChronicle, type: "Vassal", concept: "", 
            domitor: "", domitorClan: "", family: "", weakness: "",
            nature: "", demeanor: "",
            attributes: {}, abilities: {}, 
            disciplines: { Potence: 1 }, 
            backgrounds: {}, 
            virtues: { Conscience: 1, "Self-Control": 1, Courage: 1 },
            specialties: {},
            merits: {}, flaws: {}, bio: {},
            experience: { total: 0, spent: 0, log: [] },
            freebies: { spent: 0, log: [] },
            priorities: {
                attr: { Physical: null, Social: null, Mental: null },
                abil: { Talents: null, Skills: null, Knowledges: null }
            },
            humanity: 2, willpower: 1, bloodPool: 10 
        };
        initBaseDots(activeGhoul);
        recalcStatus();
    }

    renderEditorModal();
    switchTab('step1');
}

function initBaseDots(ghoul) {
    if (ATTRIBUTES) Object.values(ATTRIBUTES).flat().forEach(a => { if (ghoul.attributes[a] === undefined) ghoul.attributes[a] = 1; });
    if (ABILITIES) Object.values(ABILITIES).flat().forEach(a => { if (ghoul.abilities[a] === undefined) ghoul.abilities[a] = 0; });
}

function autoDetectPriorities() {
    const sumGroup = (cat, groupList, isAttr) => {
        let sum = 0;
        groupList.forEach(k => {
            const val = isAttr ? (activeGhoul.attributes[k] || 1) : (activeGhoul.abilities[k] || 0);
            sum += isAttr ? Math.max(0, val - 1) : val;
        });
        return sum;
    };

    const attrSums = [
        { grp: 'Physical', val: sumGroup('attr', ATTRIBUTES.Physical, true) },
        { grp: 'Social', val: sumGroup('attr', ATTRIBUTES.Social, true) },
        { grp: 'Mental', val: sumGroup('attr', ATTRIBUTES.Mental, true) }
    ].sort((a, b) => b.val - a.val);

    if(attrSums[0]) localPriorities.attr[attrSums[0].grp] = 6;
    if(attrSums[1]) localPriorities.attr[attrSums[1].grp] = 4;
    if(attrSums[2]) localPriorities.attr[attrSums[2].grp] = 3;

    const abilSums = [
        { grp: 'Talents', val: sumGroup('abil', ABILITIES.Talents, false) },
        { grp: 'Skills', val: sumGroup('abil', ABILITIES.Skills, false) },
        { grp: 'Knowledges', val: sumGroup('abil', ABILITIES.Knowledges, false) }
    ].sort((a, b) => b.val - a.val);

    if(abilSums[0]) localPriorities.abil[abilSums[0].grp] = 11;
    if(abilSums[1]) localPriorities.abil[abilSums[1].grp] = 7;
    if(abilSums[2]) localPriorities.abil[abilSums[2].grp] = 4;
}

function recalcStatus() {
    const baseHum = (activeGhoul.virtues.Conscience || 1) + (activeGhoul.virtues["Self-Control"] || 1);
    const baseWill = activeGhoul.virtues.Courage || 1;
    
    if (!activeGhoul.humanity || activeGhoul.humanity < baseHum) activeGhoul.humanity = baseHum;
    if (!activeGhoul.willpower || activeGhoul.willpower < baseWill) activeGhoul.willpower = baseWill;
}

// --- RENDER MAIN MODAL ---

function renderEditorModal() {
    let modal = document.getElementById('ghoul-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ghoul-modal';
        modal.className = 'fixed inset-0 bg-black/90 z-[100] flex items-center justify-center hidden';
        document.body.appendChild(modal);
    }

    const bgOptions = (BACKGROUNDS || []).map(b => `<option value="${b}">${b}</option>`).join('');
    const discOptions = (DISCIPLINES || []).map(d => `<option value="${d}">${d}</option>`).join('');
    const archList = (ARCHETYPES || []).sort();
    const archOptions = archList.map(a => `<option value="${a}">${a}</option>`).join('');
    const clanOptions = (CLANS || []).sort().map(c => `<option value="${c}">${c}</option>`).join('');
    const revOptions = (REVENANT_FAMILIES || []).map(r => `<option value="${r}">${r}</option>`).join('');

    // Merit/Flaw Options
    const meritOpts = (V20_MERITS_LIST || []).map(m => `<option value="${m.n}|${m.v}">${m.n} (${m.v} pts)</option>`).join('');
    const flawOpts = (V20_FLAWS_LIST || []).map(f => `<option value="${f.n}|${f.v}">${f.n} (${f.v} pts)</option>`).join('');

    modal.innerHTML = `
        <div class="w-[95%] max-w-7xl h-[95%] bg-[#0a0a0a] border-2 border-[#8b0000] shadow-[0_0_50px_rgba(139,0,0,0.5)] flex flex-col relative font-serif">
            
            <!-- HEADER -->
            <div class="bg-[#1a0505] p-4 border-b border-[#444] flex justify-between items-center shrink-0">
                <div class="flex items-center gap-4">
                    <h2 class="text-2xl font-cinzel text-[#d4af37] font-bold tracking-widest uppercase shadow-black drop-shadow-md">
                        <i class="fas fa-user-plus mr-2 text-[#8b0000]"></i>Ghoul Creator <span class="text-xs align-top opacity-50 ml-1">V20</span>
                    </h2>
                    
                    <!-- Mode Toggles -->
                    <div class="ml-6 flex items-center gap-2 border-l border-[#444] pl-4">
                        <button id="toggle-freebie-mode" class="text-[10px] uppercase font-bold px-3 py-1 border border-[#444] rounded transition-all ${freebieMode ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'text-gray-500 hover:text-white hover:border-gray-300'}">
                            <i class="fas fa-star mr-1"></i> Freebie Mode: ${freebieMode ? 'ON' : 'OFF'}
                        </button>
                        <button id="toggle-xp-mode" class="text-[10px] uppercase font-bold px-3 py-1 border border-[#444] rounded transition-all ${xpMode ? 'bg-purple-900/40 text-purple-300 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'text-gray-500 hover:text-white hover:border-gray-300'}">
                            <i class="fas fa-hourglass-half mr-1"></i> XP Mode: ${xpMode ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>
                <button id="close-ghoul-modal" class="text-gray-400 hover:text-white text-xl px-2 transition-transform hover:rotate-90"><i class="fas fa-times"></i></button>
            </div>

            <!-- TABS -->
            <div class="flex border-b border-[#333] bg-[#050505] text-[10px] uppercase font-bold text-gray-500 tracking-wider overflow-x-auto no-scrollbar shrink-0">
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="step1">1. Concept</button>
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="step2">2. Attributes</button>
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="step3">3. Abilities</button>
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="step4">4. Advantages</button>
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="stepBio">5. Biography</button>
            </div>

            <!-- CONTENT -->
            <div class="flex-1 overflow-hidden relative flex">
                <div class="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar bg-[#050505] bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]">
                    
                    <!-- STEP 1: IDENTITY -->
                    <div id="step1" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Character Concept</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div class="space-y-6">
                                    <div><label class="label-text text-[#d4af37]">Name</label><input type="text" id="g-name" value="${activeGhoul.name || ''}" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors"></div>
                                    <div><label class="label-text text-[#d4af37]">Player</label><input type="text" id="g-player" value="${activeGhoul.player || ''}" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors"></div>
                                    <div><label class="label-text text-[#d4af37]">Domitor Name</label><input type="text" id="g-domitor" value="${activeGhoul.domitor || ''}" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors"></div>
                                </div>
                                <div class="space-y-6">
                                    <div>
                                        <label class="label-text text-[#d4af37]">Nature</label>
                                        <select id="g-nature" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors appearance-none">
                                            <option value="" class="bg-black text-gray-500">Select Archetype...</option>
                                            ${archOptions}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="label-text text-[#d4af37]">Demeanor</label>
                                        <select id="g-demeanor" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors appearance-none">
                                            <option value="" class="bg-black text-gray-500">Select Archetype...</option>
                                            ${archOptions}
                                        </select>
                                    </div>
                                    <div><label class="label-text text-[#d4af37]">Concept</label><input type="text" id="g-concept" value="${activeGhoul.concept || ''}" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors"></div>
                                </div>
                                <div class="space-y-6">
                                    <div>
                                        <label class="label-text text-[#d4af37]">Ghoul Type</label>
                                        <select id="g-type" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                                            <option value="Vassal" ${activeGhoul.type === 'Vassal' ? 'selected' : ''} class="bg-black">Vassal (7 Virtue Dots)</option>
                                            <option value="Independent" ${activeGhoul.type === 'Independent' ? 'selected' : ''} class="bg-black">Independent (7 Virtue Dots)</option>
                                            <option value="Revenant" ${activeGhoul.type === 'Revenant' ? 'selected' : ''} class="bg-black">Revenant (5 Virtue Dots)</option>
                                        </select>
                                    </div>
                                    <div id="div-domitor-clan" class="${activeGhoul.type === 'Revenant' ? 'hidden' : 'block'}">
                                        <label class="label-text text-[#d4af37]">Domitor Clan</label>
                                        <select id="g-domitor-clan" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                                            <option value="" class="bg-black">Unknown/None</option>
                                            ${clanOptions}
                                        </select>
                                    </div>
                                    <div id="div-family" class="${activeGhoul.type === 'Revenant' ? 'block' : 'hidden'}">
                                        <label class="label-text text-[#d4af37]">Revenant Family</label>
                                        <select id="g-family" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                                            <option value="" class="bg-black">Select Family...</option>
                                            ${revOptions}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-6 p-4 bg-red-900/10 border border-red-900/30 rounded">
                                <label class="label-text text-red-400">Weakness (Conditional)</label>
                                <textarea id="g-weakness" class="w-full h-20 bg-transparent border-b border-[#444] text-white p-1 text-xs focus:border-red-500 focus:outline-none transition-colors" placeholder="Enter specific weakness details...">${activeGhoul.weakness || ''}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 2: ATTRIBUTES -->
                    <div id="step2" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Attributes (6 / 4 / 3)</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div id="col-attr-phys">
                                    <h3 class="column-title">Physical <span id="cnt-attr-Physical" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">${renderPrioButtons('attr', 'Physical')}</div>
                                    <div id="g-attr-phys"></div>
                                </div>
                                <div id="col-attr-soc">
                                    <h3 class="column-title">Social <span id="cnt-attr-Social" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">${renderPrioButtons('attr', 'Social')}</div>
                                    <div id="g-attr-soc"></div>
                                </div>
                                <div id="col-attr-men">
                                    <h3 class="column-title">Mental <span id="cnt-attr-Mental" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">${renderPrioButtons('attr', 'Mental')}</div>
                                    <div id="g-attr-men"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 3: ABILITIES -->
                    <div id="step3" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Abilities (11 / 7 / 4) - Max 3 Dots</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div id="col-abil-tal">
                                    <h3 class="column-title">Talents <span id="cnt-abil-Talents" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">${renderPrioButtons('abil', 'Talents')}</div>
                                    <div id="g-abil-tal"></div>
                                </div>
                                <div id="col-abil-ski">
                                    <h3 class="column-title">Skills <span id="cnt-abil-Skills" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">${renderPrioButtons('abil', 'Skills')}</div>
                                    <div id="g-abil-ski"></div>
                                </div>
                                <div id="col-abil-kno">
                                    <h3 class="column-title">Knowledges <span id="cnt-abil-Knowledges" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">${renderPrioButtons('abil', 'Knowledges')}</div>
                                    <div id="g-abil-kno"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 4: ADVANTAGES & MERITS -->
                    <div id="step4" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Advantages & Traits</div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <h3 class="column-title">Disciplines</h3>
                                    <div class="text-[9px] text-gray-500 mb-2 italic">Creation Limit: 2 Dots Total.</div>
                                    <div id="g-disc-list" class="space-y-1 mt-2"></div>
                                    <div class="mt-3"><select id="g-disc-select" class="w-full bg-transparent border border-[#444] text-[10px] text-gray-300 p-2 uppercase font-bold focus:border-[#d4af37] focus:outline-none"><option value="" class="bg-black">+ Add Discipline</option>${discOptions}</select></div>
                                    <div class="mt-8">
                                        <h3 class="column-title">Backgrounds (5 Dots Free)</h3>
                                        <div id="g-back-list" class="space-y-1 mt-2"></div>
                                        <div class="mt-3"><select id="g-back-select" class="w-full bg-transparent border border-[#444] text-[10px] text-gray-300 p-2 uppercase font-bold focus:border-[#d4af37] focus:outline-none"><option value="" class="bg-black">+ Add Background</option>${bgOptions}</select></div>
                                    </div>
                                    <div class="mt-8 border-t border-[#333] pt-6">
                                        <h3 class="column-title mb-4">Merits & Flaws (Max 7 Flaw Points)</h3>
                                        <div class="grid grid-cols-2 gap-4">
                                            <div><select id="g-merit-select" class="w-full bg-transparent border-b border-[#444] text-[10px] text-gray-300 p-1 mb-2"><option value="" class="bg-black">Add Merit...</option>${meritOpts}</select><div id="g-merits-list" class="space-y-1"></div></div>
                                            <div><select id="g-flaw-select" class="w-full bg-transparent border-b border-[#444] text-[10px] text-gray-300 p-1 mb-2"><option value="" class="bg-black">Add Flaw...</option>${flawOpts}</select><div id="g-flaws-list" class="space-y-1"></div></div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 class="column-title">Virtues <span id="g-virtue-header-limit" class="text-gray-500 text-xs"></span></h3>
                                    <div id="g-virt-list" class="space-y-3 mt-4 mb-4"></div>
                                    <div class="border border-[#333] bg-black/40 p-4 grid grid-cols-2 gap-4 mt-8">
                                        <div class="flex justify-between items-center text-xs"><span class="font-bold text-[#d4af37] uppercase">Humanity</span><div class="dot-row cursor-pointer dot-row-interactive" id="g-humanity-row" data-type="humanity" data-key="humanity">${renderDots(activeGhoul.humanity, 10)}</div></div>
                                        <div class="flex justify-between items-center text-xs"><span class="font-bold text-[#d4af37] uppercase">Willpower</span><div class="dot-row cursor-pointer dot-row-interactive" id="g-willpower-row" data-type="willpower" data-key="willpower">${renderDots(activeGhoul.willpower, 10)}</div></div>
                                        <div class="flex justify-between items-center text-xs col-span-2 border-t border-[#333] pt-2"><span class="font-bold text-[#d4af37] uppercase">Blood Pool (Vitae)</span><input type="number" id="g-blood" value="${activeGhoul.bloodPool}" class="w-12 bg-transparent border-b border-[#444] text-center text-white p-1 font-bold text-lg focus:border-[#d4af37] outline-none"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 5: BIOGRAPHY -->
                    <div id="stepBio" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Biography & Vitals</div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div class="space-y-4">${VIT.map(v => `<div class="flex justify-between items-center border-b border-[#333] pb-1"><label class="label-text text-[#d4af37] w-1/3">${v}</label><input type="text" class="w-2/3 bg-transparent text-white text-xs text-right focus:outline-none bio-input" data-field="${v}" value="${activeGhoul.bio[v] || ''}"></div>`).join('')}</div>
                                <div class="space-y-4">
                                    <div><label class="label-text text-[#d4af37] mb-2">Description / Appearance</label><textarea id="g-bio-desc" class="w-full h-32 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none">${activeGhoul.bio.Description || ''}</textarea></div>
                                    <div><label class="label-text text-[#d4af37] mb-2">Notes / History</label><textarea id="g-bio-notes" class="w-full h-32 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none">${activeGhoul.bio.Notes || ''}</textarea></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- RIGHT SIDEBARS -->
                <div id="freebie-ledger-panel" class="${freebieMode ? 'flex' : 'hidden'} w-64 bg-[#080808] border-l border-[#333] flex-col shrink-0 transition-all">
                    <div class="p-3 border-b border-[#333] bg-[#111]"><h3 class="text-[#d4af37] font-cinzel font-bold text-center">Freebie Ledger</h3></div>
                    <div class="p-3 border-b border-[#333] bg-[#1a1a1a]">
                        <div class="flex justify-between items-center text-xs mb-1"><span class="text-gray-400">Total Freebies</span><span class="text-white font-bold">21</span></div>
                        <div class="flex justify-between items-center text-xs mb-1"><span class="text-gray-400">Flaw Bonus</span><span id="fb-bonus-disp" class="text-green-400 font-bold">0</span></div>
                        <div class="border-t border-[#333] pt-1 flex justify-between items-center text-xs"><span class="text-[#d4af37] font-bold uppercase">Remaining</span><span id="fb-rem-disp" class="text-white font-black text-lg">21</span></div>
                    </div>
                    <div id="fb-breakdown-list" class="space-y-2 text-xs p-3 border-b border-[#333]"></div>
                    <div class="mt-2 px-3 flex-1 flex flex-col min-h-0"><h4 class="text-[9px] uppercase text-gray-500 font-bold mb-1 tracking-wider">Freebie Log</h4><div id="fb-log-list" class="text-[9px] text-gray-400 flex-1 overflow-y-auto border border-[#333] p-1 font-mono bg-white/5"></div></div>
                </div>

                <div id="xp-ledger-panel" class="${xpMode ? 'flex' : 'hidden'} w-64 bg-[#080808] border-l border-[#333] flex-col shrink-0 transition-all">
                    <div class="p-3 border-b border-[#333] bg-[#111]"><h3 class="text-purple-400 font-cinzel font-bold text-center">XP Log</h3></div>
                    <div class="p-3 border-b border-[#333] bg-[#1a1a1a]">
                        <div class="flex justify-between items-center text-xs mb-2"><span class="text-gray-400">Total XP</span><input type="number" id="xp-total-input" value="${activeGhoul.experience.total}" onchange="window.updateGhoulTotalXP(this.value)" class="w-16 bg-black border border-[#333] text-purple-400 text-center font-bold focus:border-purple-500 outline-none"></div>
                    </div>
                    <div id="xp-breakdown-list" class="space-y-2 text-xs p-3 border-b border-[#333]"></div>
                    <div class="p-3 border-b border-[#333] bg-[#111]">
                        <div class="flex justify-between items-center text-xs"><span class="text-gray-400">Total Spent</span><span id="xp-spent-disp" class="text-white font-bold">${activeGhoul.experience.spent}</span></div>
                        <div class="flex justify-between items-center text-xs mt-1 pt-1 border-t border-[#333]"><span class="text-gray-400">Remaining</span><span id="xp-rem-disp" class="text-green-400 font-bold">${activeGhoul.experience.total - activeGhoul.experience.spent}</span></div>
                    </div>
                    <div class="mt-2 px-3"><h4 class="text-[9px] uppercase text-gray-500 font-bold mb-1 tracking-wider">Session Log</h4><div id="xp-log-list" class="text-[9px] text-gray-400 h-40 overflow-y-auto border border-[#333] p-1 font-mono bg-white/5"></div></div>
                </div>
            </div>

            <!-- FOOTER -->
            <div class="p-4 border-t border-[#444] bg-[#050505] flex justify-between items-center shrink-0">
                <div class="text-[10px] text-gray-500 italic"><span class="text-[#d4af37]">Note:</span> Abilities capped at 3 dots until Freebie Mode is active. Specialties available at 4+ dots.</div>
                <div class="flex gap-4">
                    <button id="cancel-ghoul" class="border border-[#444] text-gray-400 px-6 py-2 uppercase font-bold text-xs hover:bg-[#222] hover:text-white transition tracking-wider">Cancel</button>
                    <button id="save-ghoul" class="bg-[#8b0000] text-white px-8 py-2 uppercase font-bold text-xs hover:bg-red-700 shadow-lg tracking-widest transition flex items-center gap-2 border border-transparent hover:border-red-500"><i class="fas fa-check"></i> Save & Close</button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    // Populate Fields
    if(activeGhoul.nature) document.getElementById('g-nature').value = activeGhoul.nature;
    if(activeGhoul.demeanor) document.getElementById('g-demeanor').value = activeGhoul.demeanor;
    if(activeGhoul.domitorClan) document.getElementById('g-domitor-clan').value = activeGhoul.domitorClan;
    if(activeGhoul.family) document.getElementById('g-family').value = activeGhoul.family;

    renderDotGroups();
    renderDynamicLists();
    renderMeritsFlaws(); 
    updatePriorityUI(); 
    renderFreebieLists();
    renderGhoulXpSidebar(); // XP Logic
    renderGhoulFreebieSidebar(); // Freebie Logic

    setupNavListeners(modal);
    setupActionListeners(modal);
    bindDotClicks(modal);
    updateTracker(); 
    updateVirtueHeader();
}

function setupNavListeners(modal) {
    const tabs = modal.querySelectorAll('.ghoul-tab');
    tabs.forEach(t => t.onclick = () => switchTab(t.dataset.tab));
}

function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.ghoul-step').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(tabId);
    if(target) target.classList.remove('hidden');
    
    document.querySelectorAll('.ghoul-tab').forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('text-[#d4af37]', 'border-b-2', 'border-b-[#d4af37]', 'bg-[#111]');
            btn.classList.remove('text-gray-500');
        } else {
            btn.classList.remove('text-[#d4af37]', 'border-b-2', 'border-b-[#d4af37]', 'bg-[#111]');
            btn.classList.add('text-gray-500');
        }
    });

    const modal = document.getElementById('ghoul-modal');
    if(modal) bindDotClicks(modal);
}

function renderGhoulXpSidebar() {
    const log = activeGhoul.experience.log || [];
    let buckets = { newAbil: 0, attr: 0, abil: 0, disc: 0, virt: 0, humanity: 0, willpower: 0, background: 0 };

    log.forEach(entry => {
        // Safe check for entry structure
        if (!entry || !entry.type || typeof entry.cost !== 'number') return;

        const type = entry.type; 
        const cost = entry.cost;
        if (type === 'attributes' || type === 'attr') buckets.attr += cost;
        else if (type === 'abilities' || type === 'abil') {
            if (entry.from === 0 && entry.cost > 0) buckets.newAbil += cost;
            else buckets.abil += cost;
        }
        else if (type === 'disciplines' || type === 'disc') buckets.disc += cost;
        else if (type === 'virtues' || type === 'virt') buckets.virt += cost;
        else if (type === 'humanity') buckets.humanity += cost;
        else if (type === 'willpower') buckets.willpower += cost;
        else if (type === 'backgrounds' || type === 'back') buckets.background += cost;
    });

    const breakdown = document.getElementById('xp-breakdown-list');
    if (breakdown) {
        breakdown.innerHTML = '';
        const addRow = (label, val) => {
            const row = document.createElement('div');
            row.className = "flex justify-between items-center gap-1";
            row.innerHTML = `<span class="text-gray-400 truncate">${label}</span><span class="text-purple-400 font-bold bg-black/95 z-10 shrink-0">${val}</span>`;
            breakdown.appendChild(row);
        };
        addRow("New Ability (3)", buckets.newAbil);
        addRow("Attributes (x4)", buckets.attr);
        addRow("Abilities (x2)", buckets.abil);
        addRow("Disciplines (x15/25)", buckets.disc);
        addRow("Virtues (x2)", buckets.virt);
        addRow("Humanity (x2)", buckets.humanity);
        addRow("Willpower (x1)", buckets.willpower);
        addRow("Backgrounds (3)", buckets.background);
    }

    const logList = document.getElementById('xp-log-list');
    if (logList) {
        if (log.length === 0) {
            logList.innerHTML = '<div class="text-center italic opacity-50 mt-4">No XP spent yet.</div>';
        } else {
            logList.innerHTML = log.slice().reverse().map(entry => {
                const isRefund = entry.cost < 0;
                const costDisp = isRefund ? `+${Math.abs(entry.cost)}` : `-${entry.cost}`;
                const color = isRefund ? 'text-green-400' : 'text-purple-400';
                const traitName = entry.trait || "Unknown";
                const dateStr = entry.date ? new Date(entry.date).toLocaleDateString() : "-";
                
                return `<div class="border-b border-[#222] pb-1 mb-1">
                    <div class="flex justify-between text-white">
                        <span class="font-bold">${traitName}</span>
                        <span class="${color}">${costDisp}</span>
                    </div>
                    <div class="flex justify-between text-[8px] text-gray-500">
                        <span>${entry.from} &rarr; ${entry.to}</span>
                        <span>${dateStr}</span>
                    </div>
                </div>`;
            }).join('');
        }
    }

    const spentEl = document.getElementById('xp-spent-disp');
    const remEl = document.getElementById('xp-rem-disp');
    if (spentEl) spentEl.innerText = activeGhoul.experience.spent;
    if (remEl) remEl.innerText = activeGhoul.experience.total - activeGhoul.experience.spent;
}

window.updateGhoulTotalXP = function(val) {
    if(!activeGhoul) return;
    activeGhoul.experience.total = parseInt(val) || 0;
    renderGhoulXpSidebar();
};

function handleXpSpend(type, key, clickedVal, currentVal) {
    let targetVal = clickedVal;
    
    if (clickedVal === currentVal) {
        targetVal = currentVal - 1;
    }

    if (targetVal < currentVal) {
        let stepsToUndo = currentVal - targetVal;
        let totalRefund = 0;
        let entriesRemoved = 0;

        while (stepsToUndo > 0) {
            const logIndex = activeGhoul.experience.log.findIndex(l => 
                (l.type === type && (l.trait === key || (!key && l.type === l.trait))) &&
                l.to === currentVal
            );

            if (logIndex !== -1) {
                const entry = activeGhoul.experience.log[logIndex];
                totalRefund += entry.cost;
                activeGhoul.experience.spent -= entry.cost;
                activeGhoul.experience.log.splice(logIndex, 1);
                
                entriesRemoved++;
                stepsToUndo--;
                currentVal--; 
            } else {
                if (entriesRemoved === 0) {
                    showNotification("Cannot refund: This dot was not purchased with XP.");
                    return; 
                }
                break; 
            }
        }

        if (type === 'humanity') activeGhoul.humanity = currentVal;
        else if (type === 'willpower') activeGhoul.willpower = currentVal;
        else activeGhoul[type][key] = currentVal;

        renderDotGroups();
        renderDynamicLists();
        renderGhoulXpSidebar();
        updateTracker();
        bindDotClicks(document.getElementById('ghoul-modal'));
        
        const hDots = document.getElementById('g-humanity-row');
        const wDots = document.getElementById('g-willpower-row');
        if(hDots) hDots.innerHTML = renderDots(activeGhoul.humanity, 10);
        if(wDots) wDots.innerHTML = renderDots(activeGhoul.willpower, 10);

        showNotification(`Refunded ${totalRefund} XP.`);
        return;
    }

    if (targetVal > currentVal + 1) {
        showNotification("XP Mode: Please purchase one dot at a time.");
        return;
    }

    let cost = 0;
    let multiplier = 0;
    let flatCost = 0;

    if (type === 'attributes') {
        multiplier = XP_COSTS.attribute; 
        cost = currentVal * multiplier;
    } 
    else if (type === 'abilities') {
        if (currentVal === 0) {
            flatCost = XP_COSTS.newAbility; 
            cost = flatCost;
        } else {
            multiplier = XP_COSTS.ability; 
            cost = currentVal * multiplier;
        }
    }
    else if (type === 'virtues') {
        multiplier = XP_COSTS.virtue;
        cost = currentVal * multiplier;
    }
    else if (type === 'humanity') {
        multiplier = XP_COSTS.humanity;
        cost = currentVal * multiplier;
    }
    else if (type === 'willpower') {
        multiplier = XP_COSTS.willpower;
        cost = currentVal * multiplier;
    }
    else if (type === 'backgrounds') {
        cost = XP_COSTS.background;
    }
    else if (type === 'disciplines') {
        if (currentVal === 0) {
            cost = XP_COSTS.newDiscipline; 
        } else {
            let isClan = false;
            const domClan = activeGhoul.domitorClan;
            if (domClan && CLAN_DISCIPLINES[domClan] && CLAN_DISCIPLINES[domClan].includes(key)) {
                isClan = true;
            }
            if (isClan) {
                multiplier = XP_COSTS.clanDiscipline; 
                cost = currentVal * multiplier;
            } else {
                multiplier = XP_COSTS.otherDiscipline; 
                cost = currentVal * multiplier;
            }
        }
    }

    const total = activeGhoul.experience.total || 0;
    const spent = activeGhoul.experience.spent || 0;
    const remaining = total - spent;

    if (cost > remaining) {
        showNotification(`Not enough XP. Cost: ${cost}, Remaining: ${remaining}`);
        return;
    }

    activeGhoul.experience.spent += cost;
    activeGhoul.experience.log.push({
        date: Date.now(),
        trait: key || type, 
        from: currentVal,
        to: targetVal,
        cost: cost,
        type: type
    });
    
    if (type === 'humanity') activeGhoul.humanity = targetVal;
    else if (type === 'willpower') activeGhoul.willpower = targetVal;
    else activeGhoul[type][key] = targetVal;

    renderDotGroups();
    renderDynamicLists();
    renderGhoulXpSidebar();
    updateTracker();
    
    const hDots = document.getElementById('g-humanity-row');
    const wDots = document.getElementById('g-willpower-row');
    if(hDots) hDots.innerHTML = renderDots(activeGhoul.humanity, 10);
    if(wDots) wDots.innerHTML = renderDots(activeGhoul.willpower, 10);

    bindDotClicks(document.getElementById('ghoul-modal'));
    showNotification("XP Spent.");
}

function renderGhoulFreebieSidebar() {
    if (!activeGhoul.freebies) activeGhoul.freebies = { spent: 0, log: [] };
    const log = activeGhoul.freebies.log || [];
    let flawBonus = 0;
    let meritCost = 0;
    if (activeGhoul.flaws) Object.values(activeGhoul.flaws).forEach(v => flawBonus += v);
    const cappedFlawBonus = Math.min(7, flawBonus);
    if (activeGhoul.merits) Object.values(activeGhoul.merits).forEach(v => meritCost += v);

    let buckets = { attr: 0, abil: 0, disc: 0, virt: 0, hum: 0, will: 0, back: 0 };
    let logSpent = 0;
    log.forEach(entry => {
        logSpent += entry.cost;
        if (entry.type === 'attributes' || entry.type === 'attr') buckets.attr += entry.cost;
        else if (entry.type === 'abilities' || entry.type === 'abil') buckets.abil += entry.cost;
        else if (entry.type === 'disciplines' || entry.type === 'disc') buckets.disc += entry.cost;
        else if (entry.type === 'virtues' || entry.type === 'virt') buckets.virt += entry.cost; 
        else if (entry.type === 'humanity') buckets.hum += entry.cost;
        else if (entry.type === 'willpower') buckets.will += entry.cost;
        else if (entry.type === 'backgrounds') buckets.back += entry.cost;
    });

    const totalSpent = logSpent + meritCost;
    const totalAvail = 21 + cappedFlawBonus;
    const remaining = totalAvail - totalSpent;

    document.getElementById('fb-bonus-disp').innerText = `+${cappedFlawBonus}`;
    const remEl = document.getElementById('fb-rem-disp');
    if (remEl) {
        remEl.innerText = remaining;
        remEl.className = remaining >= 0 ? "text-white font-black text-lg" : "text-red-500 font-black text-lg";
    }

    const breakdown = document.getElementById('fb-breakdown-list');
    if (breakdown) {
        breakdown.innerHTML = '';
        const addRow = (label, val) => {
            if (val === 0) return;
            const row = document.createElement('div');
            row.className = "flex justify-between items-center gap-1";
            row.innerHTML = `<span class="text-gray-400 truncate">${label}</span><span class="text-[#d4af37] font-bold bg-black/95 z-10 shrink-0">${val}</span>`;
            breakdown.appendChild(row);
        };
        addRow("Merits", meritCost);
        addRow("Attributes (5)", buckets.attr);
        addRow("Abilities (2)", buckets.abil);
        addRow("Disciplines (10)", buckets.disc);
        addRow("Backgrounds (1)", buckets.back);
        addRow("Virtues (2)", buckets.virt);
        addRow("Humanity (1)", buckets.hum);
        addRow("Willpower (1)", buckets.will);
    }

    const logList = document.getElementById('fb-log-list');
    if (logList) {
        if (log.length === 0) {
            logList.innerHTML = '<div class="text-center italic opacity-50 mt-4">No freebies spent on dots.</div>';
        } else {
            logList.innerHTML = log.slice().reverse().map(entry => {
                const isRefund = entry.cost < 0;
                const costDisp = isRefund ? `+${Math.abs(entry.cost)}` : `-${entry.cost}`;
                const color = isRefund ? 'text-green-400' : 'text-[#d4af37]';
                return `<div class="border-b border-[#222] pb-1 mb-1"><div class="flex justify-between text-white"><span class="font-bold">${entry.trait}</span><span class="${color}">${costDisp}</span></div><div class="flex justify-between text-[8px] text-gray-500"><span>${entry.from} &rarr; ${entry.to}</span><span>${new Date(entry.date).toLocaleTimeString()}</span></div></div>`;
            }).join('');
        }
    }
}

function renderFreebieLists() {
    if(ATTRIBUTES) {
        renderGroup('fb-attr-phys', 'Physical', ATTRIBUTES.Physical, 'attributes');
        renderGroup('fb-attr-soc', 'Social', ATTRIBUTES.Social, 'attributes');
        renderGroup('fb-attr-men', 'Mental', ATTRIBUTES.Mental, 'attributes');
    }
    if(ABILITIES) {
        renderGroup('fb-abil-tal', 'Talents', ABILITIES.Talents, 'abilities');
        renderGroup('fb-abil-ski', 'Skills', ABILITIES.Skills, 'abilities');
        renderGroup('fb-abil-kno', 'Knowledges', ABILITIES.Knowledges, 'abilities');
    }
    renderDynamicListsForFreebies();
    if(VIRTUES) renderGroup('fb-virt-list', null, VIRTUES, 'virtues');
}

function renderDynamicListsForFreebies() {
    const dEl = document.getElementById('fb-disc-list');
    const bEl = document.getElementById('fb-back-list');
    
    if(dEl && activeGhoul.disciplines) {
        dEl.innerHTML = '';
        Object.entries(activeGhoul.disciplines).forEach(([name, val]) => {
            const isAuto = name === 'Potence';
            dEl.innerHTML += `
                <div class="flex justify-between items-center mb-1 dot-row-interactive" data-type="disciplines" data-key="${name}">
                    <span class="text-[10px] uppercase font-bold ${isAuto ? 'text-[#d4af37]' : 'text-white'}">${name}</span>
                    <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(val, 5)}</div>
                </div>`;
        });
    }

    if(bEl && activeGhoul.backgrounds) {
        bEl.innerHTML = '';
        Object.entries(activeGhoul.backgrounds).forEach(([name, val]) => {
            bEl.innerHTML += `
                <div class="flex justify-between items-center mb-1 dot-row-interactive" data-type="backgrounds" data-key="${name}">
                    <span class="text-[10px] uppercase font-bold text-white">${name}</span>
                    <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(val, 5)}</div>
                </div>`;
        });
    }
}

function handleFreebieSpend(type, key, clickedVal, currentVal) {
    let targetVal = clickedVal;
    
    if (clickedVal === currentVal) {
        targetVal = currentVal - 1;
    }

    if (targetVal === currentVal) return;

    if (targetVal < currentVal) {
        let stepsToUndo = currentVal - targetVal;
        let totalRefund = 0;
        let entriesRemoved = 0;

        while (stepsToUndo > 0) {
            const logIndex = activeGhoul.freebies.log.findIndex(l => 
                (l.type === type && (l.trait === key || (!key && l.type === l.trait))) &&
                l.to === currentVal
            );

            if (logIndex !== -1) {
                const entry = activeGhoul.freebies.log[logIndex];
                totalRefund += entry.cost;
                activeGhoul.freebies.spent -= entry.cost;
                activeGhoul.freebies.log.splice(logIndex, 1);
                
                entriesRemoved++;
                stepsToUndo--;
                currentVal--;
            } else {
                if (entriesRemoved === 0) {
                    showNotification("Cannot refund: This dot was not purchased with Freebies.");
                    return;
                }
                break;
            }
        }
        
        updateValue(type, key, currentVal);
        showNotification(`Refunded ${totalRefund} Freebies`);
        renderGhoulFreebieSidebar();
        return;
    }

    if (targetVal > currentVal + 1) { 
        showNotification("Please purchase dots one at a time."); 
        return; 
    }

    let cost = 0;
    if (type === 'attributes') cost = FREEBIE_COSTS.attribute;
    else if (type === 'abilities') cost = FREEBIE_COSTS.ability;
    else if (type === 'disciplines') cost = FREEBIE_COSTS.discipline;
    else if (type === 'backgrounds') cost = FREEBIE_COSTS.background;
    else if (type === 'virtues') cost = FREEBIE_COSTS.virtue;
    else if (type === 'humanity') cost = FREEBIE_COSTS.humanity;
    else if (type === 'willpower') cost = FREEBIE_COSTS.willpower;

    const logSpent = activeGhoul.freebies.log.reduce((acc, l) => acc + l.cost, 0);
    let meritCost = 0;
    if (activeGhoul.merits) Object.values(activeGhoul.merits).forEach(v => meritCost += v);
    let flawBonus = 0;
    if (activeGhoul.flaws) Object.values(activeGhoul.flaws).forEach(v => flawBonus += v);
    
    const totalSpent = logSpent + meritCost;
    const totalAvail = 21 + Math.min(7, flawBonus);
    const rem = totalAvail - totalSpent;

    if (cost > rem) { showNotification("Not enough Freebie Points!"); return; }

    activeGhoul.freebies.spent += cost;
    activeGhoul.freebies.log.push({ date: Date.now(), trait: key || type, from: currentVal, to: targetVal, cost: cost, type: type });
    updateValue(type, key, targetVal);
    showNotification(`Spent ${cost} Freebies`);
    renderGhoulFreebieSidebar();
}

function updateValue(type, key, val) {
    if (type === 'attributes' || type === 'abilities' || type === 'virtues' || type === 'disciplines' || type === 'backgrounds') {
        activeGhoul[type][key] = val;
    } else if (type === 'humanity') activeGhoul.humanity = val;
    else if (type === 'willpower') activeGhoul.willpower = val;
    
    renderDotGroups();
    renderDynamicLists();
    
    // Safety check for renderFreebieLists before calling
    if (typeof renderFreebieLists === 'function') {
        renderFreebieLists();
    }
    
    const hDots = document.getElementById('g-humanity-row');
    const wDots = document.getElementById('g-willpower-row');
    if(hDots) hDots.innerHTML = renderDots(activeGhoul.humanity, 10);
    if(wDots) wDots.innerHTML = renderDots(activeGhoul.willpower, 10);

    bindDotClicks(document.getElementById('ghoul-modal'));
}

function bindDotClicks(modal) {
    const rows = modal.querySelectorAll('.dot-row-interactive');
    const humRow = document.getElementById('g-humanity-row');
    const willRow = document.getElementById('g-willpower-row');

    const bindDirect = (el, type) => {
        if(!el) return;
        el.onclick = (e) => {
            if (!e.target.classList.contains('dot')) return;
            const newVal = parseInt(e.target.dataset.v);
            let currentVal = activeGhoul[type];
            if (xpMode) { handleXpSpend(type, type, newVal, currentVal); return; }
            if (freebieMode) { handleFreebieSpend(type, type, newVal, currentVal); return; }
            
            let finalVal = newVal;
            if (newVal === currentVal) finalVal = newVal - 1;
            if (finalVal < 1) finalVal = 1;
            if (!validateChange(type, null, finalVal, currentVal)) return;
            activeGhoul[type] = finalVal;
            el.innerHTML = renderDots(finalVal, 10);
            updateTracker(); 
        };
    };

    if(humRow) bindDirect(humRow, 'humanity');
    if(willRow) bindDirect(willRow, 'willpower');

    rows.forEach(row => {
        row.onclick = null; 
        row.onclick = (e) => {
            if (!e.target.classList.contains('dot')) return;
            const type = row.dataset.type;
            const key = row.dataset.key;
            const newVal = parseInt(e.target.dataset.v);
            
            if (!activeGhoul[type]) activeGhoul[type] = {};
            let currentVal = activeGhoul[type][key] || 0;
            if ((type === 'attributes' || type === 'virtues') && activeGhoul[type][key] === undefined) currentVal = 1;

            if (xpMode) { handleXpSpend(type, key, newVal, currentVal); return; }
            if (freebieMode) { handleFreebieSpend(type, key, newVal, currentVal); return; }

            let finalVal = newVal;
            if (newVal === currentVal) finalVal = newVal - 1;
            if (type === 'attributes' && finalVal < 1) finalVal = 1;
            if (type === 'virtues' && finalVal < 1) finalVal = 1;

            if (!validateChange(type, key, finalVal, currentVal)) return;
            
            activeGhoul[type][key] = finalVal;
            renderDotGroups();
            renderDynamicLists();
            if (typeof renderFreebieLists === 'function') renderFreebieLists();
            bindDotClicks(modal);
            if (type === 'virtues') {
                recalcStatus();
                const hDots = document.getElementById('g-humanity-row');
                const wDots = document.getElementById('g-willpower-row');
                if(hDots) hDots.innerHTML = renderDots(activeGhoul.humanity, 10);
                if(wDots) wDots.innerHTML = renderDots(activeGhoul.willpower, 10);
            }
            updateTracker(); 
        };
    });
}

function renderMeritsFlaws() {
    const mList = document.getElementById('g-merits-list');
    const fList = document.getElementById('g-flaws-list');
    
    if(mList) {
        mList.innerHTML = '';
        if(activeGhoul.merits) {
            Object.entries(activeGhoul.merits).forEach(([name, val]) => {
                mList.innerHTML += `<div class="flex justify-between text-[9px] text-gray-300 bg-black/50 p-1 rounded"><span>${name}</span><span>${val} pts <i class="fas fa-times text-red-500 cursor-pointer ml-2" onclick="window.removeGhoulItem('merits', '${name}')"></i></span></div>`;
            });
        }
    }
    
    if(fList) {
        fList.innerHTML = '';
        if(activeGhoul.flaws) {
            Object.entries(activeGhoul.flaws).forEach(([name, val]) => {
                fList.innerHTML += `<div class="flex justify-between text-[9px] text-red-300 bg-black/50 p-1 rounded"><span>${name}</span><span>${val} pts <i class="fas fa-times text-red-500 cursor-pointer ml-2" onclick="window.removeGhoulItem('flaws', '${name}')"></i></span></div>`;
            });
        }
    }
    renderGhoulFreebieSidebar();
}

function updateTracker() {
    let spent = {
        attr: { Physical: 0, Social: 0, Mental: 0 },
        abil: { Talents: 0, Skills: 0, Knowledges: 0 },
        disc: 0, back: 0, virt: 0,
        freebies: 21
    };

    if(ATTRIBUTES) {
        ATTRIBUTES.Physical.forEach(a => spent.attr.Physical += Math.max(0, (activeGhoul.attributes[a]||1)-1));
        ATTRIBUTES.Social.forEach(a => spent.attr.Social += Math.max(0, (activeGhoul.attributes[a]||1)-1));
        ATTRIBUTES.Mental.forEach(a => spent.attr.Mental += Math.max(0, (activeGhoul.attributes[a]||1)-1));
    }

    if(ABILITIES) {
        ABILITIES.Talents.forEach(a => spent.abil.Talents += (activeGhoul.abilities[a]||0));
        ABILITIES.Skills.forEach(a => spent.abil.Skills += (activeGhoul.abilities[a]||0));
        ABILITIES.Knowledges.forEach(a => spent.abil.Knowledges += (activeGhoul.abilities[a]||0));
    }

    ['attr', 'abil'].forEach(cat => {
        Object.entries(localPriorities[cat]).forEach(([group, limit]) => {
            let s = 0;
            if (cat === 'attr') {
                if(group === 'Physical') s = spent.attr.Physical;
                if(group === 'Social') s = spent.attr.Social;
                if(group === 'Mental') s = spent.attr.Mental;
            } else {
                if(group === 'Talents') s = spent.abil.Talents;
                if(group === 'Skills') s = spent.abil.Skills;
                if(group === 'Knowledges') s = spent.abil.Knowledges;
            }
            
            const el = document.getElementById(`cnt-${cat}-${group}`);
            if(el) {
                if (limit) {
                    const color = s > limit ? 'text-red-500 font-bold' : (s === limit ? 'text-green-500 font-bold' : 'text-gray-500');
                    el.innerHTML = `<span class="${color}">${s} / ${limit}</span>`;
                } else {
                    el.innerHTML = `<span class="text-gray-600">[${s}]</span>`;
                }
            }
        });
    });
}

function renderDotGroups() {
    if(ATTRIBUTES) {
        renderGroup('g-attr-phys', 'Physical', ATTRIBUTES.Physical, 'attributes');
        renderGroup('g-attr-soc', 'Social', ATTRIBUTES.Social, 'attributes');
        renderGroup('g-attr-men', 'Mental', ATTRIBUTES.Mental, 'attributes');
    }
    if(ABILITIES) {
        renderGroup('g-abil-tal', 'Talents', ABILITIES.Talents, 'abilities');
        renderGroup('g-abil-ski', 'Skills', ABILITIES.Skills, 'abilities');
        renderGroup('g-abil-kno', 'Knowledges', ABILITIES.Knowledges, 'abilities');
    }
    if(VIRTUES) renderGroup('g-virt-list', null, VIRTUES, 'virtues');
}

function renderDynamicLists() {
    renderDisciplines();
    renderBackgrounds();
}

function renderDisciplines() {
    const el = document.getElementById('g-disc-list');
    if(!el) return;
    el.innerHTML = '';
    
    if(activeGhoul.disciplines) {
        Object.entries(activeGhoul.disciplines).forEach(([name, val]) => {
            const isAuto = name === 'Potence';
            el.innerHTML += `
                <div class="flex justify-between items-center mb-1 dot-row-interactive" data-type="disciplines" data-key="${name}">
                    <div class="flex items-center gap-2">
                        ${!isAuto ? `<span class="text-red-500 cursor-pointer hover:text-red-300" onclick="window.removeGhoulItem('disciplines','${name}')">&times;</span>` : '<span class="w-2"></span>'}
                        <span class="text-[10px] uppercase font-bold ${isAuto ? 'text-[#d4af37]' : 'text-white'}">${name}</span>
                    </div>
                    <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(val, 5)}</div>
                </div>
            `;
        });
    }
}

function renderBackgrounds() {
    const el = document.getElementById('g-back-list');
    if(!el) return;
    el.innerHTML = '';
    
    if(activeGhoul.backgrounds) {
        Object.entries(activeGhoul.backgrounds).forEach(([name, val]) => {
            el.innerHTML += `
                <div class="flex justify-between items-center mb-1 dot-row-interactive" data-type="backgrounds" data-key="${name}">
                    <div class="flex items-center gap-2">
                        <span class="text-red-500 cursor-pointer hover:text-red-300" onclick="window.removeGhoulItem('backgrounds','${name}')">&times;</span>
                        <span class="text-[10px] uppercase font-bold text-white">${name}</span>
                    </div>
                    <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(val, 5)}</div>
                </div>
            `;
        });
    }
}

function validateChange(type, key, newVal, currentVal) {
    if (xpMode || freebieMode) return true;

    const delta = newVal - currentVal;
    if (delta <= 0) return true; 

    if (type === 'attributes') {
        let group = null;
        if (ATTRIBUTES.Physical.includes(key)) group = 'Physical';
        else if (ATTRIBUTES.Social.includes(key)) group = 'Social';
        else if (ATTRIBUTES.Mental.includes(key)) group = 'Mental';

        if (!group) return true;

        const limit = localPriorities.attr[group];
        if (limit === null) {
            showNotification("Please select a priority for this Attribute group first.");
            return false;
        }

        let spent = 0;
        ATTRIBUTES[group].forEach(k => spent += Math.max(0, (activeGhoul.attributes[k] || 1) - 1));
        
        if (spent + delta > limit) {
            showNotification(`Cannot exceed ${limit} dots for ${group} Attributes.`);
            return false;
        }
    }

    if (type === 'abilities') {
        let group = null;
        if (ABILITIES.Talents.includes(key)) group = 'Talents';
        else if (ABILITIES.Skills.includes(key)) group = 'Skills';
        else if (ABILITIES.Knowledges.includes(key)) group = 'Knowledges';

        if (!group) return true;

        if (newVal > 3) {
            showNotification("Abilities are capped at 3 dots during creation.");
            return false;
        }

        const limit = localPriorities.abil[group];
        if (limit === null) {
            showNotification("Please select a priority for this Ability group first.");
            return false;
        }

        let spent = 0;
        const list = (group === 'Talents') ? ABILITIES.Talents : (group === 'Skills' ? ABILITIES.Skills : ABILITIES.Knowledges);
        list.forEach(k => spent += (activeGhoul.abilities[k] || 0));

        if (spent + delta > limit) {
            showNotification(`Cannot exceed ${limit} dots for ${group}.`);
            return false;
        }
    }

    if (type === 'disciplines') {
        let total = 0;
        Object.values(activeGhoul.disciplines).forEach(v => total += v);
        if (total + delta > 2) {
             showNotification("Creation Limit: 1 Free Dot + Potence 1 (Total 2). Use Freebies for more.");
             return false;
        }
    }

    if (type === 'backgrounds') {
        let total = 0;
        Object.values(activeGhoul.backgrounds).forEach(v => total += v);
        if (total + delta > 5) {
             showNotification("Creation Limit: 5 Dots in Backgrounds. Use Freebies for more.");
             return false;
        }
    }

    if (type === 'virtues') {
        let total = 0;
        VIRTUES.forEach(v => total += Math.max(0, (activeGhoul.virtues[v] || 1) - 1));
        const limit = activeGhoul.type === 'Revenant' ? 5 : 7;
        
        if (total + delta > limit) {
             showNotification(`Creation Limit: ${limit} Dots in Virtues. Use Freebies for more.`);
             return false;
        }
    }

    return true;
}

function updateVirtueHeader() {
    const header = document.getElementById('g-virtue-header-limit');
    if (!header) return;
    const isRevenant = activeGhoul.type === 'Revenant';
    const limit = isRevenant ? 5 : 7;
    header.innerText = `(Free Dots: ${limit})`;
}
