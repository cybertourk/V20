import { ATTRIBUTES, ABILITIES, VIRTUES, WEAPONS, RANGED_WEAPONS, ARMOR } from "./data.js";
import { renderDots, showNotification } from "./ui-common.js";
import { toggleStat, clearPool } from "./ui-mechanics.js";

let ctx = {}; // context: { activeNpc, activeIndex }
let callbacks = {}; // { closeModal, saveNpc, toggleDiceUI }

// V20 STANDARD MANEUVER DEFINITIONS
const STANDARD_MANEUVERS = {
    // CLOSE COMBAT
    "Bite": { attr: "Dexterity", abil: "Brawl", bonus: 1, diff: 6, dmgExpr: "Str+1(A)", note: "" },
    "Block": { attr: "Dexterity", abil: "Brawl", bonus: 0, diff: 6, dmgExpr: "None", note: "(R)" },
    "Claw": { attr: "Dexterity", abil: "Brawl", bonus: 0, diff: 6, dmgExpr: "Str+1(A)", note: "" },
    "Clinch": { attr: "Strength", abil: "Brawl", bonus: 0, diff: 6, dmgExpr: "Str(B)", note: "(C)" },
    "Disarm": { attr: "Dexterity", abil: "Melee", bonus: 0, diff: 7, dmgExpr: "Special", note: "" }, 
    "Dodge": { attr: "Dexterity", abil: "Athletics", bonus: 0, diff: 6, dmgExpr: "None", note: "(R)" },
    "Hold": { attr: "Strength", abil: "Brawl", bonus: 0, diff: 6, dmgExpr: "None", note: "(C)" },
    "Kick": { attr: "Dexterity", abil: "Brawl", bonus: 0, diff: 7, dmgExpr: "Str+1(B)", note: "" },
    "Parry": { attr: "Dexterity", abil: "Melee", bonus: 0, diff: 6, dmgExpr: "None", note: "(R)" },
    "Strike (Punch)": { attr: "Dexterity", abil: "Brawl", bonus: 0, diff: 6, dmgExpr: "Str(B)", note: "" },
    "Sweep": { attr: "Dexterity", abil: "Brawl", bonus: 0, diff: 7, dmgExpr: "Str(B)", note: "(K)" },
    "Tackle": { attr: "Strength", abil: "Brawl", bonus: 0, diff: 7, dmgExpr: "Str+1(B)", note: "(K)" },
    
    // RANGED COMBAT
    "Automatic Fire": { attr: "Dexterity", abil: "Firearms", bonus: 10, diff: 8, dmgExpr: "Special", note: "+10 Dice" },
    "Multiple Shots": { attr: "Dexterity", abil: "Firearms", bonus: 0, diff: 6, dmgExpr: "Weapon", note: "" },
    "Strafing": { attr: "Dexterity", abil: "Firearms", bonus: 10, diff: 8, dmgExpr: "Special", note: "+10 Dice" },
    "3-Round Burst": { attr: "Dexterity", abil: "Firearms", bonus: 2, diff: 7, dmgExpr: "Weapon", note: "+2 Dice" },
    "Two Weapons": { attr: "Dexterity", abil: "Firearms", bonus: 0, diff: 6, dmgExpr: "Weapon", note: "+1 Diff Off" }
};

export function initPlaySheet(context, callbackMap) {
    ctx = context;
    callbacks = callbackMap;
    
    if (!ctx.activeNpc.combatLoadout) {
        ctx.activeNpc.combatLoadout = ["Strike (Punch)"]; 
    }
}

