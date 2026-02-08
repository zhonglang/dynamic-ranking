/**
 * 动态排行榜生成器
 * 支持从小到大的动态排序动画
 */
class DynamicRanking {
    constructor() {
        // 烟花视觉参数（可由 UI 动态调整）
        this.fireworksSpeedMul = 0.8; // 碎片速度倍数（减慢）
        this.fireworksCoreRatio = 0.04; // 核心亮点占比（减少）
        this.data = [];
        this.intervalDuration = 0.5; // 条形图间隔时间（秒）
        this.flyInDuration = 1000; // 条形图飞入时间（毫秒），默认1秒
        this.animationType = 'squeeze'; // 动画类型：squeeze, fade, slide, scale, flip, elevator
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordedBlob = null;
        // Canvas 渲染相关
        this.canvas = null;
        this.ctx = null;
        this.animationItems = []; // 存储带动画状态的项目
        this.animationStartTime = 0;
        this.initElements();
        this.initEventListeners();

        // 背景图支持
        this.bgImageUrl = null; // Object URL
        this.bgImageObj = null; // HTMLImageElement
        this.bgOpacity = 1; // 0 - 1

        // 烟花状态（初始默认）
        this.fireworksEnabled = true; // 是否启用（从 UI 读取）
        this.isPreview = false; // 非录制的预览模式标志
        this.fireworksActive = false;
        this.fireworksStartTime = 0;
        this.fireworksDuration = 1500; // 毫秒，烟花持续时长（进一步缩短）
        this.lastFireworkSpawn = 0;
        this.fireworkSpawnInterval = 1500; // 每隔多少ms产生一次烟花（大幅减少频率）
        this.fireworkParticles = [];
        this.fireworksDensity = 3; // 粒子密度基数（极简）
        this.fireworkRockets = []; // 底部发射的火箭列表（每个在空中爆炸为粒子）
        this.fireworkRings = []; // 空中扩展的环形爆炸效果

        // 科技感效果参数
        this.techEnabled = true; // 是否启用科技感效果
        this.techParticles = []; // 科技感粒子系统
        this.digitalRainChars = []; // 数字雨字符
        this.gridLines = []; // 网格线
        this.energyParticles = []; // 能量粒子
        this.starParticles = []; // 星光粒子
        
        // 背景色参数
        this.backgroundColor = 'dark'; // 默认背景色主题
        this.backgroundThemes = {
            dark: { name: '深色科技', gradient: ['#1a202c', '#2d3748'] },
            blue: { name: '科技蓝', gradient: ['#0f172a', '#1e3a8a'] },
            purple: { name: '科技紫', gradient: ['#1e0f2a', '#4c1d95'] },
            green: { name: '科技绿', gradient: ['#0f1a1a', '#065f46'] },
            red: { name: '科技红', gradient: ['#1a0f0f', '#991b1b'] },
            cyber: { name: '赛博朋克', gradient: ['#0f0f1a', '#4c1d95'] },
            space: { name: '太空深蓝', gradient: ['#0a0a1a', '#1e40af'] }
        };
        
        // 初始化科技感效果
        this.initTechEffects();

        console.log('DynamicRanking initialized:', !!this);

        // 在窗口大小变化时，如果预览/播放中需要重新初始化 canvas 尺寸
        window.addEventListener('resize', () => {
            try {
                if (this.rankingContainer && this.rankingContainer.classList.contains('playing')) {
                    // small debounce
                    if (this._resizeTimeout) clearTimeout(this._resizeTimeout);
                    this._resizeTimeout = setTimeout(() => {
                        try { this.initCanvas(); } catch (e) { /* ignore */ }
                    }, 120);
                }
            } catch (e) { /* ignore */ }
        });
    }

    // 调试日志
    log(message) {
        console.log(`[DynamicRanking] ${message}`);
    }

    /**
     * 初始化科技感效果
     */
    initTechEffects() {
        if (!this.techEnabled) return;
        
        // 初始化数字雨字符
        this.initDigitalRain();
        
        // 初始化网格线
        this.initGridLines();
        
        // 初始化星光粒子
        this.initStarParticles();
    }

    /**
     * 初始化数字雨效果
     */
    initDigitalRain() {
        this.digitalRainChars = [];
        const columns = Math.floor(this.canvasWidth / 20); // 每20像素一列
        
        for (let i = 0; i < columns; i++) {
            const x = i * 20 + Math.random() * 10;
            const speed = 1 + Math.random() * 3;
            const length = 5 + Math.floor(Math.random() * 15);
            const chars = [];
            
            for (let j = 0; j < length; j++) {
                chars.push({
                    char: Math.floor(Math.random() * 10).toString(), // 0-9的数字
                    y: -j * 20 - Math.random() * 100,
                    brightness: 0.2 + (j / length) * 0.8
                });
            }
            
            this.digitalRainChars.push({ x, speed, chars });
        }
    }

    /**
     * 初始化网格线
     */
    initGridLines() {
        this.gridLines = [];
        const gridSize = 40;
        
        // 水平线
        for (let y = 0; y < this.canvasHeight; y += gridSize) {
            this.gridLines.push({
                type: 'horizontal',
                y: y,
                opacity: 0.1
            });
        }
        
        // 垂直线
        for (let x = 0; x < this.canvasWidth; x += gridSize) {
            this.gridLines.push({
                type: 'vertical',
                x: x,
                opacity: 0.1
            });
        }
    }

