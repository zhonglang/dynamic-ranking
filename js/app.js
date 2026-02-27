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
        this.sortOrder = 'desc'; // 排序方式：desc (从大到小), asc (从小到大)
        this.valuePosition = 'bar-end'; // 数值位置：bar-end (末端内), after-bar (末端外)
        this.valueOffset = 25; // 数值偏移距离
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
        this.fireworksTriggerRank = 3; // 默认前3名触发
        this.isPreview = false; // 非录制的预览模式标志
        this.fireworksActive = false;
        this.fireworksStartTime = 0;
        this.fireworksDuration = 2500; // 毫秒，烟花持续时长（增加到2.5秒）
        this.lastFireworkSpawn = 0;
        this.fireworkSpawnInterval = 1500; // 每隔多少ms产生一次烟花（大幅减少频率）
        this.fireworkParticles = [];
        this.fireworksDensity = 5; // 粒子密度基数（极简）
        this.fireworksShape = 'random'; // 烟花图案：random, circle, heart, star, burst
        this.fireworkRockets = []; // 底部发射的火箭列表（每个在空中爆炸为粒子）
        this.fireworkRings = []; // 空中扩展的环形爆炸效果

        // 红包/福袋效果参数
        this.redPacketsEnabled = false; // 是否开启随机红包
        this.redPackets = []; // 红包对象列表
        this.lastRedPacketSpawn = 0; // 上次生成红包的时间
        this.redPacketSpawnInterval = 1000; // 红包生成间隔（毫秒）

        // 花瓣特效相关参数
        this.petalsEnabled = false;
        this.petals = [];
        this.lastPetalSpawn = 0;
        this.petalSpawnInterval = 100; // 高频发射
        
        // 弹幕相关参数
        this.danmakuEnabled = false; // 默认不开启弹幕
        this.danmakuColor = '#ffffff'; // 默认弹幕颜色
        this.danmakuSize = 20; // 默认字体大小
        this.danmakuContent = '太棒了 恭喜 加油 优秀 厉害'; // 默认弹幕内容，使用空格分隔
        this.danmakuList = []; // 弹幕列表
        this.lastDanmakuSpawn = 0;
        this.danmakuSpawnInterval = 2000; // 弹幕生成间隔

        // 科技感效果参数
        this.techEnabled = true; // 是否启用科技感效果
        this.techParticles = []; // 科技感粒子系统
        this.digitalRainChars = []; // 数字雨字符
        this.gridLines = []; // 网格线
        this.energyParticles = []; // 能量粒子
        this.starParticles = []; // 星光粒子
        
        // 背景色参数
        this.backgroundColor = 'blue'; // 默认背景色主题
        this.backgroundThemes = {
            none: { name: '无主题', gradient: ['transparent', 'transparent'] },
            dark: { name: '深色科技', gradient: ['#1a202c', '#2d3748'] },
            blue: { name: '科技蓝', gradient: ['#0f172a', '#1e3a8a'] },
            purple: { name: '科技紫', gradient: ['#1e0f2a', '#4c1d95'] },
            green: { name: '科技绿', gradient: ['#0f1a1a', '#065f46'] },
            red: { name: '科技红', gradient: ['#1a0f0f', '#991b1b'] },
            cyber: { name: '赛博朋克', gradient: ['#0f0f1a', '#4c1d95'] },
            space: { name: '太空深蓝', gradient: ['#0a0a1a', '#1e40af'] },
            matrix: { name: '矩阵网格', gradient: ['#000500', '#001a00'] },
            circuit: { name: '电子电路', gradient: ['#050a15', '#0a1e3c'] },
            blueprint: { name: '蓝图设计', gradient: ['#001a33', '#003366'] },
            nebula: { name: '深邃星云', gradient: ['#050010', '#150025'] }
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
        if (theme === 'none') {
            this.bgThemeEnabled = false;
        } else if (this.backgroundThemes[theme]) {
            this.backgroundColor = theme;
            this.bgThemeEnabled = true;
            console.log(`背景色已切换为: ${this.backgroundThemes[theme].name}`);
        }
        
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

            // 根据排序方式进行排序（目标是让“冠军”排在最后，以实现最后弹出的动画效果）
            if (this.sortOrder === 'asc') {
                // 从小到大：数值越小排名越靠前，最小值是第1名，应该排在最后弹出
                items.sort((a, b) => b.value - a.value);
            } else {
                // 从大到小：数值越大排名越靠前，最大值是第1名，应该排在最后弹出
                items.sort((a, b) => a.value - b.value);
            }

            // 计算所有数据中的最大值和最小值，用于视觉效果计算
            const values = items.map(it => it.value);
            const maxValue = Math.max(...values);
            const minValue = Math.min(...values);
            const valueRange = maxValue - minValue || 1;

            // 为每个项目分配随机颜色和透明度
            items.forEach((item) => {
                // 生成完全随机的颜色（每次运行都不一样）
                item.color = this.generateRandomColor();
                // 根据值在范围中的比例设置透明度：0.5 到 1.0
                const valueRatio = (item.value - minValue) / valueRange;
                item.opacity = 0.5 + valueRatio * 0.5;
            });

            // 动态更新烟花触发名次下拉框
            this.updateFireworkTriggerOptions(items.length);

            return items;
        } catch (error) {
            this.showError('JSON解析错误: ' + error.message);
            return [];
        }
    }

    /**
     * 动态更新烟花触发名次下拉框选项
     */
    updateFireworkTriggerOptions(itemCount) {
        if (!this.fireworksTriggerRankSelect) return;
        
        const currentValue = this.fireworksTriggerRankSelect.value;
        this.fireworksTriggerRankSelect.innerHTML = '';
        
        for (let i = 1; i <= itemCount; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `第${i}名`;
            this.fireworksTriggerRankSelect.appendChild(option);
        }
        
        // 尝试恢复之前选中的值，如果没有则默认选第3名（如果存在）
        if (currentValue && parseInt(currentValue) <= itemCount) {
            this.fireworksTriggerRankSelect.value = currentValue;
            this.fireworksTriggerRank = parseInt(currentValue);
        } else {
            // 默认选第3名（index 2），如果项数不足3则选最后一名
            const defaultRank = Math.min(3, itemCount);
            this.fireworksTriggerRankSelect.value = defaultRank;
            this.fireworksTriggerRank = defaultRank;
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
        this.sortOrderRadios = document.getElementsByName('sort-order');
        this.redPacketRadios = document.getElementsByName('red-packet-enable'); // 新增：红包开关
        this.petalsRadios = document.getElementsByName('petals-enable'); // 新增：花瓣开关
        this.runButton = document.getElementById('run-animation');
        this.downloadButton = document.getElementById('download-video');
        this.rankingContent = document.getElementById('ranking-content');
        this.rankingTitle = document.getElementById('ranking-title');
        this.recordingStatus = document.getElementById('recording-status');
        this.rankingContainer = document.getElementById('ranking-container');
        this.canvas = document.getElementById('ranking-canvas');

        // 新增：烟花控制元素
        this.fireworksEnableRadios = document.getElementsByName('fireworks-enable');
        this.fireworksConfigContainer = document.getElementById('fireworks-config-container');
        this.fireworksTriggerRankSelect = document.getElementById('fireworks-trigger-rank');
        this.fireworksDensityInput = document.getElementById('fireworks-density');
        this.fireworksDensityDisplay = document.getElementById('fireworks-density-display');
        this.fireworksShapeSelect = document.getElementById('fireworks-shape');

        // 初始化烟花配置面板显示状态
        if (this.fireworksEnableRadios.length > 0 && this.fireworksConfigContainer) {
            const checkedRadio = Array.from(this.fireworksEnableRadios).find(r => r.checked);
            const isEnabled = checkedRadio ? checkedRadio.value === 'on' : true;
            this.fireworksConfigContainer.style.display = isEnabled ? 'block' : 'none';
        }
        
        // 新增：背景图控件与 DOM 预览元素
        this.bgImageInput = document.getElementById('bg-image-input');
        this.clearBgImageBtn = document.getElementById('clear-bg-image');
        this.bgOpacityInput = document.getElementById('bg-opacity');
        this.rankingBgImageEl = document.getElementById('ranking-bg-image');
        // 新增：数值显示设置
        this.valuePositionRadios = document.getElementsByName('value-position');
        this.valueColorInput = document.getElementById('value-color-input');
        this.nonTopTwoOutsideCheckbox = document.getElementById('non-top-two-outside');
        
        // 新增：背景主题启用设置
        this.bgThemeEnableRadios = document.getElementsByName('bg-theme-enable');
        this.bgThemeSelectContainer = document.getElementById('bg-theme-select-container');
        
        // 新增：弹幕设置
        this.danmakuEnableRadios = document.getElementsByName('danmaku-enable');
        this.danmakuColorInput = document.getElementById('danmaku-color-input');
        this.danmakuSizeInput = document.getElementById('danmaku-size-input');
        this.danmakuSizeValue = document.getElementById('danmaku-size-value');
        this.danmakuContentInput = document.getElementById('danmaku-content');
    }


    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // Tab切换
        document.querySelectorAll('.tab-item').forEach(button => {
            button.addEventListener('click', (e) => this.handleSettingsTabSwitch(e));
        });

        // 原有的数据 Tab 切换
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

        // 清除背景图
        if (this.clearBgImageBtn) {
            this.clearBgImageBtn.addEventListener('click', () => {
                if (this.bgImageInput) this.bgImageInput.value = '';
                this.bgImageUrl = null;
                this.bgImageObj = null;
                if (this.rankingBgImageEl) {
                    this.rankingBgImageEl.src = '';
                    this.rankingBgImageEl.style.display = 'none';
                }
                console.log('背景图已清除');
                
                // 如果正在预览或播放，重新绘制
                if (this.isPreview || this.isRecording) {
                    this.draw();
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

        // 数值显示设置 (单选框)
        if (this.showValuesRadios && this.showValuesRadios.length > 0) {
            this.showValuesRadios.forEach(radio => {
                if (radio.checked) {
                    this.showValues = (radio.value === 'yes');
                }
                radio.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.showValues = (e.target.value === 'yes');
                    }
                });
            });
        } else {
            this.showValues = true;
        }

        // 数值位置设置 (单选框)
        if (this.valuePositionRadios && this.valuePositionRadios.length > 0) {
            const updateVisibility = (value) => {
                this.valuePosition = value;
                
                // 实时预览更新
                if (this.isPreview || this.isRecording) {
                    this.draw();
                }
            };

            // 初始化值
            let initialValue = 'inside-bar';
            this.valuePositionRadios.forEach(radio => {
                if (radio.checked) initialValue = radio.value;
                radio.addEventListener('change', (e) => {
                    if (e.target.checked) updateVisibility(e.target.value);
                });
            });
            updateVisibility(initialValue);
        } else {
            this.valuePosition = 'inside-bar';
        }

         // 特殊规则：前二名
        if (this.nonTopTwoOutsideCheckbox) {
            this.nonTopTwoOutside = !!this.nonTopTwoOutsideCheckbox.checked;
            this.nonTopTwoOutsideCheckbox.addEventListener('change', (e) => {
                this.nonTopTwoOutside = !!e.target.checked;
                // 实时预览更新
                if (this.isPreview || this.isRecording) {
                    this.draw();
                }
            });
        }

        // 数值颜色设置
        if (this.valueColorInput) {
            this.valueColor = this.valueColorInput.value || '#ffffff';
            this.valueColorInput.addEventListener('input', (e) => {
                this.valueColor = e.target.value;
                
                // 实时预览更新
                if (this.isPreview || this.isRecording) {
                    this.draw();
                }
            });
        } else {
            this.valueColor = '#ffffff';
        }

        // 背景主题启用设置
        if (this.bgThemeEnableRadios && this.bgThemeEnableRadios.length > 0) {
            const updateBgThemeVisibility = (value) => {
                this.bgThemeEnabled = (value === 'yes');
                if (this.bgThemeSelectContainer) {
                    this.bgThemeSelectContainer.style.display = (value === 'yes') ? 'flex' : 'none';
                }
            };
            
            let initialBgEnable = 'yes';
            this.bgThemeEnableRadios.forEach(radio => {
                if (radio.checked) initialBgEnable = radio.value;
                radio.addEventListener('change', (e) => {
                    if (e.target.checked) updateBgThemeVisibility(e.target.value);
                });
            });
            updateBgThemeVisibility(initialBgEnable);
        } else {
            this.bgThemeEnabled = true;
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

        // 排序方式设置
        if (this.sortOrderRadios && this.sortOrderRadios.length > 0) {
            this.sortOrderRadios.forEach(radio => {
                if (radio.checked) this.sortOrder = radio.value;
                radio.addEventListener('change', (e) => {
                    if (e.target.checked) this.sortOrder = e.target.value;
                });
            });
        }

        // 红包开关设置
        if (this.redPacketRadios && this.redPacketRadios.length > 0) {
            this.redPacketRadios.forEach(radio => {
                if (radio.checked) this.redPacketsEnabled = (radio.value === 'on');
                radio.addEventListener('change', (e) => {
                    if (e.target.checked) this.redPacketsEnabled = (e.target.value === 'on');
                });
            });
        }

        // 花瓣开关设置
        if (this.petalsRadios && this.petalsRadios.length > 0) {
            this.petalsRadios.forEach(radio => {
                if (radio.checked) this.petalsEnabled = (radio.value === 'on');
                radio.addEventListener('change', (e) => {
                    if (e.target.checked) this.petalsEnabled = (e.target.value === 'on');
                });
            });
        }

        // 烟花控件事件（若存在）
        if (this.fireworksEnableRadios.length > 0) {
            this.fireworksEnableRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    const isEnabled = radio.value === 'on';
                    this.fireworksEnabled = isEnabled;
                    if (this.fireworksConfigContainer) {
                        this.fireworksConfigContainer.style.display = isEnabled ? 'block' : 'none';
                    }
                });
            });
        }
        if (this.fireworksTriggerRankSelect) {
            this.fireworksTriggerRankSelect.addEventListener('change', () => {
                this.fireworksTriggerRank = parseInt(this.fireworksTriggerRankSelect.value) || 3;
            });
        }
        if (this.fireworksDensityInput) {
            this.fireworksDensityInput.addEventListener('input', () => {
                const v = parseInt(this.fireworksDensityInput.value);
                if (!isNaN(v)) {
                    this.fireworksDensity = v;
                    if (this.fireworksDensityDisplay) {
                        this.fireworksDensityDisplay.textContent = v;
                    }
                    // 根据密度动态调整发射间隔：密度 1(3000ms) -> 10(300ms)
                    this.fireworkSpawnInterval = 3300 - (v * 300);
                }
            });
        }
        if (this.fireworksShapeSelect) {
            this.fireworksShapeSelect.addEventListener('change', () => {
                this.fireworksShape = this.fireworksShapeSelect.value;
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
        
        // 弹幕设置
        if (this.danmakuEnableRadios && this.danmakuEnableRadios.length > 0) {
            this.danmakuEnableRadios.forEach(radio => {
                if (radio.checked) this.danmakuEnabled = (radio.value === 'on');
                radio.addEventListener('change', (e) => {
                    if (e.target.checked) this.danmakuEnabled = (e.target.value === 'on');
                });
            });
        }
        
        if (this.danmakuColorInput) {
            this.danmakuColor = this.danmakuColorInput.value || '#ffffff';
            this.danmakuColorInput.addEventListener('input', (e) => {
                this.danmakuColor = e.target.value || '#ffffff';
            });
        }
        
        if (this.danmakuSizeInput && this.danmakuSizeValue) {
            this.danmakuSize = parseInt(this.danmakuSizeInput.value) || 20;
            this.danmakuSizeValue.textContent = this.danmakuSize + 'px';
            
            this.danmakuSizeInput.addEventListener('input', (e) => {
                this.danmakuSize = parseInt(e.target.value) || 20;
                this.danmakuSizeValue.textContent = this.danmakuSize + 'px';
            });
        }
        
        if (this.danmakuContentInput) {
            this.danmakuContent = this.danmakuContentInput.value || '太棒了,恭喜,加油,优秀,厉害';
            this.danmakuContentInput.addEventListener('input', (e) => {
                this.danmakuContent = e.target.value || '太棒了,恭喜,加油,优秀,厉害';
            });
        }
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
            if (this.fireworksEnableRadios.length > 0) {
                const checkedRadio = Array.from(this.fireworksEnableRadios).find(r => r.checked);
                this.fireworksEnabled = checkedRadio ? checkedRadio.value === 'on' : true;
            }
            if (this.fireworksTriggerRankSelect) {
                this.fireworksTriggerRank = parseInt(this.fireworksTriggerRankSelect.value) || 3;
            }
            if (this.fireworksDensityInput) {
                this.fireworksDensity = parseInt(this.fireworksDensityInput.value) || 5;
                this.fireworkSpawnInterval = 3300 - (this.fireworksDensity * 300);
            }
            if (this.fireworksShapeSelect) this.fireworksShape = this.fireworksShapeSelect.value;

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
     * 处理配置区域 Tab 切换
     */
    handleSettingsTabSwitch(e) {
        const button = e.currentTarget;
        const tabId = button.dataset.tab;

        // 更新按钮状态
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        // 更新内容显示
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        const targetPane = document.getElementById(tabId);
        if (targetPane) {
            targetPane.classList.add('active');
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
            if (this.fireworksEnableRadios.length > 0) {
                const checkedRadio = Array.from(this.fireworksEnableRadios).find(r => r.checked);
                this.fireworksEnabled = checkedRadio ? checkedRadio.value === 'on' : true;
            }
            if (this.fireworksTriggerRankSelect) {
                this.fireworksTriggerRank = parseInt(this.fireworksTriggerRankSelect.value) || 3;
            }
            if (this.fireworksDensityInput) {
                this.fireworksDensity = parseInt(this.fireworksDensityInput.value) || 5;
                this.fireworkSpawnInterval = 3300 - (this.fireworksDensity * 300);
            }
            if (this.fireworksShapeSelect) {
                this.fireworksShape = this.fireworksShapeSelect.value;
            }

            this.log(`fireworks enabled=${this.fireworksEnabled}`);

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

        // 计算全局最大值（用于条形图百分比基准）
        const maxValue = Math.max(...this.data.map(item => item.value));

        // 为每个项目设置动画参数
        // 数组末尾的项目是“冠军”，将最后弹出
        for (let i = 0; i < maxCount; i++) {
            const item = this.data[i];
            const actualRank = i + 1; // 第12名是1，第1名是12（弹出顺序）
            const displayRank = maxCount - i; // 实际排名：数组末尾的项目始终是第1名
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
            case 'fly-down':
                return {y: -300, x: 0, scale: 1, rotation: 0};
            case 'glitch':
                return {y: 0, x: 0, scale: 1, rotation: 0};
            case 'scan':
                return {y: 0, x: 0, scale: 1, rotation: 0, currentBarScale: 0, scanProgress: 0};
            case 'wave':
                return {y: 0, x: 0, scale: 1, rotation: 0};
            default:
                return {y: -50, x: 0, scale: 1, rotation: 0};
        }
    }

    /**
     * 绘制呼吸灯效果：全局背景光晕
     */
    drawBreathingEffect(currentTime) {
        if (!this.ctx || !this.bgThemeEnabled) return;

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
         if (!this.ctx || !this.techEnabled || !this.bgThemeEnabled) return;

         const currentTheme = this.backgroundColor;
         
         // 如果是新增的静态背景，绘制静态图案
         if (['matrix', 'circuit', 'blueprint', 'nebula'].includes(currentTheme)) {
             this.drawStaticTechBackground(currentTheme);
             return;
         }

         // 否则绘制原有的动态科技感效果
         this.drawDigitalRain(currentTime);
         this.drawGridLines(currentTime);
         this.drawStarParticles(currentTime);
     }

     /**
      * 绘制静态科技感背景图案
      */
     drawStaticTechBackground(theme) {
         this.ctx.save();
         
         switch (theme) {
             case 'matrix':
                 // 绘制密集网格矩阵
                 this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
                 this.ctx.lineWidth = 1;
                 const matrixSize = 20;
                 for (let x = 0; x < this.canvasWidth; x += matrixSize) {
                     for (let y = 0; y < this.canvasHeight; y += matrixSize) {
                         if (Math.random() > 0.9) {
                             this.ctx.fillStyle = 'rgba(0, 255, 0, 0.05)';
                             this.ctx.fillRect(x, y, matrixSize, matrixSize);
                         }
                         this.ctx.strokeRect(x, y, matrixSize, matrixSize);
                     }
                 }
                 break;
                 
             case 'circuit':
                 // 绘制电子电路线条
                 this.ctx.strokeStyle = 'rgba(0, 200, 255, 0.15)';
                 this.ctx.lineWidth = 1.5;
                 const seed = 12345; // 固定随机种子以保持静态
                 let tempRandom = (s) => {
                     s = Math.sin(s) * 10000;
                     return s - Math.floor(s);
                 };
                 
                 for (let i = 0; i < 40; i++) {
                     let x = tempRandom(i * 1.1) * this.canvasWidth;
                     let y = tempRandom(i * 1.2) * this.canvasHeight;
                     let len = 50 + tempRandom(i * 1.3) * 150;
                     let angle = Math.floor(tempRandom(i * 1.4) * 4) * 90; // 0, 90, 180, 270
                     
                     this.ctx.beginPath();
                     this.ctx.moveTo(x, y);
                     let dx = Math.cos(angle * Math.PI / 180) * len;
                     let dy = Math.sin(angle * Math.PI / 180) * len;
                     this.ctx.lineTo(x + dx, y + dy);
                     this.ctx.stroke();
                     
                     // 绘制接点圆圈
                     this.ctx.beginPath();
                     this.ctx.arc(x, y, 3, 0, Math.PI * 2);
                     this.ctx.stroke();
                 }
                 break;
                 
             case 'blueprint':
                 // 绘制蓝图设计感网格
                 this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                 this.ctx.lineWidth = 0.5;
                 // 大方格
                 for (let x = 0; x < this.canvasWidth; x += 100) {
                     this.ctx.beginPath();
                     this.ctx.moveTo(x, 0);
                     this.ctx.lineTo(x, this.canvasHeight);
                     this.ctx.stroke();
                 }
                 for (let y = 0; y < this.canvasHeight; y += 100) {
                     this.ctx.beginPath();
                     this.ctx.moveTo(0, y);
                     this.ctx.lineTo(this.canvasWidth, y);
                     this.ctx.stroke();
                 }
                 // 小方格
                 this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
                 for (let x = 0; x < this.canvasWidth; x += 20) {
                     this.ctx.beginPath();
                     this.ctx.moveTo(x, 0);
                     this.ctx.lineTo(x, this.canvasHeight);
                     this.ctx.stroke();
                 }
                 for (let y = 0; y < this.canvasHeight; y += 20) {
                     this.ctx.beginPath();
                     this.ctx.moveTo(0, y);
                     this.ctx.lineTo(this.canvasWidth, y);
                     this.ctx.stroke();
                 }
                 break;
                 
             case 'nebula':
                 // 绘制深邃星云感
                 for (let i = 0; i < 5; i++) {
                     const x = (i / 5) * this.canvasWidth + (Math.sin(i) * 100);
                     const y = (i % 2) * (this.canvasHeight / 2) + 200;
                     const radius = 300 + i * 50;
                     const grad = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
                     const colors = [
                         'rgba(100, 0, 255, 0.05)',
                         'rgba(0, 100, 255, 0.03)',
                         'rgba(255, 0, 100, 0.02)',
                         'rgba(0, 0, 0, 0)'
                     ];
                     grad.addColorStop(0, colors[i % colors.length]);
                     grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                     this.ctx.fillStyle = grad;
                     this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
                 }
                 break;
         }
         
         this.ctx.restore();
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

         this.ctx.save();
         
         const glowIntensity = Math.sin(currentTime * 0.005) * 0.3 + 0.7;
         const glowGradient = this.ctx.createLinearGradient(x, y, x + width, y);
         
         glowGradient.addColorStop(0, `rgba(0, 255, 255, ${0.3 * glowIntensity})`);
         glowGradient.addColorStop(0.5, `rgba(64, 156, 255, ${0.5 * glowIntensity})`);
         glowGradient.addColorStop(1, `rgba(0, 255, 255, ${0.3 * glowIntensity})`);
         
         this.ctx.strokeStyle = glowGradient;
         this.ctx.lineWidth = 3;
         this.ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);

        const innerGlow = this.ctx.createLinearGradient(x, y, x + width, y);
        innerGlow.addColorStop(0, `rgba(255, 255, 255, ${0.08 * glowIntensity})`);
        innerGlow.addColorStop(0.5, `rgba(0, 255, 255, ${0.12 * glowIntensity})`);
        innerGlow.addColorStop(1, `rgba(255, 255, 255, ${0.06 * glowIntensity})`);
        this.ctx.fillStyle = innerGlow;
        this.ctx.globalCompositeOperation = 'screen';
        this.ctx.fillRect(x, y, width, height);

        const sweep = (currentTime * 0.002 + item.displayRank * 0.07) % 1;
        const sweepX = x + width * sweep;
        const sweepWidth = Math.max(4, width * 0.06);
        const sweepGradient = this.ctx.createLinearGradient(sweepX - sweepWidth, y, sweepX + sweepWidth, y);
        sweepGradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
        sweepGradient.addColorStop(0.5, `rgba(0, 255, 255, ${0.35 * glowIntensity})`);
        sweepGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
        this.ctx.fillStyle = sweepGradient;
        this.ctx.fillRect(sweepX - sweepWidth, y, sweepWidth * 2, height);

        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.strokeStyle = `rgba(0, 255, 255, ${0.12 * glowIntensity})`;
        this.ctx.lineWidth = 1;
        const stripeGap = 8;
        for (let i = -height; i < width + height; i += stripeGap) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + i, y + height);
            this.ctx.lineTo(x + i + height, y);
            this.ctx.stroke();
        }

         this.ctx.restore();
     }

    /**
     * 在 Canvas 上运行动画
     */
    async runCanvasAnimation() {
        return new Promise((resolve) => {
            this.animationStartTime = performance.now();
            
            // 重置红包状态
            this.redPackets = [];
            this.lastRedPacketSpawn = 0;

            // 重置花瓣状态
            this.petals = [];
            this.lastPetalSpawn = 0;
            
            // 重置弹幕状态
            this.danmakuList = [];
            this.lastDanmakuSpawn = 0;

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

                // 新增：触发烟花逻辑改为在选定名次播放期间触发，并在全部完成后停止
                try {
                    const triggerRank = this.fireworksTriggerRank || 3;
                    // 所有符合触发条件的项目（包括还没开始动画的项目）
                    const allPotentialTriggerItems = this.animationItems.filter(it => it.displayRank <= triggerRank);
                    // 已经在绘制的项目中符合触发条件的
                    const triggerItems = allPotentialTriggerItems.filter(it => it._lastDrawPos);
                    
                    const triggerItemsAnimating = triggerItems.length > 0 && triggerItems.some(it => it.animate);
                    // 判定是否全部完成：所有潜在的触发项目都必须已动画且进度完成
                    const triggerItemsAllDone = allPotentialTriggerItems.length > 0 && 
                        allPotentialTriggerItems.every(it => it.animate && (currentTime - it.startTime >= this.flyInDuration));

                    // 在选定名次任一开始弹入时有概率启动烟花（只要用户启用）
                    // 增加最小启动延迟，避免连续多次运行时立即触发烟花
                    const FIREWORKS_MIN_START_DELAY = 150; // ms
                    const FIREWORKS_CHANCE = 0.3; // 30%的概率触发烟花
                    if (triggerItemsAnimating && this.fireworksEnabled && !this.fireworksActive && 
                        (currentTime - this.animationStartTime) > FIREWORKS_MIN_START_DELAY &&
                        Math.random() < FIREWORKS_CHANCE) {
                        this.startFireworks();
                    }

                    // 在选定名次全部完成且没有未完成的火箭/粒子时停止烟花
                    if (this.fireworksActive && triggerItemsAllDone && this.fireworkRockets.length === 0 && this.fireworkParticles.length === 0) {
                        // 小缓冲，确保视觉完整
                        setTimeout(() => this.stopFireworks(), 300);
                    }
                } catch (e) {
                    // ignore
                }

                // 更新并绘制烟花（如果激活）
                this.updateAndDrawFireworks(currentTime);

                // 更新并绘制随机红包（如果开启）
                this.updateAndDrawRedPackets(currentTime);

                // 更新并绘制花瓣特效（如果开启）
                this.updateAndDrawPetals(currentTime);
                
                // 更新并绘制弹幕（如果开启）
                this.updateAndDrawDanmaku(currentTime);

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
            case 'fly-down':
                this.updateFlyDownAnimation(item, progress);
                break;
            case 'glitch':
                this.updateGlitchAnimation(item, progress);
                break;
            case 'scan':
                this.updateScanAnimation(item, progress);
                break;
            case 'wave':
                this.updateWaveAnimation(item, progress);
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
     * 上方飞入式动画更新
     */
    updateFlyDownAnimation(item, progress) {
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
        
        // 计算条目在排行榜中的目标 Y 坐标（基于 displayRank）
        const itemHeight = 35;
        const itemMargin = 15;
        const startY = 120;
        const targetY = startY + (item.displayRank - 1) * (itemHeight + itemMargin);
        
        // 初始位置统一设为 Canvas 顶部外（例如 -100 像素）
        const initialY = -100;
        
        // 计算飞入所需的总距离
        const totalDistance = targetY - initialY;
        
        // 根据进度计算当前位置，确保最终位置为 targetY
        // 注意：drawItem 中已经会加上 targetY，所以这里计算的是偏移量
        // item.currentY = initialY + totalDistance * easeOutBounce(progress) - targetY;
        
        // 简化逻辑：在 drawItem 中我们使用 translate(0, offsetY)
        // 其中 offsetY = item.currentY。
        // 我们希望最终绘制坐标是 targetY，
        // 而 drawItem 中默认绘制坐标已经是 targetY (通过 startY + ... 计算得出)
        // 所以当 progress = 1 时，offsetY 必须为 0。
        // 当 progress = 0 时，offsetY 应使 y + offsetY = initialY => offsetY = initialY - targetY。
        
        item.currentY = (initialY - targetY) * (1 - easeOutBounce(progress));
    }

    updateGlitchAnimation(item, progress) {
        const easeOut = (t) => 1 - Math.pow(1 - t, 3);
        const eased = easeOut(progress);
        const t = performance.now() * 0.04;
        const flicker = Math.sin(t * 0.9 + item.popupRank) * 0.18;
        const spike = Math.max(0, Math.sin(t * 0.6 + item.displayRank) - 0.82);
        const jitter = (1 - eased) * (12 + spike * 60);
        item.currentX = Math.sin(t + item.popupRank) * jitter + Math.cos(t * 1.3 + item.displayRank) * jitter * 0.7;
        item.currentOpacity = Math.min(1, eased + flicker);
        item.currentSkew = (Math.sin(t * 0.7 + item.displayRank) * 0.12 + spike * 0.35) * (1 - eased);
    }

    updateScanAnimation(item, progress) {
        const easeOut = (t) => 1 - Math.pow(1 - t, 3);
        const eased = easeOut(progress);
        const overshoot = Math.min(1, eased + Math.sin(eased * Math.PI) * 0.08);
        item.currentBarScale = overshoot;
        item.scanProgress = eased;
        item.currentOpacity = eased;
    }

    updateWaveAnimation(item, progress) {
        const easeOut = (t) => 1 - Math.pow(1 - t, 3);
        const eased = easeOut(progress);
        const t = performance.now() * 0.004;
        const wave = Math.sin(t + item.displayRank * 0.7) * (1 - eased) * 16;
        const settle = Math.sin(eased * Math.PI) * 0.08;
        item.currentY = wave;
        item.currentScale = 0.9 + 0.1 * eased + settle;
        item.currentOpacity = eased;
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
        if (this.bgThemeEnabled) {
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
        } else if (!this.bgImageObj) {
            // 如果既没有背景主题也没有背景图，则绘制一个纯黑背景作为兜底
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        }

        // 确保清除画布后，全局透明度恢复为 1，避免影响后续绘制
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
            case 'glitch':
            case 'scan':
            case 'wave':
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
        if (this.animationType === 'fade' || this.animationType === 'flip' || this.animationType === 'glitch' || this.animationType === 'scan' || this.animationType === 'wave') {
            // 使用在 updateAnimationState 中已计算好的 currentOpacity
            drawOpacity *= (item.currentOpacity !== undefined ? item.currentOpacity : 1);
        }

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
            case 'fly-down':
                // 升降机式或上方飞入式 - 使用预先计算好的 currentY
                const offsetY = item.currentY !== undefined ? item.currentY : 0;
                this.ctx.translate(0, offsetY);
                break;
            case 'glitch':
                const glitchX = item.currentX !== undefined ? item.currentX : 0;
                const glitchSkew = item.currentSkew !== undefined ? item.currentSkew : 0;
                this.ctx.translate(glitchX, 0);
                this.ctx.transform(1, glitchSkew, 0, 1, 0, 0);
                break;
            case 'wave':
                const waveOffset = item.currentY !== undefined ? item.currentY : 0;
                const waveScale = item.currentScale !== undefined ? item.currentScale : 1;
                this.ctx.translate(centerX, centerY + waveOffset);
                this.ctx.scale(waveScale, waveScale);
                this.ctx.translate(-centerX, -(centerY + waveOffset));
                break;
        }

        // 计算条形图宽度
        const maxBarWidth = this.canvasWidth - 40;
        const baseBarWidth = (item.percentage / 100) * maxBarWidth;
        const barScale = this.animationType === 'scan' ? (item.currentBarScale !== undefined ? item.currentBarScale : 0) : 1;
        const barWidth = baseBarWidth * barScale;

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
        if (this.animationType === 'scan') {
            const sweepWidth = Math.max(6, barWidth * 0.08);
            const sweepX = 20 + barWidth;
            const sweepGradient = this.ctx.createLinearGradient(sweepX - sweepWidth, y, sweepX + sweepWidth, y);
            sweepGradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
            sweepGradient.addColorStop(0.5, `rgba(0, 255, 255, ${0.6 * drawOpacity})`);
            sweepGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            this.ctx.save();
            this.ctx.fillStyle = sweepGradient;
            this.ctx.fillRect(sweepX - sweepWidth, y, sweepWidth * 2, itemHeight);
            this.ctx.restore();
        }

        // 绘制排名
        this.ctx.fillStyle = '#ffffff';
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
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'left';
        this.ctx.font = '600 20px -apple-system, sans-serif';
        this.ctx.fillText(item.name, 55, y + itemHeight / 2);
        if (this.animationType === 'glitch') {
            const shift = Math.max(1, Math.abs(item.currentX || 0) * 0.15);
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.globalAlpha = 0.8; // 固定透明度，不再随项目透明度变化
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
            this.ctx.fillText(item.name, 55 + shift, y + itemHeight / 2 - 1);
            this.ctx.fillStyle = 'rgba(255, 0, 128, 0.6)';
            this.ctx.fillText(item.name, 55 - shift, y + itemHeight / 2 + 1);
            this.ctx.restore();
        }

        // 数值绘制（根据设置决定位置和是否显示）
        if (this.showValues !== false) {
            this.ctx.fillStyle = this.valueColor || '#ffffff';
            this.ctx.globalAlpha = 1.0; // 文字保持完全不透明，不受背景透明度影响
            this.ctx.font = '20px -apple-system, sans-serif';
            
            let valueX;
            // 特殊规则：前二名始终在条形图末端（内部），其他排名根据配置决定
            const isTop2 = item.displayRank <= 2 && this.nonTopTwoOutside;
            const effectivePosition = isTop2 ? 'inside-bar' : this.valuePosition;

            if (effectivePosition === 'outside-bar') {
                this.ctx.textAlign = 'left';
                // 计算数值的最大宽度，用于确定对齐起点
                // 假设数值最大位数为 10 位，大致宽度在 100px 左右
                // 为了让数值左对齐且紧贴右侧 20px 边距，我们需要从右侧边界向左偏移一个固定宽度
                const valueMaxWidth = 100; 
                valueX = this.canvasWidth - 20 - valueMaxWidth;
            } else {
                this.ctx.textAlign = 'right';
                // “条形图末端”模式（及前二名）始终使用固定内部偏移 10px
                valueX = 20 + barWidth - 10;
            }
            
            this.ctx.fillText(item.value.toString(), valueX, y + itemHeight / 2);
            
            if (this.animationType === 'glitch') {
                const shift = Math.max(1, Math.abs(item.currentX || 0) * 0.15);
                this.ctx.save();
                this.ctx.globalCompositeOperation = 'screen';
                this.ctx.globalAlpha = 0.8; // 固定透明度
                this.ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
                this.ctx.fillText(item.value.toString(), valueX + (effectivePosition === 'outside-bar' ? shift : -shift), y + itemHeight / 2 - 1);
                this.ctx.fillStyle = 'rgba(255, 0, 128, 0.6)';
                this.ctx.fillText(item.value.toString(), valueX - (effectivePosition === 'outside-bar' ? shift : -shift), y + itemHeight / 2 + 1);
                this.ctx.restore();
            }
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
        this.fireworkRings = [];
        // this.fireworkSmoke = []; // 暂时移除烟雾粒子系统
        this.log('Fireworks (rockets) started');
    }

    stopFireworks() {
        this.fireworksActive = false;
        // 不立即清空，让残余粒子自然消失以保证视觉完整性
        this.log('Fireworks stopped');
    }

    // 发射一枚火箭，从画布底部发射并在接近目标时爆炸
    spawnRocketTowards(targetX, targetY, rank = 10) {
        const startX = Math.max(40, Math.min(this.canvasWidth - 40, targetX + (Math.random() - 0.5) * 120));
        const startY = this.canvasHeight + 10;
        
        // 目标高度：在条形图上方随机位置爆炸
        // 优化：显著增加基础上升高度，让所有烟花都飞得更高
        let explosionY = targetY - (150 + Math.random() * 100);
        
        // 名次加成：名次越小（越靠前），额外上升高度越高
        // 扩大加成范围到前 20 名，并增加加成力度
        if (rank <= 20) {
            const heightBonus = (21 - rank) * 20; // 第一名额外上升 400px，第二十名 20px
            explosionY -= heightBonus;
        }
        
        // 确保不会飞出画布顶端（留出 60px 边距供爆炸效果展示）
        explosionY = Math.max(60, explosionY);
        
        // 计算初始速度以到达目标高度（物理公式：v^2 = 2gh）
        const gravity = 0.0015; // 稍强的重力
        // 安全检查：确保目标点在起点上方，否则至少保留 100px 的上升高度，防止 Math.sqrt(负数) 产生 NaN
        const height = Math.max(100, startY - explosionY);
        const vy = -Math.sqrt(2 * gravity * height) * (0.9 + Math.random() * 0.2);
        
        // 计算水平速度
        const vx = (targetX - startX) / (Math.abs(vy) / gravity * 2);
        
        // 随机选择颜色
        const colors = [
            ['#FF3333', '#FFCC33', '#FFFFFF'], // 红金白
            ['#33CCFF', '#FFFFFF', '#3366FF'], // 蓝白
            ['#CC33FF', '#FF33CC', '#FFFFFF'], // 紫粉白
            ['#33FF99', '#FFFF33', '#FFFFFF']  // 绿黄白
        ][Math.floor(Math.random() * 4)];
        
        this.fireworkRockets.push({
            x: startX,
            y: startY,
            vx: vx,
            vy: vy,
            gravity: gravity,
            age: 0,
            targetY: explosionY,
            colors: colors,
            trail: [],
            exploded: false
        });
    }

    // 爆炸成粒子（支持多种图案和自定义密度）
    spawnExplosion(x, y, colors) {
        const densityMultiplier = (this.fireworksDensity || 5) / 5;
        const particleCount = Math.floor((100 + Math.random() * 50) * densityMultiplier);
        const shape = this.fireworksShape === 'random' ? 
            ['circle', 'heart', 'star', 'burst'][Math.floor(Math.random() * 4)] : 
            (this.fireworksShape || 'circle');
        
        for (let i = 0; i < particleCount; i++) {
            let vx, vy;
            const t = (i / particleCount) * Math.PI * 2;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const baseForce = (3 + Math.random() * 5) * (this.fireworksSpeedMul || 1);

            if (shape === 'heart') {
                // 心形公式: x = 16sin^3(t), y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
                const force = baseForce * 0.4;
                vx = 16 * Math.pow(Math.sin(t), 3) * force * 0.1;
                vy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * force * 0.1;
                // 添加一点随机抖动使效果更自然
                vx += (Math.random() - 0.5) * 0.5;
                vy += (Math.random() - 0.5) * 0.5;
            } else if (shape === 'star') {
                // 星形: 五角星效果
                const arms = 5;
                const innerRadius = 0.5;
                const rot = (Math.PI / 2) * 3;
                const step = Math.PI / arms;
                
                // 模拟星形路径的速度分布
                const angle = t;
                const modStep = angle % (step * 2);
                const r = modStep < step ? 
                    1.0 - (modStep / step) * (1.0 - innerRadius) : 
                    innerRadius + ((modStep - step) / step) * (1.0 - innerRadius);
                
                const force = baseForce * r;
                vx = Math.cos(angle) * force;
                vy = Math.sin(angle) * force;
            } else if (shape === 'burst') {
                // 爆炸散射: 多个射线方向
                const rayCount = 8;
                const rayAngle = Math.floor(t / (Math.PI * 2) * rayCount) * (Math.PI * 2 / rayCount);
                const isRay = Math.random() > 0.3;
                const force = isRay ? baseForce * 1.2 : baseForce * 0.5;
                const angle = isRay ? rayAngle + (Math.random() - 0.5) * 0.1 : t;
                vx = Math.cos(angle) * force;
                vy = Math.sin(angle) * force;
            } else {
                // 经典圆形
                const angle = Math.random() * Math.PI * 2;
                const force = Math.random() * baseForce;
                vx = Math.cos(angle) * force;
                vy = Math.sin(angle) * force;
            }
            
            this.fireworkParticles.push({
                x: x,
                y: y,
                vx: vx,
                vy: vy,
                drag: 0.94 + Math.random() * 0.04, // 空气阻力
                gravity: 0.12, // 重力
                age: 0,
                life: (800 + Math.random() * 1000) * (this.fireworksSpeedMul || 1),
                size: 1.5 + Math.random() * 2,
                color: color,
                trail: [],
                spark: Math.random() > 0.4 // 是否有闪烁火花效果
            });
        }
        
        // 添加核心闪光
        this.fireworkRings.push({
            x, y,
            radius: 0,
            maxRadius: 60 * densityMultiplier,
            age: 0,
            life: 200,
            color: '#FFFFFF',
            thickness: 2
        });
    }

    updateAndDrawFireworks(currentTime) {
        if (!this.ctx) return;

        const now = currentTime;

        // 如果烟花激活且在持续期内，按间隔生成火箭朝前三名位置发射
        if (this.fireworksActive) {
            const elapsed = now - this.fireworksStartTime;
            // 烟花持续时间也随密度略微增加
            const effectiveDuration = this.fireworksDuration * (1 + (this.fireworksDensity || 5) / 10);
            if (elapsed < effectiveDuration) {
                if (now - this.lastFireworkSpawn > this.fireworkSpawnInterval) {
                    const triggerRank = this.fireworksTriggerRank || 3;
                    const triggerItems = this.animationItems.filter(it => it.displayRank <= triggerRank && it._lastDrawPos);
                    // 每次发射的火箭数量也随密度增加
                    const rocketsToSpawn = Math.max(1, Math.floor((this.fireworksDensity || 5) / 3));
                    
                    for (let s = 0; s < rocketsToSpawn; s++) {
                        if (triggerItems.length > 0) {
                            // 随机选择触发名次中的一个发射火箭
                            const randomIndex = Math.floor(Math.random() * triggerItems.length);
                            const posItem = triggerItems[randomIndex];
                            // 将烟花发射位置调整到画布水平中心区域，而不是条形图中心点
                            // 这样即便条形图很短，烟花也会在中间播放
                            const centerX = this.canvasWidth / 2;
                            const spread = 400; // 水平分布范围
                            const targetX = centerX + (Math.random() - 0.5) * spread;
                            this.spawnRocketTowards(targetX, posItem._lastDrawPos.y, posItem.displayRank);
                        } else {
                            const rx = 100 + Math.random() * (this.canvasWidth - 200);
                            const ry = 80 + Math.random() * (this.canvasHeight / 2);
                            this.spawnRocketTowards(rx, ry);
                        }
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
            
            // 更真实的物理效果：重力影响 (使用火箭自带的 gravity)
            r.vy += (r.gravity || 0.0015) * dt; 
            // 极小的空气阻力
            r.vx *= 0.999;
            r.vy *= 0.999;
            r.x += r.vx * dt;
            r.y += r.vy * dt;
            
            // 记录尾迹（更密集的尾迹）
            r.trail.unshift({x: r.x, y: r.y, age: r.age});
            if (r.trail.length > 12) r.trail.pop(); 
            
            // 绘制火箭和尾迹
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';
            
            // 绘制尾迹（火花/烟雾效果）
            for (let t = 0; t < r.trail.length; t++) {
                const pt = r.trail[t];
                const trailAge = r.age - pt.age;
                const trailAlpha = Math.max(0, 1 - trailAge / 400);
                
                if (trailAlpha > 0) {
                    const opacity = trailAlpha * 0.4;
                    this.ctx.globalAlpha = opacity;
                    // 尾迹颜色从亮黄变深红
                    const tRatio = t / r.trail.length;
                    this.ctx.fillStyle = tRatio < 0.3 ? '#FFFFAA' : '#FFCC33';
                    this.ctx.beginPath();
                    this.ctx.arc(pt.x, pt.y, 1.5 * (1 - tRatio * 0.5), 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // 偶尔添加小火花
                    if (Math.random() > 0.8) {
                        this.ctx.fillStyle = '#FFFFFF';
                        this.ctx.fillRect(pt.x + (Math.random()-0.5)*4, pt.y + (Math.random()-0.5)*4, 1, 1);
                    }
                }
            }
            
            // 主火箭亮点
            this.ctx.globalAlpha = 1.0;
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, 2.0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 火箭头部光晕
            const rocketColor = (r.colors && r.colors[0]) ? r.colors[0] : '#FFCC33';
            const glowGradient = this.ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 10);
            glowGradient.addColorStop(0, this.hexToRgba(rocketColor, 0.8));
            glowGradient.addColorStop(1, this.hexToRgba(rocketColor, 0));
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, 10, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();

            // 判断是否爆炸：向上飞行且速度开始变负（到达最高点）或达到目标高度
            if (r.vy >= -0.2 || r.y <= r.targetY) {
                this.spawnExplosion(r.x, r.y, r.colors);
                this.fireworkRockets.splice(i, 1);
            }
        }

        // 发射阶段额外生成烟雾（轻微、低频）
        // 在火箭更新循环外单独生成不必
        // 更新并绘制环 (核心爆炸闪光)
        for (let i = this.fireworkRings.length - 1; i >= 0; i--) {
            const ring = this.fireworkRings[i];
            ring.age += 16;
            const t = ring.age / ring.life;
            
            // 快速扩张然后变慢
            const easeOutT = 1 - Math.pow(1 - t, 3);
            ring.radius = ring.maxRadius * easeOutT;
            
            if (ring.age >= ring.life) {
                this.fireworkRings.splice(i, 1);
                continue;
            }
            
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';
            const alpha = Math.max(0, 1 - t);
            
            // 核心强烈闪光
            const grad = this.ctx.createRadialGradient(ring.x, ring.y, 0, ring.x, ring.y, ring.radius);
            grad.addColorStop(0, this.hexToRgba('#FFFFFF', 0.8 * alpha));
            grad.addColorStop(0.3, this.hexToRgba(ring.color, 0.4 * alpha));
            grad.addColorStop(1, this.hexToRgba(ring.color, 0));
            
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // 更新并绘制粒子
        for (let i = this.fireworkParticles.length - 1; i >= 0; i--) {
            const p = this.fireworkParticles[i];
            const dt = 16; // ms

            p.age += dt;
            
            // 更真实的物理效果：重力和阻力
            p.vx *= p.drag || 0.96;
            p.vy *= p.drag || 0.96;
            p.vy += (p.gravity || 0.1) * dt * 0.01; // 重力影响速度，注意系数
            p.x += p.vx * (dt / 16);
            p.y += p.vy * (dt / 16);
            
            // 记录轨迹
            if (!p.trail) p.trail = [];
            p.trail.unshift({x: p.x, y: p.y});
            if (p.trail.length > 6) p.trail.pop();
            
            // 移除过期粒子
            if (p.age >= p.life) {
                this.fireworkParticles.splice(i, 1);
                continue;
            }

            // 绘制粒子
            const lifeRatio = p.age / p.life;
            const alpha = Math.max(0, 1 - lifeRatio);
            
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';
            
            // 粒子颜色和闪烁效果
            let color = p.color;
            if (p.spark && Math.random() > 0.7) {
                color = '#FFFFFF'; // 闪烁白色火花
            }
            
            // 绘制轨迹
            if (p.trail.length > 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let j = 1; j < p.trail.length; j++) {
                    this.ctx.lineTo(p.trail[j].x, p.trail[j].y);
                }
                this.ctx.strokeStyle = this.hexToRgba(color, alpha * 0.4);
                this.ctx.lineWidth = p.size * 0.8;
                this.ctx.stroke();
            }

            // 绘制主体
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * (1 - lifeRatio * 0.5), 0, Math.PI * 2);
            this.ctx.fill();
            
            // 核心高亮
            if (lifeRatio < 0.2) {
                this.ctx.globalAlpha = (1 - lifeRatio * 5) * 0.8;
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
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

    /**
     * 更新并绘制红包/福袋
     */
    updateAndDrawRedPackets(currentTime) {
        if (!this.redPacketsEnabled || !this.ctx) return;

        // 生成新红包
        if (currentTime - this.lastRedPacketSpawn > this.redPacketSpawnInterval) {
            // 每次生成 1-3 个
            const count = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                this.spawnRedPacket();
            }
            this.lastRedPacketSpawn = currentTime;
        }

        // 更新和绘制现有红包
        for (let i = this.redPackets.length - 1; i >= 0; i--) {
            const packet = this.redPackets[i];
            
            // 更新位置
            packet.y += packet.speed;
            packet.rotation += packet.rotationSpeed;
            packet.x += Math.sin(currentTime * 0.002 + packet.id) * 0.5; // 轻微左右摇摆

            // 移除超出屏幕的红包
            if (packet.y > this.canvasHeight + 50) {
                this.redPackets.splice(i, 1);
                continue;
            }

            // 绘制
            this.drawRedPacket(packet);
        }
    }

    /**
     * 生成单个红包/福袋/金币/元宝
     */
    spawnRedPacket() {
        const x = Math.random() * this.canvasWidth;
        const size = 30 + Math.random() * 20; // 30-50px
        
        // 随机选择类型：红包、福袋、金币、元宝
        const rand = Math.random();
        let type;
        if (rand < 0.3) type = 'packet';      // 30% 红包
        else if (rand < 0.5) type = 'bag';    // 20% 福袋
        else if (rand < 0.8) type = 'coin';   // 30% 金币
        else type = 'ingot';                  // 20% 元宝

        this.redPackets.push({
            id: Math.random(),
            x: x,
            y: -size - 10,
            size: size,
            speed: 1 + Math.random() * 2, // 1-3px/frame
            rotation: (Math.random() - 0.5) * 0.5,
            rotationSpeed: (Math.random() - 0.5) * 0.05,
            type: type
        });
    }

    /**
     * 绘制单个红包/福袋/金币/元宝
     */
    drawRedPacket(packet) {
        this.ctx.save();
        this.ctx.translate(packet.x, packet.y);
        this.ctx.rotate(packet.rotation);

        if (packet.type === 'packet') {
            // 绘制红包
            const w = packet.size * 0.8;
            const h = packet.size;
            
            // 红包主体
            this.ctx.fillStyle = '#ff0000'; // 大红
            this.ctx.beginPath();
            // 兼容性写法，如果不支持 roundRect 则用 rect
            if (this.ctx.roundRect) {
                this.ctx.roundRect(-w/2, -h/2, w, h, 4);
            } else {
                this.ctx.rect(-w/2, -h/2, w, h);
            }
            this.ctx.fill();

            // 红包盖子（曲线）
            this.ctx.fillStyle = '#cc0000'; // 深红
            this.ctx.beginPath();
            this.ctx.moveTo(-w/2, -h/2 + h*0.3);
            this.ctx.quadraticCurveTo(0, -h/2 + h*0.6, w/2, -h/2 + h*0.3);
            this.ctx.lineTo(w/2, -h/2);
            this.ctx.lineTo(-w/2, -h/2);
            this.ctx.fill();

            // "福"字或者金币
            this.ctx.fillStyle = '#ffd700'; // 金色
            this.ctx.beginPath();
            this.ctx.arc(0, -h/2 + h*0.35, w*0.15, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (packet.type === 'bag') {
            // 绘制福袋
            const s = packet.size;
            
            // 袋子主体
            this.ctx.fillStyle = '#ff0000';
            this.ctx.beginPath();
            this.ctx.moveTo(0, -s/2); // 结口
            this.ctx.bezierCurveTo(-s/2, -s/4, -s/2, s/2, 0, s/2); // 左边
            this.ctx.bezierCurveTo(s/2, s/2, s/2, -s/4, 0, -s/2); // 右边
            this.ctx.fill();

            // 金色系带
            this.ctx.strokeStyle = '#ffd700';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(-s*0.2, -s*0.3);
            this.ctx.lineTo(s*0.2, -s*0.3);
            this.ctx.stroke();

            // "福"字
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = `bold ${s*0.4}px "Microsoft YaHei", sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('福', 0, s*0.1);
        } else if (packet.type === 'coin') {
            // 绘制金币
            const r = packet.size * 0.4;
            
            // 外圈
            this.ctx.fillStyle = '#ffd700'; // 金色
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 内圈（方孔）
            this.ctx.fillStyle = '#ffec8b'; // 浅金
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 方孔
            const hole = r * 0.3;
            this.ctx.fillStyle = '#e6b800'; // 深金
            this.ctx.beginPath();
            this.ctx.rect(-hole/2, -hole/2, hole, hole);
            this.ctx.fill();

            // 边缘光泽
            this.ctx.strokeStyle = '#fffacd'; // 柠檬绸色
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (packet.type === 'ingot') {
            // 绘制元宝
            const w = packet.size * 0.8;
            const h = packet.size * 0.5;
            
            // 元宝底部（船身）
            this.ctx.fillStyle = '#ffd700';
            this.ctx.beginPath();
            this.ctx.moveTo(-w/2, 0);
            this.ctx.quadraticCurveTo(0, h, w/2, 0); // 底部圆弧
            this.ctx.lineTo(w*0.7, -h*0.5); // 右翼尖
            this.ctx.quadraticCurveTo(w*0.3, 0, 0, -h*0.2); // 中间下凹
            this.ctx.quadraticCurveTo(-w*0.3, 0, -w*0.7, -h*0.5); // 左翼尖
            this.ctx.closePath();
            this.ctx.fill();
            
            // 中间凸起
            this.ctx.fillStyle = '#ffec8b';
            this.ctx.beginPath();
            this.ctx.ellipse(0, -h*0.1, w*0.25, h*0.25, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    /**
     * 更新并绘制花瓣特效
     */
    updateAndDrawPetals(currentTime) {
        if (!this.petalsEnabled || !this.ctx) return;

        // 生成新花瓣
        if (currentTime - this.lastPetalSpawn > this.petalSpawnInterval) {
            // 每次生成 2-4 个
            const count = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                // 随机左右两侧
                this.spawnPetal(Math.random() > 0.5 ? 'left' : 'right');
            }
            this.lastPetalSpawn = currentTime;
        }

        // 更新和绘制现有花瓣
        for (let i = this.petals.length - 1; i >= 0; i--) {
            const petal = this.petals[i];
            
            // 物理更新
            petal.x += petal.vx;
            petal.y += petal.vy;
            petal.rotation += petal.rotationSpeed;
            
            // 重力与空气阻力模拟
            petal.vy += 0.05; // 重力
            petal.vx *= 0.99; // 水平阻力
            
            // 飘动效果
            petal.x += Math.sin(currentTime * 0.003 + petal.id) * 0.5;

            // 移除超出屏幕的花瓣
            if (petal.y > this.canvasHeight + 50 || petal.x < -50 || petal.x > this.canvasWidth + 50) {
                this.petals.splice(i, 1);
                continue;
            }

            // 绘制
            this.drawPetal(petal);
        }
    }

    /**
     * 生成单个花瓣
     * @param {string} side 'left' or 'right'
     */
    spawnPetal(side) {
        const y = this.canvasHeight * 0.2 + Math.random() * (this.canvasHeight * 0.6); // 中间区域发射
        let x, vx;
        
        if (side === 'left') {
            x = -10;
            vx = 2 + Math.random() * 3; // 向右飞
        } else {
            x = this.canvasWidth + 10;
            vx = -(2 + Math.random() * 3); // 向左飞
        }

        // 随机颜色：粉色系
        const colors = ['#ffc0cb', '#ffb6c1', '#ff69b4', '#ff1493', '#db7093', '#fff0f5'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        this.petals.push({
            id: Math.random(),
            x: x,
            y: y,
            vx: vx,
            vy: -1 - Math.random() * 2, // 初始向上飞一点
            size: 5 + Math.random() * 8, // 大小
            color: color,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            shapeRatio: 0.5 + Math.random() * 0.5 // 形状长宽比
        });
    }

    /**
     * 绘制单个花瓣
     */
    drawPetal(petal) {
        this.ctx.save();
        this.ctx.translate(petal.x, petal.y);
        this.ctx.rotate(petal.rotation);
        
        this.ctx.fillStyle = petal.color;
        this.ctx.globalAlpha = 0.8;

        this.ctx.beginPath();
        // 绘制花瓣形状 (二次贝塞尔曲线)
        // 从 (0, -size) 到 (0, size)，控制点决定宽度
        const s = petal.size;
        const w = s * petal.shapeRatio;
        
        this.ctx.moveTo(0, -s);
        this.ctx.quadraticCurveTo(w, 0, 0, s);
        this.ctx.quadraticCurveTo(-w, 0, 0, -s);
        
        this.ctx.fill();
        this.ctx.restore();
    }
    
    /**
     * 更新并绘制弹幕
     */
    updateAndDrawDanmaku(currentTime) {
        if (!this.danmakuEnabled || !this.ctx) return;

        // 生成新弹幕
        if (currentTime - this.lastDanmakuSpawn > this.danmakuSpawnInterval) {
            this.spawnDanmaku();
            this.lastDanmakuSpawn = currentTime;
        }

        // 更新和绘制现有弹幕
        for (let i = this.danmakuList.length - 1; i >= 0; i--) {
            const danmaku = this.danmakuList[i];
            
            // 更新位置
            danmaku.x += danmaku.speed;
            
            // 实现轮播效果：当弹幕超出屏幕右侧时，重新从左侧进入
            if (danmaku.x > this.canvasWidth + 100) {
                // 重新定位到左侧，并随机选择新的弹幕内容，使用空格分隔
                const danmakuTexts = this.danmakuContent.split(' ').map(text => text.trim()).filter(text => text.length > 0);
                if (danmakuTexts.length > 0) {
                    danmaku.text = danmakuTexts[Math.floor(Math.random() * danmakuTexts.length)];
                }
                danmaku.x = -200; // 重新从左侧外进入
                danmaku.y = 50 + Math.random() * (this.canvasHeight - 100); // 随机垂直位置
                danmaku.speed = 0.5 + Math.random() * 1; // 随机速度
                continue;
            }

            // 绘制弹幕
            this.drawDanmaku(danmaku);
        }
    }
    
    /**
     * 生成单个弹幕
     */
    spawnDanmaku() {
        // 解析弹幕内容，使用空格分隔
        const danmakuTexts = this.danmakuContent.split(' ').map(text => text.trim()).filter(text => text.length > 0);
        if (danmakuTexts.length === 0) return;
        
        // 随机选择一条弹幕内容
        const text = danmakuTexts[Math.floor(Math.random() * danmakuTexts.length)];
        
        // 随机生成弹幕的垂直位置和速度
        const y = 50 + Math.random() * (this.canvasHeight - 100);
        const speed = 0.5 + Math.random() * 1; // 0.5-1.5px/frame，降低速度
        
        this.danmakuList.push({
            id: Math.random(),
            text: text,
            x: -200, // 从屏幕左侧外进入
            y: y,
            speed: speed,
            color: this.danmakuColor,
            size: this.danmakuSize
        });
    }
    
    /**
     * 绘制单个弹幕
     */
    drawDanmaku(danmaku) {
        this.ctx.save();
        
        // 设置字体和颜色
        this.ctx.font = `${danmaku.size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        this.ctx.fillStyle = danmaku.color;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        
        // 添加文字阴影，增强可读性
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetY = 2;
        
        // 绘制弹幕文本
        this.ctx.fillText(danmaku.text, danmaku.x, danmaku.y);
        
        this.ctx.restore();
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