export function renderPlaySheetModal() {
    let modal = document.getElementById('npc-play-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'npc-play-modal';
        modal.className = 'fixed inset-0 bg-black/95 z-[90] flex items-center justify-center hidden';
        document.body.appendChild(modal);
    }

    const npc = ctx.activeNpc;

    const typeLabel = npc.template === 'ghoul' 
        ? `${npc.type || 'Ghoul'} ${npc.domitorClan ? `(${npc.domitorClan})` : ''}` 
        : (npc.template === 'animal' ? 'Animal' : 'Mortal');

    const showVirtues = npc.template !== 'animal';
    const showHumanity = npc.template !== 'animal';
    const humanityLabel = npc.template === 'vampire' ? 'Humanity / Road' : 'Humanity';
    
    // Hide Feeding Grounds for Mortals, Ghouls, and Animals
    const showFeedingGrounds = !['mortal', 'ghoul', 'animal'].includes(npc.template);

    // --- BIO & EXTRAS GENERATION ---
    const physicalStats = Object.entries(npc.bio || {})
        .filter(([k, v]) => v && k !== 'Description' && k !== 'Notes')
        .map(([k, v]) => `<div class="flex justify-between border-b border-[#333] pb-1 mb-1 text-[10px]"><span class="text-gray-500 font-bold uppercase">${k}:</span> <span class="text-gray-200">${v}</span></div>`)
        .join('');

    const weaknessDisplay = npc.weakness ? `
        <div class="mt-4 p-2 border border-red-900/50 bg-red-900/10 rounded">
            <span class="text-red-400 font-bold uppercase text-[10px] block mb-1">Weakness / Curse</span>
            <p class="text-xs text-red-200 italic">${npc.weakness}</p>
        </div>` : '';

    const formatNaturalWeapons = (text) => {
        if (!text) return '';
        return text.replace(/([a-zA-Z0-9\s-]+)\s*\((\d+)\)/g, (match, name, dice) => {
            return `<span class="npc-attack-interact cursor-pointer text-[#d4af37] font-bold border-b border-dashed border-[#d4af37]/30 hover:text-white hover:border-white transition-colors ml-1" data-name="${name.trim()}" data-dice="${dice}">${match}</span>`;
        });
    };

    const naturalWeaponsDisplay = npc.naturalWeapons ? `
        <div class="mt-4 p-2 border border-yellow-900/50 bg-yellow-900/10 rounded">
            <span class="text-[#d4af37] font-bold uppercase text-[10px] block mb-1">Natural Weapons / Abilities</span>
            <p class="text-xs text-gray-300 leading-relaxed">${formatNaturalWeapons(npc.naturalWeapons)}</p>
        </div>` : '';

    let domitorDisplay = '';
    if (npc.domitor) {
        domitorDisplay = `<div class="mt-2 text-xs text-gray-400"><span class="font-bold text-gray-500 uppercase text-[10px]">Domitor:</span> <span class="text-white">${npc.domitor}</span>`;
        if (npc.domitorClan) domitorDisplay += ` <span class="text-gray-500">(${npc.domitorClan})</span>`;
        domitorDisplay += '</div>';
    }
    if (npc.bondLevel) {
        domitorDisplay += `<div class="mt-1 text-xs text-gray-400"><span class="font-bold text-gray-500 uppercase text-[10px]">Blood Bond:</span> <span class="text-[#d4af37]">Step ${npc.bondLevel}</span></div>`;
    }

    // --- STATS CALCULATION ---
    const dex = npc.attributes.Dexterity || 1;
    const wits = npc.attributes.Wits || 1;
    const str = npc.attributes.Strength || 1;
    let sta = npc.attributes.Stamina || 1;
    const fort = (npc.disciplines && npc.disciplines.Fortitude) || 0;
    const pot = (npc.disciplines && npc.disciplines.Potence) || 0;
    const cel = (npc.disciplines && npc.disciplines.Celerity) || 0;

    const brawl = npc.abilities.Brawl || 0;
    const melee = npc.abilities.Melee || 0;
    const firearms = npc.abilities.Firearms || 0;
    const athletics = npc.abilities.Athletics || 0;

    // Armor Calculation
    const inventory = npc.inventory || [];
    const equippedArmor = inventory.filter(i => i.type === 'Armor' && i.status === 'carried');
    let armorRating = 0;
    let armorPenalty = 0;
    equippedArmor.forEach(a => {
        if (!a.stats || !a.stats.rating) {
            const base = (ARMOR||[]).find(x => x.name === a.name);
            if (base) { armorRating += base.rating; armorPenalty += base.penalty; }
        } else {
            armorRating += parseInt(a.stats.rating || 0);
            armorPenalty += parseInt(a.stats.penalty || 0);
        }
    });

    const dexPenalized = Math.max(0, dex - armorPenalty);

    // --- MANEUVER GENERATION ---
    let maneuvers = [];

    // 1. EQUIPPED WEAPONS
    const equippedWeapons = inventory.filter(i => (i.type === 'Weapon' || i.type === 'Melee' || i.type === 'Ranged') && i.status === 'carried');
    
    equippedWeapons.forEach(w => {
        let stats = w.stats || {};
        if (!stats.diff) {
            const base = [...(WEAPONS||[]), ...(RANGED_WEAPONS||[])].find(x => x.name === w.name);
            if (base) stats = base;
        }

        let attrName = "Dexterity";
        let attrVal = dexPenalized;
        let abilName = "Melee";
        let abilVal = melee;
        let isRanged = (w.type === 'Ranged' || (stats.range && stats.range !== '-'));
        
        if (isRanged) {
            abilName = "Firearms";
            abilVal = firearms;
        } else if (w.name.toLowerCase().includes('fist') || w.name.toLowerCase().includes('brass')) {
            abilName = "Brawl";
            abilVal = brawl;
        }
        
        let dmgStr = stats.dmg || "Str"; 
        let dmgDice = 0;
        let dmgType = "(L)";

        if (dmgStr.includes('(B)')) dmgType = "(B)";
        else if (dmgStr.includes('(A)')) dmgType = "(A)";

        if (dmgStr.toLowerCase().includes('str')) {
            const bonus = parseInt(dmgStr.match(/\+(\d+)/)?.[1] || 0);
            dmgDice = str + pot + bonus;
        } else {
            dmgDice = parseInt(dmgStr) || 4;
        }

        maneuvers.push({
            name: w.name,
            attr: attrName,
            attrVal: attrVal,
            abil: abilName,
            abilVal: abilVal,
            bonus: 0,
            label: `${attrName.substring(0,3)} + ${abilName}`,
            diff: stats.diff || 6,
            dmg: `${dmgDice}${dmgType}`,
            isWeapon: true
        });
    });

    // 2. SAVED LOADOUT MANEUVERS
    const loadout = npc.combatLoadout || [];
    
    loadout.forEach((mName) => {
        const def = STANDARD_MANEUVERS[mName];
        if (!def) return;

        let attrVal = (def.attr === "Strength") ? str : dexPenalized; 
        let abilVal = 0;
        if (def.abil === "Brawl") abilVal = brawl;
        if (def.abil === "Melee") abilVal = melee;
        if (def.abil === "Firearms") abilVal = firearms;
        if (def.abil === "Athletics") abilVal = athletics;

        let dmgStr = "";
        
        if (def.dmgExpr === "None" || def.dmgExpr === "Special" || def.dmgExpr === "Weapon") {
            dmgStr = def.dmgExpr;
        } else if (def.dmgExpr.includes("Str")) {
            let bonus = 0;
            if (def.dmgExpr.includes("+1")) bonus = 1;
            let type = def.dmgExpr.includes("(A)") ? "(A)" : "(B)";
            dmgStr = `${str + pot + bonus}${type}`;
        }

        maneuvers.push({
            name: mName,
            attr: def.attr,
            attrVal: attrVal,
            abil: def.abil,
            abilVal: abilVal,
            bonus: def.bonus,
            label: `${def.attr.substring(0,3)} + ${def.abil}` + (def.bonus > 0 ? ` + ${def.bonus}` : ''),
            diff: def.diff,
            dmg: dmgStr,
            note: def.note,
            isWeapon: false
        });
    });

    const html = `
        <div class="w-[95%] max-w-7xl h-[95%] bg-[#0a0a0a] border border-[#444] shadow-2xl flex flex-col relative font-serif text-white overflow-hidden pb-16">
            <!-- Header -->
            <div class="bg-[#111] p-4 border-b border-[#333] flex justify-between items-center shrink-0">
                <div>
                    <h2 class="text-3xl font-cinzel font-bold text-[#d4af37] leading-none">${npc.name || "Unnamed NPC"}</h2>
                    <div class="text-xs text-gray-400 uppercase tracking-widest mt-1 font-bold">${typeLabel}</div>
                </div>
                <div class="flex items-center gap-4">
                    <button id="close-play-modal" class="text-gray-500 hover:text-white text-2xl"><i class="fas fa-times"></i></button>
                </div>
            </div>

            <!-- Content (Standard Sheet Orientation) -->
            <div class="flex-1 overflow-y-auto p-8 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] no-scrollbar">
                
                <!-- ROW 1: ATTRIBUTES -->
                <div class="sheet-section !mt-0 mb-6">
                    <div class="section-title">Attributes</div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        ${renderSimpleDots(npc.attributes, ATTRIBUTES, 'attributes')}
                    </div>
                </div>

                <!-- ROW 2: ABILITIES -->
                <div class="sheet-section mb-6">
                    <div class="section-title">Abilities</div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        ${renderSimpleDots(npc.abilities, ABILITIES, 'abilities')}
                    </div>
                </div>

                <!-- ROW 3: ADVANTAGES -->
                <div class="sheet-section mb-6">
                    <div class="section-title">Advantages</div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <!-- Disciplines -->
                        <div class="flex flex-col">
                            <h3 class="text-[#8b0000] font-cinzel font-bold border-b border-[#444] mb-2 text-center text-xs tracking-widest">Disciplines</h3>
                            ${Object.keys(npc.disciplines).length > 0 
                                ? Object.entries(npc.disciplines).map(([k,v]) => `
                                    <div class="flex justify-between text-xs mb-1 font-bold group">
                                        <span class="uppercase cursor-pointer hover:text-[#d4af37] transition-colors roll-stat" data-stat="${k}" data-val="${v}" data-type="discipline">${k}</span>
                                        <span>${renderDots(v,5)}</span>
                                    </div>`).join('') 
                                : '<div class="text-gray-600 italic text-xs text-center">None</div>'}
                        </div>
                        
                        <!-- Backgrounds -->
                        <div class="flex flex-col">
                            <h3 class="text-[#8b0000] font-cinzel font-bold border-b border-[#444] mb-2 text-center text-xs tracking-widest">Backgrounds</h3>
                            ${Object.keys(npc.backgrounds).length > 0 
                                ? Object.entries(npc.backgrounds).map(([k,v]) => `<div class="flex justify-between text-xs mb-1 font-bold"><span class="uppercase">${k}</span><span>${renderDots(v,5)}</span></div>`).join('') 
                                : '<div class="text-gray-600 italic text-xs text-center">None</div>'}
                        </div>

                        <!-- Virtues -->
                        ${showVirtues ? `
                        <div class="flex flex-col">
                            <h3 class="text-[#8b0000] font-cinzel font-bold border-b border-[#444] mb-2 text-center text-xs tracking-widest">Virtues</h3>
                            ${VIRTUES.map(v => `<div class="flex justify-between text-xs mb-1 font-bold group">
                                <span class="uppercase cursor-pointer hover:text-[#d4af37] transition-colors roll-stat" data-stat="${v}" data-val="${npc.virtues[v]||1}" data-type="virtue">${v}</span>
                                <span>${renderDots(npc.virtues[v]||1, 5)}</span>
                            </div>`).join('')}
                        </div>` : '<div></div>'}
                    </div>
                </div>

                <!-- ROW 4: DETAILS GRID (Merits, Combat, Health) -->
                <div class="grid grid-cols-12 gap-6">
                    
                    <!-- LEFT COLUMN (4/12): Stats & Merits -->
                    <div class="col-span-12 md:col-span-4 flex flex-col gap-6">
                        <!-- Merits -->
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Merits & Flaws</div>
                            <div class="text-xs">
                                ${Object.keys(npc.merits).length > 0 || Object.keys(npc.flaws).length > 0 ? `
                                    ${Object.entries(npc.merits).map(([k,v]) => `<span class="inline-block bg-blue-900/30 border border-blue-900/50 rounded px-2 py-0.5 mr-2 mb-1">${k} (${v})</span>`).join('')}
                                    ${Object.entries(npc.flaws).map(([k,v]) => `<span class="inline-block bg-red-900/30 border border-red-900/50 rounded px-2 py-0.5 mr-2 mb-1 text-red-300">${k} (${v})</span>`).join('')}
                                ` : '<span class="text-gray-600 italic">None</span>'}
                            </div>
                        </div>

                        <!-- Humanity -->
                        ${showHumanity ? `
                        <div class="sheet-section">
                             <div class="section-title">${humanityLabel}</div>
                             <div class="flex justify-between items-center mb-2 text-xs">
                                <span class="font-bold text-[#d4af37] cursor-pointer hover:text-white roll-stat" data-stat="Humanity" data-val="${npc.humanity}" data-type="humanity">Rating</span>
                                <span class="font-bold text-gray-500">${npc.humanity}</span>
                            </div>
                            <div class="flex justify-center gap-1">${renderDots(npc.humanity, 10)}</div>
                        </div>` : ''}

                        <!-- Willpower -->
                        <div class="sheet-section">
                            <div class="section-title">Willpower</div>
                            <div class="flex justify-between items-center mb-2 text-xs">
                                <span class="font-bold text-[#d4af37] cursor-pointer hover:text-white roll-stat" data-stat="Willpower" data-val="${npc.willpower}" data-type="willpower">Permanent</span>
                                <span class="font-bold text-gray-500">${npc.willpower}</span>
                            </div>
                            <div class="flex justify-center gap-1 mb-2">
                                ${renderInteractiveBoxes('tempWillpower', 10, npc.tempWillpower)}
                            </div>
                        </div>

                        <!-- Blood Pool -->
                        ${npc.bloodPool > 0 ? `
                        <div class="sheet-section">
                            <div class="section-title">Blood Pool</div>
                            <div class="text-xs font-bold text-gray-500 text-center mb-2">Max: ${npc.bloodPool}</div>
                            <div class="flex flex-wrap justify-center gap-1">
                                ${renderInteractiveBoxes('currentBlood', npc.bloodPool, npc.currentBlood, true)}
                            </div>
                        </div>` : ''}
                    </div>

                    <!-- CENTER COLUMN (5/12): Combat & Inventory -->
                    <div class="col-span-12 md:col-span-5 flex flex-col gap-6">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Combat Maneuvers</div>
                            
                            <!-- Initiative ONLY -->
                            <div class="flex justify-between border-b border-[#333] py-2 text-gray-400 mb-2 text-xs">
                                <span class="font-bold cursor-pointer hover:text-white npc-combat-interact text-[#d4af37] uppercase tracking-wide" 
                                      data-action="init" 
                                      data-v1="${dexPenalized}" 
                                      data-v2="${wits}">
                                    <i class="fas fa-bolt mr-1"></i> Initiative
                                </span>
                                <span class="text-white font-bold">1d10 + ${dexPenalized + wits}</span>
                            </div>

                            <!-- Attacks Table -->
                            <table class="w-full text-left border-collapse mb-4">
                                <thead>
                                    <tr class="text-[9px] uppercase text-gray-500 border-b border-[#444]">
                                        <th class="py-1">Atk</th>
                                        <th class="text-center">Diff</th>
                                        <th class="text-center">Dmg</th>
                                        <th class="text-right">Pool</th>
                                        <th class="w-4"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${maneuvers.map((m, idx) => `
                                    <tr class="border-b border-[#222] hover:bg-white/5 transition-colors cursor-pointer npc-combat-interact group text-xs"
                                        data-action="attack" 
                                        data-name="${m.name}" 
                                        data-dmg="${m.dmg}"
                                        data-diff="${m.diff}"
                                        data-attr="${m.attr}" 
                                        data-attr-val="${m.attrVal}" 
                                        data-abil="${m.abil}" 
                                        data-abil-val="${m.abilVal}" 
                                        data-bonus="${m.bonus}">
                                        <td class="py-1 font-bold text-gray-300 group-hover:text-[#d4af37]">${m.name} <span class="text-[8px] font-normal text-gray-600">${m.note || ''}</span></td>
                                        <td class="text-center text-gray-500">${m.diff}</td>
                                        <td class="text-center text-gray-400 text-[10px]">${m.dmg}</td>
                                        <td class="text-right text-[10px] text-gray-400 font-mono">
                                            ${m.label} <span class="text-[#d4af37] font-bold text-sm ml-1">(${m.attrVal + m.abilVal + m.bonus})</span>
                                        </td>
                                        <td class="text-center">
                                            ${!m.isWeapon ? `<button class="text-red-500 hover:text-white remove-maneuver-btn" data-name="${m.name}"><i class="fas fa-times"></i></button>` : ''}
                                        </td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                            
                            <!-- Add Maneuver Dropdown -->
                            <div class="flex gap-1 border-t border-[#333] pt-2">
                                <select id="add-maneuver-select" class="flex-1 bg-[#111] text-[10px] border border-[#444] text-gray-300 p-1">
                                    <option value="">+ Add Maneuver...</option>
                                    ${Object.keys(STANDARD_MANEUVERS).sort().map(k => `<option value="${k}">${k}</option>`).join('')}
                                </select>
                                <button id="add-maneuver-btn" class="bg-[#222] border border-[#444] text-gray-300 text-[10px] px-2 hover:bg-[#333] hover:text-white">ADD</button>
                            </div>

                            <!-- Active Disciplines Summary -->
                            ${(cel > 0 || fort > 0 || pot > 0) ? `<div class="mt-4 pt-2 border-t border-[#333] space-y-1">
                                ${(cel > 0) ? `<div class="flex justify-between text-[10px] text-gray-400"><span>Celerity</span><span class="text-white">${cel} Actions / Add to Dex</span></div>` : ''}
                                ${(fort > 0) ? `<div class="flex justify-between text-[10px] text-gray-400"><span>Fortitude</span><span class="text-white">+${fort} Soak</span></div>` : ''}
                                ${(pot > 0) ? `<div class="flex justify-between text-[10px] text-gray-400"><span>Potence</span><span class="text-white">+${pot} Dmg / Str</span></div>` : ''}
                            </div>` : ''}
                        </div>

                        <!-- Inventory List -->
                        ${inventory.length > 0 ? `
                        <div class="sheet-section">
                            <div class="section-title">Inventory</div>
                            <div class="space-y-1 text-xs">
                                ${inventory.map(i => `<div class="text-gray-400 flex justify-between border-b border-[#222] pb-1">
                                    <span>${i.name} ${i.status === 'carried' ? '<i class="fas fa-hand-holding text-green-700 ml-1" title="Carried"></i>' : ''}</span> 
                                    <span class="text-[9px] uppercase">${i.type}</span>
                                </div>`).join('')}
                            </div>
                        </div>` : ''}
                    </div>

                    <!-- RIGHT COLUMN (3/12): Health & Bio -->
                    <div class="col-span-12 md:col-span-3 flex flex-col gap-6">
                        <div class="sheet-section !mt-0 h-full relative flex flex-col">
                            <div class="section-title">Health</div>
                            <div class="flex-1 space-y-1 text-xs mt-2">
                                ${renderHealthTrack()}
                            </div>

                            <!-- DAMAGE CONTROLS -->
                            <div id="npc-damage-app-container" class="mt-4 pt-2 border-t border-[#333]">
                                <div class="flex items-center justify-between mb-2 gap-2">
                                    <span class="text-[10px] font-bold text-gray-400 uppercase">Incoming:</span>
                                    <input type="number" id="npc-dmg-input" value="1" min="1" class="w-10 bg-[#111] border border-[#444] text-white text-center text-xs font-bold">
                                </div>
                                <div class="grid grid-cols-3 gap-1 mb-2">
                                    <button type="button" class="npc-dmg-btn bg-[#1e3a8a] text-blue-200 text-[9px] font-bold py-1 px-1 rounded border border-blue-800 hover:bg-blue-900 uppercase" data-type="1">/</button>
                                    <button type="button" class="npc-dmg-btn bg-[#7f1d1d] text-red-200 text-[9px] font-bold py-1 px-1 rounded border border-red-800 hover:bg-red-900 uppercase" data-type="2">X</button>
                                    <button type="button" class="npc-dmg-btn bg-[#713f12] text-yellow-200 text-[9px] font-bold py-1 px-1 rounded border border-yellow-800 hover:bg-yellow-900 uppercase" data-type="3">*</button>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <button type="button" id="npc-soak-btn" class="w-full bg-gray-800 text-gray-300 text-[9px] font-bold py-1 rounded border border-gray-600 hover:bg-gray-700 uppercase" data-sta="${sta}" data-fort="${fort}" data-armor="${armorRating}">Roll Soak</button>
                                    <button type="button" id="npc-heal-btn" class="w-full bg-green-900/40 text-green-300 text-[9px] font-bold py-1 rounded border border-green-800 hover:bg-green-900 uppercase">Heal (1 BP)</button>
                                </div>
                            </div>
                        </div>

                        <div class="sheet-section">
                            <div class="section-title">Biography</div>
                            ${npc.bio.Description ? `<div class="text-xs text-gray-300 italic leading-relaxed mb-4 whitespace-pre-wrap">${npc.bio.Description}</div>` : '<div class="text-xs text-gray-600 italic">No description.</div>'}
                            
                            ${domitorDisplay ? `<div class="bg-[#111] p-2 border border-[#333] rounded mb-2">${domitorDisplay}</div>` : ''}
                            
                            ${physicalStats ? `<div class="border-t border-[#333] pt-2 mt-2">${physicalStats}</div>` : ''}
                            
                            ${showFeedingGrounds && npc.feedingGrounds ? `
                            <div class="mt-4 pt-2 border-t border-[#333]">
                                <h4 class="font-bold text-gray-500 uppercase text-[10px] mb-1">Feeding Grounds</h4>
                                <div class="text-xs text-gray-400 italic">${npc.feedingGrounds}</div>
                            </div>` : ''}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;

    modal.innerHTML = html;
    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    // Show Dice Engine when Play Sheet is open
    if(callbacks.toggleDiceUI) callbacks.toggleDiceUI(true, true);

    // Bind Close
    document.getElementById('close-play-modal').onclick = () => { 
        modal.style.display = 'none'; 
        if(callbacks.closeModal) callbacks.closeModal();
    };

    bindPlayInteractions(modal);
}

