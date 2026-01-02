import AttributeRenderer from './ui-attributes.js';
import AbilityRenderer from './ui-abilities.js';
import AdvantagesRenderer from './ui-advantages.js';
import MechanicsRenderer from './ui-mechanics.js';
import MeritsRenderer from './ui-merits.js';

export default class UIRenderer {
    constructor(app, rules) {
        this.app = app; // Reference to MainApp instance
        this.rules = rules;

        this.attributeRenderer = new AttributeRenderer(this);
        this.abilityRenderer = new AbilityRenderer(this);
        this.advantagesRenderer = new AdvantagesRenderer(this);
        this.mechanicsRenderer = new MechanicsRenderer(this);
        this.meritsRenderer = new MeritsRenderer(this);
    }

    render(characterData) {
        if (!characterData) return;

        this.renderProfile(characterData);
        this.renderClanWeakness(characterData);

        this.attributeRenderer.render(characterData);
        this.abilityRenderer.render(characterData);
        this.advantagesRenderer.render(characterData);
        this.mechanicsRenderer.render(characterData);
        this.meritsRenderer.render(characterData);
    }

    renderProfile(characterData) {
        // Map data keys to HTML IDs for Text Inputs
        const fieldMap = {
            'name': 'c-name',
            'player': 'c-player',
            'chronicle': 'c-chronicle',
            'concept': 'c-concept',
            'generation': 'c-gen',
            'sire': 'c-sire'
        };

        for (const [key, id] of Object.entries(fieldMap)) {
            const input = document.getElementById(id);
            if (input) {
                input.value = characterData[key] || '';
                input.onchange = (e) => this.updateProfile(key, e.target.value);
            }
        }

        // Selects (Nature, Demeanor, Clan)
        // Checks if rules exist before trying to access properties
        if (this.rules) {
            this.renderSelect('c-nature', this.rules.archetypes, characterData.nature, 'nature');
            this.renderSelect('c-demeanor', this.rules.archetypes, characterData.demeanor, 'demeanor');
            this.renderSelect('c-clan', this.rules.clans, characterData.clan, 'clan');
        }

        // Play Mode Header Summary
        const playHeader = document.getElementById('play-concept-row');
        if (playHeader) {
            playHeader.innerHTML = `
                <div>${characterData.name || 'Unknown'}</div>
                <div>${characterData.clan || 'Caitiff'}</div>
                <div>${characterData.nature || ''}</div>
                <div>${characterData.player || ''}</div>
                <div>Gen: ${characterData.generation || 13}</div>
                <div>${characterData.demeanor || ''}</div>
            `;
        }
    }

    renderSelect(elementId, optionsList, currentValue, dataKey) {
        const select = document.getElementById(elementId);
        if (!select) return;

        // Populate if empty (assuming 'Select' placeholder or empty)
        if (select.options.length <= 1 && optionsList) {
             select.innerHTML = '<option value="">-- Select --</option>';
             optionsList.sort().forEach(opt => {
                 const option = document.createElement('option');
                 option.value = opt;
                 option.textContent = opt;
                 select.appendChild(option);
             });
        }

        select.value = currentValue || '';
        select.onchange = (e) => this.updateProfile(dataKey, e.target.value);
    }

    renderClanWeakness(characterData) {
        const weaknessText = document.getElementById('c-clan-weakness');
        const playWeakness = document.getElementById('weakness-play-container');
        
        const clan = characterData.clan;
        let text = "Select a clan to see weakness.";
        
        // Retrieve weakness from rules if available
        if (clan && this.rules && this.rules.clanWeaknesses && this.rules.clanWeaknesses[clan]) {
            text = this.rules.clanWeaknesses[clan];
        }

        if (weaknessText) weaknessText.value = text;
        
        if (playWeakness) {
            playWeakness.innerHTML = `
                <div class="section-title">Weakness: ${clan || 'None'}</div>
                <div class="text-xs text-gray-300 mt-2 p-2 border border-[#333] bg-black/40 rounded italic">
                    ${text}
                </div>
            `;
        }
    }

    // --- Delegation Methods (API for sub-renderers) ---

    updateProfile(field, value) {
        this.app.updateCharacterData(field, value);
    }

    updateStat(category, statName, value) {
        this.app.updateCharacterStat(category, statName, value);
    }

    updateArrayItem(arrayName, index, key, value) {
        this.app.updateArrayData(arrayName, index, key, value);
    }

    removeArrayItem(arrayName, index) {
        this.app.removeArrayData(arrayName, index);
    }

    addArrayItem(arrayName, newItem) {
        this.app.addArrayData(arrayName, newItem);
    }

    rollDice(statName, statValue) {
        if (this.app.handleRoll) {
            this.app.handleRoll(statName, statValue);
        } else {
            console.warn('Roll handler not found in MainApp');
        }
    }
}
