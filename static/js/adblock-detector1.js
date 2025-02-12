const adBlockDetector = {
    init() {
        this.detectAdBlock().then(isBlocking => {
            if (isBlocking) {
                this.showWarning();
            }
        });
    },

    async detectAdBlock() {
        try {
            const testAd = document.createElement('div');
            testAd.innerHTML = '&nbsp;';
            testAd.className = 'adsbox';
            document.body.appendChild(testAd);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const isBlocking = testAd.offsetHeight === 0;
            testAd.remove();
            return isBlocking;
        } catch (e) {
            return true;
        }
    },

    showWarning() {
        const warning = document.createElement('div');
        warning.className = 'adblock-warning';
        warning.innerHTML = `
            <div class="warning-content">
                <h3>检测到广告拦截器</h3>
                <p>请关闭广告拦截器或将本站添加到白名单，以确保所有功能正常运行。</p>
                <button onclick="this.parentElement.parentElement.remove()">我知道了</button>
            </div>
        `;
        document.body.appendChild(warning);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    adBlockDetector.init();
}); 