function renderSimpleDots(data, structure, type) {
    let html = '';
    const cats = type === 'attributes' ? ['Physical', 'Social', 'Mental'] : ['Talents', 'Skills', 'Knowledges'];
    
    cats.forEach(cat => {
        const list = structure[cat];
        if(!list) return;
        
        // This generates the column content for the grid
        html += `<div class="flex flex-col">
            <h3 class="text-[#8b0000] font-cinzel font-bold border-b border-[#444] mb-2 text-center text-xs tracking-widest uppercase">${cat}</h3>`;
        
        list.forEach(k => {
            const val = data[k] || 0;
            if (val > 0 || type === 'attributes') {
                html += `<div class="flex justify-between items-center mb-0.5 text-xs group">
                    <span class="text-gray-300 cursor-pointer hover:text-[#d4af37] transition-colors roll-stat" data-stat="${k}" data-val="${val}" data-type="${type}">${k}</span>
                    <span>${renderDots(val, 5)}</span>
                </div>`;
            }
        });
        html += `</div>`;
    });
    return html;
}

function renderInteractiveBoxes(field, max, current, isSquare = false) {
    let html = '';
    const shapeClass = isSquare ? 'w-3 h-3 rounded-sm' : 'w-3 h-3 rounded-full';
    
    for (let i = 1; i <= max; i++) {
        let stateClass = 'bg-gray-800 border-gray-600'; 
        if (i <= current) {
            stateClass = isSquare ? 'bg-[#8b0000] border-red-900' : 'bg-[#d4af37] border-yellow-700';
        }
        html += `<div class="${shapeClass} border cursor-pointer hover:opacity-80 transition-colors npc-box-interact" data-field="${field}" data-val="${i}">
            <div class="${stateClass} w-full h-full"></div>
        </div>`;
    }
    return html;
}

