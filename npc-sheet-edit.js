import { 
    ATTRIBUTES, ABILITIES, VIRTUES, DISCIPLINES, BACKGROUNDS, 
    ARCHETYPES, CLANS, V20_MERITS_LIST, V20_FLAWS_LIST, VIT,
    WEAPONS, RANGED_WEAPONS, ARMOR, V20_VEHICLE_LIST 
} from "./data.js";
import { renderDots, showNotification } from "./ui-common.js";

// Filter Lists for NPCs
const EXCLUDED_BACKGROUNDS = ["Black Hand Membership", "Domain", "Generation", "Herd", "Retainers", "Rituals", "Status"];
const EXCLUDED_VITALS = ["Apparent Age", "R.I.P."];

// Global Callback references
let callbacks = {};
let ctx = {}; 

export function initEditSheet(context, callbackMap) {
    ctx = context;
    callbacks = callbackMap;
}

export function renderEditorModal() {
    let modal = document.getElementById('npc-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'npc-modal';
        modal.className = 'fixed inset-0 bg-black/90 z-[100] flex items-center justify-center hidden';
        document.body.appendChild(modal);
    }

    const archOptions = (ARCHETYPES || []).sort().map(a => `<option value="${a}">${a}</option>`).join('');
    const clanOptions = (CLANS || []).sort().map(c => `<option value="${c}" ${ctx.activeNpc.domitorClan === c ? 'selected' : ''}>${c}</option>`).join('');
    
    const extrasHtml = ctx.currentTemplate.renderIdentityExtras ? ctx.currentTemplate.renderIdentityExtras(ctx.activeNpc) : '';
    const f = ctx.currentTemplate.features || { disciplines: true, bloodPool: true, virtues: true, backgrounds: true, humanity: true };
    
    const isGhoul = ctx.activeNpc.template === 'ghoul';
    const showDomitor = isGhoul || (ctx.activeNpc.template === 'animal' && ctx.activeNpc.ghouled);
    const showEquipment = ctx.activeNpc.template !== 'animal';
    
    // Hide Feeding Grounds for Mortals and Ghouls
    const showFeedingGrounds = !['mortal', 'ghoul'].includes(ctx.activeNpc.template);

    modal.innerHTML = `
        <div class="w-[95%] max-w-7xl h-[95%] bg-[#0a0a0a] border-2 border-[#8b0000] shadow-[0_0_50px_rgba(139,0,0,0.5)] flex flex-col relative font-serif">
            
            <!-- HEADER -->
            <div class="bg-[#1a0505] p-4 border-b border-[#444] flex justify-between items-center shrink-0">
                <div class="flex items-center gap-4">
                    <h2 class="text-2xl font-cinzel text-[#d4af37] font-bold tracking-widest uppercase shadow-black drop-shadow-md flex items-center">
                        <i class="fas fa-user-edit mr-3 text-[#8b0000]"></i>
                        <select id="npc-type-selector" class="bg-transparent border-none text-[#d4af37] font-bold uppercase focus:outline-none cursor-pointer hover:text-white transition-colors appearance-none">
                            <option value="mortal" ${ctx.activeNpc.template === 'mortal' ? 'selected' : ''}>Mortal</option>
                            <option value="ghoul" ${ctx.activeNpc.template === 'ghoul' ? 'selected' : ''}>Ghoul / Revenant</option>
                            <option value="animal" ${ctx.activeNpc.template === 'animal' ? 'selected' : ''}>Animal</option>
                        </select>
                        <i class="fas fa-caret-down text-xs ml-2 opacity-50"></i>
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
                <div class="flex items-center gap-2">
                    <button id="btn-import-npc" class="text-gray-400 hover:text-white text-[10px] uppercase font-bold px-2 py-1"><i class="fas fa-file-import mr-1"></i> Import</button>
                    <input type="file" id="file-import-npc" class="hidden" accept=".json">
                    <button id="btn-export-npc" class="text-gray-400 hover:text-white text-[10px] uppercase font-bold px-2 py-1"><i class="fas fa-file-export mr-1"></i> Export</button>
                    <button id="close-npc-modal" class="text-gray-400 hover:text-white text-xl px-2 ml-4"><i class="fas fa-times"></i></button>
                </div>
            </div>

            <!-- TABS -->
            <div class="flex border-b border-[#333] bg-[#050505] text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                ${renderTabButton('step1', '1. Concept')}
                ${renderTabButton('step2', '2. Attributes')}
                ${renderTabButton('step3', '3. Abilities')}
                ${renderTabButton('step4', '4. Advantages')}
                ${showEquipment ? renderTabButton('step5', '5. Equipment') : ''}
                ${renderTabButton('stepBio', '6. Biography')}
            </div>

            <!-- CONTENT AREA -->
            <div class="flex-1 overflow-hidden relative flex">
                <div class="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar bg-[#050505] bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]">
                    
                    <!-- STEP 1: IDENTITY -->
                    <div id="step1" class="npc-step hidden">
                         <div class="sheet-section !mt-0"><div class="section-title">Concept & Identity</div><div class="grid grid-cols-1 md:grid-cols-3 gap-8"><div class="space-y-6"><div><label class="label-text text-[#d4af37]">Name</label><input type="text" id="npc-name" value="${ctx.activeNpc.name || ''}" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"></div>${isGhoul ? `<div><label class="label-text text-[#d4af37]">Ghoul Type</label><select id="npc-subtype" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"><option value="Vassal" ${ctx.activeNpc.type === 'Vassal' ? 'selected' : ''}>Vassal (Bound)</option><option value="Independent" ${ctx.activeNpc.type === 'Independent' ? 'selected' : ''}>Independent</option><option value="Revenant" ${ctx.activeNpc.type === 'Revenant' ? 'selected' : ''}>Revenant</option></select></div>` : ''}${showDomitor ? `<div><label class="label-text text-[#d4af37]">Domitor Name</label><input type="text" id="npc-domitor" value="${ctx.activeNpc.domitor || ''}" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"></div><div id="div-extra-clan" class="mt-2"><label class="label-text text-[#d4af37]">Domitor's Clan</label><select id="npc-extra-clan" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors"><option value="" class="bg-black">Unknown / None</option>${clanOptions}</select></div>` : ''}</div><div class="space-y-6"><div><label class="label-text text-[#d4af37]">Nature</label><select id="npc-nature" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"><option value="">Select...</option>${archOptions}</select></div><div><label class="label-text text-[#d4af37]">Demeanor</label><select id="npc-demeanor" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"><option value="">Select...</option>${archOptions}</select></div><div><label class="label-text text-[#d4af37]">Concept</label><input type="text" id="npc-concept" value="${ctx.activeNpc.concept || ''}" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"></div>${isGhoul ? `<div id="div-bond-level"><label class="label-text text-[#d4af37]">Blood Bond Level</label><select id="npc-bond-level" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none"><option value="1" ${ctx.activeNpc.bondLevel == 1 ? 'selected' : ''}>Step 1 (First Drink)</option><option value="2" ${ctx.activeNpc.bondLevel == 2 ? 'selected' : ''}>Step 2 (Strong Feelings)</option><option value="3" ${ctx.activeNpc.bondLevel == 3 ? 'selected' : ''}>Step 3 (Full Bond)</option></select></div>` : ''}</div><div class="space-y-6">${extrasHtml}</div></div></div>
                    </div>

                    <!-- STEP 2: ATTRIBUTES -->
                    <div id="step2" class="npc-step hidden">
                        <div class="sheet-section !mt-0"><div class="section-title">Attributes</div><div class="grid grid-cols-1 md:grid-cols-3 gap-10">${renderAttributeColumn('Physical')}${renderAttributeColumn('Social')}${renderAttributeColumn('Mental')}</div></div>
                    </div>

                    <!-- STEP 3: ABILITIES -->
                    <div id="step3" class="npc-step hidden">
                        <div class="sheet-section !mt-0"><div class="section-title">Abilities</div><div class="grid grid-cols-1 md:grid-cols-3 gap-10">${renderAbilityColumn('Talents')}${renderAbilityColumn('Skills')}${renderAbilityColumn('Knowledges')}</div></div>
                    </div>

                    <!-- STEP 4: ADVANTAGES -->
                    <div id="step4" class="npc-step hidden">
                        <div class="sheet-section !mt-0"><div class="section-title">Advantages</div><div class="flex flex-wrap gap-10 justify-between items-start">${ (f.disciplines || f.backgrounds) ? `<div class="flex-1 min-w-[200px]">${f.disciplines ? `<h3 class="column-title">Disciplines</h3><div id="npc-disc-list" class="space-y-1 mt-2"></div><div class="mt-3"><select id="npc-disc-select" class="w-full bg-transparent border border-[#444] text-[10px] text-gray-300 p-2 uppercase font-bold"><option value="">+ Add Discipline</option>${(DISCIPLINES||[]).map(d=>`<option value="${d}">${d}</option>`).join('')}</select></div>` : ''}${f.backgrounds ? `<h3 class="column-title ${f.disciplines ? 'mt-8' : ''}">Backgrounds</h3><div id="npc-back-list" class="space-y-1 mt-2"></div><div class="mt-3"><select id="npc-back-select" class="w-full bg-transparent border border-[#444] text-[10px] text-gray-300 p-2 uppercase font-bold"><option value="">+ Add Background</option>${(BACKGROUNDS||[]).filter(b => !EXCLUDED_BACKGROUNDS.includes(b)).map(b=>`<option value="${b}">${b}</option>`).join('')}</select></div>` : ''}</div>` : ''}<div class="flex-1 min-w-[200px]">${f.virtues ? `<h3 class="column-title">Virtues <span id="virtue-limit-display" class="text-xs text-gray-500"></span></h3><div id="npc-virtue-list" class="space-y-3 mt-4 mb-4"></div><div class="mt-8 border-t border-[#333] pt-4">${f.humanity ? `<div class="flex justify-between items-center text-xs mb-4"><span class="font-bold text-[#d4af37]">HUMANITY</span><div class="dot-row-direct cursor-pointer" id="npc-humanity-row">${renderDots(ctx.activeNpc.humanity, 10)}</div></div>` : ''}` : '<div class="mt-4"></div>'}<div class="flex justify-between items-center text-xs mb-4"><span class="font-bold text-[#d4af37]">WILLPOWER</span><div class="dot-row-direct cursor-pointer" id="npc-willpower-row">${renderDots(ctx.activeNpc.willpower, 10)}</div></div>${f.bloodPool ? `<div class="flex justify-between items-center text-xs"><span class="font-bold text-[#d4af37]">BLOOD POOL</span><input type="number" id="npc-blood" value="${ctx.activeNpc.bloodPool}" class="w-12 bg-transparent border-b border-[#444] text-center text-white p-1 font-bold text-lg focus:border-[#d4af37] outline-none"></div>` : ''}${f.virtues ? `</div>` : ''} </div><div class="flex-1 min-w-[200px]"><h3 class="column-title">Merits & Flaws</h3><select id="npc-merit-select" class="w-full bg-transparent border-b border-[#444] text-[10px] text-gray-300 p-1 mb-2"><option value="">Add Merit...</option>${(V20_MERITS_LIST||[]).map(m=>`<option value="${m.n}|${m.v}">${m.n} (${m.v})</option>`).join('')}</select><div id="npc-merits-list" class="space-y-1"></div><select id="npc-flaw-select" class="w-full bg-transparent border-b border-[#444] text-[10px] text-gray-300 p-1 mb-2 mt-4"><option value="">Add Flaw...</option>${(V20_FLAWS_LIST||[]).map(f=>`<option value="${f.n}|${f.v}">${f.n} (${f.v})</option>`).join('')}</select><div id="npc-flaws-list" class="space-y-1"></div></div></div></div>
                    </div>

                    <!-- STEP 5: EQUIPMENT (Matches Main App) -->
                    ${showEquipment ? `
                    <div id="step5" class="npc-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Possessions & Gear</div>
                            <div id="npc-inventory-manager" class="p-2 space-y-4 border-b border-[#333] pb-4 mb-4">
                                <div class="flex flex-col gap-2 mb-2">
                                    <label class="label-text">1. Select Item Type</label>
                                    <select id="npc-inv-type" class="w-full text-[11px] bg-[#111] border border-[#444] text-white p-2">
                                        <option value="Gear">General Gear</option>
                                        <option value="Weapon">Weapon</option>
                                        <option value="Armor">Armor</option>
                                        <option value="Vehicle">Vehicle</option>
                                    </select>
                                    
                                    <!-- STEP 2: BASE TEMPLATE (Hidden for Gear) -->
                                    <div id="npc-inv-base-wrapper" class="hidden">
                                        <label class="label-text">2. Choose Base Template (Auto-fills Stats)</label>
                                        <select id="npc-inv-base-select" class="w-full text-[11px] bg-[#111] border border-[#444] text-white p-2"></select>
                                    </div>
                                    
                                    <div>
                                        <label class="label-text">3. Specific Description / Name (Optional)</label>
                                        <input type="text" id="npc-inv-name" placeholder="e.g. 'Ceremonial Dagger' or 'Grandpa's Revolver'" class="w-full text-[11px] bg-transparent border-b border-[#444] text-white p-2">
                                    </div>
                                </div>

                                <!-- STAT ROWS -->
                                <div id="npc-inv-stats-row" class="hidden grid grid-cols-5 gap-2">
                                    <input type="text" id="npc-inv-diff" placeholder="Diff" class="text-center text-[9px] bg-transparent border-b border-[#444] text-white">
                                    <input type="text" id="npc-inv-dmg" placeholder="Dmg" class="text-center text-[9px] bg-transparent border-b border-[#444] text-white">
                                    <input type="text" id="npc-inv-range" placeholder="Rng" class="text-center text-[9px] bg-transparent border-b border-[#444] text-white">
                                    <input type="text" id="npc-inv-rate" placeholder="Rate" class="text-center text-[9px] bg-transparent border-b border-[#444] text-white">
                                    <input type="text" id="npc-inv-clip" placeholder="Clip" class="text-center text-[9px] bg-transparent border-b border-[#444] text-white">
                                </div>
                                <div id="npc-inv-armor-row" class="hidden grid grid-cols-2 gap-2">
                                    <input type="text" id="npc-inv-rating" placeholder="Rating" class="text-center text-[9px] bg-transparent border-b border-[#444] text-white">
                                    <input type="text" id="npc-inv-penalty" placeholder="Penalty" class="text-center text-[9px] bg-transparent border-b border-[#444] text-white">
                                </div>
                                <div id="npc-inv-vehicle-row" class="hidden grid grid-cols-3 gap-2">
                                    <input type="text" id="npc-inv-safe" placeholder="Safe Spd" class="text-center text-[9px] bg-transparent border-b border-[#444] text-white">
                                    <input type="text" id="npc-inv-max" placeholder="Max Spd" class="text-center text-[9px] bg-transparent border-b border-[#444] text-white">
                                    <input type="text" id="npc-inv-man" placeholder="Maneuver" class="text-center text-[9px] bg-transparent border-b border-[#444] text-white">
                                </div>

                                <div class="flex justify-between items-center">
                                    <div class="flex gap-2 items-center">
                                        <input type="checkbox" id="npc-inv-carried" checked class="w-3 h-3 accent-[#8b0000]">
                                        <label for="npc-inv-carried" class="text-[9px] text-gray-400 uppercase">Carried</label>
                                    </div>
                                    <button type="button" id="npc-add-inv-btn" class="bg-[#8b0000] px-4 py-2 text-[10px] font-bold text-white uppercase hover:bg-red-700 shadow-md transition-colors">Add Item</button>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 class="column-title">Gear (Carried)</h3>
                                    <div id="npc-inv-list-carried" class="space-y-1 min-h-[50px] border border-[#222] bg-black/20 p-2"></div>
                                </div>
                                <div>
                                    <h3 class="column-title">Equipment (Owned)</h3>
                                    <div id="npc-inv-list-owned" class="space-y-1 min-h-[50px] border border-[#222] bg-black/20 p-2"></div>
                                </div>
                            </div>
                            
                            <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                 ${showFeedingGrounds ? `<div>
                                    <h3 class="column-title">Feeding Grounds</h3>
                                    <textarea id="npc-inv-feeding-grounds" class="w-full h-24 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none" placeholder="Describe hunting grounds...">${ctx.activeNpc.feedingGrounds || ''}</textarea>
                                </div>` : '<div></div>'}
                                 <div>
                                    <h3 class="column-title">Vehicles</h3>
                                    <div id="npc-vehicle-list" class="space-y-1 min-h-[30px] border border-[#222] bg-black/20 p-2"></div>
                                </div>
                            </div>
                        </div>
                    </div>` : ''}

                    <!-- STEP 6: BIO -->
                    <div id="stepBio" class="npc-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Biography</div>
                            ${ctx.currentTemplate.renderBio ? ctx.currentTemplate.renderBio(ctx.activeNpc) : `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div class="space-y-4">
                                        ${VIT.filter(v => !EXCLUDED_VITALS.includes(v)).map(v => `<div class="flex justify-between items-center border-b border-[#333] pb-1"><label class="label-text text-[#d4af37] w-1/3">${v}</label><input type="text" class="npc-bio w-2/3 bg-transparent text-white text-xs text-right focus:outline-none" data-field="${v}" value="${ctx.activeNpc.bio[v]||''}"></div>`).join('')}
                                    </div>
                                    <div class="space-y-4">
                                        <div><label class="label-text text-[#d4af37] mb-2">Description</label><textarea id="npc-desc" class="w-full h-32 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none">${ctx.activeNpc.bio.Description||''}</textarea></div>
                                        <div><label class="label-text text-[#d4af37] mb-2">Notes</label><textarea id="npc-notes" class="w-full h-32 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none">${ctx.activeNpc.bio.Notes||''}</textarea></div>
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                </div>

                <!-- SIDEBAR: XP LEDGER -->
                <div id="npc-xp-sidebar" class="hidden w-64 bg-[#080808] border-l border-[#333] flex-col shrink-0">
                    <div class="p-3 bg-[#111] border-b border-[#333] text-center"><h3 class="text-purple-400 font-cinzel font-bold">XP Ledger</h3></div>
                    <div class="text-[10px] font-mono space-y-2 p-4 bg-black/40 text-gray-400 flex-none border-b border-[#333]">
                        <div class="flex justify-between border-b border-[#222] pb-1"><span>Attributes:</span> <span id="npc-xp-cost-attr" class="text-white">0</span></div>
                        <div class="flex justify-between border-b border-[#222] pb-1"><span>Abilities:</span> <span id="npc-xp-cost-abil" class="text-white">0</span></div>
                        ${f.disciplines ? `<div class="flex justify-between border-b border-[#222] pb-1"><span>Disciplines:</span> <span id="npc-xp-cost-disc" class="text-white">0</span></div>` : ''}
                        ${f.backgrounds ? `<div class="flex justify-between border-b border-[#222] pb-1"><span>Backgrounds:</span> <span id="npc-xp-cost-back" class="text-white">0</span></div>` : ''}
                        ${f.virtues ? `<div class="flex justify-between border-b border-[#222] pb-1"><span>Virtues:</span> <span id="npc-xp-cost-virt" class="text-white">0</span></div>` : ''}
                        ${f.humanity ? `<div class="flex justify-between border-b border-[#222] pb-1"><span>Humanity:</span> <span id="npc-xp-cost-hum" class="text-white">0</span></div>` : ''}
                        <div class="flex justify-between border-b border-[#222] pb-1"><span>Willpower:</span> <span id="npc-xp-cost-will" class="text-white">0</span></div>
                        
                        <div class="mt-4 pt-2 border-t border-[#444]">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-gray-500">Total XP</span>
                                <input type="number" id="npc-xp-total" value="${ctx.activeNpc.experience.total}" class="w-16 bg-black border border-[#333] text-purple-400 text-center font-bold">
                            </div>
                            <div class="flex justify-between font-bold text-xs text-white">
                                <span>Remaining:</span>
                                <span id="npc-xp-remain" class="text-purple-400">0</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex-1 overflow-y-auto p-2 border-t border-[#333] bg-[#0a0a0a]">
                        <h4 class="text-[9px] uppercase text-gray-500 font-bold mb-1 tracking-wider sticky top-0 bg-[#0a0a0a] pb-1">Session Log</h4>
                        <div id="npc-xp-list" class="text-[9px] font-mono text-gray-400 space-y-1"></div>
                    </div>
                </div>

                <!-- SIDEBAR: FREEBIE LEDGER -->
                <div id="npc-fb-sidebar" class="hidden w-64 bg-[#080808] border-l border-[#333] flex-col shrink-0 transition-all flex flex-col">
                    <div class="p-3 bg-[#111] border-b border-[#333] text-center"><h3 class="text-[#d4af37] font-cinzel font-bold">Freebie Ledger</h3></div>
                    <div class="text-[10px] font-mono space-y-2 p-4 bg-black/40 text-gray-400 flex-none border-b border-[#333]">
                        <div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-attr">Attributes (5):</span> <span id="npc-fb-cost-attr" class="text-white">0</span></div>
                        <div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-abil">Abilities (2):</span> <span id="npc-fb-cost-abil" class="text-white">0</span></div>
                        ${f.disciplines ? `<div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-disc">Disciplines (10):</span> <span id="npc-fb-cost-disc" class="text-white">0</span></div>` : ''}
                        ${f.backgrounds ? `<div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-back">Backgrounds (1):</span> <span id="npc-fb-cost-back" class="text-white">0</span></div>` : ''}
                        ${f.virtues ? `<div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-virt">Virtues (2):</span> <span id="npc-fb-cost-virt" class="text-white">0</span></div>` : ''}
                        ${f.humanity ? `<div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-human">Humanity (1):</span> <span id="npc-fb-cost-hum" class="text-white">0</span></div>` : ''}
                        <div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-will">Willpower (1):</span> <span id="npc-fb-cost-will" class="text-white">0</span></div>
                        <div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-merit">Merits (Cost):</span> <span id="npc-fb-cost-merit" class="text-white">0</span></div>
                        <div class="flex justify-between border-b border-[#222] pb-1"><span id="lbl-flaw">Flaws (Bonus):</span> <span id="npc-fb-cost-flaw" class="text-green-400">0</span></div>
                        <div class="mt-4 flex justify-between font-bold text-xs text-white">
                            <span>Remaining:</span>
                            <span id="npc-fb-total-calc" class="text-green-400">15</span>
                        </div>
                    </div>

                    <div class="flex-1 overflow-y-auto p-2 border-t border-[#333] bg-[#0a0a0a]">
                        <h4 class="text-[9px] uppercase text-gray-500 font-bold mb-1 tracking-wider sticky top-0 bg-[#0a0a0a] pb-1">Spending Log</h4>
                        <div id="npc-fb-log-list" class="text-[9px] font-mono text-gray-400 space-y-1"></div>
                    </div>

                    <div class="p-4 bg-[#d4af37]/10 border-t border-[#d4af37]/30 text-center flex-none">
                        <div class="uppercase text-[9px] font-bold text-[#d4af37]">Freebies Remaining</div>
                        <div id="npc-fb-final" class="text-4xl font-black text-white mt-2 font-cinzel">21</div>
                    </div>
                </div>
            </div>

            <!-- FOOTER -->
            <div class="p-4 border-t border-[#444] bg-[#050505] flex justify-between items-center shrink-0">
                <div class="text-[10px] text-gray-500 italic">Mode: ${ctx.currentTemplate.label}</div>
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

    if(ctx.activeNpc.nature) document.getElementById('npc-nature').value = ctx.activeNpc.nature;
    if(ctx.activeNpc.demeanor) document.getElementById('npc-demeanor').value = ctx.activeNpc.demeanor;

    // --- SETUP LISTENERS ---
    const ts = document.getElementById('npc-type-selector');
    if(ts) ts.onchange = (e) => callbacks.switchTemplate(e.target.value);

    modal.querySelectorAll('.npc-tab').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
    
    const bxp = document.getElementById('toggle-xp-mode');
    const bfb = document.getElementById('toggle-fb-mode');
    if(bxp) bxp.onclick = () => callbacks.toggleMode('xp');
    if(bfb) bfb.onclick = () => callbacks.toggleMode('freebie');
    
    document.getElementById('btn-import-npc').onclick = () => document.getElementById('file-import-npc').click();
    document.getElementById('file-import-npc').onchange = callbacks.importData;
    document.getElementById('btn-export-npc').onclick = callbacks.exportData;
    document.getElementById('npc-cancel').onclick = callbacks.closeModal;
    document.getElementById('npc-save').onclick = callbacks.saveNpc;
    document.getElementById('close-npc-modal').onclick = callbacks.closeModal;

    const setupAdd = (id, type, renderFn) => {
        const el = document.getElementById(id);
        if(el) el.onchange = (e) => {
            const val = e.target.value;
            if(val) {
                if(!ctx.activeNpc[type]) ctx.activeNpc[type] = {};
                ctx.activeNpc[type][val] = (ctx.modes.xp || ctx.modes.freebie) ? 0 : 1;
                renderFn();
                e.target.value = "";
            }
        };
    };
    setupAdd('npc-disc-select', 'disciplines', renderDisciplines);
    setupAdd('npc-back-select', 'backgrounds', renderBackgrounds);

    const setupMF = (id, type) => {
        const el = document.getElementById(id);
        if(el) el.onchange = (e) => {
            if(!e.target.value) return;
            const [name, val] = e.target.value.split('|');
            callbacks.handleValueChange(type, name, parseInt(val)); 
            e.target.value = "";
        };
    };
    setupMF('npc-merit-select', 'merits');
    setupMF('npc-flaw-select', 'flaws');

    // EQUIPMENT MANAGER LOGIC
    if(showEquipment) {
        const typeSelect = document.getElementById('npc-inv-type');
        const baseSelect = document.getElementById('npc-inv-base-select');
        const baseWrapper = document.getElementById('npc-inv-base-wrapper');
        const addBtn = document.getElementById('npc-add-inv-btn');

        const toggleFields = () => {
            const t = typeSelect.value;
            const statsRow = document.getElementById('npc-inv-stats-row');
            if(statsRow) statsRow.classList.toggle('hidden', t !== 'Weapon');
            
            const armorRow = document.getElementById('npc-inv-armor-row');
            if(armorRow) armorRow.classList.toggle('hidden', t !== 'Armor');
            
            const vehicleRow = document.getElementById('npc-inv-vehicle-row');
            if(vehicleRow) vehicleRow.classList.toggle('hidden', t !== 'Vehicle');
            
            // Rebuild Template Options
            baseSelect.innerHTML = '<option value="">-- Select Template --</option>';
            let list = [];
            
            if (t === 'Weapon') list = [...(WEAPONS||[]), ...(RANGED_WEAPONS||[])];
            else if (t === 'Armor') list = ARMOR || [];
            else if (t === 'Vehicle') list = V20_VEHICLE_LIST || [];
            // GEAR intentionally left blank/null so list remains empty and wrapper hides
            
            // Show Step 2 ONLY if lists exist (Weapons, Armor, Vehicles)
            if(list.length > 0) {
                baseWrapper.classList.remove('hidden');
                list.sort((a,b) => a.name.localeCompare(b.name));
                baseSelect.innerHTML += list.map(i => `<option value="${i.name}">${i.name}</option>`).join('');
            } else {
                baseWrapper.classList.add('hidden'); // Completely hide for Gear
            }
        };

        typeSelect.onchange = toggleFields;
        
        baseSelect.onchange = (e) => {
            const name = e.target.value;
            if(!name) return;
            document.getElementById('npc-inv-name').value = name;
            
            const t = typeSelect.value;
            let item = null;
            if (t === 'Weapon') item = [...(WEAPONS||[]), ...(RANGED_WEAPONS||[])].find(x => x.name === name);
            else if (t === 'Armor') item = (ARMOR||[]).find(x => x.name === name);
            else if (t === 'Vehicle') item = (V20_VEHICLE_LIST||[]).find(x => x.name === name);
            // Gear doesn't have stats to auto-fill

            if(item) {
                if(t === 'Weapon') {
                    document.getElementById('npc-inv-diff').value = item.diff || '';
                    document.getElementById('npc-inv-dmg').value = item.dmg || '';
                    document.getElementById('npc-inv-range').value = item.range || '';
                    document.getElementById('npc-inv-rate').value = item.rate || '';
                    document.getElementById('npc-inv-clip').value = item.clip || '';
                } else if(t === 'Armor') {
                    document.getElementById('npc-inv-rating').value = item.rating || '';
                    document.getElementById('npc-inv-penalty').value = item.penalty || '';
                } else if(t === 'Vehicle') {
                    document.getElementById('npc-inv-safe').value = item.safe || '';
                    document.getElementById('npc-inv-max').value = item.max || '';
                    document.getElementById('npc-inv-man').value = item.man || '';
                }
            }
        };

        addBtn.onclick = () => {
            const type = typeSelect.value;
            const name = document.getElementById('npc-inv-name').value || "Unnamed Item";
            const carried = document.getElementById('npc-inv-carried').checked;
            
            const newItem = {
                name,
                type,
                status: carried ? 'carried' : 'owned',
                stats: {}
            };

            if (type === 'Weapon') {
                newItem.stats = {
                    diff: document.getElementById('npc-inv-diff').value,
                    dmg: document.getElementById('npc-inv-dmg').value,
                    range: document.getElementById('npc-inv-range').value,
                    rate: document.getElementById('npc-inv-rate').value,
                    clip: document.getElementById('npc-inv-clip').value
                };
            } else if (type === 'Armor') {
                newItem.stats = {
                    rating: document.getElementById('npc-inv-rating').value,
                    penalty: document.getElementById('npc-inv-penalty').value
                };
            } else if (type === 'Vehicle') {
                newItem.stats = {
                    safe: document.getElementById('npc-inv-safe').value,
                    max: document.getElementById('npc-inv-max').value,
                    man: document.getElementById('npc-inv-man').value
                };
            }

            if(!ctx.activeNpc.inventory) ctx.activeNpc.inventory = [];
            ctx.activeNpc.inventory.push(newItem);
            renderInventoryList();
            
            document.getElementById('npc-inv-name').value = '';
            document.querySelectorAll('#npc-inventory-manager input[type="text"]').forEach(i => i.value = '');
            showNotification("Item Added.");
        };
        
        // Initial Trigger
        setTimeout(toggleFields, 100);
    }

    const bloodInput = document.getElementById('npc-blood');
    if(bloodInput) bloodInput.oninput = (e) => {
        ctx.activeNpc.bloodPool = parseInt(e.target.value) || 0;
    };

    const xpTot = document.getElementById('npc-xp-total');
    if(xpTot) xpTot.onchange = (e) => {
        ctx.activeNpc.experience.total = parseInt(e.target.value) || 0;
        updateXpLog();
    };

    if (ctx.currentTemplate.setupListeners) {
        ctx.currentTemplate.setupListeners(modal, ctx.activeNpc, () => {
             updateVirtueDisplay();
             renderAllDots(); 
        });
    }

    switchTab(ctx.currentTab || 'step1');
    updateModeUI();
    renderAllDots();
    renderDisciplines();
    renderBackgrounds();
    renderMeritsFlaws();
    if(showEquipment) renderInventoryList();
    updateVirtueDisplay();
    updatePrioritiesUI();
    updateXpLog();
    updateFreebieCalc();
}

// --- SUB-RENDERERS ---

export function updateModeUI() {
    const xpBtn = document.getElementById('toggle-xp-mode');
    const fbBtn = document.getElementById('toggle-fb-mode');
    const xpBar = document.getElementById('npc-xp-sidebar');
    const fbBar = document.getElementById('npc-fb-sidebar');

    const setActive = (btn, isActive, color) => {
        if (!btn) return;
        if (isActive) btn.className = `text-[10px] uppercase font-bold px-3 py-1 border rounded transition-all bg-${color}-900/40 text-${color}-300 border-${color}-500 shadow-[0_0_10px_rgba(255,255,255,0.2)]`;
        else btn.className = "text-[10px] uppercase font-bold px-3 py-1 border border-[#444] rounded transition-all text-gray-500 hover:text-white";
    };

    setActive(xpBtn, ctx.modes.xp, 'purple');
    setActive(fbBtn, ctx.modes.freebie, 'yellow');

    if(xpBar) {
        if(ctx.modes.xp) {
            xpBar.classList.remove('hidden');
            xpBar.classList.add('flex');
            updateXpLog();
        } else {
            xpBar.classList.add('hidden');
            xpBar.classList.remove('flex');
        }
    }

    if(fbBar) {
        if(ctx.modes.freebie) {
            fbBar.classList.remove('hidden');
            fbBar.classList.add('flex');
            updateFreebieCalc();
        } else {
            fbBar.classList.add('hidden');
            fbBar.classList.remove('flex');
        }
    }
}

export function renderInventoryList() {
    const cList = document.getElementById('npc-inv-list-carried');
    const oList = document.getElementById('npc-inv-list-owned');
    const vList = document.getElementById('npc-vehicle-list');
    if(!cList || !oList) return;
    
    cList.innerHTML = ''; oList.innerHTML = '';
    if(vList) vList.innerHTML = '';

    if(!ctx.activeNpc.inventory) return;

    ctx.activeNpc.inventory.forEach((item, idx) => {
        const html = `
            <div class="flex justify-between items-center bg-black/40 p-1 border border-[#333] text-[10px] mb-1">
                <div>
                    <span class="text-[#d4af37] font-bold">${item.name}</span>
                    <span class="text-gray-500 uppercase ml-2 text-[9px]">${item.type}</span>
                    ${item.stats && item.stats.damage ? `<span class="text-gray-600 text-[8px] ml-1">${item.stats.damage}</span>` : ''}
                </div>
                <button class="text-red-500 hover:text-white remove-inv-btn" data-idx="${idx}"><i class="fas fa-times"></i></button>
            </div>
        `;
        if (item.type === 'Vehicle' && vList) vList.innerHTML += html;
        else if (item.status === 'carried') cList.innerHTML += html;
        else oList.innerHTML += html;
    });
    
    document.querySelectorAll('.remove-inv-btn').forEach(b => {
        b.onclick = (e) => callbacks.removeNpcInv(parseInt(b.dataset.idx));
    });
}

function renderTabButton(id, label) {
    return `<button class="npc-tab px-6 py-4 hover:bg-[#111] hover:text-[#d4af37] border-r border-[#333] transition-colors" data-tab="${id}">${label}</button>`;
}

function switchTab(id) {
    ctx.currentTab = id;
    document.querySelectorAll('.npc-step').forEach(d => d.classList.add('hidden'));
    const tgt = document.getElementById(id);
    if(tgt) tgt.classList.remove('hidden');
    document.querySelectorAll('.npc-tab').forEach(b => {
        if(b.dataset.tab === id) b.classList.add('text-[#d4af37]', 'bg-[#111]');
        else b.classList.remove('text-[#d4af37]', 'bg-[#111]');
    });
}

function renderAttributeColumn(group) {
    if (!ATTRIBUTES[group]) return `<div>Error: ${group} undefined</div>`;
    const list = ATTRIBUTES[group];
    return `
        <div>
            <h3 class="column-title">${group} <span id="cnt-attr-${group}" class="text-[10px] text-gray-500 ml-1"></span></h3>
            <div class="flex justify-center gap-2 mb-4">${renderPrioButtons('attr', group)}</div>
            <div id="list-attr-${group}">${list.map(k => renderDotRow('attributes', k, ctx.activeNpc.attributes[k], group)).join('')}</div>
        </div>
    `;
}

function renderAbilityColumn(group) {
    if (!ABILITIES[group]) return `<div>Error: ${group} undefined</div>`;
    const list = ABILITIES[group];
    return `
        <div>
            <h3 class="column-title">${group} <span id="cnt-abil-${group}" class="text-[10px] text-gray-500 ml-1"></span></h3>
            <div class="flex justify-center gap-2 mb-4">${renderPrioButtons('abil', group)}</div>
            <div id="list-abil-${group}">${list.map(k => renderDotRow('abilities', k, ctx.activeNpc.abilities[k], group)).join('')}</div>
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

export function renderAllDots() {
    ['Physical', 'Social', 'Mental'].forEach(g => {
        const el = document.getElementById(`list-attr-${g}`);
        if (el && ATTRIBUTES[g]) el.innerHTML = ATTRIBUTES[g].map(k => renderDotRow('attributes', k, ctx.activeNpc.attributes[k], g)).join('');
    });
    ['Talents', 'Skills', 'Knowledges'].forEach(g => {
        const el = document.getElementById(`list-abil-${g}`);
        if (el && ABILITIES[g]) el.innerHTML = ABILITIES[g].map(k => renderDotRow('abilities', k, ctx.activeNpc.abilities[k], g)).join('');
    });
    const vList = document.getElementById('npc-virtue-list');
    if(vList) vList.innerHTML = VIRTUES.map(k => `
        <div class="flex justify-between items-center mb-1 dot-interactive" data-type="virtues" data-key="${k}">
            <span class="text-[10px] uppercase font-bold text-gray-300 tracking-tight">${k}</span>
            <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(ctx.activeNpc.virtues[k] || 1, 5)}</div>
        </div>
    `).join('');
    const humRow = document.getElementById('npc-humanity-row');
    if(humRow) humRow.innerHTML = renderDots(ctx.activeNpc.humanity, 10);
    const willRow = document.getElementById('npc-willpower-row');
    if(willRow) willRow.innerHTML = renderDots(ctx.activeNpc.willpower, 10);
    
    const bloodIn = document.getElementById('npc-blood');
    if(bloodIn && document.activeElement !== bloodIn) bloodIn.value = ctx.activeNpc.bloodPool || 0;
    
    bindDotClicks();
    updatePrioritiesUI();
}

export function renderDisciplines() {
    const list = document.getElementById('npc-disc-list');
    if(!list) return;
    list.innerHTML = Object.entries(ctx.activeNpc.disciplines).map(([k,v]) => `
        <div class="flex justify-between items-center mb-1 dot-interactive" data-type="disciplines" data-key="${k}">
            <div class="flex gap-2 items-center">
                <i class="fas fa-times text-red-500 cursor-pointer text-xs hover:text-white remove-item-btn" data-type="disciplines" data-key="${k}"></i>
                <span class="text-[10px] uppercase font-bold text-white">${k}</span>
            </div>
            <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(v, 5)}</div>
        </div>
    `).join('');
    bindDotClicks();
    bindRemoveBtns();
}

export function renderBackgrounds() {
    const list = document.getElementById('npc-back-list');
    if(!list) return;
    list.innerHTML = Object.entries(ctx.activeNpc.backgrounds).map(([k,v]) => `
        <div class="flex justify-between items-center mb-1 dot-interactive" data-type="backgrounds" data-key="${k}">
            <div class="flex gap-2 items-center">
                <i class="fas fa-times text-red-500 cursor-pointer text-xs hover:text-white remove-item-btn" data-type="backgrounds" data-key="${k}"></i>
                <span class="text-[10px] uppercase font-bold text-white">${k}</span>
            </div>
            <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(v, 5)}</div>
        </div>
    `).join('');
    bindDotClicks();
    bindRemoveBtns();
}

export function renderMeritsFlaws() {
    const mList = document.getElementById('npc-merits-list');
    const fList = document.getElementById('npc-flaws-list');
    mList.innerHTML = Object.entries(ctx.activeNpc.merits).map(([k,v]) => 
        `<div class="flex justify-between text-[9px] text-gray-300 bg-black/50 p-1 rounded"><span>${k}</span><span>${v} pts <i class="fas fa-times text-red-500 ml-2 cursor-pointer remove-item-btn" data-type="merits" data-key="${k}"></i></span></div>`
    ).join('');
    fList.innerHTML = Object.entries(ctx.activeNpc.flaws).map(([k,v]) => 
        `<div class="flex justify-between text-[9px] text-red-300 bg-black/50 p-1 rounded"><span>${k}</span><span>${v} pts <i class="fas fa-times text-red-500 ml-2 cursor-pointer remove-item-btn" data-type="flaws" data-key="${k}"></i></span></div>`
    ).join('');
    bindRemoveBtns();
}

function bindDotClicks() {
    document.querySelectorAll('.dot-interactive').forEach(row => {
        row.onclick = (e) => {
            if(!e.target.classList.contains('dot')) return;
            callbacks.handleValueChange(row.dataset.type, row.dataset.key, parseInt(e.target.dataset.v));
        };
    });
    const bindDirect = (id, type) => {
        const el = document.getElementById(id);
        if(el) el.onclick = (e) => {
            if(!e.target.classList.contains('dot')) return;
            callbacks.handleValueChange(type, null, parseInt(e.target.dataset.v));
        }
    };
    bindDirect('npc-humanity-row', 'humanity');
    bindDirect('npc-willpower-row', 'willpower');
}

function bindRemoveBtns() {
    document.querySelectorAll('.remove-item-btn').forEach(b => {
        b.onclick = (e) => {
            e.stopPropagation();
            callbacks.removeNpcItem(b.dataset.type, b.dataset.key);
        };
    });
}

function renderPrioButtons(cat, group) {
    const vals = ctx.currentTemplate.getPriorities()[cat];
    if (!vals) return '';
    return vals.map(v => `<button class="npc-prio-btn w-6 h-6 rounded-full border border-gray-600 text-[9px] font-bold text-gray-400 hover:text-white hover:border-[#d4af37] transition-all" data-cat="${cat}" data-group="${group}" data-val="${v}">${v}</button>`).join('');
}

export function updatePrioritiesUI() {
    document.querySelectorAll('.npc-prio-btn').forEach(btn => {
        const { cat, group, val } = btn.dataset;
        const v = parseInt(val);
        const current = ctx.localPriorities[cat][group];

        btn.className = "npc-prio-btn w-6 h-6 rounded-full border text-[9px] font-bold transition-all mr-1 ";
        if (current === v) {
            btn.classList.add('bg-[#d4af37]', 'text-black', 'border-[#d4af37]');
            btn.onclick = null;
        } else if (Object.values(ctx.localPriorities[cat]).includes(v)) {
            btn.classList.add('border-gray-800', 'text-gray-600', 'opacity-30', 'cursor-not-allowed');
            btn.onclick = null;
        } else {
            btn.classList.add('border-gray-600', 'text-gray-400', 'hover:border-[#d4af37]', 'hover:text-white');
            btn.onclick = () => {
                if(ctx.modes.xp || ctx.modes.freebie) return;
                const existingOwner = Object.keys(ctx.localPriorities[cat]).find(k => ctx.localPriorities[cat][k] === v);
                if(existingOwner) ctx.localPriorities[cat][existingOwner] = null;
                ctx.localPriorities[cat][group] = v;
                updatePrioritiesUI();
                renderAllDots();
            };
        }
    });

    ['attr', 'abil'].forEach(cat => {
        Object.keys(ctx.localPriorities[cat]).forEach(grp => {
            const limit = ctx.localPriorities[cat][grp];
            const el = document.getElementById(`cnt-${cat}-${grp}`);
            if(!el) return;
            let spent = 0;
            const list = (cat === 'attr') ? ATTRIBUTES[grp] : ABILITIES[grp];
            list.forEach(k => {
                const val = (cat === 'attr') ? ctx.activeNpc.attributes[k] : ctx.activeNpc.abilities[k];
                spent += (cat === 'attr') ? Math.max(0, (val||1)-1) : (val||0);
            });
            el.innerHTML = limit ? `<span class="${spent > limit ? 'text-red-500' : (spent === limit ? 'text-green-500' : 'text-gray-500')}">${spent}/${limit}</span>` : `[${spent}]`;
        });
    });
}

function updateVirtueDisplay() {
    const limit = ctx.currentTemplate.getVirtueLimit(ctx.activeNpc);
    const el = document.getElementById('virtue-limit-display');
    if(el) el.innerText = `(Max ${limit} Dots)`;
}

export function updateXpLog() {
    if(!ctx.modes.xp) return;
    const spentDiv = document.getElementById('npc-xp-spent');
    const remDiv = document.getElementById('npc-xp-remain');
    
    let costs = { attr: 0, abil: 0, disc: 0, back: 0, virt: 0, hum: 0, will: 0, merit: 0, flaw: 0 };
    let spentTotal = 0;

    ctx.activeNpc.experience.log.forEach(entry => {
        spentTotal += entry.cost;
        if (costs[entry.type.substring(0,4)] !== undefined) costs[entry.type.substring(0,4)] += entry.cost; // Simple mapping won't work perfectly, manual map below
        if (entry.type === 'attributes') costs.attr += entry.cost;
        else if (entry.type === 'abilities') costs.abil += entry.cost;
        else if (entry.type === 'disciplines') costs.disc += entry.cost;
        else if (entry.type === 'backgrounds') costs.back += entry.cost;
        else if (entry.type === 'virtues') costs.virt += entry.cost;
        else if (entry.type === 'humanity') costs.hum += entry.cost;
        else if (entry.type === 'willpower') costs.will += entry.cost;
    });

    ctx.activeNpc.experience.spent = spentTotal;
    if(spentDiv) spentDiv.innerText = ctx.activeNpc.experience.spent;
    if(remDiv) remDiv.innerText = ctx.activeNpc.experience.total - ctx.activeNpc.experience.spent;

    const setXpCost = (id, val) => {
        const el = document.getElementById(id);
        if(el) { el.innerText = val; el.className = val > 0 ? "text-purple-400 font-bold" : "text-gray-500"; }
    };
    setXpCost('npc-xp-cost-attr', costs.attr);
    setXpCost('npc-xp-cost-abil', costs.abil);
    setXpCost('npc-xp-cost-disc', costs.disc);
    setXpCost('npc-xp-cost-back', costs.back);
    setXpCost('npc-xp-cost-virt', costs.virt);
    setXpCost('npc-xp-cost-hum', costs.hum);
    setXpCost('npc-xp-cost-will', costs.will);

    const logDiv = document.getElementById('npc-xp-list');
    if(logDiv) {
        logDiv.innerHTML = ctx.activeNpc.experience.log.length === 0 ? '<div class="italic opacity-50">No XP spent.</div>' : 
        ctx.activeNpc.experience.log.slice().reverse().map(l => `
            <div class="flex justify-between border-b border-[#222] pb-1 mb-1 text-[9px]">
                <div><span class="text-gray-500">[${new Date(l.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}]</span> <span class="text-white font-bold">${l.trait}</span></div>
                <div class="text-purple-400 font-bold">-${l.cost}</div>
            </div>
            <div class="text-[8px] text-gray-600 mb-1 italic">${l.from} &rarr; ${l.to}</div>
        `).join('');
    }
}

export function updateFreebieCalc() {
    if(!ctx.modes.freebie) return;
    let costs = { attr: 0, abil: 0, disc: 0, back: 0, virt: 0, hum: 0, will: 0, merit: 0, flaw: 0 };
    let totalSpent = 0;
    
    ctx.activeNpc.freebieLog.forEach(l => {
        totalSpent += l.cost;
        if (l.type === 'attributes') costs.attr += l.cost;
        else if (l.type === 'abilities') costs.abil += l.cost;
        else if (l.type === 'disciplines') costs.disc += l.cost;
        else if (l.type === 'backgrounds') costs.back += l.cost;
        else if (l.type === 'virtues') costs.virt += l.cost;
        else if (l.type === 'humanity') costs.hum += l.cost;
        else if (l.type === 'willpower') costs.will += l.cost;
        else if (l.type === 'merit') costs.merit += l.cost;
        else if (l.type === 'flaw') costs.flaw += Math.abs(l.cost);
    });

    const remaining = 21 - totalSpent;
    const setCost = (id, val) => { const el = document.getElementById(id); if(el) { el.innerText = val; el.className = val > 0 ? "text-red-400 font-bold" : "text-gray-500"; } };
    
    setCost('npc-fb-cost-attr', costs.attr);
    setCost('npc-fb-cost-abil', costs.abil);
    setCost('npc-fb-cost-disc', costs.disc);
    setCost('npc-fb-cost-back', costs.back);
    setCost('npc-fb-cost-virt', costs.virt);
    setCost('npc-fb-cost-hum', costs.hum);
    setCost('npc-fb-cost-will', costs.will);
    setCost('npc-fb-cost-merit', costs.merit);
    
    const flawEl = document.getElementById('npc-fb-cost-flaw');
    if(flawEl) { flawEl.innerText = costs.flaw; flawEl.className = costs.flaw > 0 ? "text-green-400 font-bold" : "text-gray-500"; }
    
    const fbEl = document.getElementById('npc-fb-final');
    if(fbEl) { fbEl.innerText = remaining; fbEl.className = remaining >= 0 ? "text-4xl font-black text-white mt-2 font-cinzel" : "text-4xl font-black text-red-500 mt-2 font-cinzel"; }
    
    const fbTotalCalc = document.getElementById('npc-fb-total-calc');
    if(fbTotalCalc) { fbTotalCalc.innerText = remaining; fbTotalCalc.className = remaining >= 0 ? "text-green-400" : "text-red-500"; }

    const logEl = document.getElementById('npc-fb-log-list');
    if(logEl) {
        logEl.innerHTML = ctx.activeNpc.freebieLog.length === 0 ? '<div class="italic opacity-50">No freebie points spent.</div>' : 
        ctx.activeNpc.freebieLog.slice().reverse().map(l => `
            <div class="flex justify-between border-b border-[#222] pb-1 mb-1 text-[9px]">
                <div><span class="text-white font-bold">${l.trait}</span></div>
                <div class="${l.cost < 0 ? 'text-green-400' : 'text-red-400'} font-bold">${l.cost < 0 ? '+' + Math.abs(l.cost) : '-' + l.cost}</div>
            </div>
            <div class="text-[8px] text-gray-600 mb-1 italic">${l.from !== undefined ? `${l.from} &rarr; ${l.to}` : "Added"}</div>
        `).join('');
    }
}
