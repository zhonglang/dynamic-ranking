/**
 * 动态排行榜生成器
 * 支持从小到大的动态排序动画
 */
class DynamicRanking {
    constructor() {
        this.data = [];
        this.intervalDuration = 0.5; // 条形图间隔时间（秒）
        this.flyInDuration = 1000; // 条形图飞入时间（毫秒），默认1秒
        this.isAnimating = false;
        this.initElements();
        this.initEventListeners();
    }

    // 调试日志
    log(message) {
        console.log(`[DynamicRanking] ${message}`);
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        console.error(`[DynamicRanking] Error: ${message}`);
        alert(`错误: ${message}`);
    }

    /**
     * 解析输入数据
     */
    parseData() {
        const inputText = this.textInput.value.trim();
        if (!inputText) {
            this.showError('请输入数据');
            return [];
        }

        try {
            const parsed = JSON.parse(inputText);
            let items = [];

            // 处理两种格式
            if (Array.isArray(parsed)) {
                // 格式1: [{name: "xxx", value: 123}]
                items = parsed.map(item => {
                    const name = item.name || item.label || item.title || '未知';
                    const value = parseFloat(item.value || item.score || 0);
                    return { name, value };
                });
            } else if (typeof parsed === 'object' && parsed !== null) {
                // 格式2: {"name": 123}
                items = Object.entries(parsed).map(([name, value]) => ({
                    name,
                    value: parseFloat(value)
                }));
            } else {
                this.showError('数据格式不正确');
                return [];
            }

            // 过滤无效数据
            items = items.filter(item => !isNaN(item.value) && item.value > 0);

            if (items.length === 0) {
                this.showError('没有有效数据');
                return [];
            }

            // 按值从小到大排序（第1名是最大值）
            items.sort((a, b) => a.value - b.value);

            // 为每个项目分配随机颜色
            items.forEach((item, index) => {
                item.color = this.generateRandomColor(index);
                item.opacity = 0.5 + (index / items.length) * 0.3;
            });

            return items;
        } catch (error) {
            this.showError('JSON解析错误: ' + error.message);
            return [];
        }
    }

