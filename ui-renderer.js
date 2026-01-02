class UIRenderer {
    constructor(app, rules) {
        this.app = app; // Reference to main app/data manager
        this.rules = rules;

        // Initialize sub-renderers
        this.attributeRenderer = new AttributeRenderer(this);
        this.abilityRenderer = new AbilityRenderer(this);
        this.advantagesRenderer = new AdvantagesRenderer(this);
        this.mechanicsRenderer = new MechanicsRenderer(this);
        this.meritsRenderer = new MeritsRenderer(this);
    }

    render(characterData) {
        if (!characterData) return;

        // Render the main header/profile section directly
        this.renderProfile(characterData);

        // Delegate specific sections to sub-renderers
        this.attributeRenderer.render(characterData);
        this.abilityRenderer.render(characterData);
        this.advantagesRenderer.render(characterData);
        this.mechanicsRenderer.render(characterData);
        this.meritsRenderer.render(characterData);
    }

    renderProfile(characterData) {
        const fields = [
            'name', 'player', 'chronicle',
            'nature', 'demeanor', 'concept',
            'clan', 'generation', 'sire'
        ];

        fields.forEach(field => {
            const input = document.getElementById(`char-${field}`);
            if (input) {
                input.value = characterData[field] || '';
                
                // Remove old listeners to prevent duplicates if re-rendering
                const newNode = input.cloneNode(true);
                input.parentNode.replaceChild(newNode, input);
                
                newNode.onchange = (e) => {
                    this.updateProfile(field, e.target.value);
                };
            }
        });
    }

    // --- Data Update Methods called by Sub-Renderers ---

    updateProfile(field, value) {
        this.app.updateCharacterData(field, value);
    }

    updateStat(category, statName, value) {
        // Handle nested objects (attributes.physical) or flat structures depending on data layout
        // Based on sub-renderers, they pass 'attributes', 'Strength', 4
        this.app.updateCharacterStat(category, statName, value);
    }

    updateArrayItem(arrayName, index, key, value) {
        // For disciplines, backgrounds, merits
        this.app.updateArrayData(arrayName, index, key, value);
    }

    removeArrayItem(arrayName, index) {
        this.app.removeArrayData(arrayName, index);
    }

    addArrayItem(arrayName, newItem) {
        this.app.addArrayData(arrayName, newItem);
    }

    rollDice(statName, statValue) {
        // Trigger dice rolling logic in main app
        if (this.app.handleRoll) {
            this.app.handleRoll(statName, statValue);
        } else {
            console.log(`Rolling ${statName}: ${statValue} dice`);
        }
    }
}
