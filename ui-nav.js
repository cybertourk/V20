import { 
    STEPS_CONFIG, CLAN_DISCIPLINES
} from "./data.js";

import { checkStepComplete } from "./v20-rules.js";

import { 
    showNotification 
} from "./ui-common.js";

import { 
    updatePools 
} from "./ui-mechanics.js";

import { renderJournalTab } from "./ui-journal.js";

// --- IMPORT NEW MODULES FOR NAVIGATION HOOKS ---
import { renderPrintSheet } from "./ui-print.js";
import { renderNpcTab } from "./ui-play.js"; 
import { renderRitualsEdit } from "./ui-advantages.js";

// --- NAVIGATION & STEPS ---

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

    // --- SPECIAL NPC INJECTION FOR PLAY MODE ---
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
    
    // --- SPECIAL: RITUALS INJECTION FOR PHASE 6 (EDIT MODE) ---
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
    updateWalkthrough();
}
window.changeStep = changeStep;

// --- XP MODE LOGIC ---

export function toggleXpMode() {
    window.state.xpMode = !window.state.xpMode;
    document.body.classList.toggle('xp-mode', window.state.xpMode);
    
    const btn = document.getElementById('toggle-xp-btn');
    if(btn) {
        btn.classList.toggle('bg-purple-900/40', window.state.xpMode);
        btn.classList.toggle('border-purple-500', window.state.xpMode);
        btn.classList.toggle('text-purple-200', window.state.xpMode);
        const txt = document.getElementById('xp-btn-text');
        if(txt) txt.innerText = window.state.xpMode ? "Exit Experience" : "Experience";
    }

    if (window.state.xpMode && window.state.freebieMode) toggleFreebieMode();

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
    let buckets = {
        newAbil: 0, newDisc: 0, newPath: 0,
        attr: 0, abil: 0,
        clanDisc: 0, otherDisc: 0, caitiffDisc: 0,
        secPath: 0, virt: 0, humanity: 0, willpower: 0
    };

    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    const isCaitiff = clan === "Caitiff";
    const clanDiscs = CLAN_DISCIPLINES[clan] || [];

    const primThaum = window.state.primaryThaumPath;
    const primNecro = window.state.primaryNecroPath;

    log.forEach(entry => {
        const isNew = entry.old === 0;
        const name = entry.trait || "";
        const type = entry.type;
        const cost = entry.cost;

        if (type === 'abil') {
            if (isNew) buckets.newAbil += cost; else buckets.abil += cost;
        } 
        else if (type === 'attr') {
            buckets.attr += cost;
        }
        else if (type === 'disc') {
            // CRITICAL FIX: Ensure Primary Paths are treated as Disciplines, not "Paths"
            const isPrimary = (name === primThaum || name === primNecro);
            
            // It is only a "Secondary Path" here if name includes 'path' AND it is NOT primary
            const isPathName = name.toLowerCase().includes('path');
            
            if (isPathName && !isPrimary) {
                if (isNew) buckets.newPath += cost; else buckets.secPath += cost; 
            } else {
                if (isNew) buckets.newDisc += cost;
                else {
                    // Treat Primary Paths as their parent Discipline for Clan Check
                    let checkName = name;
                    if (name === primThaum) checkName = 'Thaumaturgy';
                    if (name === primNecro) checkName = 'Necromancy';

                    if (isCaitiff) buckets.caitiffDisc += cost;
                    else if (clanDiscs.includes(checkName)) buckets.clanDisc += cost;
                    else buckets.otherDisc += cost;
                }
            }
        }
        else if (type === 'virt') buckets.virt += cost;
        else if (type === 'humanity' || (type === 'status' && name === 'Humanity')) buckets.humanity += cost;
        else if (type === 'willpower' || (type === 'status' && name === 'Willpower')) buckets.willpower += cost;
        else if (type === 'path') buckets.secPath += cost;
    });

    const sb = document.getElementById('xp-sidebar');
    if (!sb) return;

    const toggleBtn = document.getElementById('xp-sb-toggle-btn');
    sb.innerHTML = '';
    if (toggleBtn) sb.appendChild(toggleBtn);

    const title = document.createElement('h3');
    title.className = "heading text-purple-400 text-sm border-b border-purple-500 pb-2 mb-4 text-center";
    title.innerText = "Experience Ledger";
    sb.appendChild(title);

    const listDiv = document.createElement('div');
    listDiv.className = "space-y-2 text-xs";

    const addRow = (label, val, highlight = false) => {
        const row = document.createElement('div');
        row.className = "cost-row";
        const valClass = highlight ? "text-purple-300 font-bold" : "text-gray-400 font-bold";
        row.innerHTML = `<span class="text-gray-400">${label}</span><span class="cost-val ${valClass} bg-black/95 z-10 shrink-0">${val}</span>`;
        listDiv.appendChild(row);
    };

    addRow("New Ability (3)", buckets.newAbil);
    addRow("New Discipline (10)", buckets.newDisc);
    addRow("New Path (7)", buckets.newPath);
    addRow("Attribute (Cur x4)", buckets.attr);
    addRow("Ability (Cur x2)", buckets.abil);
    
    if (isCaitiff) {
        addRow("Discipline (Cur x6)*", buckets.caitiffDisc, true);
    } else {
        addRow("Clan Disc (Cur x5)*", buckets.clanDisc);
        addRow("Other Disc (Cur x7)*", buckets.otherDisc);
    }
    
    addRow("Sec. Path (Cur x4)", buckets.secPath);
    addRow("Virtue (Cur x2)**", buckets.virt);
    addRow("Humanity/Path (Cur x2)", buckets.humanity);
    addRow("Willpower (Cur x1)", buckets.willpower);

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

    const footer = document.createElement('div');
    footer.className = "mt-4 pt-2 border-t border-[#444] text-[8px] text-gray-500 italic leading-tight";
    let footerText = `<div>** Virtues do not raise Traits.</div>`;
    if (isCaitiff) footerText += `<div class="mt-1 text-purple-400">* Caitiff cost is x6 (Curse/Blessing).</div>`;
    else footerText += `<div class="mt-1">* In-Clan/Out-of-Clan multiplier.</div>`;
    footer.innerHTML = footerText;
    sb.appendChild(footer);
}
window.renderXpSidebar = renderXpSidebar;