    /**
     * 初始化DOM元素引用
     */
    initElements() {
        this.textInput = document.getElementById('data-input');
        this.fileInput = document.getElementById('file-input');
        this.fileInfo = document.getElementById('file-info');
        this.titleInput = document.getElementById('title-input');
        this.durationInput = document.getElementById('animation-duration');
        this.runButton = document.getElementById('run-animation');
        this.rankingContent = document.getElementById('ranking-content');
        this.rankingTitle = document.getElementById('ranking-title');
    }


    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // Tab切换
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.handleTabSwitch(e));
        });

        // 文件上传
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.fileInput.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.fileInput.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.fileInput.addEventListener('drop', (e) => this.handleFileDrop(e));

        // 控制按钮
        this.runButton.addEventListener('click', () => {
            this.log('runAnimation button clicked');
            this.runAnimation();
        });

        // 间隔时间输入
        this.durationInput.addEventListener('change', () => this.updateIntervalDuration());
    }

    /**
     * 处理Tab切换
     */
    handleTabSwitch(e) {
        const tabId = e.target.dataset.tab;

        // 更新按钮状态
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        // 更新内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabId}-tab`).classList.add('active');
    }

    /**
     * 处理文件上传
     */
    handleFileUpload(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    /**
     * 处理拖拽悬停
     */
    handleDragOver(e) {
        e.preventDefault();
        e.target.parentElement.classList.add('drag-over');
    }

    /**
     * 处理拖拽离开
     */
    handleDragLeave(e) {
        e.preventDefault();
        e.target.parentElement.classList.remove('drag-over');
    }

    /**
     * 处理文件拖放
     */
    handleFileDrop(e) {
        e.preventDefault();
        e.target.parentElement.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    /**
     * 处理文件
     */
    processFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                this.textInput.value = content;
                this.fileInfo.style.display = 'block';
                this.fileInfo.innerHTML = `<span style="color: green;">✓</span> 已加载: ${file.name}`;
            } catch (error) {
                this.showError('文件读取失败: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    /**
     * 更新间隔时间
     */
    updateIntervalDuration() {
        const value = parseFloat(this.durationInput.value);
        if (value >= 0.1 && value <= 2) {
            this.intervalDuration = value;
        }
    }

    /**
     * 生成随机颜色
     */
    generateRandomColor(seed) {
        // 使用简单的伪随机数生成器，确保相同排名得到相同颜色
        const x = Math.sin(seed * 9999) * 10000;
        const random = x - Math.floor(x);

        // 使用HSL颜色空间，生成鲜艳的颜色
        const hue = Math.floor(random * 360);
        const saturation = 70 + Math.floor(random * 20); // 70-90% 饱和度
        const lightness = 50 + Math.floor(random * 15); // 50-65% 亮度

        return {
            hsl: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
            h: hue,
            s: saturation,
            l: lightness
        };
    }




    /**
     * 运行动画
     */
    async runAnimation() {
        try {
            // 解析数据
            this.data = this.parseData();
            if (this.data.length === 0) {
                return;
            }

            // 更新间隔时间
            this.updateIntervalDuration();


            // 清空排行榜容器
            this.rankingContent.innerHTML = '';

            // 设置标题
            const title = this.titleInput.value.trim() || '排行榜';
            this.rankingTitle.textContent = title;

            // 运行动画
            await this.animateRanking();

            this.log('动画运行完成');
        } catch (error) {
            console.error('运行动画错误:', error);
            this.showError('运行动画失败: ' + error.message);
        }
    }

    /**
     * 在DOM中运行动画
     */
    async animateRanking() {
        return new Promise((resolve) => {
            const maxCount = this.data.length;
            const flyInDuration = this.flyInDuration; // 条形图飞入时间（毫秒）
            const delayPerItem = this.intervalDuration * 1000; // 条形图之间的间隔时间

            // 清空容器
            this.rankingContent.innerHTML = '';

            // 设置CSS变量
            this.rankingContent.style.setProperty('--fly-in-duration', `${flyInDuration}ms`);

            // 从第12名开始逐个添加到容器（从小到大），每个新元素都加在当前最上面
            // 这样第12名先出现在底部，第11名把第12名挤下去...第1名最后在最上面
            for (let i = 0; i < maxCount; i++) {
                setTimeout(() => {
                    const item = this.data[i]; // 从最小值开始，第12名先处理
                    const actualRank = maxCount - i; // 实际排名：第12名是minCount-i

                    // 创建排行项目元素
                    const itemElement = document.createElement('div');
                    itemElement.className = 'ranking-item';

                    // 添加排名类
                    if (actualRank === 1) {
                        itemElement.classList.add('first');
                    } else if (actualRank === 2) {
                        itemElement.classList.add('second');
                    } else if (actualRank === 3) {
                        itemElement.classList.add('third');
                    }

                    // 计算百分比（相对于最大值）
                    const maxValue = this.data[maxCount - 1].value;
                    const percentage = (item.value / maxValue) * 100;

                    // 创建内容
                    itemElement.innerHTML = `
                        <div class="rank-number">${actualRank <= 3 ? ['🥇', '🥈', '🥉'][actualRank - 1] : actualRank}</div>
                        <div class="item-info">
                            <div class="item-name">${this.escapeHtml(item.name)}</div>
                            <div class="item-value">${item.value}</div>
                        </div>
                        <div class="ranking-bar" style="width: ${percentage}%"></div>
                    `;

                    // 为前三名设置特殊背景色，其他使用项目颜色
                    if (actualRank > 3) {
                        const barElement = itemElement.querySelector('.ranking-bar');
                        barElement.style.background = `linear-gradient(90deg, ${item.color.hsl}, hsla(${item.color.h}, ${item.color.s}%, ${item.color.l - 10}%, 0.8))`;
                        barElement.style.opacity = item.opacity;
                    }

                    // 用prepend添加到顶部，这样每个新元素都在最上面
                    // 第12名先加 → 在底部
                    // 第11名后加 → 在第12名上面
                    // ...
                    // 第1名最后加 → 在最上面
                    this.rankingContent.prepend(itemElement);

                    // 触发动画
                    requestAnimationFrame(() => {
                        itemElement.classList.add('show');
                    });

                    // 如果是最后一个项目（第1名），解析Promise
                    if (i === maxCount - 1) {
                        setTimeout(() => {
                            resolve();
                        }, flyInDuration + 1000);
                    }
                }, i * (flyInDuration + delayPerItem));
            }
        });
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }


}

// 创建实例
window.addEventListener('DOMContentLoaded', () => {
    window.rankingApp = new DynamicRanking();
});