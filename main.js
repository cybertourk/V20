// cybertourk/v20/V20-5147783a6c880fca5723408a9242fe67e1fd0b0f/main.js
import { 
    APP_VERSION, CLANS, ARCHETYPES, CLAN_WEAKNESSES, CLAN_DISCIPLINES,
    ATTRIBUTES, ABILITIES, BACKGROUNDS, DISCIPLINES, VIRTUES,
    STEPS_CONFIG, GEN_LIMITS, HEALTH_STATES, SPECIALTY_EXAMPLES
} from "./data.js";

import { 
    checkStepComplete, calculateTotalFreebiesSpent, getPool, checkCreationComplete 
} from "./v20-rules.js";

import { 
    renderSheet, updateLedger, initializeUI, toggleSidebarLedger, 
    clearPool, rollPool, togglePlayMode, nextStep 
} from "./ui-renderer.js";

// --- STATE MANAGEMENT ---
export const currentUser = {
    meta: {
        version: APP_VERSION,
        created: new Date().toISOString(),
        step: 1
    },
    textFields: {
        "c-name": "", "c-player": "", "c-chronicle": "",
        "c-nature": "", "c-demeanor": "", "c-concept": "",
        "c-clan": "", "c-gen": "13", "c-sire": "",
        "c-clan-weakness": ""
    },
    dots: {
        attr: {
            "Strength": 1, "Dexterity": 1, "Stamina": 1,
            "Charisma": 1, "Manipulation": 1, "Appearance": 1,
            "Perception": 1, "Intelligence": 1, "Wits": 1
        },
        abil: {},
        disc: {},
        back: {},
        virt: {
            "Conscience": 1, "Self-Control": 1, "Courage": 1
        }
    },
    prios: {
        attr: { Physical: 0, Social: 0, Mental: 0 },
        abil: { Talents: 0, Skills: 0, Knowledges: 0 }
    },
    status: {
        humanity: null,
        willpower: null,
        blood: 10,
        health: 0
    },
    merits: [],
    flaws: [],
    inventory: [],
    customAbilityCategories: {} // To track which custom ability belongs to which cat
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    initializeUI(currentUser);
    setupEventListeners();
    
    // Expose window functions for HTML onclick attributes
    window.toggleSidebarLedger = () => toggleSidebarLedger();
    window.clearPool = () => clearPool();
    window.rollPool = () => rollPool(currentUser);
    window.togglePlayMode = () => togglePlayMode(currentUser);
    window.nextStep = () => {
        if (currentUser.meta.step < 8) {
            currentUser.meta.step++;
            renderSheet(currentUser);
        }
    };

    // Initial Render
    renderSheet(currentUser);
});

// --- EVENT LISTENERS ---
function setupEventListeners() {
    
    // 1. Text Fields
    const textInputs = document.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
    textInputs.forEach(input => {
        // Skip specific UI controls
        if (input.id === 'roll-diff' || input.id === 'c-freebie-total') return;

        input.addEventListener('change', (e) => {
            const id = e.target.id;
            
            // Handle Clan Logic Specially
            if (id === "c-clan") {
                const clan = e.target.value;
                currentUser.textFields[id] = clan;
                
                // Auto-fill Weakness
                const weakText = CLAN_WEAKNESSES[clan] || "";
                currentUser.textFields['c-clan-weakness'] = weakText;
                const weakInput = document.getElementById('c-clan-weakness');
                if (weakInput) weakInput.value = weakText;

                // Auto-fill Disciplines (The Fix)
                if (CLAN_DISCIPLINES[clan]) {
                    // Reset Disciplines logic
                    currentUser.dots.disc = {};
                    CLAN_DISCIPLINES[clan].forEach(d => {
                        currentUser.dots.disc[d] = 0; // Add key with 0 dots to populate list
                    });
                }
                
                renderSheet(currentUser);
                return;
            }

            // Handle Standard Text Fields
            if (currentUser.textFields.hasOwnProperty(id)) {
                currentUser.textFields[id] = e.target.value;
            }
            
            renderSheet(currentUser);
        });
    });

    // 2. Priority Buttons
    const prioBtns = document.querySelectorAll('.prio-btn');
    prioBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cat = e.target.dataset.cat; // 'attr' or 'abil'
            const group = e.target.dataset.group; // 'Physical', 'Talents', etc.
            const val = parseInt(e.target.dataset.v);

            // Logic to ensure unique priorities (7/5/3 or 13/9/5)
            // Reset others that have this value
            Object.keys(currentUser.prios[cat]).forEach(g => {
                if (currentUser.prios[cat][g] === val) currentUser.prios[cat][g] = 0;
            });
            currentUser.prios[cat][group] = val;
            
            renderSheet(currentUser);
        });
    });

    // 3. Save / Load / New
    document.getElementById('cmd-save').addEventListener('click', () => {
        document.getElementById('save-modal').classList.add('active');
    });
    
    document.getElementById('confirm-save-btn').addEventListener('click', () => {
        const name = document.getElementById('save-name-input').value;
        if(name) {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentUser));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", name + ".json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            document.getElementById('save-modal').classList.remove('active');
        }
    });

    document.getElementById('cmd-load').addEventListener('click', () => {
        document.getElementById('import-input').click();
    });

    document.getElementById('import-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                // Merge data into currentUser
                Object.assign(currentUser, data);
                renderSheet(currentUser);
            } catch (err) {
                alert("Invalid JSON file");
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('cmd-new').addEventListener('click', () => {
        if(confirm("Clear current character?")) {
            location.reload();
        }
    });

    // 4. Freebie Toggle
    const freebieBtn = document.getElementById('toggle-freebie-btn');
    if (freebieBtn) {
        freebieBtn.addEventListener('click', () => {
            document.body.classList.toggle('freebie-mode');
            renderSheet(currentUser);
        });
    }
}