function renderHealthTrack() {
    let levels = [
        { l: 'Bruised', p: 0 },
        { l: 'Hurt', p: -1 },
        { l: 'Injured', p: -1 },
        { l: 'Wounded', p: -2 },
        { l: 'Mauled', p: -2 },
        { l: 'Crippled', p: -5 },
        { l: 'Incapacitated', p: 0 }
    ];

    if (ctx.activeNpc.healthConfig && Array.isArray(ctx.activeNpc.healthConfig) && ctx.activeNpc.healthConfig.length > 0) {
        levels = ctx.activeNpc.healthConfig;
    }

    // Ensure health object and track array exist
    if (!ctx.activeNpc.health) ctx.activeNpc.health = {};
    if (!ctx.activeNpc.health.track) {
        const dmg = ctx.activeNpc.health.damage || 0;
        ctx.activeNpc.health.track = Array(levels.length).fill(0);
        for(let i=0; i<dmg; i++) {
            ctx.activeNpc.health.track[i] = 2; // Default to Lethal (X)
        }
    }
    
    // Ensure track length matches levels
    if (ctx.activeNpc.health.track.length < levels.length) {
        const diff = levels.length - ctx.activeNpc.health.track.length;
        for(let i=0; i<diff; i++) ctx.activeNpc.health.track.push(0);
    }

    return levels.map((lvl, idx) => {
        const state = ctx.activeNpc.health.track[idx] || 0;
        const boxHtml = `<div class="box npc-health-box cursor-pointer hover:border-white" 
            data-idx="${idx}" 
            data-state="${state}" 
            style="width: 14px; height: 14px;"></div>`;

        return `
            <div class="flex justify-between items-center h-5 border-b border-[#222] pb-1 last:border-0">
                <span class="w-24 font-bold text-gray-400">${lvl.l}</span>
                <span class="text-gray-500 w-8 text-center text-[10px]">${lvl.p === 0 ? '' : lvl.p}</span>
                ${boxHtml}
            </div>
        `;
    }).join('');
}

