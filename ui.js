class ConfigGenerator {
    constructor() {
        this.components = [];
        this.selectedComponents = {};
        this.inputTimeout = null;
        this.init();
    }

    async init() {
        this.setCurrentDate();
        await this.loadData();
        this.renderTable();
        this.bindEvents();
    }

    setCurrentDate() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        document.getElementById('currentDate').textContent = dateStr;
    }

    async loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error('数据加载失败');
            this.components = await response.json();
        } catch (error) {
            console.error('加载数据失败:', error);
            this.components = [];
        }
    }

    renderTable() {
        const tbody = document.getElementById('tableBody');
        const types = ['CPU', '散热器', '主板', '内存', '硬盘', '显卡', '电源', '机箱', '显示器', '键鼠套装', '其它1', '其它2'];
        
        tbody.innerHTML = types.map(type => {
            if (type === '其它1' || type === '其它2') {
                return `
                    <tr data-type="${type}">
                        <td>${type}</td>
                        <td>
                            <input type="text" class="other-name-input" 
                                   data-type="${type}" placeholder="请输入${type}名称">
                        </td>
                        <td>
                            <input type="text" class="quantity-input" data-type="${type}" 
                                   value="1" placeholder="1"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        </td>
                        <td>
                            <input type="text" class="cost-input" data-type="${type}" 
                                   placeholder="成本价"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        </td>
                        <td>
                            <input type="text" class="price-input" data-type="${type}" 
                                   placeholder="销售价"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        </td>
                        <td class="subtotal" data-type="${type}">-</td>
                        <td class="profit" data-type="${type}">-</td>
                    </tr>
                `;
            } else {
                return `
                    <tr data-type="${type}">
                        <td>${type}</td>
                        <td>
                            <div class="search-container">
                                <input type="text" class="search-input" placeholder="搜索或选择配件" 
                                       data-type="${type}" autocomplete="off">
                                <div class="dropdown" style="display: none;"></div>
                            </div>
                        </td>
                        <td>
                            <input type="text" class="quantity-input" data-type="${type}" 
                                   value="" placeholder="0" style="display: none;"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        </td>
                        <td class="cost" data-type="${type}">-</td>
                        <td class="price" data-type="${type}">-</td>
                        <td class="subtotal" data-type="${type}">-</td>
                        <td class="profit" data-type="${type}">-</td>
                    </tr>
                `;
            }
        }).join('');
    }

    bindEvents() {
        // 搜索功能事件
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('search-input')) {
                this.handleSearch(e.target);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('search-input')) {
                if (e.target.value === '') {
                    this.showAllOptions(e.target);
                }
            }
            if (e.target.classList.contains('dropdown-item')) {
                this.selectComponent(e.target);
            }
        });

        // 其它类型输入事件 - 使用延迟处理
        document.addEventListener('input', (e) => {
            const type = e.target.dataset.type;
            
            if (e.target.classList.contains('other-name-input') || 
                e.target.classList.contains('quantity-input') ||
                e.target.classList.contains('price-input') ||
                e.target.classList.contains('cost-input')) {
                
                // 延迟处理输入，让用户有时间完成输入
                clearTimeout(this.inputTimeout);
                this.inputTimeout = setTimeout(() => {
                    this.processOtherInput(type);
                }, 800);
            }
        });

        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('search-input')) {
                this.handleKeyboard(e);
            }
        });

        // 按钮事件
        document.getElementById('copyConfig').addEventListener('click', () => {
            this.copyConfigToClipboard();
        });

        document.getElementById('loadPreset').addEventListener('click', () => {
            this.showPresetModal();
        });

        // 模态框事件
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('presetModal').style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('presetModal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    processOtherInput(type) {
        const row = document.querySelector(`tr[data-type="${type}"]`);
        const nameInput = row.querySelector('.other-name-input');
        const quantityInput = row.querySelector('.quantity-input');
        const priceInput = row.querySelector('.price-input');
        const costInput = row.querySelector('.cost-input');
        
        const name = nameInput.value.trim();
        const quantity = parseInt(quantityInput.value) || 0;
        const price = parseInt(priceInput.value) || 0;
        const cost = parseInt(costInput.value) || 0;

        if (name && quantity > 0 && price > 0) {
            this.selectedComponents[type] = {
                name,
                price,
                cost,
                quantity,
                isCustom: true
            };
            
            this.updateOtherRowDisplay(type);
        } else {
            delete this.selectedComponents[type];
            this.updateOtherRowDisplay(type);
        }
        
        this.updateTotals();
    }

    updateOtherRowDisplay(type) {
        const component = this.selectedComponents[type];
        const row = document.querySelector(`tr[data-type="${type}"]`);
        
        if (component) {
            const subtotal = component.price * component.quantity;
            const profit = (component.price - component.cost) * component.quantity;
            
            row.querySelector('.subtotal').textContent = `¥${subtotal}`;
            row.querySelector('.profit').textContent = `¥${profit}`;
        } else {
            row.querySelector('.subtotal').textContent = '-';
            row.querySelector('.profit').textContent = '-';
        }
    }

    handleSearch(input) {
        const query = input.value.trim();
        const type = input.dataset.type;
        
        if (query === '') {
            this.showAllOptions(input);
            return;
        }

        const results = this.searchComponents(query, type);
        this.showDropdown(input, results);
    }

    searchComponents(query, type) {
        const lowerQuery = query.toLowerCase();
        return this.components.filter(component => {
            if (component.type !== type) return false;
            return component.name.toLowerCase().includes(lowerQuery);
        });
    }

    showAllOptions(input) {
        const type = input.dataset.type;
        const components = this.components.filter(c => c.type === type);
        this.showDropdown(input, components);
    }

    showDropdown(input, components) {
        const dropdown = input.nextElementSibling;
        
        if (components.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.innerHTML = components.map(component => `
            <div class="dropdown-item" data-name="${component.name}" data-type="${component.type}"
                 data-price="${component.price}">
                ${component.name} (¥${component.price})
            </div>
        `).join('');

        dropdown.style.display = 'block';
    }

    selectComponent(item) {
        const name = item.dataset.name;
        const type = item.dataset.type;
        const price = parseInt(item.dataset.price);

        item.closest('.dropdown').style.display = 'none';

        const input = item.closest('.search-container').querySelector('.search-input');
        input.value = name;

        const quantityInput = document.querySelector(`.quantity-input[data-type="${type}"]`);
        quantityInput.style.display = 'block';
        quantityInput.value = '1';

        this.selectedComponents[type] = {
            name,
            price,
            quantity: 1,
            isCustom: false
        };

        this.updateRegularRowDisplay(type);
    }

    updateRegularRowDisplay(type) {
        const component = this.selectedComponents[type];
        const estimatedCost = Math.round(component.price * 0.8);
        const subtotal = component.price * component.quantity;
        const profit = (component.price - estimatedCost) * component.quantity;
        
        const row = document.querySelector(`tr[data-type="${type}"]`);
        row.querySelector('.cost').textContent = `¥${estimatedCost}`;
        row.querySelector('.price').textContent = `¥${component.price}`;
        row.querySelector('.subtotal').textContent = `¥${subtotal}`;
        row.querySelector('.profit').textContent = `¥${profit}`;

        this.updateTotals();
    }

    updateTotals() {
        let totalPrice = 0;
        let totalProfit = 0;

        Object.values(this.selectedComponents).forEach(component => {
            if (component.quantity > 0) {
                const cost = component.isCustom ? component.cost : Math.round(component.price * 0.8);
                totalPrice += component.price * component.quantity;
                totalProfit += (component.price - cost) * component.quantity;
            }
        });

        document.getElementById('totalPrice').textContent = totalPrice;
        document.getElementById('totalProfit').textContent = totalProfit;
    }

    handleKeyboard(e) {
        const dropdown = e.target.nextElementSibling;
        const items = dropdown.querySelectorAll('.dropdown-item');
        let selectedIndex = -1;

        items.forEach((item, index) => {
            if (item.classList.contains('selected')) {
                selectedIndex = index;
            }
        });

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                this.selectDropdownItem(items, selectedIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                this.selectDropdownItem(items, selectedIndex);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    items[selectedIndex].click();
                }
                break;
            case 'Escape':
                dropdown.style.display = 'none';
                break;
        }
    }

    selectDropdownItem(items, index) {
        items.forEach(item => item.classList.remove('selected'));
        if (items[index]) {
            items[index].classList.add('selected');
            items[index].scrollIntoView({ block: 'nearest' });
        }
    }

    showPresetModal() {
        const modal = document.getElementById('presetModal');
        const presetList = document.getElementById('presetList');
        
        const presets = this.getPresetConfigs();
        presetList.innerHTML = presets.map((preset, index) => `
            <div class="preset-item" data-index="${index}">
                <h4>${preset.name}</h4>
                <p>${preset.description}</p>
            </div>
        `).join('');

        presetList.querySelectorAll('.preset-item').forEach(item => {
            item.addEventListener('click', () => {
                this.loadPresetConfig(parseInt(item.dataset.index));
                modal.style.display = 'none';
            });
        });

        modal.style.display = 'block';
    }

    getPresetConfigs() {
        return [
            {
                name: '办公配置',
                description: '适合日常办公使用',
                components: [
                    { type: 'CPU', name: 'Intel i5-13400F' },
                    { type: '主板', name: '华硕 B760M-P' },
                    { type: '内存', name: '金士顿 16GB DDR5 5200' }
                ]
            },
            {
                name: '游戏配置',
                description: '主流游戏配置',
                components: [
                    { type: 'CPU', name: 'Intel i7-13700K' },
                    { type: '主板', name: '华硕 B760M-P' },
                    { type: '内存', name: '金士顿 16GB DDR5 5200' },
                    { type: '显卡', name: '技嘉 RTX 4060 8G' }
                ]
            }
        ];
    }

    loadPresetConfig(index) {
        const presets = this.getPresetConfigs();
        const preset = presets[index];
        
        if (!preset) return;

        Object.keys(this.selectedComponents).forEach(type => {
            this.clearSelection(type);
        });

        preset.components.forEach(item => {
            const component = this.components.find(c => 
                c.type === item.type && c.name === item.name
            );
            
            if (component) {
                const input = document.querySelector(`.search-input[data-type="${item.type}"]`);
                if (input) {
                    this.selectedComponents[item.type] = {
                        name: component.name,
                        price: component.price,
                        quantity: 1,
                        isCustom: false
                    };

                    input.value = component.name;
                    const quantityInput = document.querySelector(`.quantity-input[data-type="${item.type}"]`);
                    quantityInput.style.display = 'block';
                    quantityInput.value = '1';

                    this.updateRegularRowDisplay(item.type);
                }
            }
        });
    }

    clearSelection(type) {
        if (type === '其它1' || type === '其它2') {
            const row = document.querySelector(`tr[data-type="${type}"]`);
            row.querySelector('.other-name-input').value = '';
            row.querySelector('.quantity-input').value = '1';
            row.querySelector('.cost-input').value = '';
            row.querySelector('.price-input').value = '';
            row.querySelector('.subtotal').textContent = '-';
            row.querySelector('.profit').textContent = '-';
        } else {
            const row = document.querySelector(`tr[data-type="${type}"]`);
            const input = row.querySelector('.search-input');
            input.value = '';
            
            const quantityInput = row.querySelector('.quantity-input');
            quantityInput.style.display = 'none';
            quantityInput.value = '';
            
            row.querySelector('.cost').textContent = '-';
            row.querySelector('.price').textContent = '-';
            row.querySelector('.subtotal').textContent = '-';
            row.querySelector('.profit').textContent = '-';
        }

        delete this.selectedComponents[type];
        this.updateTotals();
    }

    async copyConfigToClipboard() {
        const lines = [];
        let totalAmount = 0;

        Object.entries(this.selectedComponents).forEach(([type, component]) => {
            if (component.quantity > 0 && component.price > 0) {
                const subtotal = component.price * component.quantity;
                totalAmount += subtotal;
                
                let displayName = component.name;
                if (component.quantity > 1) {
                    displayName += `【数量${component.quantity}】`;
                }
                
                lines.push(`${type}\t${displayName}\t${subtotal}`);
            }
        });

        if (lines.length > 0) {
            lines.push(`总价\t${totalAmount}`);
        }

        const text = lines.join('\n');

        try {
            await navigator.clipboard.writeText(text);
            alert('配置单已复制到剪贴板！');
        } catch (err) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('配置单已复制到剪贴板！');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ConfigGenerator();
});
