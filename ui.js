class ConfigGenerator {
    constructor() {
        this.components = [];
        this.selectedComponents = {};
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
            
            if (!this.components || this.components.length === 0) {
                this.components = this.getSampleData();
            }
        } catch (error) {
            console.error('加载数据失败:', error);
            this.components = this.getSampleData();
            alert('加载数据失败，使用示例数据');
        }
    }

    getSampleData() {
        return [
            { type: 'CPU', name: 'Intel i5-13400F', price: 1299 },
            { type: 'CPU', name: 'Intel i7-13700K', price: 2899 },
            { type: '主板', name: '华硕 B760M-P', price: 899 }
        ];
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
            }
        ];
    }

    renderTable() {
        const tbody = document.getElementById('tableBody');
        const types = ['CPU', '散热器', '主板', '内存', '硬盘', '显卡', '电源', '机箱', '显示器', '键鼠套装', '其它1', '其它2'];
        
        tbody.innerHTML = types.map(type => {
            // 对于"其它1"和"其它2"类型，显示输入框而不是搜索框
            if (type === '其它1' || type === '其它2') {
                return `
                    <tr data-type="${type}">
                        <td>${type}</td>
                        <td>
                            <input type="text" class="input-field other-input" 
                                   data-type="${type}" placeholder="请输入${type}名称" 
                                   style="width: 100%;">
                        </td>
                        <td>
                            <input type="number" class="input-field quantity" data-type="${type}" 
                                   min="1" value="" placeholder="0" style="display: none;">
                        </td>
                        <td class="cost" data-type="${type}">-</td>
                        <td class="price" data-type="${type}">-</td>
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
                            <input type="number" class="input-field quantity" data-type="${type}" 
                                   min="1" value="" placeholder="0" style="display: none;">
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
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('search-input')) {
                this.handleSearch(e.target);
            }
            // 添加对其它类型输入框的监听
            if (e.target.classList.contains('other-input')) {
                this.handleOtherInput(e.target);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('search-input')) {
                if (e.target.value === '') {
                    this.showAllOptions(e.target);
                }
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('quantity')) {
                this.updateCalculations(e.target.dataset.type);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('dropdown-item')) {
                this.selectComponent(e.target);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('search-input')) {
                this.handleKeyboard(e);
            }
        });

        document.getElementById('copyConfig').addEventListener('click', () => {
            this.copyConfigToClipboard();
        });

        document.getElementById('loadPreset').addEventListener('click', () => {
            this.showPresetModal();
        });

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

    // 处理其它类型的手动输入
    handleOtherInput(input) {
        const type = input.dataset.type;
        const name = input.value.trim();
        
        if (name === '') {
            // 如果输入为空，清除选择
            this.clearSelection(type);
            return;
        }

        // 显示并设置数量
        const quantityInput = document.querySelector(`.quantity[data-type="${type}"]`);
        quantityInput.style.display = 'block';
        if (!quantityInput.value) {
            quantityInput.value = '1';
        }

        // 设置默认价格（用户可以后续修改）
        const defaultPrice = 0; // 初始价格为0，需要用户手动输入

        // 保存选择
        this.selectedComponents[type] = {
            name,
            price: defaultPrice,
            quantity: parseInt(quantityInput.value) || 1,
            isCustom: true // 标记为自定义项
        };

        // 更新计算
        this.updateCalculations(type);
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
        const price = parseFloat(item.dataset.price);

        item.closest('.dropdown').style.display = 'none';

        const input = item.closest('.search-container').querySelector('.search-input');
        input.value = name;

        const quantityInput = document.querySelector(`.quantity[data-type="${type}"]`);
        quantityInput.style.display = 'block';
        quantityInput.value = '1';

        this.selectedComponents[type] = {
            name,
            price,
            quantity: 1,
            isCustom: false
        };

        this.updateCalculations(type);
    }

    updateCalculations(type) {
        const component = this.selectedComponents[type];
        if (!component) return;

        const quantityInput = document.querySelector(`.quantity[data-type="${type}"]`);
        const quantity = parseInt(quantityInput.value) || 0;
        component.quantity = quantity;

        if (quantity === 0) {
            this.clearSelection(type);
            return;
        }

        // 对于自定义项，需要手动输入价格
        if (component.isCustom && component.price === 0) {
            // 提示用户输入价格
            const priceInput = document.querySelector(`.price[data-type="${type}"]`);
            priceInput.innerHTML = `<input type="number" class="input-field price-input" data-type="${type}" placeholder="输入价格" min="0" style="width: 80px;">`;
            
            // 绑定价格输入事件
            const priceField = priceInput.querySelector('.price-input');
            priceField.addEventListener('input', (e) => {
                component.price = parseFloat(e.target.value) || 0;
                this.updateRowDisplay(type);
            });
            
            return;
        }

        this.updateRowDisplay(type);
    }

    updateRowDisplay(type) {
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

    clearSelection(type) {
        const row = document.querySelector(`tr[data-type="${type}"]`);
        
        if (type === '其它1' || type === '其它2') {
            const input = row.querySelector('.other-input');
            input.value = '';
        } else {
            const input = row.querySelector('.search-input');
            input.value = '';
        }
        
        const quantityInput = row.querySelector('.quantity');
        quantityInput.style.display = 'none';
        quantityInput.value = '';
        
        row.querySelector('.cost').textContent = '-';
        row.querySelector('.price').textContent = '-';
        row.querySelector('.subtotal').textContent = '-';
        row.querySelector('.profit').textContent = '-';

        delete this.selectedComponents[type];
        this.updateTotals();
    }

    updateTotals() {
        let totalPrice = 0;
        let totalProfit = 0;

        Object.values(this.selectedComponents).forEach(component => {
            if (component.quantity > 0 && component.price > 0) {
                const estimatedCost = Math.round(component.price * 0.8);
                totalPrice += component.price * component.quantity;
                totalProfit += (component.price - estimatedCost) * component.quantity;
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
                    const quantityInput = document.querySelector(`.quantity[data-type="${item.type}"]`);
                    quantityInput.style.display = 'block';
                    quantityInput.value = '1';

                    this.updateCalculations(item.type);
                }
            }
        });
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