function applyNpcDamage(type) {
    const input = document.getElementById('npc-dmg-input');
    const amount = parseInt(input.value) || 1;
    const track = ctx.activeNpc.health.track;
    
    for(let i=0; i<amount; i++) {
        const emptyIdx = track.indexOf(0);
        if (emptyIdx !== -1) {
            track[emptyIdx] = type;
        } else {
            track.push(type);
        }
    }
    
    track.sort((a, b) => b - a);
    
    if (track.length > 7) { 
        ctx.activeNpc.health.track = track.slice(0, 7);
    }
    
    const filledCount = track.filter(s => s > 0).length;
    ctx.activeNpc.health.damage = filledCount;
    
    if(callbacks.saveNpc) callbacks.saveNpc(true);
    renderPlaySheetModal();
}

function healNpc() {
    const track = ctx.activeNpc.health.track;
    
    if (ctx.activeNpc.template === 'vampire' || ctx.activeNpc.template === 'ghoul') {
        if (ctx.activeNpc.currentBlood > 0) {
            ctx.activeNpc.currentBlood--;
        } else {
            showNotification("Not enough blood to heal!");
            return;
        }
    }
    
    const bashIdx = track.lastIndexOf(1);
    const lethalIdx = track.lastIndexOf(2);
    
    if (bashIdx !== -1) {
        track[bashIdx] = 0;
        showNotification("Healed 1 Bashing Level.");
    } else if (lethalIdx !== -1) {
        track[lethalIdx] = 0;
        showNotification("Healed 1 Lethal Level.");
    } else {
        showNotification("Cannot instantly heal Aggravated damage.");
        if (ctx.activeNpc.currentBlood < ctx.activeNpc.bloodPool) ctx.activeNpc.currentBlood++;
        return;
    }
    
    track.sort((a, b) => b - a);
    
    const filledCount = track.filter(s => s > 0).length;
    ctx.activeNpc.health.damage = filledCount;
    
    if(callbacks.saveNpc) callbacks.saveNpc(true);
    renderPlaySheetModal();
}