export function toggleXpSidebarLedger() {
    document.getElementById('xp-sidebar').classList.toggle('open');
}
window.toggleXpSidebarLedger = toggleXpSidebarLedger;

// --- FREEBIE MODE LOGIC ---

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


// --- WALKTHROUGH / GUIDE SYSTEM ---

const STEP_FOUR_TEXT = `
    <p>Advantages make the vampire a contender in the hierarchy of the night.</p>
    <h4 class="text-gold mt-2 font-bold uppercase">Disciplines (3 Dots)</h4>
    <p>Each character begins with <strong>3 dots</strong> of Disciplines. These must be from your Clan Disciplines (unless Caitiff). You may spend all three on one, or spread them out.</p>
    <h4 class="text-gold mt-2 font-bold uppercase">Backgrounds (5 Dots)</h4>
    <p>A starting character has <strong>5 dots</strong> worth of Backgrounds to distribute at your discretion.</p>
    <p class="mt-2 text-sm italic">Optional: At Storyteller discretion, Sabbat vampires may take 4 dots in Disciplines instead of Backgrounds.</p>
    <h4 class="text-gold mt-2 font-bold uppercase">Virtues (7 Dots)</h4>
    <p>Virtues determine how well the character resists the Beast. Every character starts with 1 dot in Conscience and Self-Control (or Conviction/Instinct for Sabbat). You have <strong>7 additional dots</strong>.</p>
`;

const GUIDE_TEXT = {
    1: { 
        title: "Step One: Character Concept",
        body: `
            <p>Concept is the birthing chamber for who a character will become. It only needs to be a general idea — brute; slick mobster; manic Malkavian kidnapper.</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Concept</h4>
            <p>Refers to who the character was before becoming a vampire.</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Clan</h4>
            <p>A character’s Clan is her vampire “family.” Vampires are always of the same Clan as their sires.</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Nature & Demeanor</h4>
            <ul class="list-disc pl-4 mt-1"><li><strong>Demeanor:</strong> The mask worn for the world.</li><li><strong>Nature:</strong> The character's true self.</li></ul>
        `
    },
    2: { 
        title: "Step Two: Select Attributes",
        body: `
            <p>Attributes are the natural abilities. Prioritize your categories:</p>
            <ul class="list-disc pl-4 mt-1"><li><strong>Primary:</strong> 7 dots</li><li><strong>Secondary:</strong> 5 dots</li><li><strong>Tertiary:</strong> 3 dots</li></ul>
            <p class="mt-2 text-sm italic">Note: All characters start with one dot in each Attribute automatically.</p>
        `
    },
    3: { 
        title: "Step Three: Select Abilities",
        body: `
            <p>Prioritize your categories:</p>
            <ul class="list-disc pl-4 mt-1"><li><strong>Primary:</strong> 13 dots</li><li><strong>Secondary:</strong> 9 dots</li><li><strong>Tertiary:</strong> 5 dots</li></ul>
            <p class="mt-2 text-sm italic">Note: No Ability may be purchased above 3 dots during this stage.</p>
        `
    },
    4: { title: "Step Four: Select Advantages", body: STEP_FOUR_TEXT },
    5: { title: "Step Four: Select Advantages", body: STEP_FOUR_TEXT },
    6: { 
        title: "Step Five: Last Touches",
        body: `
            <h4 class="text-gold mt-2 font-bold uppercase">Calculated Traits</h4>
            <ul class="list-disc pl-4 mt-1"><li><strong>Humanity:</strong> Conscience + Self-Control.</li><li><strong>Willpower:</strong> Equals Courage rating.</li><li><strong>Blood Pool:</strong> Determined by generation.</li></ul>
        `
    },
    7: { title: "Step Five: Freebie Points", body: `<p>The player may spend <strong>15 freebie points</strong> to purchase additional dots.</p><p>You may also take up to 7 points of Flaws.</p>` },
    8: { title: "Step Five: Freebie Points", body: `<p>The player may spend <strong>15 freebie points</strong> to purchase additional dots.</p>` }
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
            <div id="wt-body" class="p-5 overflow-y-auto text-gray-300 text-sm leading-relaxed flex-1 font-serif"></div>
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
    const phase = window.state.currentPhase || 1;
    const data = GUIDE_TEXT[phase] || GUIDE_TEXT[1];
    titleEl.innerText = data.title;
    bodyEl.innerHTML = data.body;
}

window.toggleWalkthrough = function() {
    createWalkthroughModal(); 
    const modal = document.getElementById('walkthrough-modal');
    if (modal.classList.contains('hidden')) {
        renderWalkthroughModalContent();
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    createWalkthroughButton();
});
