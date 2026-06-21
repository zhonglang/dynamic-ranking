window.addEventListener('DOMContentLoaded', () => {
    try {
        window.dynamicRanking = new window.DynamicRanking();
        console.log('DynamicRanking initialized:', !!window.dynamicRanking);
        try {
            const rc = document.getElementById('ranking-content');
            if (rc) {
                rc.innerHTML = '<div class="empty-state"><p>已就绪 - 点击 "运行动画" 或 "预览动画" 开始</p></div>';
            }
            const runBtnFallback = document.getElementById('run-animation');
            if (runBtnFallback && !(window.dynamicRanking && (window.dynamicRanking._runBtnBound || runBtnFallback.dataset.drBound === '1'))) {
                runBtnFallback.addEventListener('click', () => {
                    console.log('fallback run button clicked');
                    try {
                        window.dynamicRanking && window.dynamicRanking.runAnimation();
                    } catch (err) {
                        console.error(err);
                    }
                });
                if (window.dynamicRanking) window.dynamicRanking._runBtnBound = true;
            }
            const previewBtnFallback = document.getElementById('preview-animation');
            if (previewBtnFallback && !(window.dynamicRanking && (window.dynamicRanking._previewBtnBound || previewBtnFallback.dataset.drBound === '1'))) {
                previewBtnFallback.addEventListener('click', () => {
                    console.log('fallback preview button clicked');
                    try {
                        window.dynamicRanking && window.dynamicRanking.runPreview();
                    } catch (err) {
                        console.error(err);
                    }
                });
                if (window.dynamicRanking) window.dynamicRanking._previewBtnBound = true;
            }
        } catch (err) {
            // ignore
        }
    } catch (err) {
        console.error('Failed to initialize DynamicRanking', err);
        alert('初始化失败: ' + err.message);
    }
});

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