function bindPlayInteractions(modal) {
    // 1. ROLL STATS
    modal.querySelectorAll('.roll-stat').forEach(el => {
        el.onclick = () => {
            const name = el.dataset.stat;
            const score = parseInt(el.dataset.val) || 0;
            const type = el.dataset.type;
            if (typeof toggleStat === 'function') toggleStat(name, score, type);
        };
    });

    // 2. COMBAT STATS
    modal.querySelectorAll('.npc-combat-interact').forEach(el => {
        el.onclick = () => {
            if (typeof clearPool === 'function') clearPool();
            
            const action = el.dataset.action;
            const v1 = parseInt(el.dataset.v1) || 0;
            const v2 = parseInt(el.dataset.v2) || 0;
            const v3 = parseInt(el.dataset.v3) || 0; 

            if (typeof toggleStat === 'function') {
                if (action === 'init') {
                    if (typeof clearPool === 'function') clearPool();
                    const score = v1 + v2; 
                    toggleStat(`Initiative (+${score})`, 1, 'custom');
                    showNotification(`Initiative: Roll 1d10 + ${score}. (Total Score: [Die Result] + ${score})`);
                }
                else if (action === 'soak') {
                    toggleStat('Stamina', v1, 'attribute');
                    if (v2 > 0) toggleStat('Fortitude', v2, 'discipline');
                    if (v3 > 0) toggleStat('Armor', v3, 'custom');
                    showNotification("Soak Pool Loaded.");
                }
                else if (action === 'attack') {
                    const name = el.dataset.name;
                    const diff = parseInt(el.dataset.diff);
                    const dmg = el.dataset.dmg;
                    
                    const attr = el.dataset.attr;
                    const attrVal = parseInt(el.dataset.attrVal);
                    const abil = el.dataset.abil;
                    const abilVal = parseInt(el.dataset.abilVal);
                    const bonus = parseInt(el.dataset.bonus);

                    // Load Attribute
                    if (attrVal > 0) toggleStat(attr, attrVal, 'attribute');
                    
                    // Load Ability
                    if (abilVal > 0) toggleStat(abil, abilVal, 'ability');
                    
                    // Load Bonus (like Bite +1)
                    if (bonus > 0) toggleStat('Bonus', bonus, 'custom');
                    
                    const diffInput = document.getElementById('roll-diff');
                    if(diffInput) diffInput.value = diff;

                    showNotification(`Attack: ${name} (Diff ${diff}, Dmg ${dmg}) Loaded.`);
                }
            }
        };
    });

    // 3. STAT BOXES (Willpower / Blood)
    modal.querySelectorAll('.npc-box-interact').forEach(box => {
        box.onclick = () => {
            const field = box.dataset.field;
            const val = parseInt(box.dataset.val);
            const current = ctx.activeNpc[field] || 0;
            
            if (field === 'tempWillpower') {
                const perm = ctx.activeNpc.willpower || 10;
                if (val > perm) return;
            }
            
            if (val === current) ctx.activeNpc[field] = val - 1;
            else ctx.activeNpc[field] = val;

            if(callbacks.saveNpc) callbacks.saveNpc(true); 
            renderPlaySheetModal(); 
        };
    });

    // 4. HEALTH BOXES (CYCLING LOGIC)
    modal.querySelectorAll('.npc-health-box').forEach(box => {
        box.onclick = () => {
            const idx = parseInt(box.dataset.idx);
            
            if (!ctx.activeNpc.health) ctx.activeNpc.health = {};
            if (!ctx.activeNpc.health.track) ctx.activeNpc.health.track = [];
            
            const currentState = ctx.activeNpc.health.track[idx] || 0;
            const nextState = (currentState + 1) % 4;
            
            ctx.activeNpc.health.track[idx] = nextState;
            
            // Sync legacy damage counter
            const filledCount = ctx.activeNpc.health.track.filter(s => s > 0).length;
            ctx.activeNpc.health.damage = filledCount;
            
            if(callbacks.saveNpc) callbacks.saveNpc(true);
            renderPlaySheetModal();
        };
    });

    // 5. NATURAL WEAPONS
    modal.querySelectorAll('.npc-attack-interact').forEach(el => {
        el.onclick = () => {
            if (typeof clearPool === 'function') clearPool();
            const name = el.dataset.name;
            const dice = parseInt(el.dataset.dice) || 0;
            if (typeof toggleStat === 'function') {
                toggleStat(name, dice, 'custom');
                showNotification(`Attack Pool: ${name} (${dice}) loaded.`);
            }
        };
    });

    // 6. DAMAGE CONTROL BUTTONS
    modal.querySelectorAll('.npc-dmg-btn').forEach(btn => {
        btn.onclick = () => {
            const type = parseInt(btn.dataset.type);
            applyNpcDamage(type);
        };
    });

    const soakBtn = document.getElementById('npc-soak-btn');
    if (soakBtn) {
        soakBtn.onclick = () => {
            if (typeof clearPool === 'function') clearPool();
            const sta = parseInt(soakBtn.dataset.sta) || 0;
            const fort = parseInt(soakBtn.dataset.fort) || 0;
            const armor = parseInt(soakBtn.dataset.armor) || 0;
            
            if (typeof toggleStat === 'function') {
                toggleStat('Stamina', sta, 'attribute');
                if (fort > 0) toggleStat('Fortitude', fort, 'discipline');
                if (armor > 0) toggleStat('Armor', armor, 'custom');
                showNotification("Soak Pool Loaded.");
            }
        };
    }

    const healBtn = document.getElementById('npc-heal-btn');
    if (healBtn) healBtn.onclick = healNpc;

    // 7. ADD/REMOVE MANEUVERS
    const addBtn = document.getElementById('add-maneuver-btn');
    if (addBtn) {
        addBtn.onclick = () => {
            const select = document.getElementById('add-maneuver-select');
            const val = select.value;
            if (val && !ctx.activeNpc.combatLoadout.includes(val)) {
                ctx.activeNpc.combatLoadout.push(val);
                if(callbacks.saveNpc) callbacks.saveNpc(true);
                renderPlaySheetModal();
            }
        };
    }

    modal.querySelectorAll('.remove-maneuver-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const name = btn.dataset.name;
            ctx.activeNpc.combatLoadout = ctx.activeNpc.combatLoadout.filter(m => m !== name);
            if(callbacks.saveNpc) callbacks.saveNpc(true);
            renderPlaySheetModal();
        };
    });
}
