/**
 * 动态排行榜生成器
 * 支持从小到大的动态排序动画
 */
class DynamicRanking {
    constructor() {
        // 烟花视觉参数（可由 UI 动态调整）
        this.fireworksTrailLength = 20; // 尾迹采样长度
        this.fireworksGlow = 0.6; // 光晕强度（0-1）
        this.fireworksSpeedMul = 1.0; // 碎片速度倍数
        this.fireworksCoreRatio = 0.06; // 核心亮点占比
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

        // 烟花状态（初始默认）
        this.fireworksEnabled = true; // 是否启用（从 UI 读取）
        this.isPreview = false; // 非录制的预览模式标志
        this.fireworksActive = false;
        this.fireworksStartTime = 0;
        this.fireworksDuration = 3000; // 毫秒，烟花持续时长（可由 UI 覆盖）
        this.lastFireworkSpawn = 0;
        this.fireworkSpawnInterval = 250; // 每隔多少ms产生一次烟花
        this.fireworkParticles = [];
        this.fireworksDensity = 32; // 粒子密度基数（可由 UI 覆盖）
        this.fireworkRockets = []; // 底部发射的火箭列表（每个在空中爆炸为粒子）
        this.fireworkRings = []; // 空中扩展的环形爆炸效果

        console.log('DynamicRanking initialized:', !!this);
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
        this.fireworksTrailInput = document.getElementById('fireworks-trail');
        this.fireworksGlowInput = document.getElementById('fireworks-glow');
        this.fireworksSpeedInput = document.getElementById('fireworks-speed');
        this.fireworksCoreRatioInput = document.getElementById('fireworks-core-ratio');
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
        if (this.fireworksTrailInput) {
            this.fireworksTrailInput.addEventListener('change', () => {
                const v = parseInt(this.fireworksTrailInput.value);
                if (!isNaN(v) && v >= 4) this.fireworksTrailLength = v;
            });
        }
        if (this.fireworksGlowInput) {
            this.fireworksGlowInput.addEventListener('change', () => {
                const v = parseFloat(this.fireworksGlowInput.value);
                if (!isNaN(v)) this.fireworksGlow = Math.max(0, Math.min(1, v));
            });
        }
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

            // 初始化 Canvas
            this.initCanvas();

            // 显示 Canvas 用于预览
            this.rankingContainer.classList.add('playing');

            // 准备动画数据
            this.prepareAnimationData();

            // 直接运行动画（不录制）
            await this.runCanvasAnimation();

            // 预览结束，清理预览标志
            this.isPreview = false;

            // 结束后移除 playing
            this.rankingContainer.classList.remove('playing');
        } catch (err) {
            console.error('preview failed', err);
            this.showError('预览失败: ' + err.message);
            this.isPreview = false;
            this.rankingContainer.classList.remove('playing');
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
        // 完全随机的 HSL 颜色
        const hue = Math.floor(Math.random() * 360);
        const saturation = 70 + Math.floor(Math.random() * 20); // 70-90% 饱和度
        const lightness = 50 + Math.floor(Math.random() * 15); // 50-65% 亮度

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

            // 初始化 Canvas
            this.initCanvas();

            // 在播放动画时也显示 Canvas（非录制时可预览烟花）
            this.rankingContainer.classList.add('playing');

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
        const rect = this.rankingContainer.getBoundingClientRect();
        this.canvas.width = rect.width * 2; // 2x scale for HD
        this.canvas.height = rect.height * 2;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(2, 2);
        this.canvasWidth = rect.width;
        this.canvasHeight = rect.height;
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
                        this.drawItem(this.animationItems[i]);
                    }
                } else {
                    // 其他动画类型：正向绘制
                    for (let i = 0; i < this.animationItems.length; i++) {
                        this.drawItem(this.animationItems[i]);
                    }
                }

                // 新增：触发烟花逻辑改为在第1~第3名播放期间触发，并在三名全部完成后停止
                try {
                    const top3 = this.animationItems.filter(it => it.displayRank <= 3 && it._lastDrawPos);
                    const top3Animating = top3.length > 0 && top3.some(it => it.animate);
                    const top3AllDone = top3.length > 0 && top3.every(it => it.animate && (currentTime - it.startTime >= this.flyInDuration));

                    // 在第1~第3名任一开始弹入时启动烟花（只要用户启用）
                    // 增加最小启动延迟，避免连续多次运行时立即触发烟花
                    const FIREWORKS_MIN_START_DELAY = 150; // ms
                    if (top3Animating && this.fireworksEnabled && !this.fireworksActive && (currentTime - this.animationStartTime) > FIREWORKS_MIN_START_DELAY) {
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
        // 绘制背景
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);
        gradient.addColorStop(0, '#1a202c');
        gradient.addColorStop(1, '#2d3748');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
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
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetY = 4;
        this.ctx.fillText(this.title, this.canvasWidth / 2, titleY);
        this.ctx.shadowColor = 'transparent';
    }

    /**
     * 绘制单个项目
     */
    drawItem(item) {
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

        // 前三名特殊颜色
        let barColor;
        let textColor = '#ffffff';
        if (item.displayRank === 1) {
            barColor = ['#FFD700', '#FFA500'];
        } else if (item.displayRank === 2) {
            barColor = ['#C0C0C0', '#808080'];
        } else if (item.displayRank === 3) {
            barColor = ['#CD7F32', '#8B4513'];
        } else {
            barColor = [item.color.hsl, `hsla(${item.color.h}, ${item.color.s}%, ${item.color.l - 10}%, ${item.opacity})`];
        }

        // 绘制条形图背景
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.roundRect(20, y, barWidth, itemHeight, 15);
        this.ctx.fillStyle = barColor[0];
        this.ctx.fill();

        if (item.displayRank > 3) {
            const gradient = this.ctx.createLinearGradient(20, y, 20 + barWidth, y);
            gradient.addColorStop(0, barColor[0]);
            gradient.addColorStop(1, barColor[1]);
            this.ctx.fillStyle = gradient;
            this.ctx.globalAlpha = drawOpacity;
        } else {
            const gradient = this.ctx.createLinearGradient(20, y, 20 + barWidth, y);
            gradient.addColorStop(0, barColor[0]);
            gradient.addColorStop(1, barColor[1]);
            this.ctx.fillStyle = gradient;
        }
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

        // 数值绘制在条形图右侧
        this.ctx.fillStyle = textColor;
        this.ctx.globalAlpha = drawOpacity * 0.8;
        this.ctx.textAlign = 'right';
        this.ctx.font = '20px -apple-system, sans-serif';
        const valueX = 20 + barWidth + 10;
        this.ctx.fillText(item.value.toString(), valueX, y + itemHeight / 2);

        // 在 item 上记录最后一次绘制位置，供烟花效果定位使用
        item._lastDrawPos = {
            x: 20 + barWidth / 2,
            y: y + itemHeight / 2
        };

        this.ctx.restore();
    }

    /**
     * 开始录制视频
     */
    async startRecording() {
        try {
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
            this.log('停止录制');
        }
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
        const vy = -(1.0 + Math.random() * 1.6); // 更迅速
        const vx = (targetX - startX) / (350 + Math.random() * 300);
        const life = 600 + Math.random() * 700; // 火箭寿命
        const targetAltitude = Math.max(60, targetY - (20 + Math.random() * 120)); // 在目标上方一定高度爆炸
        const color = ['#FFD700', '#FF8C42', '#FF6B6B', '#6BCB77', '#4D96FF'][Math.floor(Math.random() * 5)];
        // 火箭带一个小的烟雾粒子组，用于发射时的向上烟雾
        this.fireworkRockets.push({
            x: startX,
            y: startY,
            vx,
            vy,
            age: 0,
            life,
            targetY: targetAltitude,
            color,
            smokeTimer: 0
        });
    }

    // 爆炸成粒子（增强：核心 + 主体粒子 + 环形扩散 + 次级裂变粒子）
    spawnExplosion(x, y) {
        const baseColors = ['#FFD700', '#FF6B6B', '#FF8C42', '#6BCB77', '#4D96FF'];
        const particleCount = Math.max(16, Math.min(400, Math.round(this.fireworksDensity)));

        // 主环（大环光晕）
        const ringCount = 1 + Math.floor(Math.random() * 3);
        for (let r = 0; r < ringCount; r++) {
            this.fireworkRings.push({
                x,
                y,
                radius: 6 + r * 8,
                maxRadius: 60 + Math.random() * 80,
                thickness: 3 + Math.random() * 6,
                age: 0,
                life: 420 + Math.random() * 520,
                color: baseColors[Math.floor(Math.random() * baseColors.length)]
            });
        }

        // 生成几颗核心亮点（亮度高、体积大、寿命短）
        const coreCount = Math.max(1, Math.round(particleCount * (this.fireworksCoreRatio || 0.06)));
        for (let c = 0; c < coreCount; c++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (1.2 + Math.random() * 2.2) * this.fireworksSpeedMul;
            const color = baseColors[Math.floor(Math.random() * baseColors.length)];
            this.fireworkParticles.push({
                x, y,
                vx: Math.cos(angle) * speed * 0.6,
                vy: Math.sin(angle) * speed * 0.6,
                life: 380 + Math.random() * 220,
                age: 0,
                size: 3 + Math.random() * 4,
                color: color,
                core: true,
                trail: [],
                drag: 0.995
            });
        }

        // 主体粒子（较多，带颜色渐变）
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2) * (i / particleCount) + (Math.random() - 0.5) * 0.8;
            const velocity = (0.6 + Math.random() * 4.0) * this.fireworksSpeedMul;
            const color = baseColors[Math.floor(Math.random() * baseColors.length)];
            this.fireworkParticles.push({
                x, y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: 700 + Math.random() * 1000,
                age: 0,
                size: 1 + Math.random() * 2.5,
                color: color,
                core: false,
                trail: [],
                drag: 0.995,
                // 小概率成为会再度裂变的次级炸弹
                canSplit: Math.random() < 0.12,
                splitTime: 200 + Math.random() * 400,
                splitDone: false
            });
        }
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
                        // 为前三名分别发射若干火箭（可以更密集）
                        top3.forEach(posItem => {
                            // 每次在目标附近发射1 枚火箭
                            this.spawnRocketTowards(posItem._lastDrawPos.x + (Math.random() - 0.5) * 20, posItem._lastDrawPos.y);
                        });
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
            r.vy += -0.0006 * dt; // 微弱加速（更自然）
            // 引入空气阻力略微减速横向速度
            r.vx *= 0.9995;
            r.vy *= 0.9998;
            r.x += r.vx * dt;
            r.y += r.vy * dt;
            // 绘制火箭（亮点）
            this.ctx.save();
            // 使用叠加效果让尾迹更明显
            this.ctx.globalCompositeOperation = 'lighter';
            // 主亮点
            this.ctx.fillStyle = r.color || '#fff';
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, 2.6, 0, Math.PI * 2);
            this.ctx.fill();
            // 更长更柔和的尾迹（多次 radial fade）
            const trailLen = 40 + Math.abs(r.vx) * 120;
            for (let t = 0; t < 6; t++) {
                const a = 1 - t / 6;
                const px = r.x - r.vx * (trailLen * (t / 6));
                const py = r.y - r.vy * (trailLen * (t / 6));
                this.ctx.globalAlpha = 0.15 * a;
                this.ctx.fillStyle = r.color || '#fff';
                this.ctx.beginPath();
                this.ctx.arc(px, py, 4 + (6 - t) * 0.6, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();

            // 判断是否爆炸：达到目标高度或寿命用尽
            if (r.y <= r.targetY || r.age >= r.life) {
                this.spawnExplosion(r.x, r.y);
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
        const gravity = 0.0025; // px/ms^2
        for (let i = this.fireworkParticles.length - 1; i >= 0; i--) {
            const p = this.fireworkParticles[i];
            const dt = 16; // ms

            p.age += dt;
            // 物理：速度受重力和阻力影响
            p.vx *= p.drag || 0.998;
            p.vy *= p.drag || 0.998;
            p.vy += gravity * dt * 0.95; // 稍强重力感
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            // 记录轨迹（采样点取决于尾迹长度设置）
            if (!p.trail) p.trail = [];
            p.trail.unshift({x: p.x, y: p.y, age: p.age});
            const maxTrail = p.core ? Math.max(6, Math.round(this.fireworksTrailLength * 0.6)) : Math.max(8, Math.round(this.fireworksTrailLength));
            if (p.trail.length > maxTrail) p.trail.pop();
        }

        // 绘制粒子（放在 items 之上）
        this.ctx.save();
        // 更强的混合效果（叠加）让颜色更鲜艳
        this.ctx.globalCompositeOperation = 'lighter';
        for (const p of this.fireworkParticles) {
            const alpha = Math.max(0, 1 - p.age / p.life);
            const size = p.size * (p.core ? 1.4 : 1);

            // 绘制基于轨迹的渐变尾迹（使用线性样式，减少单点 glow）
            if (p.trail && p.trail.length > 1) {
                for (let ti = 0; ti < p.trail.length; ti++) {
                    const pt = p.trail[ti];
                    const t = ti / p.trail.length;
                    const tAlpha = (1 - t) * 0.55 * alpha;
                    this.ctx.save();
                    this.ctx.globalAlpha = tAlpha;
                    // 使用半透明圆并缩放半径以获得渐隐尾迹
                    const r = Math.max(0.4, size * (1 - t) * 1.1);
                    this.ctx.fillStyle = p.color;
                    this.ctx.beginPath();
                    this.ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                }
            }

            // 粒子主体（较弱的 glow + 径向渐变以控制光晕）
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';
            // 控制光晕：用径向渐变而不是强 shadowBlur
            const glowStrength = Math.max(0, Math.min(1, this.fireworksGlow));
            if (glowStrength > 0.02) {
                const g = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 6);
                g.addColorStop(0, this.hexToRgba(p.color, 0.55 * glowStrength * alpha));
                g.addColorStop(0.4, this.hexToRgba(p.color, 0.22 * glowStrength * alpha));
                g.addColorStop(1, this.hexToRgba(p.color, 0));
                this.ctx.fillStyle = g;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, size * 6, 0, Math.PI * 2);
                this.ctx.fill();
            }
            // 主体
            this.ctx.globalAlpha = alpha;
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
