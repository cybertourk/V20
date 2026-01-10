import { 
    ATTRIBUTES, ABILITIES, DISCIPLINES, VIRTUES, BACKGROUNDS, ARCHETYPES, CLANS, 
    SPECIALTY_EXAMPLES as SPECIALTIES, 
    V20_MERITS_LIST, V20_FLAWS_LIST, VIT 
} from "./data.js";
import { renderDots, showNotification } from "./ui-common.js";

// Revenant Families (Not currently in data.js, so kept local)
const REVENANT_FAMILIES = ["Bratovitch", "Grimaldi", "Obertus", "Zantosa"];

// Standard V20 Clan Disciplines for Vassal Discounts
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
    "Baali": ["Demonism", "Obfuscate", "Presence"], // Optional extra
    "Cappadocian": ["Auspex", "Fortitude", "Necromancy"] // Optional extra
};

// Family Disciplines for Revenants
const FAMILY_DISCIPLINES = {
    "Bratovitch": ["Animalism", "Potence", "Vicissitude"],
    "Grimaldi": ["Celerity", "Dominate", "Fortitude"],
    "Obertus": ["Auspex", "Obfuscate", "Vicissitude"],
    "Zantosa": ["Auspex", "Presence", "Vicissitude"]
};

// --- XP COSTS (V20 Ghouls p. 499) ---
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

// --- FREEBIE COSTS (V20 Ghouls p. 499) ---
const FREEBIE_COSTS = {
    attribute: 5,
    ability: 2,
    discipline: 10,
    background: 1,
    virtue: 2,
    humanity: 1,
    willpower: 1
};

// --- STATE ---
let activeGhoul = null;
let activeIndex = null;
let currentTab = 'step1';
let xpMode = false; // Toggle for XP spending

// Priority State Checkers (V20 Ghoul Rules)
const PRIO_CONFIG = {
    attr: [6, 4, 3],
    abil: [11, 7, 4]
};

let localPriorities = {
    attr: { Physical: null, Social: null, Mental: null },
    abil: { Talents: null, Skills: null, Knowledges: null }
};

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
    
    // Reset Local State
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

        // Init XP Data if missing
        if (!activeGhoul.experience) activeGhoul.experience = { total: 0, spent: 0, log: [] };
        
        // Init Freebie Data if missing
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
    
    // Only set if not already set, or if calculation puts it higher (don't auto-lower if user spent points)
    if (!activeGhoul.humanity || activeGhoul.humanity < baseHum) activeGhoul.humanity = baseHum;
    if (!activeGhoul.willpower || activeGhoul.willpower < baseWill) activeGhoul.willpower = baseWill;
}