    /**
     * 初始化星光粒子
     */
    initStarParticles() {
        this.starParticles = [];
        const starCount = 50;
        
        for (let i = 0; i < starCount; i++) {
            this.starParticles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 0.5 + Math.random() * 2,
                brightness: 0.3 + Math.random() * 0.7,
                twinkleSpeed: 0.5 + Math.random() * 2,
                twinkleOffset: Math.random() * Math.PI * 2
            });
        }
    }

    /**
     * 切换背景色主题
     */
    changeBackgroundColor(theme) {
        if (this.backgroundThemes[theme]) {
            this.backgroundColor = theme;
            console.log(`背景色已切换为: ${this.backgroundThemes[theme].name}`);
            
            // 如果正在预览或录制，重新绘制Canvas
            if (this.isRecording || this.isPreview) {
                this.clearCanvas();
                this.drawTitle();
                // 重新绘制所有项目
                this.animationItems.forEach(item => {
                    if (item.animate) {
                        this.drawItem(item, performance.now());
                    }
                });
            }
        }
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
                    return {name, value};
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

            // 计算最大值和最小值用于透明度计算
            const maxValue = items[items.length - 1].value;
            const minValue = items[0].value;
            const valueRange = maxValue - minValue || 1;

            // 为每个项目分配随机颜色和透明度
            items.forEach((item) => {
                // 生成完全随机的颜色（每次运行都不一样）
                item.color = this.generateRandomColor();
                // 值越小透明度越高：0.5（最小值）到 1.0（最大值）
                const valueRatio = (item.value - minValue) / valueRange;
                item.opacity = 0.5 + valueRatio * 0.5;
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
        // 新增：标题颜色选择器
        this.titleColorInput = document.getElementById('title-color-input');
        // 新增：标题大小选择器
        this.titleSizeInput = document.getElementById('title-size-input');
        this.titleSizeValue = document.getElementById('title-size-value');
        this.durationInput = document.getElementById('animation-duration');
        this.animationTypeSelect = document.getElementById('animation-type');
        this.runButton = document.getElementById('run-animation');
        this.downloadButton = document.getElementById('download-video');
        this.rankingContent = document.getElementById('ranking-content');
        this.rankingTitle = document.getElementById('ranking-title');
        this.recordingStatus = document.getElementById('recording-status');
        this.rankingContainer = document.getElementById('ranking-container');
        this.canvas = document.getElementById('ranking-canvas');

        // 新增：烟花控制元素
        this.fireworksEnableInput = document.getElementById('fireworks-enable');
        this.fireworksDurationInput = document.getElementById('fireworks-duration');
        this.fireworksDensityInput = document.getElementById('fireworks-density');
        // 新增视觉参数
        this.fireworksSpeedInput = document.getElementById('fireworks-speed');
        this.fireworksCoreRatioInput = document.getElementById('fireworks-core-ratio');

        // 新增：背景图控件与 DOM 预览元素
        this.bgImageInput = document.getElementById('bg-image-input');
        this.bgOpacityInput = document.getElementById('bg-opacity');
        this.rankingBgImageEl = document.getElementById('ranking-bg-image');
        // 新增：数值显示设置
        this.showValuesInput = document.getElementById('show-values');
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
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
            this.fileInput.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.fileInput.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            this.fileInput.addEventListener('drop', (e) => this.handleFileDrop(e));
        }

        // 背景图上传处理
        if (this.bgImageInput) {
            this.bgImageInput.addEventListener('change', (e) => {
                try {
                    const file = e.target.files && e.target.files[0];
                    if (file) this.loadBackgroundImage(file);
                } catch (err) {
                    console.error('背景图选择处理失败', err);
                    this.showError('背景图选择失败: ' + (err && err.message ? err.message : err));
                }
            });
        }
        // 背景透明度监听
        if (this.bgOpacityInput) {
            this.bgOpacityInput.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) {
                    this.bgOpacity = Math.max(0, Math.min(1, v));
                    // 更新 DOM 预览透明度
                    if (this.rankingBgImageEl) {
                        this.rankingBgImageEl.style.opacity = String(this.bgOpacity);
                        // ensure visible when opacity > 0
                        this.rankingBgImageEl.style.display = this.bgImageObj ? 'block' : 'none';
                    }
                }
            });
        }

        // 标题颜色选择监听
        if (this.titleColorInput) {
            // initialize default
            this.titleColor = this.titleColorInput.value || '#ffffff';
            // apply initial color to DOM title if present
            if (this.rankingTitle) this.rankingTitle.style.color = this.titleColor;
            this.titleColorInput.addEventListener('input', (e) => {
                this.titleColor = e.target.value || '#ffffff';
                // update DOM title color immediately
                if (this.rankingTitle) this.rankingTitle.style.color = this.titleColor;
            });
        } else {
            this.titleColor = '#ffffff';
        }

        // 标题大小设置
        if (this.titleSizeInput && this.titleSizeValue) {
            this.titleSize = parseInt(this.titleSizeInput.value) || 24;
            this.titleSizeValue.textContent = this.titleSize + 'px';
            
            this.titleSizeInput.addEventListener('input', (e) => {
                this.titleSize = parseInt(e.target.value) || 24;
                this.titleSizeValue.textContent = this.titleSize + 'px';
                // 更新DOM标题大小
                if (this.rankingTitle) {
                    this.rankingTitle.style.fontSize = this.titleSize + 'px';
                }
            });
        } else {
            this.titleSize = 24;
        }

        // 数值显示设置
        if (this.showValuesInput) {
            this.showValues = this.showValuesInput.checked;
            this.showValuesInput.addEventListener('change', () => {
                this.showValues = this.showValuesInput.checked;
            });
        } else {
            this.showValues = true;
        }

        // 控制按钮
        if (this.runButton) {
            this.runButton.addEventListener('click', () => {
                try {
                    this.log('runAnimation button clicked');
                    this.runAnimation();
                } catch (err) {
                    console.error('runAnimation handler error', err);
                    alert('运行动画出错: ' + err.message);
                }
            });
        }

        // 预览按钮（不录制）
        const previewBtn = document.getElementById('preview-animation');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                try {
                    this.log('previewAnimation button clicked');
                    this.runPreview();
                } catch (err) {
                    console.error('runPreview handler error', err);
                    alert('预览动画出错: ' + err.message);
                }
            });
        }

        // 下载视频按钮
        if (this.downloadButton) {
            this.downloadButton.addEventListener('click', () => this.downloadVideo());
        }

        // 间隔时间输入
        if (this.durationInput) {
            this.durationInput.addEventListener('change', () => this.updateIntervalDuration());
        }

        // 烟花控件事件（若存在）
        if (this.fireworksEnableInput) {
            this.fireworksEnableInput.addEventListener('change', () => {
                this.fireworksEnabled = !!this.fireworksEnableInput.checked;
            });
        }
        if (this.fireworksDurationInput) {
            this.fireworksDurationInput.addEventListener('change', () => {
                const v = parseFloat(this.fireworksDurationInput.value);
                if (!isNaN(v) && v > 0) this.fireworksDuration = v * 1000;
            });
        }
        if (this.fireworksDensityInput) {
            this.fireworksDensityInput.addEventListener('change', () => {
                const v = parseInt(this.fireworksDensityInput.value);
                if (!isNaN(v) && v > 0) this.fireworksDensity = v;
            });
        }
        // 视觉参数监听
        if (this.fireworksSpeedInput) {
            this.fireworksSpeedInput.addEventListener('change', () => {
                const v = parseFloat(this.fireworksSpeedInput.value);
                if (!isNaN(v) && v > 0) this.fireworksSpeedMul = v;
            });
        }
        if (this.fireworksCoreRatioInput) {
            this.fireworksCoreRatioInput.addEventListener('change', () => {
                const v = parseFloat(this.fireworksCoreRatioInput.value);
                if (!isNaN(v) && v >= 0 && v <= 0.5) this.fireworksCoreRatio = v;
            });
        }

        // 背景色主题选择器
        this.backgroundThemeSelect = document.getElementById('background-theme');
        if (this.backgroundThemeSelect) {
            // 设置默认值
            this.backgroundThemeSelect.value = this.backgroundColor;
            
            this.backgroundThemeSelect.addEventListener('change', (e) => {
                const theme = e.target.value;
                this.changeBackgroundColor(theme);
            });
        }



        // 高级面板 折叠/展开
        this.advancedToggleBtn = document.getElementById('advanced-toggle');
        this.advancedContent = document.getElementById('advanced-content');
        if (this.advancedToggleBtn && this.advancedContent) {
            // restore state
            const saved = localStorage.getItem('dynamicRanking.advancedOpen');
            const open = saved === '1';
            this.setAdvancedOpen(open, false);

            this.advancedToggleBtn.addEventListener('click', () => {
                const isOpen = this.advancedToggleBtn.getAttribute('aria-expanded') === 'true';
                this.setAdvancedOpen(!isOpen, true);
            });
        }
    }

    setAdvancedOpen(open, animate = true) {
        if (!this.advancedToggleBtn || !this.advancedContent) return;
        this.advancedToggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        this.advancedToggleBtn.textContent = open ? '收起' : '展开';
        // animate with max-height
        if (open) {
            this.advancedContent.style.display = 'block';
            const h = this.advancedContent.scrollHeight;
            if (animate) {
                this.advancedContent.style.maxHeight = '0px';
                // trigger reflow
                // eslint-disable-next-line no-unused-expressions
                this.advancedContent.offsetHeight;
                this.advancedContent.style.transition = 'max-height 260ms ease';
            }
            this.advancedContent.style.maxHeight = h + 'px';
        } else {
            if (animate) {
                this.advancedContent.style.transition = 'max-height 260ms ease';
                this.advancedContent.style.maxHeight = this.advancedContent.scrollHeight + 'px';
                // trigger reflow
                // eslint-disable-next-line no-unused-expressions
                this.advancedContent.offsetHeight;
                this.advancedContent.style.maxHeight = '0px';
                setTimeout(() => {
                    this.advancedContent.style.display = 'none';
                }, 260);
            } else {
                this.advancedContent.style.maxHeight = '0px';
                this.advancedContent.style.display = 'none';
            }
        }
        localStorage.setItem('dynamicRanking.advancedOpen', open ? '1' : '0');
    }

    // 播放预览（不录制）
    async runPreview() {
        try {
            this.data = this.parseData();
            if (this.data.length === 0) return;

            this.isPreview = true;

            this.updateIntervalDuration();
            this.animationType = this.animationTypeSelect.value;

            // 清理并重置烟花状态，避免上次运行残留影响本次
            this.fireworksActive = false;
            this.fireworksStartTime = 0;
            this.lastFireworkSpawn = 0;
            this.fireworkParticles = [];
            this.fireworkRockets = [];
            this.fireworkRings = [];

            // 应用烟花设置
            if (this.fireworksEnableInput) this.fireworksEnabled = !!this.fireworksEnableInput.checked;
            if (this.fireworksDurationInput) {
                const v = parseFloat(this.fireworksDurationInput.value);
                if (!isNaN(v) && v > 0) this.fireworksDuration = v * 1000;
            }
            if (this.fireworksDensityInput) {
                const v = parseInt(this.fireworksDensityInput.value);
                if (!isNaN(v) && v > 0) this.fireworksDensity = v;
            }

            this.recordedBlob = null;
            this.downloadButton.disabled = true;

            // 清空 DOM 排行榜
            this.rankingContent.innerHTML = '';

            // 标题
            this.title = this.titleInput.value.trim() || '排行榜';
            this.rankingTitle.textContent = this.title;
            if (this.rankingTitle) {
                this.rankingTitle.style.color = this.titleColor;
                this.rankingTitle.style.fontSize = this.titleSize + 'px';
            }

            // 先切换为 playing 状态以确保 canvas 可见，从而正确测量尺寸
            this.rankingContainer.classList.add('playing');

            // 锁定当前容器尺寸，避免播放时被 layout 改变
            this.lockContainerSize();

            // 初始化 Canvas（现在 canvas 是可见的，getBoundingClientRect 返回正确值）
            this.initCanvas();

            // 确保 DOM 背景与透明度同步
            if (typeof this._ensureDomBackgroundVisibility === 'function') {
                this._ensureDomBackgroundVisibility();
            } else {
                if (this.rankingBgImageEl) {
                    if (this.bgImageObj && this.bgImageUrl) {
                        this.rankingBgImageEl.src = this.bgImageUrl;
                        this.rankingBgImageEl.style.opacity = String(this.bgOpacity || 1);
                        this.rankingBgImageEl.style.display = (this.bgOpacity > 0) ? 'block' : 'none';
                    } else {
                        this.rankingBgImageEl.style.display = 'none';
                        this.rankingBgImageEl.src = '';
                    }
                }
            }

            // 准备动画数据
            this.prepareAnimationData();

            // 直接运行动画（不录制）
            await this.runCanvasAnimation();

            // 预览结束，清理预览标志
            this.isPreview = false;

            // 结束后移除 playing
            this.rankingContainer.classList.remove('playing');

            // 恢复容器之前的内联样式
            this.unlockContainerSize();
        } catch (err) {
            console.error('preview failed', err);
            this.showError('预览失败: ' + err.message);
            this.isPreview = false;
            this.rankingContainer.classList.remove('playing');
            this.unlockContainerSize();
        }
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
                this.textInput.value = e.target.result;
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
     * 生成随机颜色（每次运行都不一样）
     */
    generateRandomColor() {
        // 使用更丰富的颜色生成算法
        const hue = Math.floor(Math.random() * 360);
        
        // 根据色相选择不同的饱和度和亮度范围，让颜色更协调
        let saturation, lightness;
        
        // 暖色调（红、橙、黄）：高饱和度，中等亮度
        if (hue >= 0 && hue < 60) {
            saturation = 80 + Math.floor(Math.random() * 15); // 80-95%
            lightness = 55 + Math.floor(Math.random() * 10); // 55-65%
        }
        // 冷色调（绿、蓝、紫）：中等饱和度，较高亮度
        else if (hue >= 60 && hue < 240) {
            saturation = 70 + Math.floor(Math.random() * 20); // 70-90%
            lightness = 60 + Math.floor(Math.random() * 15); // 60-75%
        }
        // 暖色调（紫红、红）：高饱和度，中等亮度
        else {
            saturation = 75 + Math.floor(Math.random() * 20); // 75-95%
            lightness = 50 + Math.floor(Math.random() * 15); // 50-65%
        }

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

            // 在每次运行前彻底重置录制状态
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                console.warn('检测到正在运行的录制，先停止它');
                this.stopRecording();
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // 重置录制相关状态
            this.recordedChunks = [];
            this.recordedBlob = null;
            this.mediaRecorder = null;

            // 更新间隔时间和动画类型
            this.updateIntervalDuration();
            this.animationType = this.animationTypeSelect.value;
            this.log(`使用动画类型: ${this.animationType}`);

            // 在每次正式运行前重置烟花状态，防止上一次运行残留导致立即触发
            this.fireworksActive = false;
            this.fireworksStartTime = 0;
            this.lastFireworkSpawn = 0;
            this.fireworkParticles = [];
            this.fireworkRockets = [];
            this.fireworkRings = [];

            // 读取并应用烟花设置（从 UI）
            if (this.fireworksEnableInput) {
                this.fireworksEnabled = !!this.fireworksEnableInput.checked;
            }
            if (this.fireworksDurationInput) {
                const v = parseFloat(this.fireworksDurationInput.value);
                if (!isNaN(v) && v > 0) this.fireworksDuration = v * 1000;
            }
            if (this.fireworksDensityInput) {
                const v = parseInt(this.fireworksDensityInput.value);
                if (!isNaN(v) && v > 0) this.fireworksDensity = v;
            }

            this.log(`fireworks enabled=${this.fireworksEnabled} duration=${this.fireworksDuration} density=${this.fireworksDensity}`);

            // 禁用下载按钮
            this.downloadButton.disabled = true;
            this.downloadButton.textContent = '录制中...';
            this.recordedBlob = null;

            // 清空 DOM 排行榜
            this.rankingContent.innerHTML = '';

            // 设置标题
            this.title = this.titleInput.value.trim() || '排行榜';
            this.rankingTitle.textContent = this.title;
            if (this.rankingTitle) {
                this.rankingTitle.style.color = this.titleColor;
                this.rankingTitle.style.fontSize = this.titleSize + 'px';
            }

            // 先将容器置为 playing 状态以确保 canvas 可见并可正确测量尺寸
            this.rankingContainer.classList.add('playing');

            // 锁定当前容器尺寸，避免播放/录制时被 layout 改变
            this.lockContainerSize();

            // 初始化 Canvas（此时 canvas 可见）
            this.initCanvas();

            // 确保 DOM 背景与透明度同步
            if (typeof this._ensureDomBackgroundVisibility === 'function') {
                this._ensureDomBackgroundVisibility();
            } else {
                if (this.rankingBgImageEl) {
                    if (this.bgImageObj && this.bgImageUrl) {
                        this.rankingBgImageEl.src = this.bgImageUrl;
                        this.rankingBgImageEl.style.opacity = String(this.bgOpacity || 1);
                        this.rankingBgImageEl.style.display = (this.bgOpacity > 0) ? 'block' : 'none';
                    } else {
                        this.rankingBgImageEl.style.display = 'none';
                        this.rankingBgImageEl.src = '';
                    }
                }
            }

            // 在播放动画时也显示 Canvas（非录制时可预览烟花）
            // (已经设置 playing above)

            // 准备动画数据
            this.prepareAnimationData();

            // 开始录制
            await this.startRecording();

            // 等待录制启动后再运行动画
            await new Promise(resolve => setTimeout(resolve, 300));

            // 运行动画
            await this.runCanvasAnimation();

            // 动画完成后移除 playing 状态
            this.rankingContainer.classList.remove('playing');

            // 恢复容器之前的内联样式
            this.unlockContainerSize();

            this.log('动画运行完成');
        } catch (error) {
            console.error('运行动画错误:', error);
            this.showError('运行动画失败: ' + error.message);
            this.recordingStatus.style.display = 'none';
            this.isRecording = false;
            this.rankingContainer.classList.remove('recording');
            this.rankingContainer.classList.remove('playing');
        }
    }

    /**
     * 初始化 Canvas
     */
    initCanvas() {
        // 取容器尺寸并设置 canvas 的像素尺寸（考虑 DPR）
        const rect = this.rankingContainer.getBoundingClientRect();
        // Guard: 若元素尚不可见，则 rect 可能为 0，0；尝试 fallback
        const width = rect.width || this.rankingContainer.clientWidth || 360;
        const height = rect.height || this.rankingContainer.clientHeight || 640;
        this.canvasWidth = width;
        this.canvasHeight = height;

        // 使用设备像素比（devicePixelRatio）而不是固定 2x，提高兼容性
        const dpr = Math.max(window.devicePixelRatio || 1, 1);

        // 设置画布像素尺寸
        this.canvas.width = Math.round(this.canvasWidth * dpr);
        this.canvas.height = Math.round(this.canvasHeight * dpr);

        // 设置 CSS 尺寸，确保 canvas 在布局中不被拉伸
        this.canvas.style.width = this.canvasWidth + 'px';
        this.canvas.style.height = this.canvasHeight + 'px';

        // 初始化 2D 上下文并应用缩放
        this.ctx = this.canvas.getContext('2d');
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset any transforms
        this.ctx.scale(dpr, dpr);

        // 重新初始化科技感效果（需要Canvas尺寸）
        this.initTechEffects();
    }

    // 锁定排行容器的当前 CSS 尺寸，避免在切换到播放/录制时被 layout 改变
    lockContainerSize() {
        try {
            if (!this.rankingContainer) return;
            // 如果已经锁定，则忽略
            if (this._containerLocked) return;
            const rect = this.rankingContainer.getBoundingClientRect();
            // 保存原有内联样式以便恢复
            this._prevInlineWidth = this.rankingContainer.style.width || '';
            this._prevInlineHeight = this.rankingContainer.style.height || '';
            this._prevInlineFlex = this.rankingContainer.style.flex || '';
            this._prevInlineMaxHeight = this.rankingContainer.style.maxHeight || '';

            // 应用像素锁定
            this.rankingContainer.style.width = Math.round(rect.width) + 'px';
            this.rankingContainer.style.height = Math.round(rect.height) + 'px';
            // 防止 flex 收缩
            this.rankingContainer.style.flex = '0 0 ' + Math.round(rect.width) + 'px';
            this.rankingContainer.style.maxHeight = Math.round(rect.height) + 'px';
            this._containerLocked = true;
        } catch (e) {
            // ignore
        }
    }

    // 恢复容器之前的内联样式
    unlockContainerSize() {
        try {
            if (!this.rankingContainer) return;
            if (!this._containerLocked) return;
            this.rankingContainer.style.width = this._prevInlineWidth || '';
            this.rankingContainer.style.height = this._prevInlineHeight || '';
            this.rankingContainer.style.flex = this._prevInlineFlex || '';
            this.rankingContainer.style.maxHeight = this._prevInlineMaxHeight || '';
            this._containerLocked = false;
            this._prevInlineWidth = undefined;
            this._prevInlineHeight = undefined;
            this._prevInlineFlex = undefined;
            this._prevInlineMaxHeight = undefined;
        } catch (e) {
            // ignore
        }
    }

    /**
     * 准备动画数据
     */
    prepareAnimationData() {
        const maxCount = this.data.length;
        this.animationItems = [];

        // 计算最大值（用于百分比）
        const maxValue = this.data[maxCount - 1].value;

        // 为每个项目设置动画参数
        // 从第12名（最小值）开始，到第1名（最大值）结束
        for (let i = 0; i < maxCount; i++) {
            const item = this.data[i];
            const actualRank = i + 1; // 第12名是1，第1名是12（弹出顺序）
            const displayRank = maxCount - i; // 实际排名：第1名是最大值
            const percentage = (item.value / maxValue) * 100;

            // 根据动画类型设置初始状态
            let initialState = this.getInitialState(this.animationType);

            this.animationItems.push({
                name: item.name,
                value: item.value,
                color: item.color,
                opacity: item.opacity,
                displayRank: displayRank, // 显示的排名（1-12）
                popupRank: actualRank, // 弹出顺序（1-12）
                percentage: percentage,
                // 动画状态
                ...initialState, // 初始状态（y, x, scale, rotation, opacity等）
                animate: false, // 是否开始动画
                delay: i * (this.flyInDuration + this.intervalDuration * 1000),
                startTime: 0
            });
        }
    }

    /**
     * 根据动画类型获取初始状态
     */
    getInitialState(animationType) {
        switch (animationType) {
            case 'squeeze':
                return {y: -50, x: 0, scale: 1, rotation: 0};
            case 'fade':
                return {y: 0, x: 0, scale: 1, rotation: 0}; // 不设置 opacity，使用原值
            case 'slide':
                return {y: 0, x: -400, scale: 1, rotation: 0};
            case 'scale':
                return {y: 0, x: 0, scale: 0, rotation: 0};
            case 'flip':
                return {y: 0, x: 0, scale: 1, rotation: 180};
            case 'elevator':
                return {y: 600, x: 0, scale: 1, rotation: 0};
            default:
                return {y: -50, x: 0, scale: 1, rotation: 0};
        }
    }

    /**
     * 绘制呼吸灯效果：全局背景光晕
     */
    drawBreathingEffect(currentTime) {
        if (!this.ctx) return;

        // 呼吸灯周期：2秒一个完整循环（更快更明显）
        const breathingCycle = 2000; // 2秒
        const breathingProgress = (currentTime % breathingCycle) / breathingCycle;
        
        // 使用正弦函数创建明显的呼吸效果，范围从 0.4 到 1.0
        const breathingIntensity = Math.sin(breathingProgress * Math.PI * 2) * 0.3 + 0.7; // 0.4 到 1.0

        // 创建中心光晕效果
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        const maxRadius = Math.max(this.canvasWidth, this.canvasHeight) * 0.8;
        
        // 主光晕：中心蓝色光晕
        const mainGlowGradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, maxRadius
        );
        
        // 增强光晕强度，让效果更明显
        const mainOpacity = 0.4 * breathingIntensity;
        
        mainGlowGradient.addColorStop(0, `rgba(64, 156, 255, ${mainOpacity * 0.8})`);
        mainGlowGradient.addColorStop(0.3, `rgba(32, 128, 255, ${mainOpacity * 0.6})`);
        mainGlowGradient.addColorStop(0.6, `rgba(16, 96, 255, ${mainOpacity * 0.3})`);
        mainGlowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        // 绘制主光晕
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';
        this.ctx.fillStyle = mainGlowGradient;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.ctx.restore();

        // 添加白色高光光晕
        const highlightGlowGradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, maxRadius * 0.5
        );
        
        const highlightOpacity = 0.25 * breathingIntensity;
        
        highlightGlowGradient.addColorStop(0, `rgba(255, 255, 255, ${highlightOpacity * 0.6})`);
        highlightGlowGradient.addColorStop(0.5, `rgba(200, 220, 255, ${highlightOpacity * 0.3})`);
        highlightGlowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'overlay';
        this.ctx.fillStyle = highlightGlowGradient;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.ctx.restore();

        // 添加边缘科技光晕效果
        const edgeGlowGradient = this.ctx.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);
        const edgeOpacity = 0.15 * breathingIntensity;
        
        edgeGlowGradient.addColorStop(0, `rgba(0, 255, 255, ${edgeOpacity * 0.8})`);
        edgeGlowGradient.addColorStop(0.3, `rgba(128, 0, 255, ${edgeOpacity * 0.6})`);
        edgeGlowGradient.addColorStop(0.7, `rgba(255, 0, 128, ${edgeOpacity * 0.4})`);
        edgeGlowGradient.addColorStop(1, `rgba(0, 255, 255, ${edgeOpacity * 0.2})`);

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'soft-light';
        this.ctx.fillStyle = edgeGlowGradient;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.ctx.restore();

        // 添加扫描线效果（科技感）
        const scanLineOpacity = 0.1 * breathingIntensity;
        const scanLineY = (currentTime % 4000) / 4000 * this.canvasHeight;
        
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';
        this.ctx.fillStyle = `rgba(0, 255, 255, ${scanLineOpacity})`;
        this.ctx.fillRect(0, scanLineY, this.canvasWidth, 2);
         this.ctx.restore();
     }

     /**
      * 绘制科技感背景效果
      */
     drawTechBackground(currentTime) {
         if (!this.ctx || !this.techEnabled) return;

         // 绘制数字雨效果
         this.drawDigitalRain(currentTime);
         
         // 绘制网格线
         this.drawGridLines(currentTime);
         
         // 绘制星光粒子
         this.drawStarParticles(currentTime);
     }

     /**
      * 绘制数字雨效果
      */
     drawDigitalRain(currentTime) {
         this.ctx.save();
         this.ctx.font = '16px monospace';
         this.ctx.textAlign = 'center';
         
         this.digitalRainChars.forEach(column => {
             column.chars.forEach(char => {
                 // 更新位置
                 char.y += column.speed;
                 if (char.y > this.canvasHeight) {
                     char.y = -20;
                     char.char = Math.floor(Math.random() * 10).toString();
                 }
                 
                 // 绘制字符
                 const opacity = char.brightness * 0.6;
                 this.ctx.fillStyle = `rgba(0, 255, 255, ${opacity})`;
                 this.ctx.fillText(char.char, column.x, char.y);
             });
         });
         
         this.ctx.restore();
     }

     /**
      * 绘制网格线
      */
     drawGridLines(currentTime) {
         this.ctx.save();
         this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
         this.ctx.lineWidth = 0.5;
         
         this.gridLines.forEach(line => {
             if (line.type === 'horizontal') {
                 this.ctx.beginPath();
                 this.ctx.moveTo(0, line.y);
                 this.ctx.lineTo(this.canvasWidth, line.y);
                 this.ctx.stroke();
             } else {
                 this.ctx.beginPath();
                 this.ctx.moveTo(line.x, 0);
                 this.ctx.lineTo(line.x, this.canvasHeight);
                 this.ctx.stroke();
             }
         });
         
         this.ctx.restore();
     }

     /**
      * 绘制星光粒子
      */
     drawStarParticles(currentTime) {
         this.ctx.save();
         
         this.starParticles.forEach(star => {
             // 闪烁效果
             const twinkle = Math.sin(currentTime * 0.001 * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5;
             const brightness = star.brightness * twinkle;
             
             this.ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.8})`;
             this.ctx.beginPath();
             this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
             this.ctx.fill();
         });
         
         this.ctx.restore();
     }

     /**
      * 绘制科技感条形图效果
      */
     drawTechBar(item, x, y, width, height, currentTime) {
         if (!this.ctx) return;

         // 条形图发光边框
         this.ctx.save();
         
         // 外发光效果
         const glowIntensity = Math.sin(currentTime * 0.005) * 0.3 + 0.7;
         const glowGradient = this.ctx.createLinearGradient(x, y, x + width, y);
         
         glowGradient.addColorStop(0, `rgba(0, 255, 255, ${0.3 * glowIntensity})`);
         glowGradient.addColorStop(0.5, `rgba(64, 156, 255, ${0.5 * glowIntensity})`);
         glowGradient.addColorStop(1, `rgba(0, 255, 255, ${0.3 * glowIntensity})`);
         
         this.ctx.strokeStyle = glowGradient;
         this.ctx.lineWidth = 3;
         this.ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
         
         this.ctx.restore();
     }

    /**
     * 在 Canvas 上运行动画
     */
    async runCanvasAnimation() {
        return new Promise((resolve) => {
            this.animationStartTime = performance.now();

            const animate = (currentTime) => {
                // 如果既不是录制也不是预览模式，则停止动画
                if (!this.isRecording && !this.isPreview && this.animationItems.length > 0) {
                    resolve();
                    return;
                }

                const elapsed = currentTime - this.animationStartTime;

                // 清空 Canvas
                this.clearCanvas();

                // 绘制科技感背景效果（在标题和条形图之前）
                this.drawTechBackground(currentTime);

                // 绘制标题
                this.drawTitle();

                // 统计已经动画（或正在动画）的项目数量
                let animatingCount = 0;

                // 计算每个项目的动画状态
                this.animationItems.forEach((item) => {
                    // 检查是否该开始动画
                    if (elapsed >= item.delay && !item.animate) {
                        item.animate = true;
                        item.startTime = currentTime;
                    }

                    // 如果已经开始动画，计算进度
                    if (item.animate) {
                        animatingCount++;
                        const itemElapsed = currentTime - item.startTime;
                        const progress = Math.min(itemElapsed / this.flyInDuration, 1);

                        // 根据动画类型更新状态
                        this.updateAnimationState(item, progress);
                    }
                });

                // 绘制所有项目
                // 根据动画类型决定绘制顺序
                if (this.animationType === 'squeeze') {
                    // 挤压式：反向绘制（先弹出的在下面）
                    for (let i = this.animationItems.length - 1; i >= 0; i--) {
                        this.drawItem(this.animationItems[i], currentTime);
                    }
                } else {
                    // 其他动画类型：正向绘制
                    for (let i = 0; i < this.animationItems.length; i++) {
                        this.drawItem(this.animationItems[i], currentTime);
                    }
                }

                // 添加呼吸灯效果：全局背景光晕
                this.drawBreathingEffect(currentTime);

                // 新增：触发烟花逻辑改为在第1~第3名播放期间触发，并在三名全部完成后停止
                try {
                    const top3 = this.animationItems.filter(it => it.displayRank <= 3 && it._lastDrawPos);
                    const top3Animating = top3.length > 0 && top3.some(it => it.animate);
                    const top3AllDone = top3.length > 0 && top3.every(it => it.animate && (currentTime - it.startTime >= this.flyInDuration));

                    // 在第1~第3名任一开始弹入时有概率启动烟花（只要用户启用）
                    // 增加最小启动延迟，避免连续多次运行时立即触发烟花
                    const FIREWORKS_MIN_START_DELAY = 150; // ms
                    const FIREWORKS_CHANCE = 0.3; // 30%的概率触发烟花
                    if (top3Animating && this.fireworksEnabled && !this.fireworksActive && 
                        (currentTime - this.animationStartTime) > FIREWORKS_MIN_START_DELAY &&
                        Math.random() < FIREWORKS_CHANCE) {
                        this.startFireworks();
                    }

                    // 在三名全部完成且没有未完成的火箭/粒子时停止烟花
                    if (this.fireworksActive && top3AllDone && this.fireworkRockets.length === 0 && this.fireworkParticles.length === 0) {
                        // 小缓冲，确保视觉完整
                        setTimeout(() => this.stopFireworks(), 300);
                    }
                } catch (e) {
                    // ignore
                }

                // 更新并绘制烟花（如果激活）
                this.updateAndDrawFireworks(currentTime);

                // 检查动画是否完成
                const lastItem = this.animationItems[this.animationItems.length - 1];
                if (lastItem && lastItem.animate) {
                    const lastItemElapsed = currentTime - lastItem.startTime;
                    if (lastItemElapsed >= this.flyInDuration + 1000) {
                        // 最后一个项目动画完成，额外等待1秒
                        this.stopRecording();
                        // 停止烟花（给一点缓冲时间）
                        setTimeout(() => this.stopFireworks(), 500);
                        resolve();
                        return;
                    }
                }

                // 继续动画循环
                if (this.isRecording || this.isPreview) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        });
    }

    /**
     * 根据动画类型更新项目状态
     */
    updateAnimationState(item, progress) {
        switch (this.animationType) {
            case 'squeeze':
                this.updateSqueezeAnimation(item, progress);
                break;
            case 'fade':
                this.updateFadeAnimation(item, progress);
                break;
            case 'slide':
                this.updateSlideAnimation(item, progress);
                break;
            case 'scale':
                this.updateScaleAnimation(item, progress);
                break;
            case 'flip':
                this.updateFlipAnimation(item, progress);
                break;
            case 'elevator':
                this.updateElevatorAnimation(item, progress);
                break;
            default:
                this.updateSqueezeAnimation(item, progress);
        }
    }

    /**
     * 挤压式动画更新
     */
    updateSqueezeAnimation(item, progress) {
        const easeOutBack = (t) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        };
        const easedProgress = easeOutBack(progress);
        item.currentY = -50 * (1 - easedProgress);
    }

    /**
     * 淡入式动画更新
     */
    updateFadeAnimation(item, progress) {
        // 使用 easeInOut 缓动
        const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        item.currentOpacity = easeInOut(progress);
    }

    /**
     * 横向滑入式动画更新
     */
    updateSlideAnimation(item, progress) {
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
        item.currentX = -400 * (1 - easeOutCubic(progress));
    }

    /**
     * 缩放弹跳式动画更新
     */
    updateScaleAnimation(item, progress) {
        const elasticOut = (t) => {
            const c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        };
        item.currentScale = elasticOut(progress);
    }

    /**
     * 翻转卡片式动画更新
     */
    updateFlipAnimation(item, progress) {
        const easeOutBack = (t) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        };
        item.currentRotation = 180 * (1 - easeOutBack(progress));
        // 翻转到90度时透明度为0
        item.currentOpacity = progress < 0.5 ? 1 - progress * 2 : (progress - 0.5) * 2;
    }

    /**
     * 升降机式动画更新
     */
    updateElevatorAnimation(item, progress) {
        const easeOutBounce = (t) => {
            const n1 = 7.5625;
            const d1 = 2.75;
            if (t < 1 / d1) {
                return n1 * t * t;
            } else if (t < 2 / d1) {
                return n1 * (t -= 1.5 / d1) * t + 0.75;
            } else if (t < 2.5 / d1) {
                return n1 * (t -= 2.25 / d1) * t + 0.9375;
            } else {
                return n1 * (t -= 2.625 / d1) * t + 0.984375;
            }
        };
        item.currentY = 600 * (1 - easeOutBounce(progress));
    }

    /**
     * 清空 Canvas
     */
    clearCanvas() {
        if (!this.ctx) return;

        // 保存当前变换状态
        this.ctx.save();
        
        // 重置变换到像素空间，绘制背景
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        // 先绘制背景图（如果已加载）
        if (this.bgImageObj) {
            try {
                const img = this.bgImageObj;
                const imgW = img.naturalWidth || img.width;
                const imgH = img.naturalHeight || img.height;

                // 使用设备像素比
                const dpr = Math.max(window.devicePixelRatio || 1, 1);
                const destPixelW = Math.round(this.canvasWidth * dpr);
                const destPixelH = Math.round(this.canvasHeight * dpr);

                if (imgW > 0 && imgH > 0 && destPixelW > 0 && destPixelH > 0) {
                    // 计算裁剪区域，实现 cover 效果
                    const canvasRatio = destPixelW / destPixelH;
                    const imgRatio = imgW / imgH;
                    let sx = 0, sy = 0, sWidth = imgW, sHeight = imgH;

                    if (imgRatio > canvasRatio) {
                        // 图片更宽 -> 水平裁剪
                        sHeight = imgH;
                        sWidth = Math.round(imgH * canvasRatio);
                        sx = Math.round((imgW - sWidth) / 2);
                        sy = 0;
                    } else {
                        // 图片更高 -> 垂直裁剪
                        sWidth = imgW;
                        sHeight = Math.round(imgW / canvasRatio);
                        sx = 0;
                        sy = Math.round((imgH - sHeight) / 2);
                    }

                    // 绘制背景图到整个像素缓冲区
                    this.ctx.globalAlpha = this.bgOpacity;
                    this.ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, destPixelW, destPixelH);
                    this.ctx.globalAlpha = 1;
                } else {
                    // 备用方案：直接拉伸绘制
                    this.ctx.globalAlpha = this.bgOpacity;
                    this.ctx.drawImage(img, 0, 0, destPixelW, destPixelH);
                    this.ctx.globalAlpha = 1;
                }
            } catch (e) {
                console.warn('绘制背景图失败，使用渐变背景', e);
            }
        }

        // 恢复原来的变换状态（CSS像素空间）
        this.ctx.restore();

        // 绘制半透明覆盖层，增强文字可读性
        const currentTheme = this.backgroundThemes[this.backgroundColor] || this.backgroundThemes.dark;
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);
        gradient.addColorStop(0, currentTheme.gradient[0]);
        gradient.addColorStop(1, currentTheme.gradient[1]);
        this.ctx.fillStyle = gradient;
        
        // 根据背景图透明度调整覆盖层透明度
        const overlayAlpha = this.bgImageObj ? Math.max(0.15, 0.55 - this.bgOpacity * 0.5) : 0.8;
        this.ctx.globalAlpha = overlayAlpha;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // 恢复默认透明度
        this.ctx.globalAlpha = 1;
    }

    /**
     * 绘制标题
     */
    drawTitle() {
        const titleY = 90;
        const titleHeight = 80;

        // 标题背景
        this.ctx.save();
        const titleGradient = this.ctx.createLinearGradient(0, titleY - titleHeight / 2, 0, titleY + titleHeight / 2);
        titleGradient.addColorStop(0, 'rgba(102, 126, 234, 0.2)');
        titleGradient.addColorStop(1, 'rgba(118, 75, 162, 0.2)');
        this.ctx.fillStyle = titleGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(10, titleY - titleHeight / 2, this.canvasWidth - 20, titleHeight, 15);
        this.ctx.fill();
        this.ctx.restore();

        // 标题文字
        // use chosen title color (fallback to white)
        const titleColor = this.titleColor || '#ffffff';
        this.ctx.fillStyle = titleColor;
        this.ctx.font = `bold ${this.titleSize || 32}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetY = 4;
        this.ctx.fillText(this.title, this.canvasWidth / 2, titleY);
        this.ctx.shadowColor = 'transparent';

        // ensure DOM title color matches
        if (this.rankingTitle) this.rankingTitle.style.color = this.titleColor || '#ffffff';
    }

    /**
     * 绘制单个项目
     */
    drawItem(item, currentTime) {
        if (!item.animate || item.opacity <= 0) return;

        const startY = 140;
        const itemHeight = 35;
        const itemMargin = 10;

        // 计算项目位置：基于动画进程，每个项目根据弹出顺序动态计算位置
        // popupRank 较小的项目（先弹出的）会被挤到下面
        // 最终位置：第1名（popupRank=12）在最上面，第12名（popupRank=1）在最下面
        // finalPosition removed (unused)
        // const finalPosition = (item.displayRank - 1) * (itemHeight + itemMargin);

        // 计算当前位置：基于动画过程中有多少项目已经显示
        // 当项目正在动画时，它从顶部滑入，会把之前的项目往下挤
        let currentPosition;
        const itemElapsed = performance.now() - item.startTime;
        const progress = Math.min(itemElapsed / this.flyInDuration, 1);

        // 缓动函数
        const easeOutBack = (t) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        };
        const easedProgress = easeOutBack(progress);

        // 根据动画类型计算位置
        let drawY, drawX = 0;

        switch (this.animationType) {
            case 'squeeze':
                // 挤压式：基于当前已显示的项目动态计算位置
                const topOffset = -50 * (1 - easedProgress);
                const itemsAboveCurrent = this.animationItems.filter(i => i.animate && i.popupRank > item.popupRank).length;
                currentPosition = startY + itemsAboveCurrent * (itemHeight + itemMargin) + topOffset;
                drawY = currentPosition;
                break;
            case 'fade':
            case 'scale':
            case 'flip':
            case 'slide':
            case 'elevator':
            default:
                // 其他动画类型：固定位置
                drawY = startY + (item.displayRank - 1) * (itemHeight + itemMargin);
                drawX = 0;
                break;
        }

        const y = drawY;
        // const x = drawX; // x variable removed (unused)

        this.ctx.save();

        // 根据动画类型计算透明度
        let drawOpacity = item.opacity;
        if (this.animationType === 'fade') {
            // 使用在 updateAnimationState 中已计算好的 currentOpacity
            drawOpacity *= (item.currentOpacity !== undefined ? item.currentOpacity : 1);
        } else if (this.animationType === 'flip') {
            // 使用在 updateAnimationState 中已计算好的 currentOpacity
            drawOpacity *= (item.currentOpacity !== undefined ? item.currentOpacity : 1);
        }

        this.ctx.globalAlpha = drawOpacity;

        // 应用动画变换
        const centerX = this.canvasWidth / 2;
        const centerY = y + itemHeight / 2;

        switch (this.animationType) {
            case 'scale':
                // 缩放动画 - 使用预先计算好的 currentScale
                const scale = item.currentScale !== undefined ? item.currentScale : 1;
                this.ctx.translate(centerX, centerY);
                this.ctx.scale(scale, scale);
                this.ctx.translate(-centerX, -centerY);
                break;
            case 'flip':
                // 翻转动画 - 使用预先计算好的 currentRotation
                const rotation = item.currentRotation !== undefined ? item.currentRotation : 0;
                const rotationRad = (rotation * Math.PI) / 180;
                const scaleX = Math.abs(Math.cos(rotationRad));
                this.ctx.translate(centerX, centerY);
                this.ctx.scale(scaleX, 1);
                this.ctx.translate(-centerX, -centerY);
                break;
            case 'slide':
                // 横向滑入 - 使用预先计算好的 currentX
                const offsetX = item.currentX !== undefined ? item.currentX : 0;
                this.ctx.translate(offsetX, 0);
                break;
            case 'elevator':
                // 升降机式 - 使用预先计算好的 currentY
                const offsetY = item.currentY !== undefined ? item.currentY : 0;
                this.ctx.translate(0, offsetY);
                break;
        }

        // 计算条形图宽度
        const maxBarWidth = this.canvasWidth - 40;
        const barWidth = (item.percentage / 100) * maxBarWidth;

        // 为所有项目创建更丰富的渐变色
        let barGradient;
        let textColor = '#ffffff';
        
        if (item.displayRank === 1) {
            // 金牌：金色渐变
            barGradient = this.ctx.createLinearGradient(20, y, 20 + barWidth, y);
            barGradient.addColorStop(0, '#FFD700');
            barGradient.addColorStop(0.5, '#FFA500');
            barGradient.addColorStop(1, '#FF8C00');
        } else if (item.displayRank === 2) {
            // 银牌：银色渐变
            barGradient = this.ctx.createLinearGradient(20, y, 20 + barWidth, y);
            barGradient.addColorStop(0, '#E6E6FA');
            barGradient.addColorStop(0.5, '#C0C0C0');
            barGradient.addColorStop(1, '#808080');
        } else if (item.displayRank === 3) {
            // 铜牌：铜色渐变
            barGradient = this.ctx.createLinearGradient(20, y, 20 + barWidth, y);
            barGradient.addColorStop(0, '#CD7F32');
            barGradient.addColorStop(0.5, '#8B4513');
            barGradient.addColorStop(1, '#654321');
        } else {
            // 其他排名：基于随机颜色的丰富渐变
            const baseHue = item.color.h;
            const baseSaturation = item.color.s;
            const baseLightness = item.color.l;
            
            barGradient = this.ctx.createLinearGradient(20, y, 20 + barWidth, y);
            barGradient.addColorStop(0, `hsl(${baseHue}, ${baseSaturation}%, ${baseLightness + 10}%)`);
            barGradient.addColorStop(0.5, `hsl(${baseHue}, ${baseSaturation}%, ${baseLightness}%)`);
            barGradient.addColorStop(1, `hsl(${baseHue}, ${baseSaturation}%, ${baseLightness - 15}%)`);
        }

        // 绘制条形图背景
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.roundRect(20, y, barWidth, itemHeight, 15);
        this.ctx.fillStyle = barGradient;
        this.ctx.globalAlpha = drawOpacity;
        this.ctx.fill();
        this.ctx.restore();

        // 绘制排名
        this.ctx.fillStyle = textColor;
        this.ctx.font = 'bold 18px -apple-system, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const rankX = 35;
        if (item.displayRank === 1) {
            this.ctx.fillText('🥇', rankX, y + itemHeight / 2);
        } else if (item.displayRank === 2) {
            this.ctx.fillText('🥈', rankX, y + itemHeight / 2);
        } else if (item.displayRank === 3) {
            this.ctx.fillText('🥉', rankX, y + itemHeight / 2);
        } else {
            this.ctx.fillText(item.displayRank.toString(), rankX, y + itemHeight / 2);
        }

        // 绘制名称和数值
        this.ctx.fillStyle = textColor;
        this.ctx.textAlign = 'left';
        this.ctx.font = '600 20px -apple-system, sans-serif';
        this.ctx.fillText(item.name, 55, y + itemHeight / 2);

        // 数值绘制在条形图右侧（根据设置决定是否显示）
        if (this.showValues) {
            this.ctx.fillStyle = textColor;
            this.ctx.globalAlpha = drawOpacity * 0.8;
            this.ctx.textAlign = 'right';
            this.ctx.font = '20px -apple-system, sans-serif';
            const valueX = 20 + barWidth + 10;
            this.ctx.fillText(item.value.toString(), valueX, y + itemHeight / 2);
        }

        // 在 item 上记录最后一次绘制位置，供烟花效果定位使用
        item._lastDrawPos = {
            x: 20 + barWidth / 2,
            y: y + itemHeight / 2
        };

        // 绘制科技感条形图效果
        this.drawTechBar(item, 20, y, barWidth, itemHeight, currentTime);

        this.ctx.restore();
    }

    /**
     * 开始录制视频
     */
    async startRecording() {
        try {
            // 安全检查：确保没有正在运行的录制
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                console.warn('检测到正在运行的录制，先停止它');
                this.stopRecording();
                // 等待一小段时间确保录制完全停止
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            this.recordingStatus.style.display = 'flex';
            this.rankingContainer.classList.add('recording');

            // 直接从 Canvas 录制
            const stream = this.canvas.captureStream(30); // 30 fps

            // 优先尝试 MP4 格式
            let mimeType;
            if (MediaRecorder.isTypeSupported('video/mp4')) {
                mimeType = 'video/mp4';
            } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
                mimeType = 'video/mp4;codecs=avc1';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                mimeType = 'video/webm;codecs=vp9';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
                mimeType = 'video/webm;codecs=vp8';
            } else {
                mimeType = 'video/webm';
            }

            this.videoMimeType = mimeType;

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 8000000 // 8 Mbps 提高质量
            });

            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.recordedBlob = new Blob(this.recordedChunks, {type: this.videoMimeType});
                this.downloadButton.disabled = false;
                this.downloadButton.textContent = '下载视频';
                this.recordingStatus.style.display = 'none';
                this.rankingContainer.classList.remove('recording');
                this.log('录制完成');
            };

            this.mediaRecorder.start(100); // 每100ms产生一个数据块
            this.log('MediaRecorder 已启动，格式: ' + mimeType);
            this.isRecording = true;

        } catch (error) {
            console.error('录制失败:', error);
            this.showError('录制失败: ' + error.message);
            this.recordingStatus.style.display = 'none';
            this.isRecording = false;
            this.rankingContainer.classList.remove('recording');
        }
    }

    /**
     * 停止录制视频
     */
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.isRecording = false;
            this.mediaRecorder.stop();
            
            // 清理 MediaRecorder 资源
            if (this.mediaRecorder.stream) {
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
            
            this.log('停止录制');
        }
        
        // 重置 MediaRecorder 引用
        this.mediaRecorder = null;
        this.rankingContainer.classList.remove('recording');
    }

    /**
     * 下载视频
     */
    async downloadVideo() {
        if (!this.recordedBlob) {
            this.showError('没有可下载的视频，请先运行动画');
            return;
        }

        // 生成文件名，根据 MIME 类型确定扩展名
        const title = this.titleInput.value.trim() || '排行榜';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const extension = this.videoMimeType && this.videoMimeType.includes('mp4') ? 'mp4' : 'webm';
        const filename = `${title}_${timestamp}.${extension}`;

        // 创建下载链接
        const url = URL.createObjectURL(this.recordedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.log(`视频已下载: ${filename}`);
    }

    // 烟花：生成并管理粒子
    startFireworks() {
        this.fireworksActive = true;
        this.fireworksStartTime = performance.now();
        this.lastFireworkSpawn = 0;
        this.fireworkParticles = [];
        this.fireworkRockets = [];
        // this.fireworkSmoke = []; // 暂时移除烟雾粒子系统
        this.log('Fireworks (rockets) started');
    }

    stopFireworks() {
        this.fireworksActive = false;
        // 不立即清空，让残余粒子自然消失以保证视觉完整性
        this.log('Fireworks stopped');
    }

    // 发射一枚火箭，从画布底部发射并在接近目标时爆炸
    spawnRocketTowards(targetX, targetY) {
        const startX = Math.max(40, Math.min(this.canvasWidth - 40, targetX + (Math.random() - 0.5) * 120));
        const startY = this.canvasHeight + 30; // 从画布底部下方发射
        
        // 抛物线轨迹：更真实的火箭发射
        const distance = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2));
        const angle = Math.atan2(targetY - startY, targetX - startX);
        const speed = 0.8 + Math.random() * 0.4; // 更慢更自然的速度
        
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        
        const life = 800 + Math.random() * 800; // 火箭寿命
        const targetAltitude = Math.max(80, targetY - (40 + Math.random() * 160)); // 在目标上方爆炸
        
        // 更丰富的颜色组合
        const colorSets = [
            ['#FF6B6B', '#FF8C42', '#FFD700'], // 红橙黄
            ['#4D96FF', '#6BCB77', '#FFD700'], // 蓝绿黄
            ['#9D4BFF', '#FF6B6B', '#FF8C42'], // 紫红橙
            ['#6BCB77', '#4D96FF', '#9D4BFF']  // 绿蓝紫
        ];
        const colors = colorSets[Math.floor(Math.random() * colorSets.length)];
        
        this.fireworkRockets.push({
            x: startX,
            y: startY,
            vx,
            vy,
            age: 0,
            life,
            targetY: targetAltitude,
            colors: colors,
            smokeTimer: 0,
            trail: [] // 尾迹记录
        });
    }

    // 爆炸成粒子（更真实的烟花爆炸效果）
    spawnExplosion(x, y, rocketColors) {
        const particleCount = Math.max(8, Math.min(50, Math.round(this.fireworksDensity * 0.5))); // 极简粒子数量
        
        // 使用火箭的颜色组合，或者随机颜色组合
        const colors = rocketColors || [
            ['#FF6B6B', '#FF8C42', '#FFD700'],
            ['#4D96FF', '#6BCB77', '#FFD700'],
            ['#9D4BFF', '#FF6B6B', '#FF8C42'],
            ['#6BCB77', '#4D96FF', '#9D4BFF']
        ][Math.floor(Math.random() * 4)];

        // 1. 中心爆炸光晕（强烈闪光）
        this.fireworkRings.push({
            x, y,
            radius: 10,
            maxRadius: 120 + Math.random() * 80,
            thickness: 8 + Math.random() * 6,
            age: 0,
            life: 300 + Math.random() * 200,
            color: colors && colors.length > 0 ? colors[0] : '#FF6B6B',
            type: 'flash'
        });

        // 2. 扩散光晕环（多个环）
        const ringCount = Math.floor(Math.random() * 2); // 极简光晕环数量（0或1个）
        for (let r = 0; r < ringCount; r++) {
            const colorIndex = colors && colors.length > 0 ? r % colors.length : 0;
            const ringColor = colors && colors.length > 0 ? colors[colorIndex] : '#4D96FF';
            this.fireworkRings.push({
                x, y,
                radius: 15 + r * 12,
                maxRadius: 80 + Math.random() * 100,
                thickness: 4 + Math.random() * 3,
                age: 0,
                life: 500 + Math.random() * 300,
                color: ringColor,
                type: 'ring'
            });
        }

        // 3. 核心亮点（高亮度、大体积）
        const coreCount = Math.max(1, Math.round(particleCount * 0.03)); // 极简核心亮点数量
        for (let c = 0; c < coreCount; c++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (2.0 + Math.random() * 3.0) * this.fireworksSpeedMul;
            const colorIndex = colors && colors.length > 0 ? Math.floor(Math.random() * colors.length) : 0;
            const color = colors && colors.length > 0 ? colors[colorIndex] : '#FFD700';
            
            this.fireworkParticles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 400 + Math.random() * 300,
                age: 0,
                size: 4 + Math.random() * 3,
                color: color,
                core: true,
                trail: [],
                drag: 0.98, // 更强的阻力
                gravity: 0.0005, // 重力效果
                brightness: 1.0
            });
        }

        // 4. 主体粒子（向外扩散）
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2) * (i / particleCount) + (Math.random() - 0.5) * 1.2;
            const velocity = (1.5 + Math.random() * 5.0) * this.fireworksSpeedMul;
            const colorIndex = colors && colors.length > 0 ? Math.floor(Math.random() * colors.length) : 0;
            const color = colors && colors.length > 0 ? colors[colorIndex] : '#FF8C42';
            
            this.fireworkParticles.push({
                x, y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: 800 + Math.random() * 600,
                age: 0,
                size: 1.5 + Math.random() * 2.0,
                color: color,
                core: false,
                trail: [],
                drag: 0.985,
                gravity: 0.0008, // 重力效果
                brightness: 0.7 + Math.random() * 0.3,
                // 次级爆炸效果
                canSplit: Math.random() < 0.15,
                splitTime: 150 + Math.random() * 200,
                splitDone: false,
                // 闪烁效果
                twinkleSpeed: 2 + Math.random() * 3,
                twinkleOffset: Math.random() * Math.PI * 2
            });
        }

        // 5. 烟雾效果（暂时注释掉，因为烟雾粒子系统未实现）
        // const smokeCount = Math.max(10, Math.round(particleCount * 0.3));
        // for (let i = 0; i < smokeCount; i++) {
        //     const angle = Math.random() * Math.PI * 2;
        //     const speed = 0.3 + Math.random() * 0.8;
        //     
        //     this.fireworkSmoke.push({
        //         x, y,
        //         vx: Math.cos(angle) * speed,
        //         vy: Math.sin(angle) * speed,
        //         life: 1000 + Math.random() * 800,
        //         age: 0,
        //         size: 3 + Math.random() * 4,
        //         color: '#888888',
        //         opacity: 0.6 + Math.random() * 0.4,
        //         expandRate: 1.02 + Math.random() * 0.03
        //     });
        // }
    }

    updateAndDrawFireworks(currentTime) {
        if (!this.ctx) return;

        const now = currentTime;

        // 如果烟花激活且在持续期内，按间隔生成火箭朝前三名位置发射
        if (this.fireworksActive) {
            const elapsed = now - this.fireworksStartTime;
            if (elapsed < this.fireworksDuration) {
                if (now - this.lastFireworkSpawn > this.fireworkSpawnInterval) {
                    const top3 = this.animationItems.filter(it => it.displayRank <= 3 && it._lastDrawPos);
                    if (top3.length > 0) {
                        // 随机选择前三名中的一个发射火箭，而不是全部发射
                        const randomIndex = Math.floor(Math.random() * top3.length);
                        const posItem = top3[randomIndex];
                        // 每次只发射1枚火箭
                        this.spawnRocketTowards(posItem._lastDrawPos.x + (Math.random() - 0.5) * 20, posItem._lastDrawPos.y);
                    } else {
                        const rx = 100 + Math.random() * (this.canvasWidth - 200);
                        const ry = 80 + Math.random() * (this.canvasHeight / 2);
                        this.spawnRocketTowards(rx, ry);
                    }
                    this.lastFireworkSpawn = now;
                }
            } else {
                // 停止继续发射，但允许现有火箭与粒子完成动画
                this.fireworksActive = false;
            }
        }

        // 更新火箭（上升并在到达目标高度或寿命到时爆炸）
        for (let i = this.fireworkRockets.length - 1; i >= 0; i--) {
            const r = this.fireworkRockets[i];
            const dt = 16; // ms
            r.age += dt;
            
            // 更真实的物理效果：重力影响
            r.vy += 0.0008 * dt; // 重力效果
            // 空气阻力
            r.vx *= 0.998;
            r.vy *= 0.998;
            r.x += r.vx * dt;
            r.y += r.vy * dt;
            
            // 记录尾迹
            r.trail.unshift({x: r.x, y: r.y, age: r.age});
            if (r.trail.length > 8) r.trail.pop(); // 极简尾迹长度
            
            // 绘制火箭和尾迹
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';
            
            // 绘制尾迹（烟雾效果）
            for (let t = 0; t < r.trail.length; t++) {
                const pt = r.trail[t];
                const trailAge = r.age - pt.age;
                const trailAlpha = Math.max(0, Math.min(1, 1 - trailAge / 300));
                
                if (trailAlpha > 0) {
                    const trailOpacity = Math.max(0, Math.min(1, trailAlpha * 0.3));
                    this.ctx.globalAlpha = trailOpacity;
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.beginPath();
                    this.ctx.arc(pt.x, pt.y, 2 + (t / r.trail.length) * 4, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
            
            // 主火箭亮点
            const lifeRatio = r.life > 0 ? r.age / r.life : 1;
            const rocketAlpha = Math.max(0, Math.min(1, 1 - lifeRatio));
            this.ctx.globalAlpha = rocketAlpha;
            const rocketColor = (r.colors && r.colors[0]) ? r.colors[0] : '#ffffff';
            this.ctx.fillStyle = rocketColor;
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, 3.0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 火箭光晕
            const glowAlpha = Math.max(0, Math.min(1, rocketAlpha * 0.4));
            this.ctx.globalAlpha = glowAlpha;
            const glowGradient = this.ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 12);
            glowGradient.addColorStop(0, this.hexToRgba(rocketColor, 0.8));
            glowGradient.addColorStop(1, this.hexToRgba(rocketColor, 0));
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, 12, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();

            // 判断是否爆炸：达到目标高度或寿命用尽
            if (r.y <= r.targetY || r.age >= r.life) {
                this.spawnExplosion(r.x, r.y, r.colors);
                this.fireworkRockets.splice(i, 1);
            }
        }

        // 发射阶段额外生成烟雾（轻微、低频）
        // 在火箭更新循环外单独生成不必
        // 更新并绘制环
        for (let i = this.fireworkRings.length - 1; i >= 0; i--) {
            const ring = this.fireworkRings[i];
            ring.age += 16;
            const t = ring.age / ring.life;
            ring.radius = ring.radius + (ring.maxRadius / ring.life) * 16; // 增大半径
            if (ring.age >= ring.life) {
                this.fireworkRings.splice(i, 1);
                continue;
            }
            // 绘制环
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';
            const alpha = Math.max(0, 1 - t);
            this.ctx.strokeStyle = ring.color;
            this.ctx.globalAlpha = 0.6 * alpha;
            this.ctx.lineWidth = ring.thickness * (1 - t);
            this.ctx.beginPath();
            this.ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            // 用径向渐变表现更自然的光晕
            const grad = this.ctx.createRadialGradient(ring.x, ring.y, ring.radius * 0.2, ring.x, ring.y, ring.radius + ring.thickness);
            grad.addColorStop(0, this.hexToRgba(ring.color, 0.75 * alpha));
            grad.addColorStop(0.6, this.hexToRgba(ring.color, 0.25 * alpha));
            grad.addColorStop(1, this.hexToRgba(ring.color, 0));
            this.ctx.fillStyle = grad;
            this.ctx.globalAlpha = 1;
            this.ctx.beginPath();
            this.ctx.arc(ring.x, ring.y, ring.radius + ring.thickness, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // 更新并绘制粒子
        for (let i = this.fireworkParticles.length - 1; i >= 0; i--) {
            const p = this.fireworkParticles[i];
            const dt = 16; // ms

            p.age += dt;
            
            // 更真实的物理效果：重力和阻力
            p.vx *= p.drag || 0.985;
            p.vy *= p.drag || 0.985;
            p.vy += (p.gravity || 0.0008) * dt; // 重力效果
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            
            // 记录轨迹
            if (!p.trail) p.trail = [];
            p.trail.unshift({x: p.x, y: p.y, age: p.age});
            const maxTrail = p.core ? 4 : 6; // 极简轨迹长度
            if (p.trail.length > maxTrail) p.trail.pop();
            
            // 次级爆炸效果
            if (p.canSplit && !p.splitDone && p.age >= p.splitTime) {
                this.spawnExplosion(p.x, p.y, [p.color]);
                p.splitDone = true;
            }
            
            // 移除过期粒子
            if (p.age >= p.life) {
                this.fireworkParticles.splice(i, 1);
            }
        }

        // 绘制粒子（放在 items 之上）
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';
        
        // 使用传统的for循环遍历粒子，避免迭代器失效
        for (let i = 0; i < this.fireworkParticles.length; i++) {
            const p = this.fireworkParticles[i];
            // 安全计算透明度，避免NaN
            const lifeRatio = p.life > 0 ? p.age / p.life : 1;
            const alpha = Math.max(0, Math.min(1, 1 - lifeRatio));
            const size = p.size * (p.core ? 1.6 : 1);
            
            // 闪烁效果（安全计算）
            const twinkleSpeed = p.twinkleSpeed || 2;
            const twinkleOffset = p.twinkleOffset || 0;
            const twinkle = Math.sin(p.age * 0.001 * twinkleSpeed + twinkleOffset) * 0.3 + 0.7;
            const brightness = p.brightness || 1;
            const finalAlpha = Math.max(0, Math.min(1, alpha * brightness * twinkle));

            // 绘制轨迹尾迹
            if (p.trail && p.trail.length > 1) {
                for (let ti = 0; ti < p.trail.length; ti++) {
                    const pt = p.trail[ti];
                    const t = ti / p.trail.length;
                    const trailAlpha = Math.max(0, Math.min(1, (1 - t) * 0.4 * finalAlpha));
                    
                    if (trailAlpha > 0) {
                        this.ctx.save();
                        this.ctx.globalAlpha = trailAlpha;
                        const trailSize = Math.max(0.3, size * (1 - t) * 0.8);
                        this.ctx.fillStyle = p.color;
                        this.ctx.beginPath();
                        this.ctx.arc(pt.x, pt.y, trailSize, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.restore();
                    }
                }
            }

            // 粒子光晕效果
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';
            
            // 外光晕
            const glowSize = size * (p.core ? 10 : 6);
            const glowGradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
            
            // 安全计算透明度，避免NaN
            const stop0Alpha = Math.max(0, Math.min(1, 0.6 * finalAlpha));
            const stop05Alpha = Math.max(0, Math.min(1, 0.2 * finalAlpha));
            
            glowGradient.addColorStop(0, this.hexToRgba(p.color, stop0Alpha));
            glowGradient.addColorStop(0.5, this.hexToRgba(p.color, stop05Alpha));
            glowGradient.addColorStop(1, this.hexToRgba(p.color, 0));
            
            this.ctx.globalAlpha = 1;
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 粒子主体
            this.ctx.globalAlpha = finalAlpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        }
        
        this.ctx.restore();
    }

    // helper: 16进制颜色 to rgba string
    hexToRgba(hex, alpha) {
        // 支持 #RRGGBB
        const c = hex.replace('#', '');
        const r = parseInt(c.substring(0, 2), 16);
        const g = parseInt(c.substring(2, 4), 16);
        const b = parseInt(c.substring(4, 6), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    // 新增：加载背景图片文件并准备用于 Canvas 与 DOM 预览
    loadBackgroundImage(file) {
        try {
            // 清理之前的 URL（如果之前使用过 object URL）
            if (this.bgImageUrl) {
                try { URL.revokeObjectURL(this.bgImageUrl); } catch (e) { /* ignore */ }
                this.bgImageUrl = null;
            }

            // no longer store raw File reference; we convert to data URL and keep img in bgImageObj/bgImageUrl

            // 使用 FileReader 将图片读取为 data URL，避免 blob/object URL 与跨域报错
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const dataUrl = ev.target.result;
                    // 创建 Image 并加载 data URL
                    const img = new Image();
                    img.onload = () => {
                        this.bgImageObj = img;
                        this.bgImageUrl = dataUrl; // 记录 data URL 用于 DOM 预览
                        if (this.rankingBgImageEl) {
                            this.rankingBgImageEl.src = this.bgImageUrl;
                            this.rankingBgImageEl.style.opacity = String(this.bgOpacity || 1);
                            this.rankingBgImageEl.style.display = (this.bgOpacity > 0) ? 'block' : 'none';
                        }
                        console.log('背景图已加载 (dataURL)', file.name);
                    };
                    img.onerror = (err) => {
                        console.error('背景图 Image 加载失败', err);
                        this.showError('背景图加载失败');
                        this.bgImageObj = null;
                        this.bgImageUrl = null;
                        if (this.rankingBgImageEl) {
                            this.rankingBgImageEl.src = '';
                            this.rankingBgImageEl.style.display = 'none';
                        }
                    };
                    img.src = dataUrl;
                } catch (e) {
                    console.error('处理 FileReader result 时出错', e);
                    this.showError('无法处理背景图: ' + (e && e.message ? e.message : e));
                }
            };
            reader.onerror = (err) => {
                console.error('FileReader 读取背景图失败', err);
                this.showError('无法读取背景图文件');
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('loadBackgroundImage error', error);
            this.showError('无法加载背景图: ' + error.message);
        }
    }

    // 在预览或运行开始前，确保 DOM 预览元素的可见性与透明度同步
    _ensureDomBackgroundVisibility() {
        if (!this.rankingBgImageEl) return;
        if (this.bgImageObj && this.bgImageUrl) {
            this.rankingBgImageEl.src = this.bgImageUrl;
            this.rankingBgImageEl.style.opacity = String(this.bgOpacity || 1);
            this.rankingBgImageEl.style.display = (this.bgOpacity > 0) ? 'block' : 'none';
        } else {
            this.rankingBgImageEl.style.display = 'none';
            this.rankingBgImageEl.src = '';
        }
    }
}

// 实例化并初始化应用（在 DOM 完成后）
window.addEventListener('DOMContentLoaded', () => {
    try {
        window.dynamicRanking = new DynamicRanking();
        console.log('DynamicRanking initialized:', !!window.dynamicRanking);
        // 简单的UI提示，帮助确认初始化成功
        try {
            const rc = document.getElementById('ranking-content');
            if (rc) {
                rc.innerHTML = '<div class="empty-state"><p>已就绪 - 点击 "运行动画" 或 "预览动画" 开始</p></div>';
            }
            // Fallback global listeners to ensure responsiveness
            const runBtnFallback = document.getElementById('run-animation');
            if (runBtnFallback) {
                runBtnFallback.addEventListener('click', () => {
                    console.log('fallback run button clicked');
                    try {
                        window.dynamicRanking && window.dynamicRanking.runAnimation();
                    } catch (err) {
                        console.error(err);
                    }
                });
            }
            const previewBtnFallback = document.getElementById('preview-animation');
            if (previewBtnFallback) {
                previewBtnFallback.addEventListener('click', () => {
                    console.log('fallback preview button clicked');
                    try {
                        window.dynamicRanking && window.dynamicRanking.runPreview();
                    } catch (err) {
                        console.error(err);
                    }
                });
            }
        } catch (err) {
            // ignore
        }
    } catch (err) {
        console.error('Failed to initialize DynamicRanking', err);
        alert('初始化失败: ' + err.message);
    }
});

// 全局错误监控，便于调试运行时错误导致的无响应
window.addEventListener('error', (e) => {
    try {
        console.error('Global error captured:', e.message, e.error);
        alert('运行时错误: ' + e.message);
    } catch (err) { /* ignore */
    }
});
window.addEventListener('unhandledrejection', (e) => {
    try {
        console.error('Unhandled rejection:', e.reason);
        alert('未处理的 Promise 错误: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
    } catch (err) { /* ignore */
    }
});

// 在页面卸载时清理可能残留的 object URL
window.addEventListener('beforeunload', () => {
    try {
        if (window.dynamicRanking && window.dynamicRanking.bgImageUrl) {
            try { URL.revokeObjectURL(window.dynamicRanking.bgImageUrl); } catch (e) { /* ignore */ }
            window.dynamicRanking.bgImageUrl = null;
        }
    } catch (e) {
        // ignore
    }
});

