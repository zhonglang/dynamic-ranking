/**
 * 动态排行榜生成器
 * 支持从小到大的动态排序动画和视频导出
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
        this.exportButton = document.getElementById('export-video');
        this.rankingContent = document.getElementById('ranking-content');
        this.rankingTitle = document.getElementById('ranking-title');
        this.recordingCanvas = document.getElementById('recording-canvas');
        this.canvasCtx = this.recordingCanvas.getContext('2d');
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
        this.exportButton.addEventListener('click', () => {
            this.log('exportVideo button clicked');
            this.exportVideo();
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
     * 导出视频
     */
    async exportVideo() {
        if (this.isRecording) return;

        // 保存原始按钮文本
        const originalButtonText = this.exportButton.textContent;

        try {
            this.isRecording = true;
            this.exportButton.disabled = true;
            this.exportButton.innerHTML = '<span class="loading"></span> 正在录制...';

            // 添加录制状态提示
            const title = document.querySelector('.ranking-container .empty-state');
            if (title) {
                title.innerHTML = '<p><span class="loading"></span> 正在录制排行榜动画...</p>';
                title.style.display = 'flex';
            }

            // 检查浏览器支持
            if (!window.MediaRecorder || !document.createElement('canvas').captureStream) {
                throw new Error('浏览器不支持视频录制');
            }

            // 检查是否有数据
            if (this.data.length === 0) {
                this.showError('请先运行动画再导出视频');
                return;
            }

            // 重新运行动画并录制到Canvas
            console.log('开始录制视频...');
            await this.recordAnimation();
            console.log('视频录制完成');

            this.isRecording = false;
            this.exportButton.disabled = false;
            this.exportButton.textContent = originalButtonText;

            // 恢复空状态
            setTimeout(() => {
                const title = document.querySelector('.ranking-container .empty-state');
                if (title) {
                    title.innerHTML = '<p>请输入数据并点击"运行动画"</p>';
                }
            }, 1000);

        } catch (error) {
            console.error('视频导出错误:', error);
            this.isRecording = false;
            this.exportButton.disabled = false;
            this.exportButton.textContent = originalButtonText;

            // 恢复空状态
            const title = document.querySelector('.ranking-container .empty-state');
            if (title) {
                title.innerHTML = '<p>请输入数据并点击"运行动画"</p>';
            }

            this.showError('视频导出失败: ' + error.message);
        }
    }

    /**
     * 绘制单个排行项目
     */
    drawRankingItem(ctx, width, y, item, rank, percentage, appearanceProgress, barProgress, height) {
        const padding = 20;
        // 从画面左侧外部飞入的动画
        const itemX = padding - (1 - appearanceProgress) * (width + 100);
        const itemY = y;
        const itemOpacity = appearanceProgress;
        // 条形图宽度保持完整宽度
        const barWidth = (width - padding * 2) * (percentage / 100);

        ctx.save();
        ctx.globalAlpha = itemOpacity;

        // 绘制项目背景
        let textColor = '#ffffff';

        if (rank === 1) {
            textColor = '#000000';
        } else if (rank === 2) {
            textColor = '#000000';
        } else if (rank === 3) {
            textColor = '#ffffff';
        }

        // 创建渐变背景 - 基于实际条形图宽度
        const bgGradient = ctx.createLinearGradient(itemX, itemY, itemX + barWidth, itemY + height);

        if (rank === 1) {
            bgGradient.addColorStop(0, '#FFD700');
        } else if (rank === 2) {
            bgGradient.addColorStop(0, '#C0C0C0');
        } else if (rank === 3) {
            bgGradient.addColorStop(0, '#CD7F32');
        } else {
            // 使用随机颜色，排名越靠后透明度越低
            const opacity = item.opacity || 0.5;
            bgGradient.addColorStop(0, `hsla(${item.color.h}, ${item.color.s}%, ${item.color.l}%, ${opacity})`);
            bgGradient.addColorStop(1, `hsla(${item.color.h}, ${item.color.s}%, ${item.color.l - 10}%, ${opacity})`);
        }

        ctx.fillStyle = bgGradient;
        ctx.beginPath();
        // 使用动态X位置和宽度，条形图从右往左飞入
        ctx.roundRect(itemX, itemY, barWidth, height, 15);
        ctx.fill();

        // 绘制排名数字
        ctx.fillStyle = textColor;
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (rank <= 3) {
            const medal = ['🥇', '🥈', '🥉'][rank - 1];
            ctx.fillText(medal, itemX + 30, itemY + height / 2);
        } else {
            ctx.fillText(rank.toString(), itemX + 30, itemY + height / 2);
        }

        // 绘制名称 - 动态位置，随条形图宽度变化
        ctx.font = '600 15px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(item.name, itemX + 60, itemY + height / 2 - 7);

        // 绘制数值 - 动态位置，随条形图宽度变化
        ctx.font = '12px sans-serif';
        ctx.globalAlpha = itemOpacity * 0.8;
        ctx.fillText(item.value.toString(), itemX + 60, itemY + height / 2 + 9);

        ctx.restore();
    }

    /**
     * 绘制标题
     */
    drawTitle(ctx, width, title) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        ctx.fillText(title, width / 2, 70);
        ctx.restore();
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

            // 启用导出按钮
            this.exportButton.disabled = false;

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

    /**
     * 绘制排行榜到Canvas
     */
    async animateRankingToCanvas() {
        const canvas = this.recordingCanvas;
        const ctx = this.canvasCtx;
        const width = canvas.width / 2;
        const height = canvas.height / 2;

        const maxCount = this.data.length;
        const flyInDuration = this.flyInDuration; // 条形图飞入时间（毫秒），可配置
        const delayPerItem = this.intervalDuration * 1000; // 条形图之间的间隔时间

        const startTime = Date.now();
        const title = this.titleInput.value.trim() || '排行榜';
        const recordingEndTime = maxCount * (flyInDuration + delayPerItem) + 1500;

        const drawFrame = () => {
            // 清空画布
            ctx.fillStyle = '#1a202c';
            ctx.fillRect(0, 0, width, height);

            // 绘制渐变背景
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#1a202c');
            gradient.addColorStop(1, '#2d3748');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // 绘制标题
            this.drawTitle(ctx, width, title);

            // 计算当前应该显示的项目数
            const elapsed = Date.now() - startTime;
            const currentIndex = Math.min(
                Math.floor(elapsed / (flyInDuration + delayPerItem)),
                maxCount
            );

            // 从顶部开始绘制（1在顶部）
            // 但新项目从底部出现，所以要反向绘制
            const itemHeight = 51;
            const gap = 4;
            const startY = 140; // 标题下方开始

            // 从顶部开始绘制（1在最上面），数据按从小到大排序
            // 但绘制顺序是：最大值在顶部（第1名），最小值在底部（第12名）
            let currentY = startY;

            // 所有项目都可见，从数据末尾（最大值）开始绘制
            for (let i = this.data.length - 1; i >= 0; i--) {
                const item = this.data[i];
                const actualRank = this.data.length - i;
                const percentage = maxCount > 0 ? (item.value / this.data[maxCount - 1].value) * 100 : 0;

                // 计算当前项目的动画进度（从数组开头开始，即最小值先出现）
                const itemElapsed = elapsed - (i * (flyInDuration + delayPerItem));

                // 使用过冲回弹的缓动函数（更大的过冲效果）
                const easeOutBack = (t) => {
                    const c1 = 2.5;
                    const c3 = c1 + 1;
                    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
                };
                const appearanceProgress = Math.min(itemElapsed / flyInDuration, 1);
                const finalAppearanceProgress = easeOutBack(Math.max(0, Math.min(1, appearanceProgress)));

                // 条形图保持完整宽度，只做位置飞入动画
                const barProgress = 1;

                // 使用实际进度
                this.drawRankingItem(ctx, width, currentY, item, actualRank, percentage, finalAppearanceProgress, barProgress, itemHeight);
                currentY += itemHeight + gap;
            }

            // 使用新的录制结束时间（第1名出现后1.5秒）
            if (elapsed < recordingEndTime + 500) {
                requestAnimationFrame(drawFrame);
            }
        };

        drawFrame();

        // 等待动画完成（使用新的录制结束时间）
        await new Promise(resolve => setTimeout(resolve, recordingEndTime + 500));
    }

    /**
     * 录制动画到视频
     */
    async recordAnimation() {
        // 设置Canvas尺寸（高清1080p）
        const canvas = this.recordingCanvas;
        const targetWidth = 1080;
        const targetHeight = 1920; // 9:16竖屏比例

        // 设置Canvas尺寸为2倍用于高清渲染
        canvas.width = targetWidth * 2;
        canvas.height = targetHeight * 2;
        canvas.style.width = `${targetWidth}px`;
        canvas.style.height = `${targetHeight}px`;

        // 使用现有的Canvas上下文，重置变换
        this.canvasCtx.resetTransform();

        // 创建媒体流
        const stream = canvas.captureStream(60); // 60fps
        const options = {
            mimeType: 'video/mp4',
            videoBitsPerSecond: 2500000 // 2.5 Mbps
        };

        // 尝试其他编码格式（按优先级）
        const mimeTypes = [
            'video/mp4',                          // MP4 格式（Safari 支持）
            'video/webm;codecs=vp9',             // WebM VP9（Chrome 推荐）
            'video/webm;codecs=vp8',             // WebM VP8
            'video/webm'                          // WebM 通用
        ];

        // 找到第一个支持的 MIME 类型
        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                options.mimeType = mimeType;
                break;
            }
        }

        return new Promise((resolve, reject) => {
            this.mediaRecorder = new MediaRecorder(stream, options);
            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `排行榜动画_${new Date().getTime()}.${this.mediaRecorder.mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                resolve();
            };

            this.mediaRecorder.onerror = (event) => {
                reject(new Error(`录制错误: ${event.error}`));
            };

            // 开始录制
            this.mediaRecorder.start();

            // 运行动画
            this.animateRankingToCanvas().then(() => {
                // 动画完成后停止录制
                setTimeout(() => {
                    if (this.mediaRecorder.state === 'recording') {
                        this.mediaRecorder.stop();
                    }
                }, 1000);
            }).catch(reject);
        });
    }
}

// 创建实例
window.addEventListener('DOMContentLoaded', () => {
    window.rankingApp = new DynamicRanking();
});