// --- MAIN RENDER ---
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
                    <!-- XP Mode Toggle -->
                    <div class="ml-6 flex items-center gap-2 border-l border-[#444] pl-4">
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
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="step5">6. Finishing</button>
            </div>

            <!-- CONTENT -->
            <div class="flex-1 overflow-hidden relative flex">
                
                <!-- MAIN SCROLL AREA -->
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
                                    <!-- Conditional Fields -->
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
                            <!-- Weakness Display -->
                            <div class="mt-6 p-4 bg-red-900/10 border border-red-900/30 rounded">
                                <label class="label-text text-red-400">Weakness (Conditional)</label>
                                <textarea id="g-weakness" class="w-full h-20 bg-transparent border-b border-[#444] text-white p-1 text-xs focus:border-red-500 focus:outline-none transition-colors" placeholder="Enter specific weakness details here if conditions are met (e.g. 'Rashes in sunlight' if Setite blood consumed)...">${activeGhoul.weakness || ''}</textarea>
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
                                    <div class="flex justify-center gap-2 mb-4">
                                        ${renderPrioButtons('attr', 'Physical')}
                                    </div>
                                    <div id="g-attr-phys"></div>
                                </div>
                                <div id="col-attr-soc">
                                    <h3 class="column-title">Social <span id="cnt-attr-Social" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">
                                        ${renderPrioButtons('attr', 'Social')}
                                    </div>
                                    <div id="g-attr-soc"></div>
                                </div>
                                <div id="col-attr-men">
                                    <h3 class="column-title">Mental <span id="cnt-attr-Mental" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">
                                        ${renderPrioButtons('attr', 'Mental')}
                                    </div>
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
                                    <div class="flex justify-center gap-2 mb-4">
                                        ${renderPrioButtons('abil', 'Talents')}
                                    </div>
                                    <div id="g-abil-tal"></div>
                                </div>
                                <div id="col-abil-ski">
                                    <h3 class="column-title">Skills <span id="cnt-abil-Skills" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">
                                        ${renderPrioButtons('abil', 'Skills')}
                                    </div>
                                    <div id="g-abil-ski"></div>
                                </div>
                                <div id="col-abil-kno">
                                    <h3 class="column-title">Knowledges <span id="cnt-abil-Knowledges" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                    <div class="flex justify-center gap-2 mb-4">
                                        ${renderPrioButtons('abil', 'Knowledges')}
                                    </div>
                                    <div id="g-abil-kno"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 4: ADVANTAGES -->
                    <div id="step4" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Advantages</div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <h3 class="column-title">Disciplines (Potence 1 + 1 Free Dot)</h3>
                                    <div class="text-[9px] text-gray-500 mb-2 italic">Creation Limit: 2 Dots Total.</div>
                                    <div id="g-disc-list" class="space-y-1 mt-2"></div>
                                    <div class="mt-3">
                                        <select id="g-disc-select" class="w-full bg-transparent border border-[#444] text-[10px] text-gray-300 p-2 uppercase font-bold focus:border-[#d4af37] focus:outline-none">
                                            <option value="" class="bg-black">+ Add Discipline</option>
                                            ${discOptions}
                                        </select>
                                    </div>
                                    <div class="mt-8">
                                        <h3 class="column-title">Backgrounds (5 Dots Free)</h3>
                                        <div id="g-back-list" class="space-y-1 mt-2"></div>
                                        <div class="mt-3">
                                            <select id="g-back-select" class="w-full bg-transparent border border-[#444] text-[10px] text-gray-300 p-2 uppercase font-bold focus:border-[#d4af37] focus:outline-none">
                                                <option value="" class="bg-black">+ Add Background</option>
                                                ${bgOptions}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 class="column-title">Virtues <span id="g-virtue-header-limit" class="text-gray-500 text-xs"></span></h3>
                                    <div id="g-virt-list" class="space-y-3 mt-4 mb-4"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 5: BIOGRAPHY (NEW) -->
                    <div id="stepBio" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Biography & Vitals</div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div class="space-y-4">
                                    ${VIT.map(v => `
                                        <div class="flex justify-between items-center border-b border-[#333] pb-1">
                                            <label class="label-text text-[#d4af37] w-1/3">${v}</label>
                                            <input type="text" class="w-2/3 bg-transparent text-white text-xs text-right focus:outline-none bio-input" data-field="${v}" value="${activeGhoul.bio[v] || ''}">
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="space-y-4">
                                    <div>
                                        <label class="label-text text-[#d4af37] mb-2">Description / Appearance</label>
                                        <textarea id="g-bio-desc" class="w-full h-32 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none">${activeGhoul.bio.Description || ''}</textarea>
                                    </div>
                                    <div>
                                        <label class="label-text text-[#d4af37] mb-2">Notes / History</label>
                                        <textarea id="g-bio-notes" class="w-full h-32 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none">${activeGhoul.bio.Notes || ''}</textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 6: FINISHING (FREEBIES) -->
                    <div id="step5" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0 h-full">
                            <div class="section-title">Finishing Touches & Freebie Points</div>
                            
                            <div class="flex flex-col md:flex-row gap-6 h-full">
                                <!-- LEFT: UPGRADE PANEL -->
                                <div class="flex-1 space-y-8 overflow-y-auto pr-2 max-h-[60vh]">
                                    
                                    <!-- Merits & Flaws Block -->
                                    <div class="border border-[#333] bg-black/40 p-4">
                                        <h3 class="column-title mb-4">Merits & Flaws (Max 7 Flaw Points)</h3>
                                        <div class="grid grid-cols-2 gap-4">
                                            <div>
                                                <select id="g-merit-select" class="w-full bg-transparent border-b border-[#444] text-[10px] text-gray-300 p-1 mb-2">
                                                    <option value="" class="bg-black">Add Merit...</option>
                                                    ${meritOpts}
                                                </select>
                                                <div id="g-merits-list" class="space-y-1"></div>
                                            </div>
                                            <div>
                                                <select id="g-flaw-select" class="w-full bg-transparent border-b border-[#444] text-[10px] text-gray-300 p-1 mb-2">
                                                    <option value="" class="bg-black">Add Flaw...</option>
                                                    ${flawOpts}
                                                </select>
                                                <div id="g-flaws-list" class="space-y-1"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Status Block -->
                                    <div class="border border-[#333] bg-black/40 p-4 grid grid-cols-2 gap-4">
                                        <div class="flex justify-between items-center text-xs">
                                            <span class="font-bold text-[#d4af37] uppercase">Humanity</span>
                                            <div class="dot-row cursor-pointer" id="g-humanity-row">${renderDots(activeGhoul.humanity, 10)}</div>
                                        </div>
                                        <div class="flex justify-between items-center text-xs">
                                            <span class="font-bold text-[#d4af37] uppercase">Willpower</span>
                                            <div class="dot-row cursor-pointer" id="g-willpower-row">${renderDots(activeGhoul.willpower, 10)}</div>
                                        </div>
                                        <div class="flex justify-between items-center text-xs col-span-2 border-t border-[#333] pt-2">
                                            <span class="font-bold text-[#d4af37] uppercase">Blood Pool (Vitae)</span>
                                            <input type="number" id="g-blood" value="${activeGhoul.bloodPool}" class="w-12 bg-transparent border-b border-[#444] text-center text-white p-1 font-bold text-lg focus:border-[#d4af37] outline-none">
                                        </div>
                                    </div>

                                    <!-- Attributes Upgrade -->
                                    <div>
                                        <h3 class="column-title mb-2">Attributes</h3>
                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div id="fb-attr-phys"></div>
                                            <div id="fb-attr-soc"></div>
                                            <div id="fb-attr-men"></div>
                                        </div>
                                    </div>

                                    <!-- Abilities Upgrade -->
                                    <div>
                                        <h3 class="column-title mb-2">Abilities</h3>
                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div id="fb-abil-tal"></div>
                                            <div id="fb-abil-ski"></div>
                                            <div id="fb-abil-kno"></div>
                                        </div>
                                    </div>

                                    <!-- Advantages Upgrade -->
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h3 class="column-title mb-2">Disciplines & Backgrounds</h3>
                                            <div id="fb-disc-list" class="space-y-1"></div>
                                            <div id="fb-back-list" class="space-y-1 mt-4"></div>
                                        </div>
                                        <div>
                                            <h3 class="column-title mb-2">Virtues</h3>
                                            <div id="fb-virt-list" class="space-y-2"></div>
                                        </div>
                                    </div>
                                </div>

                                <!-- RIGHT: FREEBIE LEDGER (Dynamic) -->
                                <div id="freebie-ledger-panel" class="w-64 bg-[#080808] border-l border-[#333] flex-col shrink-0 transition-all">
                                    <div class="p-3 border-b border-[#333] bg-[#111]">
                                        <h3 class="text-[#d4af37] font-cinzel font-bold text-center">Freebie Ledger</h3>
                                    </div>
                                    
                                    <div class="p-3 border-b border-[#333] bg-[#1a1a1a]">
                                        <div class="flex justify-between items-center text-xs mb-1">
                                            <span class="text-gray-400">Total Freebies</span>
                                            <span class="text-white font-bold">21</span>
                                        </div>
                                        <div class="flex justify-between items-center text-xs mb-1">
                                            <span class="text-gray-400">Flaw Bonus</span>
                                            <span id="fb-bonus-disp" class="text-green-400 font-bold">0</span>
                                        </div>
                                        <div class="border-t border-[#333] pt-1 flex justify-between items-center text-xs">
                                            <span class="text-[#d4af37] font-bold uppercase">Remaining</span>
                                            <span id="fb-rem-disp" class="text-white font-black text-lg">21</span>
                                        </div>
                                    </div>

                                    <!-- CATEGORIZED COSTS -->
                                    <div id="fb-breakdown-list" class="space-y-2 text-xs p-3 border-b border-[#333]">
                                        <!-- Injected via JS -->
                                    </div>

                                    <div class="mt-2 px-3 flex-1 flex flex-col min-h-0">
                                        <h4 class="text-[9px] uppercase text-gray-500 font-bold mb-1 tracking-wider">Freebie Log</h4>
                                        <div id="fb-log-list" class="text-[9px] text-gray-400 flex-1 overflow-y-auto border border-[#333] p-1 font-mono bg-white/5">
                                            <!-- Log entries injected here -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div> <!-- End Main Scroll Area -->

                <!-- RIGHT SIDEBAR: XP LEDGER (Visible in XP Mode) -->
                <div id="xp-ledger-panel" class="${xpMode ? 'flex' : 'hidden'} w-64 bg-[#080808] border-l border-[#333] flex-col shrink-0 transition-all">
                    <div class="p-3 border-b border-[#333] bg-[#111]">
                        <h3 class="text-purple-400 font-cinzel font-bold text-center">XP Log</h3>
                    </div>
                    
                    <div class="p-3 border-b border-[#333] bg-[#1a1a1a]">
                        <div class="flex justify-between items-center text-xs mb-2">
                            <span class="text-gray-400">Total XP</span>
                            <input type="number" id="xp-total-input" value="${activeGhoul.experience.total}" onchange="window.updateGhoulTotalXP(this.value)" class="w-16 bg-black border border-[#333] text-purple-400 text-center font-bold focus:border-purple-500 outline-none">
                        </div>
                    </div>

                    <!-- CATEGORIZED COSTS -->
                    <div id="xp-breakdown-list" class="space-y-2 text-xs p-3 border-b border-[#333]">
                        <!-- Injected via JS -->
                    </div>

                    <div class="p-3 border-b border-[#333] bg-[#111]">
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-gray-400">Total Spent</span>
                            <span id="xp-spent-disp" class="text-white font-bold">${activeGhoul.experience.spent}</span>
                        </div>
                        <div class="flex justify-between items-center text-xs mt-1 pt-1 border-t border-[#333]">
                            <span class="text-gray-400">Remaining</span>
                            <span id="xp-rem-disp" class="text-green-400 font-bold">${activeGhoul.experience.total - activeGhoul.experience.spent}</span>
                        </div>
                    </div>

                    <div class="mt-2 px-3">
                        <h4 class="text-[9px] uppercase text-gray-500 font-bold mb-1 tracking-wider">Session Log</h4>
                        <div id="xp-log-list" class="text-[9px] text-gray-400 h-40 overflow-y-auto border border-[#333] p-1 font-mono bg-white/5">
                            <!-- Log entries injected here -->
                        </div>
                    </div>
                </div>

            </div>

            <!-- FOOTER -->
            <div class="p-4 border-t border-[#444] bg-[#050505] flex justify-between items-center shrink-0">
                <div class="text-[10px] text-gray-500 italic">
                    <span class="text-[#d4af37]">Note:</span> Abilities capped at 3 dots until 'Finishing' step. Specialties available at 4+ dots.
                </div>
                <div class="flex gap-4">
                    <button id="cancel-ghoul" class="border border-[#444] text-gray-400 px-6 py-2 uppercase font-bold text-xs hover:bg-[#222] hover:text-white transition tracking-wider">Cancel</button>
                    <button id="save-ghoul" class="bg-[#8b0000] text-white px-8 py-2 uppercase font-bold text-xs hover:bg-red-700 shadow-lg tracking-widest transition flex items-center gap-2 border border-transparent hover:border-red-500">
                        <i class="fas fa-check"></i> Save & Close
                    </button>
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
    updateTracker(); // Keep tracking logic for Steps 1-4
    updateVirtueHeader();
}

// ... existing XP helpers ...

function renderGhoulXpSidebar() {
    // 1. Calculate Buckets
    const log = activeGhoul.experience.log || [];
    let buckets = {
        newAbil: 0,
        attr: 0,
        abil: 0,
        disc: 0,
        virt: 0,
        humanity: 0,
        willpower: 0,
        background: 0
    };

    log.forEach(entry => {
        // Use type stored in log, fallback to detection if missing
        const type = entry.type; 
        const cost = entry.cost;
        
        if (type === 'attributes' || type === 'attr') buckets.attr += cost;
        else if (type === 'abilities' || type === 'abil') {
            if (entry.from === 0 && entry.cost > 0) buckets.newAbil += cost; // Only count buying new ability here
            else buckets.abil += cost;
        }
        else if (type === 'disciplines' || type === 'disc') buckets.disc += cost;
        else if (type === 'virtues' || type === 'virt') buckets.virt += cost;
        else if (type === 'humanity') buckets.humanity += cost;
        else if (type === 'willpower') buckets.willpower += cost;
        else if (type === 'backgrounds' || type === 'back') buckets.background += cost;
    });

    // 2. Render Breakdown List
    const breakdown = document.getElementById('xp-breakdown-list');
    if (breakdown) {
        breakdown.innerHTML = '';
        const addRow = (label, val) => {
            const row = document.createElement('div');
            row.className = "flex justify-between items-center gap-1";
            // Match main app style: Label gray, value colored
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

    // 3. Render Log List
    const logList = document.getElementById('xp-log-list');
    if (logList) {
        if (log.length === 0) {
            logList.innerHTML = '<div class="text-center italic opacity-50 mt-4">No XP spent yet.</div>';
        } else {
            logList.innerHTML = log.slice().reverse().map(entry => {
                const isRefund = entry.cost < 0;
                const costDisp = isRefund ? `+${Math.abs(entry.cost)}` : `-${entry.cost}`;
                const color = isRefund ? 'text-green-400' : 'text-purple-400';
                
                return `
                <div class="border-b border-[#222] pb-1 mb-1">
                    <div class="flex justify-between text-white">
                        <span class="font-bold">${entry.trait}</span>
                        <span class="${color}">${costDisp}</span>
                    </div>
                    <div class="flex justify-between text-[8px] text-gray-500">
                        <span>${entry.from} &rarr; ${entry.to}</span>
                        <span>${new Date(entry.date).toLocaleDateString()}</span>
                    </div>
                </div>`;
            }).join('');
        }
    }

    // 4. Update Totals
    const spentEl = document.getElementById('xp-spent-disp');
    const remEl = document.getElementById('xp-rem-disp');
    
    if (spentEl) spentEl.innerText = activeGhoul.experience.spent;
    if (remEl) remEl.innerText = activeGhoul.experience.total - activeGhoul.experience.spent;
}

// --- FREEBIE LOGIC ---

function renderGhoulFreebieSidebar() {
    if (!activeGhoul.freebies) activeGhoul.freebies = { spent: 0, log: [] };
    
    const log = activeGhoul.freebies.log || [];
    
    // Calculate Stats
    let flawBonus = 0;
    let meritCost = 0;
    
    if (activeGhoul.flaws) Object.values(activeGhoul.flaws).forEach(v => flawBonus += v);
    // Cap flaw bonus at 7
    const cappedFlawBonus = Math.min(7, flawBonus);
    
    if (activeGhoul.merits) Object.values(activeGhoul.merits).forEach(v => meritCost += v);

    let buckets = {
        attr: 0, abil: 0, disc: 0, virt: 0, hum: 0, will: 0, back: 0
    };

    let logSpent = 0;
    log.forEach(entry => {
        logSpent += entry.cost;
        if (entry.type === 'attributes' || entry.type === 'attr') buckets.attr += entry.cost;
        else if (entry.type === 'abilities' || entry.type === 'abil') buckets.abil += entry.cost;
        else if (entry.type === 'disciplines' || entry.type === 'disc') buckets.disc += entry.cost;
        else if (type === 'virtues' || type === 'virt') buckets.virt += entry.cost; // Fix typo in previous versions if present
        else if (entry.type === 'virtues') buckets.virt += entry.cost;
        else if (entry.type === 'humanity') buckets.hum += entry.cost;
        else if (entry.type === 'willpower') buckets.will += entry.cost;
        else if (entry.type === 'backgrounds') buckets.back += entry.cost;
    });

    const totalSpent = logSpent + meritCost;
    const totalAvail = 21 + cappedFlawBonus;
    const remaining = totalAvail - totalSpent;

    // Render Status
    document.getElementById('fb-bonus-disp').innerText = `+${cappedFlawBonus}`;
    const remEl = document.getElementById('fb-rem-disp');
    if (remEl) {
        remEl.innerText = remaining;
        remEl.className = remaining >= 0 ? "text-white font-black text-lg" : "text-red-500 font-black text-lg";
    }

    // Render Breakdown
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

    // Render Log
    const logList = document.getElementById('fb-log-list');
    if (logList) {
        if (log.length === 0) {
            logList.innerHTML = '<div class="text-center italic opacity-50 mt-4">No freebies spent on dots.</div>';
        } else {
            logList.innerHTML = log.slice().reverse().map(entry => {
                const isRefund = entry.cost < 0;
                const costDisp = isRefund ? `+${Math.abs(entry.cost)}` : `-${entry.cost}`;
                const color = isRefund ? 'text-green-400' : 'text-[#d4af37]';
                
                return `
                <div class="border-b border-[#222] pb-1 mb-1">
                    <div class="flex justify-between text-white">
                        <span class="font-bold">${entry.trait}</span>
                        <span class="${color}">${costDisp}</span>
                    </div>
                    <div class="flex justify-between text-[8px] text-gray-500">
                        <span>${entry.from} &rarr; ${entry.to}</span>
                        <span>${new Date(entry.date).toLocaleTimeString()}</span>
                    </div>
                </div>`;
            }).join('');
        }
    }
}

function handleFreebieSpend(type, key, newVal, currentVal) {
    let targetVal = newVal;
    if (newVal === currentVal) {
        targetVal = currentVal - 1; // Toggle off = remove dot
    }

    if (targetVal === currentVal) return;

    // BUYING
    if (targetVal > currentVal) {
        // Enforce 1 dot at a time for simplicity in logging
        if (targetVal > currentVal + 1) {
             showNotification("Please purchase dots one at a time.");
             return;
        }

        // Calculate Cost
        let cost = 0;
        if (type === 'attributes') cost = FREEBIE_COSTS.attribute;
        else if (type === 'abilities') cost = FREEBIE_COSTS.ability;
        else if (type === 'disciplines') cost = FREEBIE_COSTS.discipline;
        else if (type === 'backgrounds') cost = FREEBIE_COSTS.background;
        else if (type === 'virtues') cost = FREEBIE_COSTS.virtue;
        else if (type === 'humanity') cost = FREEBIE_COSTS.humanity;
        else if (type === 'willpower') cost = FREEBIE_COSTS.willpower;

        // Check Funds
        const logSpent = activeGhoul.freebies.log.reduce((acc, l) => acc + l.cost, 0);
        let meritCost = 0;
        if (activeGhoul.merits) Object.values(activeGhoul.merits).forEach(v => meritCost += v);
        let flawBonus = 0;
        if (activeGhoul.flaws) Object.values(activeGhoul.flaws).forEach(v => flawBonus += v);
        
        const totalSpent = logSpent + meritCost;
        const totalAvail = 21 + Math.min(7, flawBonus);
        const rem = totalAvail - totalSpent;

        if (cost > rem) {
            showNotification("Not enough Freebie Points!");
            return;
        }

        activeGhoul.freebies.spent += cost;
        activeGhoul.freebies.log.push({
            date: Date.now(),
            trait: key || type, // Use type for hum/will
            from: currentVal,
            to: targetVal,
            cost: cost,
            type: type
        });

        updateValue(type, key, targetVal);
        showNotification(`Spent ${cost} Freebies`);
    }
    // REFUNDING
    else {
        // We can only refund if we have a log entry for this trait that raised it to current level
        // Simplification: Just allow refunding at fixed cost if log exists for this trait?
        // Better: Check if the user "bought" this dot.
        // We will assume standard cost refund.
        // But what if it's a creation dot?
        // We scan the log. If there is a positive cost entry for this trait, we can refund it.
        // Or simpler: Just allow refunding down to 0, but log negative cost.
        // The user is responsible for not cheating (or we implement strict checking).
        
        // Strict Check: Can only refund if `count(buys) > count(refunds)` for this trait?
        // Let's keep it flexible like XP mode: Allow refund, but maybe check floor?
        // Floor is complex because of Priorities.
        // We will allow refunding freely, assuming user knows what they are doing in Step 5.
        
        let refundAmount = 0;
        if (type === 'attributes') refundAmount = FREEBIE_COSTS.attribute;
        else if (type === 'abilities') refundAmount = FREEBIE_COSTS.ability;
        else if (type === 'disciplines') refundAmount = FREEBIE_COSTS.discipline;
        else if (type === 'backgrounds') refundAmount = FREEBIE_COSTS.background;
        else if (type === 'virtues') refundAmount = FREEBIE_COSTS.virtue;
        else if (type === 'humanity') refundAmount = FREEBIE_COSTS.humanity;
        else if (type === 'willpower') refundAmount = FREEBIE_COSTS.willpower;

        activeGhoul.freebies.spent -= refundAmount;
        activeGhoul.freebies.log.push({
            date: Date.now(),
            trait: key || type,
            from: currentVal,
            to: targetVal,
            cost: -refundAmount,
            type: type
        });

        updateValue(type, key, targetVal);
        showNotification(`Refunded ${refundAmount} Freebies`);
    }
    
    renderGhoulFreebieSidebar();
}

// ... existing updateValue (shared) ...
function updateValue(type, key, val) {
    if (type === 'attributes' || type === 'abilities' || type === 'virtues' || type === 'disciplines' || type === 'backgrounds') {
        activeGhoul[type][key] = val;
    } else if (type === 'humanity') {
        activeGhoul.humanity = val;
    } else if (type === 'willpower') {
        activeGhoul.willpower = val;
    }
    
    renderDotGroups();
    renderDynamicLists();
    renderFreebieLists();
    bindDotClicks(document.getElementById('ghoul-modal'));
}

// ... existing bindDotClicks ...
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
            
            if (xpMode) {
                handleXpSpend(type, type, newVal, currentVal); 
                return;
            }
            if (currentTab === 'step5') {
                handleFreebieSpend(type, type, newVal, currentVal); // Key is same as type
                return;
            }

            // Normal Logic
            let finalVal = newVal;
            if (newVal === currentVal) finalVal = newVal - 1;
            if (finalVal < 1) finalVal = 1;
            if (!validateChange(type, null, finalVal, currentVal)) return;
            activeGhoul[type] = finalVal;
            el.innerHTML = renderDots(finalVal, 10);
            updateCounters();
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

            if (xpMode) {
                handleXpSpend(type, key, newVal, currentVal);
                return;
            }
            if (currentTab === 'step5') {
                handleFreebieSpend(type, key, newVal, currentVal);
                return;
            }

            let finalVal = newVal;
            if (newVal === currentVal) finalVal = newVal - 1;
            
            if (type === 'attributes' && finalVal < 1) finalVal = 1;
            if (type === 'virtues' && finalVal < 1) finalVal = 1;

            if (!validateChange(type, key, finalVal, currentVal)) return;
            
            activeGhoul[type][key] = finalVal;
            
            renderDotGroups();
            renderDynamicLists();
            renderFreebieLists();
            
            bindDotClicks(modal);

            if (type === 'virtues') {
                recalcStatus();
                const hDots = document.getElementById('g-humanity-row');
                const wDots = document.getElementById('g-willpower-row');
                if(hDots) hDots.innerHTML = renderDots(activeGhoul.humanity, 10);
                if(wDots) wDots.innerHTML = renderDots(activeGhoul.willpower, 10);
            }

            updateCounters();
        };
    });
}

// ... existing renderMeritsFlaws ...
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
    // Update Freebie Ledger Sidebar if visible
    renderGhoulFreebieSidebar();
}

// ... existing updateTracker ... (Only for Step 1-4 validation now)
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

    // Colors for Counters in Steps 2-3
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
