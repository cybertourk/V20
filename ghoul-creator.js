import { ATTRIBUTES, ABILITIES, DISCIPLINES, VIRTUES, BACKGROUNDS, ARCHETYPES, SPECIALTIES } from "./data.js";
import { renderDots, showNotification } from "./ui-common.js";

// --- STATE ---
let activeGhoul = null;
let activeIndex = null;
let currentTab = 'step1';

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
    
    // Reset Local State
    localPriorities = {
        attr: { Physical: null, Social: null, Mental: null },
        abil: { Talents: null, Skills: null, Knowledges: null }
    };

    if (incomingData) {
        activeGhoul = JSON.parse(JSON.stringify(incomingData));
        // Patch missing objects
        ['attributes', 'abilities', 'disciplines', 'backgrounds', 'specialties'].forEach(k => { if (!activeGhoul[k]) activeGhoul[k] = {}; });
        if (!activeGhoul.virtues) activeGhoul.virtues = { Conscience: 1, "Self-Control": 1, Courage: 1 };
        
        if (!activeGhoul.disciplines.Potence) activeGhoul.disciplines.Potence = 1;

        initBaseDots(activeGhoul);
        
        // RECOVER PRIORITIES
        if (activeGhoul.priorities) {
            localPriorities = JSON.parse(JSON.stringify(activeGhoul.priorities));
        } else {
            autoDetectPriorities();
        }

    } else {
        // New Ghoul Template
        const defaultChronicle = (window.character && window.character.chronicle) ? window.character.chronicle : "";

        activeGhoul = {
            name: "", player: "", chronicle: defaultChronicle, type: "Vassal", concept: "", domitor: "",
            nature: "", demeanor: "",
            attributes: {}, abilities: {}, 
            disciplines: { Potence: 1 }, 
            backgrounds: {}, 
            virtues: { Conscience: 1, "Self-Control": 1, Courage: 1 },
            specialties: {},
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
    // Helper to sum points
    const sumGroup = (cat, groupList, isAttr) => {
        let sum = 0;
        groupList.forEach(k => {
            const val = isAttr ? (activeGhoul.attributes[k] || 1) : (activeGhoul.abilities[k] || 0);
            sum += isAttr ? Math.max(0, val - 1) : val;
        });
        return sum;
    };

    // 1. Detect Attributes
    const attrSums = [
        { grp: 'Physical', val: sumGroup('attr', ATTRIBUTES.Physical, true) },
        { grp: 'Social', val: sumGroup('attr', ATTRIBUTES.Social, true) },
        { grp: 'Mental', val: sumGroup('attr', ATTRIBUTES.Mental, true) }
    ].sort((a, b) => b.val - a.val);

    // Assign strictly descending (approximate)
    if(attrSums[0]) localPriorities.attr[attrSums[0].grp] = 6;
    if(attrSums[1]) localPriorities.attr[attrSums[1].grp] = 4;
    if(attrSums[2]) localPriorities.attr[attrSums[2].grp] = 3;

    // 2. Detect Abilities
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
    activeGhoul.humanity = (activeGhoul.virtues.Conscience || 1) + (activeGhoul.virtues["Self-Control"] || 1);
    activeGhoul.willpower = activeGhoul.virtues.Courage || 1;
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

    modal.innerHTML = `
        <div class="w-[95%] max-w-7xl h-[95%] bg-[#0a0a0a] border-2 border-[#8b0000] shadow-[0_0_50px_rgba(139,0,0,0.5)] flex flex-col relative font-serif">
            
            <!-- HEADER -->
            <div class="bg-[#1a0505] p-4 border-b border-[#444] flex justify-between items-center shrink-0">
                <div class="flex items-center gap-4">
                    <h2 class="text-2xl font-cinzel text-[#d4af37] font-bold tracking-widest uppercase shadow-black drop-shadow-md">
                        <i class="fas fa-user-plus mr-2 text-[#8b0000]"></i>Ghoul Creator <span class="text-xs align-top opacity-50 ml-1">V20</span>
                    </h2>
                </div>
                <button id="close-ghoul-modal" class="text-gray-400 hover:text-white text-xl px-2 transition-transform hover:rotate-90"><i class="fas fa-times"></i></button>
            </div>

            <!-- TABS -->
            <div class="flex border-b border-[#333] bg-[#050505] text-[10px] uppercase font-bold text-gray-500 tracking-wider overflow-x-auto no-scrollbar shrink-0">
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="step1">1. Concept</button>
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="step2">2. Attributes</button>
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="step3">3. Abilities</button>
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="step4">4. Advantages</button>
                <button class="ghoul-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="step5">5. Finishing</button>
            </div>

            <!-- CONTENT -->
            <div class="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar relative bg-[#050505] bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]">
                
                <!-- STEP 1: IDENTITY -->
                <div id="step1" class="ghoul-step hidden">
                    <div class="sheet-section !mt-0">
                        <div class="section-title">Character Concept</div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="space-y-6">
                                <div><label class="label-text text-[#d4af37]">Name</label><input type="text" id="g-name" value="${activeGhoul.name || ''}" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors"></div>
                                <div><label class="label-text text-[#d4af37]">Player</label><input type="text" id="g-player" value="${activeGhoul.player || ''}" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors"></div>
                                <div><label class="label-text text-[#d4af37]">Domitor (Master)</label><input type="text" id="g-domitor" value="${activeGhoul.domitor || ''}" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors"></div>
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
                                <div>
                                    <label class="label-text text-[#d4af37]">Ghoul Type</label>
                                    <select id="g-type" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                                        <option value="Vassal" ${activeGhoul.type === 'Vassal' ? 'selected' : ''} class="bg-black">Vassal (7 Virtue Dots)</option>
                                        <option value="Independent" ${activeGhoul.type === 'Independent' ? 'selected' : ''} class="bg-black">Independent (7 Virtue Dots)</option>
                                        <option value="Revenant" ${activeGhoul.type === 'Revenant' ? 'selected' : ''} class="bg-black">Revenant (5 Virtue Dots)</option>
                                    </select>
                                </div>
                            </div>
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

                <!-- STEP 5: FINISHING (FREEBIES) -->
                <div id="step5" class="ghoul-step hidden">
                    <div class="sheet-section !mt-0 h-full">
                        <div class="section-title">Finishing Touches & Freebie Points</div>
                        
                        <div class="flex flex-col md:flex-row gap-6 h-full">
                            <!-- LEFT: UPGRADE PANEL -->
                            <div class="flex-1 space-y-8 overflow-y-auto pr-2 max-h-[60vh]">
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
                                        <span class="font-bold text-[#d4af37] uppercase">Blood Pool</span>
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

                            <!-- RIGHT: LEDGER (STICKY) -->
                            <div class="w-full md:w-64 flex-shrink-0">
                                <div class="sticky top-0 space-y-4">
                                    <h3 class="column-title">Freebie Ledger</h3>
                                    <div class="text-[10px] font-mono space-y-2 p-4 bg-black/40 border border-[#333] text-gray-400">
                                        <div class="flex justify-between border-b border-[#222] pb-1"><span>Attributes (5):</span> <span id="fb-cost-attr" class="text-white">0</span></div>
                                        <div class="flex justify-between border-b border-[#222] pb-1"><span>Abilities (2):</span> <span id="fb-cost-abil" class="text-white">0</span></div>
                                        <div class="flex justify-between border-b border-[#222] pb-1"><span>Disciplines (10):</span> <span id="fb-cost-disc" class="text-white">0</span></div>
                                        <div class="flex justify-between border-b border-[#222] pb-1"><span>Backgrounds (1):</span> <span id="fb-cost-back" class="text-white">0</span></div>
                                        <div class="flex justify-between border-b border-[#222] pb-1"><span>Virtues (2):</span> <span id="fb-cost-virt" class="text-white">0</span></div>
                                        <div class="flex justify-between border-b border-[#222] pb-1"><span>Humanity (1):</span> <span id="fb-cost-hum" class="text-white">0</span></div>
                                        <div class="flex justify-between border-b border-[#222] pb-1"><span>Willpower (1):</span> <span id="fb-cost-will" class="text-white">0</span></div>
                                    </div>
                                    <div class="p-4 border border-[#d4af37]/30 bg-[#d4af37]/10 rounded text-center shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                                        <div class="uppercase text-[9px] font-bold text-[#d4af37] tracking-widest">Freebies Remaining</div>
                                        <div id="final-freebie-disp" class="text-4xl font-black text-white mt-2 font-cinzel">21</div>
                                    </div>
                                </div>
                            </div>
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

    if(activeGhoul.nature) document.getElementById('g-nature').value = activeGhoul.nature;
    if(activeGhoul.demeanor) document.getElementById('g-demeanor').value = activeGhoul.demeanor;

    renderDotGroups();
    renderDynamicLists();
    updatePriorityUI(); 
    
    // Render Step 5 Lists initially (hidden but ready)
    renderFreebieLists();

    setupNavListeners(modal);
    setupActionListeners(modal);
    bindDotClicks(modal);
    updateTracker();
    updateVirtueHeader();
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

function validateChange(type, key, newVal, currentVal) {
    if (currentTab === 'step5') return true; 

    const delta = newVal - currentVal;
    if (delta <= 0) return true; 

    // 1. Attributes
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

    // 2. Abilities
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

    // 3. Disciplines
    if (type === 'disciplines') {
        let total = 0;
        Object.values(activeGhoul.disciplines).forEach(v => total += v);
        // Limit: Potence 1 + 1 Free Dot = 2 Total
        if (total + delta > 2) {
             showNotification("Creation Limit: 1 Free Dot + Potence 1 (Total 2). Use Freebies for more.");
             return false;
        }
    }

    // 4. Backgrounds
    if (type === 'backgrounds') {
        let total = 0;
        Object.values(activeGhoul.backgrounds).forEach(v => total += v);
        if (total + delta > 5) {
             showNotification("Creation Limit: 5 Dots in Backgrounds. Use Freebies for more.");
             return false;
        }
    }

    // 5. Virtues
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

// --- PRIORITY HELPERS ---
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

function handlePrioClick(e) {
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
    updateCounters();
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

function updateCounters() {
    ['attr', 'abil'].forEach(cat => {
        Object.entries(localPriorities[cat]).forEach(([group, limit]) => {
            const el = document.getElementById(`cnt-${cat}-${group}`);
            if(!el) return;
            
            let spent = 0;
            let list = (cat === 'attr') ? ATTRIBUTES[group] : 
                       (group === 'Talents' ? ABILITIES.Talents : 
                        group === 'Skills' ? ABILITIES.Skills : ABILITIES.Knowledges);
            
            list.forEach(item => {
                const val = (cat === 'attr') ? activeGhoul.attributes[item] : activeGhoul.abilities[item];
                if (cat === 'attr') spent += Math.max(0, (val||1) - 1);
                else spent += (val||0);
            });

            if (limit) {
                const color = spent > limit ? 'text-red-500 font-bold' : (spent === limit ? 'text-green-500 font-bold' : 'text-gray-500');
                el.innerHTML = `<span class="${color}">${spent} / ${limit}</span>`;
            } else {
                el.innerHTML = `<span class="text-gray-600">[${spent}]</span>`;
            }
        });
    });
    updateTracker();
}

// --- TABS ---
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

function setupNavListeners(modal) {
    const tabs = modal.querySelectorAll('.ghoul-tab');
    tabs.forEach(t => t.onclick = () => switchTab(t.dataset.tab));
}

// --- RENDER HELPERS ---
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

function renderGroup(id, title, list, type) {
    const el = document.getElementById(id);
    if(!el) return;
    let html = ''; 
    if (list) {
        list.forEach(item => {
            const val = activeGhoul[type][item] || 0;
            const dispVal = (type === 'attributes' && val < 1) ? 1 : val;
            
            // Specialty Check
            let specialtyHtml = '';
            if ((type === 'attributes' || type === 'abilities') && val >= 4) {
                const specVal = (activeGhoul.specialties && activeGhoul.specialties[item]) || '';
                
                // Get relevant options
                const options = (SPECIALTIES && SPECIALTIES[item]) ? SPECIALTIES[item] : [];
                const datalistId = `spec-list-${item.replace(/\s/g, '-')}`;
                const datalistHtml = `
                    <datalist id="${datalistId}">
                        ${options.map(opt => `<option value="${opt}">`).join('')}
                    </datalist>
                `;

                specialtyHtml = `
                    ${datalistHtml}
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

window.removeGhoulItem = function(type, key) {
    if (type === 'disciplines' && key === 'Potence') return; 
    if (activeGhoul[type] && activeGhoul[type][key] !== undefined) {
        delete activeGhoul[type][key];
        renderDynamicLists();
        renderFreebieLists(); // Update step 5 too
        updateCounters();
        bindDotClicks(document.getElementById('ghoul-modal'));
    }
};

function setupActionListeners(modal) {
    const close = () => {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    };
    
    document.getElementById('close-ghoul-modal').onclick = close;
    document.getElementById('cancel-ghoul').onclick = close;
    
    document.getElementById('save-ghoul').onclick = () => {
        activeGhoul.name = document.getElementById('g-name').value;
        activeGhoul.domitor = document.getElementById('g-domitor').value;
        activeGhoul.concept = document.getElementById('g-concept').value;
        activeGhoul.type = document.getElementById('g-type').value;
        activeGhoul.player = document.getElementById('g-player').value;
        
        const natureEl = document.getElementById('g-nature');
        const demeanorEl = document.getElementById('g-demeanor');
        if(natureEl) activeGhoul.nature = natureEl.value;
        if(demeanorEl) activeGhoul.demeanor = demeanorEl.value;

        activeGhoul.bloodPool = parseInt(document.getElementById('g-blood').value) || 10;
        
        // SAVE PRIORITIES (Critical for Freebie calculation on reload)
        activeGhoul.priorities = JSON.parse(JSON.stringify(localPriorities));

        if (!window.state.retainers) window.state.retainers = [];
        if (activeIndex !== null && activeIndex >= 0) window.state.retainers[activeIndex] = activeGhoul;
        else window.state.retainers.push(activeGhoul);

        if(window.renderRetainersTab) window.renderRetainersTab(document.getElementById('play-content'));
        
        if (typeof showNotification === 'function') {
            showNotification("Retainer Added. Please save your character.");
        } else if (window.showNotification) {
            window.showNotification("Retainer Added. Please save your character.");
        }
        
        close();
    };

    const typeSelect = document.getElementById('g-type');
    if(typeSelect) {
        typeSelect.onchange = (e) => {
            activeGhoul.type = e.target.value;
            updateVirtueHeader();
            updateCounters(); 
        };
    }

    // Specialty Inputs
    modal.addEventListener('change', (e) => {
        if(e.target.classList.contains('specialty-input')) {
            const key = e.target.dataset.key;
            if(!activeGhoul.specialties) activeGhoul.specialties = {};
            activeGhoul.specialties[key] = e.target.value;
        }
    });

    const setupDrop = (id, type, renderFn) => {
        const sel = document.getElementById(id);
        if(!sel) return;
        sel.onchange = (e) => {
            const val = e.target.value;
            if(val) {
                if(!activeGhoul[type]) activeGhoul[type] = {};
                if(activeGhoul[type][val] === undefined) {
                    if (!validateChange(type, val, 1, 0)) {
                        e.target.value = "";
                        return;
                    }
                    activeGhoul[type][val] = 1;
                    renderFn();
                    renderFreebieLists(); // Update step 5 too
                    updateCounters();
                    bindDotClicks(modal);
                }
                e.target.value = "";
            }
        };
    };
    setupDrop('g-disc-select', 'disciplines', renderDisciplines);
    setupDrop('g-back-select', 'backgrounds', renderBackgrounds);
}

function updateVirtueHeader() {
    const header = document.getElementById('g-virtue-header-limit');
    if (!header) return;
    const isRevenant = activeGhoul.type === 'Revenant';
    const limit = isRevenant ? 5 : 7;
    header.innerText = `(Free Dots: ${limit})`;
}

function bindDotClicks(modal) {
    const rows = modal.querySelectorAll('.dot-row-interactive');
    const humRow = document.getElementById('g-humanity-row');
    const willRow = document.getElementById('g-willpower-row');

    const bindDirect = (el, type) => {
        if(!el) return;
        el.onclick = (e) => {
            if (!e.target.classList.contains('dot')) return;
            if (currentTab !== 'step5') return;
            
            const newVal = parseInt(e.target.dataset.v);
            let currentVal = activeGhoul[type];
            let finalVal = newVal;
            if (newVal === currentVal) finalVal = newVal - 1;
            if (finalVal < 1) finalVal = 1;
            
            activeGhoul[type] = finalVal;
            el.innerHTML = renderDots(finalVal, 10);
            updateCounters();
        };
    };

    bindDirect(humRow, 'humanity');
    bindDirect(willRow, 'willpower');

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

            let finalVal = newVal;
            if (newVal === currentVal) finalVal = newVal - 1;
            
            if (type === 'attributes' && finalVal < 1) finalVal = 1;
            if (type === 'virtues' && finalVal < 1) finalVal = 1;

            if (!validateChange(type, key, finalVal, currentVal)) return;
            
            activeGhoul[type][key] = finalVal;
            
            // Re-render ALL instances of this row (in step 2-4 AND step 5)
            renderDotGroups();
            renderDynamicLists();
            renderFreebieLists();
            
            // Re-bind because we wiped HTML
            bindDotClicks(modal);

            if (type === 'virtues') {
                recalcStatus();
                // Status is in Step 5, update manually if we aren't re-rendering whole modal
                const hDots = document.getElementById('g-humanity-row');
                const wDots = document.getElementById('g-willpower-row');
                if(hDots) hDots.innerHTML = renderDots(activeGhoul.humanity, 10);
                if(wDots) wDots.innerHTML = renderDots(activeGhoul.willpower, 10);
            }

            updateCounters();
        };
    });
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

    let costs = { attr: 0, abil: 0, disc: 0, back: 0, virt: 0, hum: 0, will: 0 };

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
            
            const cap = limit || 0; 
            if (s > cap) {
                const multiplier = (cat === 'attr') ? 5 : 2;
                if (cat === 'attr') costs.attr += (s - cap) * multiplier;
                else costs.abil += (s - cap) * multiplier;
            }
        });
    });

    let totalDiscDots = 0;
    if(activeGhoul.disciplines) {
        Object.values(activeGhoul.disciplines).forEach(v => totalDiscDots += v);
    }
    const freeDiscDots = 2; 
    if (totalDiscDots > freeDiscDots) {
        costs.disc = (totalDiscDots - freeDiscDots) * 10;
    }

    let backDots = 0;
    if(activeGhoul.backgrounds) Object.values(activeGhoul.backgrounds).forEach(v => backDots += v);
    if (backDots > 5) costs.back = (backDots - 5) * 1;

    let virtDots = 0;
    if(VIRTUES && activeGhoul.virtues) VIRTUES.forEach(v => virtDots += Math.max(0, (activeGhoul.virtues[v]||1)-1));
    const virtLimit = (activeGhoul.type === 'Revenant') ? 5 : 7;
    if (virtDots > virtLimit) costs.virt = (virtDots - virtLimit) * 2;

    const baseHum = (activeGhoul.virtues.Conscience||1) + (activeGhoul.virtues["Self-Control"]||1);
    if (activeGhoul.humanity > baseHum) {
        costs.hum = (activeGhoul.humanity - baseHum) * 1;
    }

    const baseWill = (activeGhoul.virtues.Courage||1);
    if (activeGhoul.willpower > baseWill) {
        costs.will = (activeGhoul.willpower - baseWill) * 1;
    }

    const setCost = (id, val) => {
        const el = document.getElementById(id);
        if(el) {
            el.innerText = val;
            el.className = val > 0 ? "text-red-400 font-bold" : "text-gray-500";
        }
    };
    
    setCost('fb-cost-attr', costs.attr);
    setCost('fb-cost-abil', costs.abil);
    setCost('fb-cost-disc', costs.disc);
    setCost('fb-cost-back', costs.back);
    setCost('fb-cost-virt', costs.virt);
    setCost('fb-cost-hum', costs.hum);
    setCost('fb-cost-will', costs.will);

    const totalCost = Object.values(costs).reduce((a, b) => a + b, 0);
    const remaining = 21 - totalCost;
    
    const fbEl = document.getElementById('final-freebie-disp');
    if(fbEl) {
        fbEl.innerText = remaining;
        fbEl.className = remaining >= 0 ? "text-4xl font-black text-white mt-2 font-cinzel" : "text-4xl font-black text-red-500 mt-2 font-cinzel";
    }
}
