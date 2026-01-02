class MeritsRenderer {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    render(characterData) {
        const container = document.getElementById('merits-section');
        if (!container) return;
        container.innerHTML = '';

        const colDiv = document.createElement('div');
        colDiv.className = 'merits-column';
        
        const header = document.createElement('h3');
        header.textContent = 'Merits & Flaws';
        colDiv.appendChild(header);

        const list = document.createElement('div');
        list.className = 'merits-list';

        // Merits and Flaws are often stored in a single array or two. 
        // We will assume a 'merits' array in characterData that contains objects { name: '', value: 1, type: 'merit'|'flaw' }
        // If the data structure is different, this adapter logic handles standard array rendering.
        
        const meritsData = characterData.merits || [];

        meritsData.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'stat-row merit-row';

            // Name Input
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = item.name;
            nameInput.placeholder = 'Merit/Flaw Name';
            nameInput.className = 'stat-name-input';
            nameInput.style.flex = '2';
            nameInput.onchange = (e) => this.uiManager.updateArrayItem('merits', index, 'name', e.target.value);

            // Points Input (Number)
            const pointsInput = document.createElement('input');
            pointsInput.type = 'number';
            pointsInput.value = item.value;
            pointsInput.className = 'stat-value-input';
            pointsInput.style.width = '50px';
            pointsInput.onchange = (e) => this.uiManager.updateArrayItem('merits', index, 'value', parseInt(e.target.value));

            // Remove Button
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.className = 'remove-btn';
            removeBtn.onclick = () => this.uiManager.removeArrayItem('merits', index);

            row.appendChild(nameInput);
            row.appendChild(pointsInput);
            row.appendChild(removeBtn);
            list.appendChild(row);
        });

        // Add Button
        const addBtn = document.createElement('button');
        addBtn.textContent = '+ Add Merit/Flaw';
        addBtn.className = 'add-btn';
        addBtn.onclick = () => this.uiManager.addArrayItem('merits', { name: '', value: 1 });

        colDiv.appendChild(list);
        colDiv.appendChild(addBtn);
        container.appendChild(colDiv);
    }
}
