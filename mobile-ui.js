// mobile-ui.js - 独立的移动端功能
class MobileUI {
    constructor(configGenerator) {
        this.configGenerator = configGenerator;
        this.init();
    }

    init() {
        this.bindMobileEvents();
        this.checkViewport();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.checkViewport();
        });
    }

    bindMobileEvents() {
        // 移动端菜单按钮
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                this.showMobileMenu();
            });
        }
        
        // 移动端功能按钮
        const mobileLoadPreset = document.getElementById('mobileLoadPreset');
        if (mobileLoadPreset) {
            mobileLoadPreset.addEventListener('click', () => {
                this.configGenerator.showPresetModal();
                this.hideMobileMenu();
            });
        }
        
        const mobileCopyConfig = document.getElementById('mobileCopyConfig');
        if (mobileCopyConfig) {
            mobileCopyConfig.addEventListener('click', () => {
                this.configGenerator.copyConfigToClipboard();
                this.hideMobileMenu();
            });
        }
        
        const mobileToggleView = document.getElementById('mobileToggleView');
        if (mobileToggleView) {
            mobileToggleView.addEventListener('click', () => {
                this.toggleMobileView();
                this.hideMobileMenu();
            });
        }
    }

    checkViewport() {
        const isMobile = window.innerWidth <= 768;
        const controls = document.querySelector('.controls');
        const mobileControls = document.querySelector('.mobile-controls');
        const tableView = document.querySelector('.table-container');
        const cardView = document.getElementById('mobileCardView');

        if (isMobile) {
            // 移动端：显示移动控制，隐藏桌面控制
            if (controls) controls.style.display = 'none';
            if (mobileControls) mobileControls.style.display = 'block';
            
            // 默认显示卡片视图
            if (tableView) tableView.style.display = 'none';
            if (cardView) {
                cardView.style.display = 'block';
                this.renderMobileCards();
            }
        } else {
            // 桌面端：显示桌面控制，隐藏移动控制
            if (controls) controls.style.display = 'flex';
            if (mobileControls) mobileControls.style.display = 'none';
            
            // 显示表格视图
            if (tableView) tableView.style.display = 'block';
            if (cardView) cardView.style.display = 'none';
        }
    }

    showMobileMenu() {
        const modal = document.getElementById('mobileMenuModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    hideMobileMenu() {
        const modal = document.getElementById('mobileMenuModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    toggleMobileView() {
        const tableView = document.querySelector('.table-container');
        const cardView = document.getElementById('mobileCardView');
        
        if (tableView && cardView) {
            if (tableView.style.display !== 'none') {
                tableView.style.display = 'none';
                cardView.style.display = 'block';
                this.renderMobileCards();
            } else {
                tableView.style.display = 'block';
                cardView.style.display = 'none';
            }
        }
    }

    renderMobileCards() {
        const cardView = document.getElementById('mobileCardView');
        if (!cardView || !this.configGenerator) return;

        const types = ['CPU', '散热器', '主板', '内存', '硬盘', '显卡', '电源', '机箱', '显示器', '键鼠套装', '其它1', '其它2'];
        
        cardView.innerHTML = types.map(type => {
            const component = this.configGenerator.selectedComponents[type];
            
            return `
                <div class="mobile-card" data-type="${type}">
                    <div class="mobile-card-header">
                        <span class="mobile-card-type">${type}</span>
                        <div class="mobile-card-controls">
                            <button class="mobile-card-btn" onclick="mobileUI.editMobileComponent('${type}')">编辑</button>
                            <button class="mobile-card-btn" onclick="mobileUI.clearMobileSelection('${type}')">清除</button>
                        </div>
                    </div>
                    <div class="mobile-card-content">
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">配件名称</span>
                            <span class="mobile-card-value">${component ? component.name : '未选择'}</span>
                        </div>
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">数量</span>
                            <span class="mobile-card-value">${component ? component.quantity : '0'}</span>
                        </div>
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">成本价</span>
                            <span class="mobile-card-value">¥${component ? component.cost : '0'}</span>
                        </div>
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">销售价</span>
                            <span class="mobile-card-value">¥${component ? component.price : '0'}</span>
                        </div>
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">小计</span>
                            <span class="mobile-card-value">¥${component ? component.price * component.quantity : '0'}</span>
                        </div>
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">利润</span>
                            <span class="mobile-card-value">¥${component ? (component.price - component.cost) * component.quantity : '0'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    editMobileComponent(type) {
        // 切换到表格视图进行编辑
        this.toggleMobileView();
        
        // 可以添加滚动到对应行的逻辑
        const row = document.querySelector(`tr[data-type="${type}"]`);
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    clearMobileSelection(type) {
        if (this.configGenerator && this.configGenerator.clearSelection) {
            this.configGenerator.clearSelection(type);
            this.renderMobileCards(); // 重新渲染卡片
        }
    }
}

// 全局变量
let mobileUI;
