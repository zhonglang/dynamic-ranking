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

            this.animationItems.push({
                name: item.name,
                value: item.value,
                color: item.color,
                opacity: item.opacity,
                displayRank: displayRank, // 显示的排名（1-12）
                popupRank: actualRank, // 弹出顺序（1-12）
                percentage: percentage,
                // 动画状态
                y: -50, // 初始在屏幕上方外
                opacity: 0,
                animate: false, // 是否开始动画
                delay: i * (this.flyInDuration + this.intervalDuration * 1000),
                startTime: 0
            });
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

                        // 缓动函数
                        const easeOutBack = (t) => {
                            const c1 = 1.70158;
                            const c3 = c1 + 1;
                            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
                        };

                        const easedProgress = easeOutBack(progress);

                        // 从上方滑入
                        item.y = -50 + easedProgress * 50;
                        item.opacity = progress;
                    }
                });

                // 绘制所有项目（从第一个到第二个，因为第一个在最下面）
                // 第12名（弹出顺序1）先显示，第11名（弹出顺序2）后显示在上方
                for (let i = this.animationItems.length - 1; i >= 0; i--) {
                    this.drawItem(this.animationItems[i], animatingCount);
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
        const titleY = 60;
        const titleHeight = 80;

        // 标题背景
        this.ctx.save();
        const titleGradient = this.ctx.createLinearGradient(0, titleY - titleHeight/2, 0, titleY + titleHeight/2);
        titleGradient.addColorStop(0, 'rgba(102, 126, 234, 0.2)');
        titleGradient.addColorStop(1, 'rgba(118, 75, 162, 0.2)');
        this.ctx.fillStyle = titleGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(20, titleY - titleHeight/2, this.canvasWidth - 40, titleHeight, 15);
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

        const startY = 120;
        const itemHeight = 40;
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

        // 顶部进入动画：从 -50 开始，到 0
        const topOffset = -50 * (1 - easedProgress);

        // 当前弹出的项目中，有 popupRank <= item.popupRank 的数量（包括自己）
        const itemsAbove = this.animationItems.filter(i => i.animate && i.popupRank <= item.popupRank).length;

        // 计算动画中的位置（会被挤下去）
        // 项目上方有 (itemsAbove - 1) 个项目，所以它的位置是 startY + (itemsAbove - 1) * height
        const animatingPosition = startY + (itemsAbove - 1) * (itemHeight + itemMargin);

        // 根据动画进度插值：从动画位置到最终位置
        // 在动画初期，项目在 animatingPosition；动画完成后，项目在 finalPosition
        // 但实际上我们希望：新项目从顶部滑入，把旧项目挤下去
        // 所以每个项目在动画过程中始终保持动态挤压效果

        // 当前显示位置：基于 animatingCount 和 popupRank
        // popupRank 较小的项目（先弹出的）会被 popupRank 较大的项目挤下去
        const itemsAboveCurrent = this.animationItems.filter(i => i.animate && i.popupRank > item.popupRank).length;
        currentPosition = startY + itemsAboveCurrent * (itemHeight + itemMargin) + topOffset;

        const y = currentPosition;

        this.ctx.save();
        this.ctx.globalAlpha = item.opacity;

        // 计算条形图宽度
        const maxBarWidth = this.canvasWidth - 40;
        const barWidth = (item.percentage / 100) * maxBarWidth;

        // 前三名特殊颜色
        let barColor;
        let textColor = '#ffffff';
        if (item.displayRank === 1) {
            barColor = ['#FFD700', '#FFA500'];
            textColor = '#1a202c';
        } else if (item.displayRank === 2) {
            barColor = ['#C0C0C0', '#808080'];
            textColor = '#1a202c';
        } else if (item.displayRank === 3) {
            barColor = ['#CD7F32', '#8B4513'];
            textColor = '#1a202c';
        } else {
            barColor = [item.color.hsl, `hsla(${item.color.h}, ${item.color.s}%, ${item.color.l - 10}%, 0.8)`];
        }

        // 绘制条形图背景
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.roundRect(20, y, maxBarWidth, itemHeight, 15);
        this.ctx.fillStyle = barColor[0];
        this.ctx.fill();

        if (item.displayRank > 3) {
            const gradient = this.ctx.createLinearGradient(20, y, 20 + barWidth, y);
            gradient.addColorStop(0, barColor[0]);
            gradient.addColorStop(1, barColor[1]);
            this.ctx.fillStyle = gradient;
            this.ctx.globalAlpha = item.opacity * (0.5 + (item.displayRank / this.animationItems.length) * 0.3);
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
        this.ctx.font = '600 15px -apple-system, sans-serif';
        this.ctx.fillText(item.name, 55, y + 15);

        this.ctx.fillStyle = textColor;
        this.ctx.globalAlpha = item.opacity * 0.8;
        this.ctx.font = '12px -apple-system, sans-serif';
        this.ctx.fillText(item.value.toString(), 55, y + 32);

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

            // 创建 MediaRecorder
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                ? 'video/webm;codecs=vp9'
                : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
                ? 'video/webm;codecs=vp8'
                : 'video/webm';

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
                this.recordedBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
                this.downloadButton.disabled = false;
                this.downloadButton.textContent = '下载视频';
                this.recordingStatus.style.display = 'none';
                this.rankingContainer.classList.remove('recording');
                this.log('录制完成');
            };

            this.mediaRecorder.start(100); // 每100ms产生一个数据块
            this.log('MediaRecorder 已启动');
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

        // 生成文件名
        const title = this.titleInput.value.trim() || '排行榜';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `${title}_${timestamp}.webm`;

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