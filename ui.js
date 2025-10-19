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
            this.selectedComponents[type]
