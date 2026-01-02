class AttributeRenderer {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    render(characterData) {
        const container = document.getElementById('attributes-section');
        if (!container) return;
        container.innerHTML = '';

        const categories = ['physical', 'social', 'mental'];

        categories.forEach(category => {
            const colDiv = document.createElement('div');
            colDiv.className = 'attribute-column';
            
            const header = document.createElement('h3');
            header.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            colDiv.appendChild(header);

            const attrs = this.uiManager.rules.attributes[category];
            attrs.forEach(attr => {
                const attrRow = document.createElement('div');
                attrRow.className = 'stat-row';

                const label = document.createElement('span');
                label.className = 'stat-label';
                label.textContent = attr;
                
                // Clickable label for rolling
                label.style.cursor = 'pointer';
                label.onclick = () => this.uiManager.rollDice(attr, characterData.attributes[attr]);

                const dotsContainer = document.createElement('div');
                dotsContainer.className = 'dots-container';

                const currentVal = characterData.attributes[attr] || 1;
                const maxVal = 5; // V20 core limit, gen 8+

                for (let i = 1; i <= maxVal; i++) {
                    const dot = document.createElement('span');
                    dot.className = i <= currentVal ? 'dot filled' : 'dot empty';
                    dot.dataset.value = i;
                    dot.dataset.attribute = attr;
                    dot.onclick = () => this.uiManager.updateStat('attributes', attr, i);
                    dotsContainer.appendChild(dot);
                }

                attrRow.appendChild(label);
                attrRow.appendChild(dotsContainer);
                colDiv.appendChild(attrRow);
            });

            container.appendChild(colDiv);
        });
    }
}
