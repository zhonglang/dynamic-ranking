/**
 * 动态排行榜生成器
 * 支持从小到大的动态排序动画
 */
class DynamicRanking {
    constructor() {
        this.data = [];
        this.intervalDuration = 0.5; // 条形图间隔时间（秒）
        this.flyInDuration = 1000; // 条形图飞入时间（毫秒），默认1秒
        this.animationType = 'squeeze'; // 动画类型：squeeze, fade, slide, scale, flip, elevator
        this.isAnimating = false;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordedBlob = null;
        // Canvas 渲染相关
        this.canvas = null;
        this.ctx = null;
        this.animationItems = []; // 存储带动画状态的项目
        this.animationStartTime = 0;
        this.lastFrameTime = 0;
        this.animationComplete = false;
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

        // 下载视频按钮
        this.downloadButton.addEventListener('click', () => this.downloadVideo());

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

            // 准备动画数据
            this.prepareAnimationData();

            // 开始录制
            await this.startRecording();

            // 等待录制启动后再运行动画
            await new Promise(resolve => setTimeout(resolve, 300));

            // 运行动画
            await this.runCanvasAnimation();

            this.log('动画运行完成');
        } catch (error) {
            console.error('运行动画错误:', error);
            this.showError('运行动画失败: ' + error.message);
            this.recordingStatus.style.display = 'none';
            this.isRecording = false;
            this.rankingContainer.classList.remove('recording');
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
                return { y: -50, x: 0, scale: 1, rotation: 0 };
            case 'fade':
                return { y: 0, x: 0, scale: 1, rotation: 0 }; // 不设置 opacity，使用原值
            case 'slide':
                return { y: 0, x: -400, scale: 1, rotation: 0 };
            case 'scale':
                return { y: 0, x: 0, scale: 0, rotation: 0 };
            case 'flip':
                return { y: 0, x: 0, scale: 1, rotation: 180 };
            case 'elevator':
                return { y: 600, x: 0, scale: 1, rotation: 0 };
            default:
                return { y: -50, x: 0, scale: 1, rotation: 0 };
        }
    }

    /**
     * 在 Canvas 上运行动画
     */
    async runCanvasAnimation() {
        return new Promise((resolve) => {
            this.animationComplete = false;
            this.animationStartTime = performance.now();

            const animate = (currentTime) => {
                if (!this.isRecording && this.animationItems.length > 0) {
                    // 如果录制已停止，停止动画
                    this.animationComplete = true;
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
                this.animationItems.forEach((item, index) => {
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
                        this.updateAnimationState(item, progress, currentTime);
                    }
                });

                // 绘制所有项目
                // 根据动画类型决定绘制顺序
                if (this.animationType === 'squeeze') {
                    // 挤压式：反向绘制（先弹出的在下面）
                    for (let i = this.animationItems.length - 1; i >= 0; i--) {
                        this.drawItem(this.animationItems[i], animatingCount);
                    }
                } else {
                    // 其他动画类型：正向绘制
                    for (let i = 0; i < this.animationItems.length; i++) {
                        this.drawItem(this.animationItems[i], animatingCount);
                    }
                }

                // 检查动画是否完成
                const lastItem = this.animationItems[this.animationItems.length - 1];
                if (lastItem && lastItem.animate) {
                    const lastItemElapsed = currentTime - lastItem.startTime;
                    if (lastItemElapsed >= this.flyInDuration + 1000) {
                        // 最后一个项目动画完成，额外等待1秒
                        this.animationComplete = true;
                        this.stopRecording();
                        resolve();
                        return;
                    }
                }

                // 继续动画循环
                if (this.isRecording) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        });
    }

    /**
     * 根据动画类型更新项目状态
     */
    updateAnimationState(item, progress, currentTime) {
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
        const titleGradient = this.ctx.createLinearGradient(0, titleY - titleHeight/2, 0, titleY + titleHeight/2);
        titleGradient.addColorStop(0, 'rgba(102, 126, 234, 0.2)');
        titleGradient.addColorStop(1, 'rgba(118, 75, 162, 0.2)');
        this.ctx.fillStyle = titleGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(10, titleY - titleHeight/2, this.canvasWidth - 20, titleHeight, 15);
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
    drawItem(item, animatingCount) {
        if (!item.animate || item.opacity <= 0) return;

        const startY = 140;
        const itemHeight = 35;
        const itemMargin = 10;

        // 计算项目位置：基于动画进程，每个项目根据弹出顺序动态计算位置
        // popupRank 较小的项目（先弹出的）会被挤到下面
        // 最终位置：第1名（popupRank=12）在最上面，第12名（popupRank=1）在最下面
        const finalPosition = (item.displayRank - 1) * (itemHeight + itemMargin);

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
        const x = drawX;

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
            // textColor = '#1a202c';
        } else if (item.displayRank === 2) {
            barColor = ['#C0C0C0', '#808080'];
            // textColor = '#1a202c';
        } else if (item.displayRank === 3) {
            barColor = ['#CD7F32', '#8B4513'];
            // textColor = '#1a202c';
        } else {
            // 使用 item.opacity 作为透明度
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

        this.ctx.restore();
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
                this.recordedBlob = new Blob(this.recordedChunks, { type: this.videoMimeType });
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


}

// 创建实例
window.addEventListener('DOMContentLoaded', () => {
    window.rankingApp = new DynamicRanking();
});