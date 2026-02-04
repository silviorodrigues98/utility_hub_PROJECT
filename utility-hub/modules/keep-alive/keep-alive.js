// Keep-Alive Module
// Prevents session timeouts by simulating user activity

const KeepAliveModule = (function () {
    let currentTabId;
    let intervalSeconds = 120; // 2 minutes default

    const playIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    const stopIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"></rect></svg>`;

    function init(tabId) {
        currentTabId = tabId;
        loadStatus();
        setupEventListeners();
    }

    function loadStatus() {
        const key = `keepAlive_${currentTabId}`;
        chrome.storage.local.get([key], (result) => {
            const data = result[key] || {};
            const isActive = data.active || false;
            intervalSeconds = data.interval || 120;

            updatePresetActive(intervalSeconds);
            updateUI(isActive, data.lastPing);
        });
    }

    function updateUI(isActive, lastPing) {
        const toggleBtn = document.getElementById('kaToggleBtn');
        const statusEl = document.getElementById('kaStatus');
        const lastPingEl = document.getElementById('kaLastPing');
        const intervalEl = document.getElementById('kaInterval');
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');

        if (isActive) {
            toggleBtn.innerHTML = `${stopIcon} <span>Desativar</span>`;
            toggleBtn.classList.add('active');
            statusEl.textContent = 'Ativo';
            statusEl.classList.add('active');
            statusEl.classList.remove('inactive');
            if (statusIndicator) statusIndicator.classList.add('active');
            if (statusText) {
                statusText.textContent = 'Ativo';
                statusText.style.color = 'var(--success)';
            }
        } else {
            toggleBtn.innerHTML = `${playIcon} <span>Ativar</span>`;
            toggleBtn.classList.remove('active');
            statusEl.textContent = 'Inativo';
            statusEl.classList.remove('active');
            statusEl.classList.add('inactive');
            if (statusIndicator) statusIndicator.classList.remove('active');
            if (statusText) {
                statusText.textContent = 'Inativo';
                statusText.style.color = 'var(--text-muted)';
            }
        }

        if (lastPing) {
            lastPingEl.textContent = new Date(lastPing).toLocaleTimeString();
        } else {
            lastPingEl.textContent = '--';
        }

        const mins = Math.floor(intervalSeconds / 60);
        intervalEl.textContent = mins + ' min';
    }

    function toggle() {
        const key = `keepAlive_${currentTabId}`;
        chrome.storage.local.get([key], (result) => {
            const data = result[key] || {};
            const isActive = data.active || false;

            if (isActive) {
                stop(key);
            } else {
                start(key);
            }
        });
    }

    function stop(key) {
        chrome.alarms.clear(key);
        chrome.action.setBadgeText({ text: '', tabId: currentTabId });
        chrome.storage.local.set({ [key]: { active: false, interval: intervalSeconds } }, () => {
            updateUI(false, null);
        });
    }

    function start(key) {
        const now = Date.now();
        chrome.action.setBadgeText({ text: 'KA', tabId: currentTabId });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId: currentTabId });

        chrome.storage.local.set({
            [key]: { active: true, interval: intervalSeconds, lastPing: now }
        }, () => {
            // Create alarm for periodic pings
            chrome.alarms.create(key, {
                delayInMinutes: intervalSeconds / 60,
                periodInMinutes: intervalSeconds / 60
            });

            // Execute first ping immediately
            executePing();
            updateUI(true, now);
        });
    }

    function executePing() {
        // Inject keep-alive script into the page
        chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            func: () => {
                // Simulate mouse movement
                document.dispatchEvent(new MouseEvent('mousemove', {
                    bubbles: true,
                    clientX: Math.random() * 100,
                    clientY: Math.random() * 100
                }));

                // Simulate keypress
                document.dispatchEvent(new KeyboardEvent('keydown', {
                    bubbles: true,
                    key: 'Shift'
                }));

                // Fetch current URL to keep session alive
                const url = window.location.href;
                const separator = url.indexOf('?') > -1 ? '&' : '?';
                fetch(url + separator + 'ka_bust=' + Date.now(), {
                    credentials: 'include',
                    method: 'GET'
                }).catch(() => { });

                console.log('🔁 Keep-alive ping executed at', new Date().toLocaleTimeString());
            }
        });

        // Update last ping time
        const key = `keepAlive_${currentTabId}`;
        const now = Date.now();
        chrome.storage.local.get([key], (result) => {
            const data = result[key] || {};
            chrome.storage.local.set({
                [key]: { ...data, lastPing: now }
            });
        });

        document.getElementById('kaLastPing').textContent = new Date(now).toLocaleTimeString();
    }

    function updatePresetActive(value) {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-value') == value);
        });
    }

    function setupEventListeners() {
        document.getElementById('kaToggleBtn').addEventListener('click', toggle);

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-value'));
                intervalSeconds = val;
                updatePresetActive(val);
                document.getElementById('kaCustomInterval').value = Math.floor(val / 60);
                updateIntervalDisplay();
                applyIntervalChange();
            });
        });

        // Custom interval input
        document.getElementById('kaCustomInterval').addEventListener('change', (e) => {
            const mins = parseInt(e.target.value);
            if (mins >= 1 && mins <= 60) {
                intervalSeconds = mins * 60;
                updatePresetActive(intervalSeconds);
                updateIntervalDisplay();
                applyIntervalChange();
            }
        });
    }

    function updateIntervalDisplay() {
        const mins = Math.floor(intervalSeconds / 60);
        document.getElementById('kaInterval').textContent = mins + ' min';
    }

    function applyIntervalChange() {
        const key = `keepAlive_${currentTabId}`;
        chrome.storage.local.get([key], (result) => {
            if (result[key]?.active) {
                chrome.alarms.clear(key);
                chrome.alarms.create(key, {
                    delayInMinutes: intervalSeconds / 60,
                    periodInMinutes: intervalSeconds / 60
                });
                chrome.storage.local.set({
                    [key]: { ...result[key], interval: intervalSeconds }
                });
            }
        });
    }

    function cleanup() {
        // Nothing to clean up in popup context
    }

    return {
        init,
        cleanup,
        id: 'keep-alive',
        name: 'Keep Alive',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`,
        description: 'Evita logout por inatividade'
    };
})();

// Register with core
if (typeof UtilityHub !== 'undefined') {
    UtilityHub.registerModule(KeepAliveModule);
}
