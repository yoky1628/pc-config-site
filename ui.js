class ConfigGenerator {
    constructor() {
        this.components = [];
        this.selectedComponents = {};
        this.inputTimeout = null;
        this.currentDropdown = null;
        this.currentDropdownItems = [];
        this.currentSelectedIndex = -1;
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
                        <td>
                            <span class="type-text">${type}</span>
                            <button class="clear-row-btn" data-type="${type}" title="清除整行">×</button>
                        </td>
                        <td>
                            <input type="text" class="other-name-input" 
                                   data-type="${type}" placeholder="请输入${type}名称">
                        </td>
                        <td>
                            <div class="quantity-container">
                                <button class="quantity-btn minus-btn" data-type="${type}">-</button>
                                <input type="text" class="quantity-input" data-type="${type}" 
                                       value="" placeholder="0" style="display: none;"
                                       oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                                <button class="quantity-btn plus-btn" data-type="${type}">+</button>
                            </div>
                        </td>
                        <td>
                            <input type="text" class="cost-input" data-type="${type}" 
                                   placeholder="成本价" value="0"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        </td>
                        <td>
                            <input type="text" class="price-input" data-type="${type}" 
                                   placeholder="销售价" value="0"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        </td>
                        <td class="subtotal" data-type="${type}">-</td>
                        <td class="profit" data-type="${type}">-</td>
                    </tr>
                `;
            } else {
                return `
                    <tr data-type="${type}">
                        <td>
                            <span class="type-text">${type}</span>
                            <button class="clear-row-btn" data-type="${type}" title="清除整行">×</button>
                        </td>
                        <td>
                            <div class="search-container">
                                <input type="text" class="search-input" placeholder="搜索或选择配件" 
                                       data-type="${type}" autocomplete="off">
                                <div class="dropdown" style="display: none;"></div>
                            </div>
                        </td>
                        <td>
                            <div class="quantity-container">
                                <button class="quantity-btn minus-btn" data-type="${type}">-</button>
                                <input type="text" class="quantity-input" data-type="${type}" 
                                       value="1" placeholder="1"
                                       oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                                <button class="quantity-btn plus-btn" data-type="${type}">+</button>
                            </div>
                        </td>
                        <td>
                            <input type="text" class="cost-input" data-type="${type}" 
                                   placeholder="成本价" style="display: none;"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        </td>
                        <td>
                            <input type="text" class="price-input" data-type="${type}" 
                                   placeholder="销售价" style="display: none;"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        </td>
                        <td class="subtotal" data-type="${type}">-</td>
                        <td class="profit" data-type="${type}">-</td>
                    </tr>
                `;
            }
        }).join('');
    }

    // 清除整行数据的方法
    clearRowData(type) {
        const row = document.querySelector(`tr[data-type="${type}"]`);

        if (!row) return;

        if (type === '其它1' || type === '其它2') {
            // 处理其它类型的行
            const nameInput = row.querySelector('.other-name-input');
            const quantityInput = row.querySelector('.quantity-input');
            const costInput = row.querySelector('.cost-input');
            const priceInput = row.querySelector('.price-input');

            nameInput.value = '';
            quantityInput.value = '1';
            costInput.value = '0';
            priceInput.value = '0';
        } else {
            // 处理普通配件行
            const searchInput = row.querySelector('.search-input');
            const quantityInput = row.querySelector('.quantity-input');
            const costInput = row.querySelector('.cost-input');
            const priceInput = row.querySelector('.price-input');

            searchInput.value = '';
            quantityInput.style.display = 'none';
            quantityInput.value = '';
            costInput.style.display = 'none';
            costInput.value = '';
            priceInput.style.display = 'none';
            priceInput.value = '';
        }

        // 重置显示数据
        const subtotalCell = row.querySelector('.subtotal');
        const profitCell = row.querySelector('.profit');
        subtotalCell.textContent = '-';
        profitCell.textContent = '-';

        // 从选中组件中移除
        delete this.selectedComponents[type];

        // 更新总计
        this.updateTotals();
    }

    bindEvents() {
        // 搜索功能事件
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('search-input')) {
                this.handleSearch(e.target);
            }
        });

        document.addEventListener('click', (e) => {
            // 新增：加减按钮事件
            if (e.target.classList.contains('quantity-btn')) {
                const type = e.target.dataset.type;
                const isPlus = e.target.classList.contains('plus-btn');
                this.adjustQuantity(type, isPlus);
            }

            if (e.target.classList.contains('clear-row-btn')) {
                const type = e.target.dataset.type;
                this.clearRowData(type);
            }
            if (e.target.classList.contains('search-input')) {
                if (e.target.value === '') {
                    this.showAllOptions(e.target);
                }
            }
            if (e.target.classList.contains('dropdown-item')) {
                this.selectComponent(e.target);
            }

            // 新增：点击页面其他区域时隐藏下拉框
            this.handleOutsideClick(e);
        });

        // 修复：添加普通配件的输入事件处理
        document.addEventListener('input', (e) => {
            const type = e.target.dataset.type;

            // 处理普通配件的数量、价格、成本输入
            if (type && type !== '其它1' && type !== '其它2') {
                if (e.target.classList.contains('quantity-input') ||
                    e.target.classList.contains('price-input') ||
                    e.target.classList.contains('cost-input')) {

                    this.handleRegularInput(type);
                }
            }

            // 处理其它类型的输入
            if ((type === '其它1' || type === '其它2') &&
                (e.target.classList.contains('other-name-input') ||
                    e.target.classList.contains('quantity-input') ||
                    e.target.classList.contains('price-input') ||
                    e.target.classList.contains('cost-input'))) {

                this.handleOtherInputImmediate(type);
            }

            // 搜索输入保持原有逻辑
            if (e.target.classList.contains('search-input')) {
                clearTimeout(this.inputTimeout);
                this.inputTimeout = setTimeout(() => {
                    this.handleSearch(e.target);
                }, 300);
            }
        });

        // 键盘事件
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
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

    // 新增方法：处理外部点击事件
    handleOutsideClick(e) {
        // 如果点击的不是搜索输入框或下拉框项目，则隐藏所有下拉框
        if (!e.target.classList.contains('search-input') &&
            !e.target.classList.contains('dropdown-item') &&
            !e.target.closest('.dropdown')) {

            this.hideAllDropdowns();
        }
    }


    // 新增方法：隐藏所有下拉框
    hideAllDropdowns() {
        const allDropdowns = document.querySelectorAll('.dropdown');
        allDropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });

        // 重置当前下拉框状态
        this.currentDropdown = null;
        this.currentDropdownItems = [];
        this.currentSelectedIndex = -1;
    }

    // 处理普通配件的输入
    handleRegularInput(type) {
        const component = this.selectedComponents[type];
        if (!component) return;

        const row = document.querySelector(`tr[data-type="${type}"]`);
        const quantityInput = row.querySelector('.quantity-input');
        const priceInput = row.querySelector('.price-input');
        const costInput = row.querySelector('.cost-input');

        // 获取输入值
        const quantity = parseInt(quantityInput.value) || 0;
        const price = parseInt(priceInput.value) || 0;
        const cost = parseInt(costInput.value) || 0;

        // 更新组件数据
        if (quantity > 0) {
            component.quantity = quantity;
        }
        if (price > 0) {
            component.price = price;
        }
        if (cost >= 0) {
            component.cost = cost;
            component.manualCost = true;
        }

        // 如果满足计算条件，更新显示
        if (component.quantity > 0 && component.price > 0) {
            this.updateRegularRow(type);
        } else if (quantity === 0) {
            this.clearSelection(type);
        }
    }

    // 专门处理其它类型输入的立即响应方法
    handleOtherInputImmediate(type) {
        const row = document.querySelector(`tr[data-type="${type}"]`);
        if (!row) return;

        const nameInput = row.querySelector('.other-name-input');
        const quantityInput = row.querySelector('.quantity-input');
        const priceInput = row.querySelector('.price-input');
        const costInput = row.querySelector('.cost-input');

        const name = nameInput.value.trim();
        const quantity = parseInt(quantityInput.value) || 0;
        const price = parseInt(priceInput.value) || 0;
        const cost = parseInt(costInput.value) || 0;

        // 只要有名称、数量和价格就计算
        if (name && quantity > 0 && price > 0) {
            this.selectedComponents[type] = {
                name,
                price,
                cost: cost || 0,
                quantity,
                isCustom: true,
                manualCost: cost > 0
            };

            this.updateOtherRowDisplay(type);
        } else {
            delete this.selectedComponents[type];
            this.updateOtherRowDisplay(type);
        }
    }

    // 更新普通配件行的显示
    updateRegularRow(type) {
        const component = this.selectedComponents[type];
        if (!component) return;

        const subtotal = component.price * component.quantity;
        const profit = (component.price - component.cost) * component.quantity;

        const row = document.querySelector(`tr[data-type="${type}"]`);
        row.querySelector('.subtotal').textContent = `¥${subtotal}`;
        row.querySelector('.profit').textContent = `¥${profit}`;

        this.updateTotals();
    }

    // 更新其它类型行的显示
    updateOtherRowDisplay(type) {
        const component = this.selectedComponents[type];
        const row = document.querySelector(`tr[data-type="${type}"]`);

        if (component && component.quantity > 0 && component.price > 0) {
            const subtotal = component.price * component.quantity;
            const profit = (component.price - component.cost) * component.quantity;

            row.querySelector('.subtotal').textContent = `¥${subtotal}`;
            row.querySelector('.profit').textContent = `¥${profit}`;
        } else {
            row.querySelector('.subtotal').textContent = '-';
            row.querySelector('.profit').textContent = '-';
        }

        this.updateTotals();
    }

    // 更新总计
    updateTotals() {
        let totalPrice = 0;
        let totalProfit = 0;

        Object.values(this.selectedComponents).forEach(component => {
            if (component.quantity > 0 && component.price > 0) {
                totalPrice += component.price * component.quantity;
                totalProfit += (component.price - component.cost) * component.quantity;
            }
        });

        document.getElementById('totalPrice').textContent = totalPrice;
        document.getElementById('totalProfit').textContent = totalProfit;
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

        // 新增：先隐藏所有其他下拉框
        this.hideAllDropdowns();

        if (components.length === 0) {
            dropdown.style.display = 'none';
            this.currentDropdown = null;
            this.currentDropdownItems = [];
            this.currentSelectedIndex = -1;
            return;
        }

        dropdown.innerHTML = components.map(component => `
            <div class="dropdown-item" data-name="${component.name}" data-type="${component.type}"
                 data-price="${component.price}">
                ${component.name} (¥${component.price})
            </div>
        `).join('');

        dropdown.style.display = 'block';
        this.currentDropdown = dropdown;
        this.currentDropdownItems = Array.from(dropdown.querySelectorAll('.dropdown-item'));
        this.currentSelectedIndex = -1;
    }

    selectComponent(item) {
        const name = item.dataset.name;
        const type = item.dataset.type;
        const price = parseInt(item.dataset.price);

        // 新增：从组件数据中查找真实的成本价
        const componentData = this.components.find(c => c.name === name && c.type === type);
        const actualCost = componentData ? componentData.cost : Math.round(price * 0.8); // 备用方案

        item.closest('.dropdown').style.display = 'none';
        this.currentDropdown = null;
        this.currentDropdownItems = [];
        this.currentSelectedIndex = -1;

        const input = item.closest('.search-container').querySelector('.search-input');
        input.value = name;

        const quantityInput = document.querySelector(`.quantity-input[data-type="${type}"]`);
        const costInput = document.querySelector(`.cost-input[data-type="${type}"]`);
        const priceInput = document.querySelector(`.price-input[data-type="${type}"]`);

        quantityInput.style.display = 'block';
        quantityInput.value = '1';

        costInput.style.display = 'block';
        costInput.value = actualCost;  // 修改这里：使用真实成本价

        priceInput.style.display = 'block';
        priceInput.value = price;

        this.selectedComponents[type] = {
            name,
            price,
            cost: actualCost,  // 修改这里：使用真实成本价
            quantity: 1,
            isCustom: false,
            manualCost: false
        };

        this.updateRegularRow(type);
    }

    handleKeyboard(e) {
        if (!this.currentDropdown || this.currentDropdown.style.display === 'none') {
            return;
        }

        const items = this.currentDropdownItems;
        if (items.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.currentSelectedIndex = (this.currentSelectedIndex + 1) % items.length;
                this.selectDropdownItem(items, this.currentSelectedIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.currentSelectedIndex = (this.currentSelectedIndex - 1 + items.length) % items.length;
                this.selectDropdownItem(items, this.currentSelectedIndex);
                break;
            case 'Enter':
                e.preventDefault();
                if (this.currentSelectedIndex >= 0 && items[this.currentSelectedIndex]) {
                    items[this.currentSelectedIndex].click();
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.currentDropdown.style.display = 'none';
                this.currentDropdown = null;
                this.currentDropdownItems = [];
                this.currentSelectedIndex = -1;
                break;
        }
    }

    selectDropdownItem(items, index) {
        items.forEach(item => item.classList.remove('selected'));
        if (items[index]) {
            items[index].classList.add('selected');
            items[index].scrollIntoView({block: 'nearest'});
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
                    {type: 'CPU', name: 'Intel i5-13400F'},
                    {type: '主板', name: '华硕 B760M-P'},
                    {type: '内存', name: '金士顿 16GB DDR5 5200'}
                ]
            },
            {
                name: '游戏配置',
                description: '主流游戏配置',
                components: [
                    {type: 'CPU', name: 'Intel i7-13700K'},
                    {type: '主板', name: '华硕 B760M-P'},
                    {type: '内存', name: '金士顿 16GB DDR5 5200'},
                    {type: '显卡', name: '技嘉 RTX 4060 8G'}
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
                        cost: Math.round(component.price * 0.8),
                        quantity: 1,
                        isCustom: false,
                        manualCost: false
                    };

                    input.value = component.name;
                    const quantityInput = document.querySelector(`.quantity-input[data-type="${item.type}"]`);
                    const costInput = document.querySelector(`.cost-input[data-type="${item.type}"]`);
                    const priceInput = document.querySelector(`.price-input[data-type="${item.type}"]`);

                    quantityInput.style.display = 'block';
                    quantityInput.value = '1';

                    costInput.style.display = 'block';
                    costInput.value = component.cost;  // 改为使用真实成本价，而不是Math.round(component.price * 0.8)

                    priceInput.style.display = 'block';
                    priceInput.value = component.price;

                    this.updateRegularRow(item.type);
                }
            }
        });
    }

    clearSelection(type) {
        if (type === '其它1' || type === '其它2') {
            const row = document.querySelector(`tr[data-type="${type}"]`);
            row.querySelector('.other-name-input').value = '';
            row.querySelector('.quantity-input').value = '1';
            row.querySelector('.cost-input').value = '0';
            row.querySelector('.price-input').value = '0';
            row.querySelector('.subtotal').textContent = '-';
            row.querySelector('.profit').textContent = '-';
        } else {
            const row = document.querySelector(`tr[data-type="${type}"]`);
            const input = row.querySelector('.search-input');
            input.value = '';

            const quantityInput = row.querySelector('.quantity-input');
            const costInput = row.querySelector('.cost-input');
            const priceInput = row.querySelector('.price-input');

            quantityInput.style.display = 'none';
            quantityInput.value = '';

            costInput.style.display = 'none';
            costInput.value = '';

            priceInput.style.display = 'none';
            priceInput.value = '';

            row.querySelector('.subtotal').textContent = '-';
            row.querySelector('.profit').textContent = '-';
        }

        delete this.selectedComponents[type];
        this.updateTotals();
    }

    // 添加调整数量的方法
    adjustQuantity(type, isPlus) {
        const row = document.querySelector(`tr[data-type="${type}"]`);
        const quantityInput = row.querySelector('.quantity-input');

        let quantity = parseInt(quantityInput.value) || 0;

        if (isPlus) {
            quantity++;
        } else {
            quantity = Math.max(0, quantity - 1); // 数量不能小于0
        }

        quantityInput.value = quantity;

        // 触发输入事件来更新价格计算
        if (type === '其它1' || type === '其它2') {
            this.handleOtherInputImmediate(type);
        } else {
            // 对于普通配件，只有当已经选择了配件时才更新
            if (this.selectedComponents[type]) {
                this.selectedComponents[type].quantity = quantity;
                if (quantity > 0) {
                    this.updateRegularRow(type);
                } else {
                    this.clearSelection(type);
                }
            } else if (quantity > 0) {
                // 如果还没有选择配件但设置了数量，显示输入框
                const costInput = row.querySelector('.cost-input');
                const priceInput = row.querySelector('.price-input');
                costInput.style.display = 'block';
                priceInput.style.display = 'block';
            }
        }
    }

    async copyConfigToClipboard() {
        const lines = [];
        let totalAmount = 0;

        // 定义配件类型的显示顺序
        const typeOrder = ['CPU', '散热器', '主板', '内存', '硬盘', '显卡', '电源', '机箱', '显示器', '键鼠套装', '其它1', '其它2'];

        // 按照指定顺序处理配件
        typeOrder.forEach(type => {
            const component = this.selectedComponents[type];
            if (component && component.quantity > 0 && component.price > 0) {
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

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ConfigGenerator();
});
