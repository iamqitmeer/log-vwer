document.addEventListener('DOMContentLoaded', () => {
    const appState = {
        level: '', search: '', page: 1, totalPages: 1, autoRefreshInterval: null, isLoading: false, theme: 'dark'
    };
    const ui = {
        logTitle: document.getElementById('log-title'),
        logTableBody: document.getElementById('log-table-body'),
        messageContainer: document.getElementById('message-container'),
        messageIcon: document.getElementById('message-icon'),
        messageText: document.getElementById('message-text'),
        statusBar: document.getElementById('status-bar'),
        searchInput: document.getElementById('search-input'),
        autoRefreshToggle: document.getElementById('auto-refresh-toggle'),
        clearBtn: document.getElementById('clear-btn'),
        navContainer: document.getElementById('level-filter-nav'),
        paginationControls: document.getElementById('pagination-controls'),
        themeToggle: document.getElementById('theme-toggle'),
        modal: document.getElementById('confirm-modal'),
        modalCancel: document.getElementById('modal-cancel-btn'),
        modalConfirm: document.getElementById('modal-confirm-btn'),
        sidebar: document.getElementById('sidebar'),
        menuToggle: document.getElementById('menu-toggle'),
        sidebarOverlay: document.getElementById('sidebar-overlay')
    };
    const logCache = new Map();

    const sanitizeHTML = str => {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    };
    
    const renderTheme = () => document.documentElement.className = appState.theme;

    const toggleSidebar = (forceOpen) => {
        const shouldOpen = forceOpen !== undefined ? forceOpen : !ui.sidebar.classList.contains('open');
        ui.sidebar.classList.toggle('open', shouldOpen);
        ui.sidebarOverlay.classList.toggle('visible', shouldOpen);
    };

    const toggleModal = (show) => {
        if (show) {
            ui.modal.style.display = 'flex';
            setTimeout(() => ui.modal.classList.add('visible'), 10);
        } else {
            ui.modal.classList.remove('visible');
            setTimeout(() => ui.modal.style.display = 'none', 200);
        }
    };
    
    const showMessage = (type, text) => {
        const icons = {
            loading: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
            empty: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>',
            error: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
        };
        ui.logTableBody.style.display = 'none';
        ui.messageContainer.style.display = 'flex';
        ui.messageIcon.innerHTML = icons[type] || '';
        ui.messageText.textContent = text;
    };

    const hideMessage = () => {
        ui.messageContainer.style.display = 'none';
        ui.logTableBody.style.display = '';
    };

    const renderLogs = (data) => {
        const { logs, totalLogs } = data;
        if (!logs || logs.length === 0) {
            showMessage('empty', 'No logs found. Try a different filter or generate some.');
            updateStatus('No logs to display.');
            return;
        }
        hideMessage();

        const fragment = document.createDocumentFragment();
        logs.forEach(log => {
            const level = (log.level || 'unknown').toLowerCase();
            const row = document.createElement('tr');
            row.className = 'log-table-row';
            row.dataset.logId = log._id;
            
            row.innerHTML = `
                <td class="col-status"><div class="log-level-dot ${level}"></div></td>
                <td class="col-level"><span class="log-level-indicator">${sanitizeHTML(level.toUpperCase())}</span></td>
                <td class="col-message"><div class="log-message">${sanitizeHTML(log.message)}</div></td>
                <td class="col-service">${sanitizeHTML(log.service || 'N/A')}</td>
                <td class="col-time"><span class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</span></td>
            `;
            fragment.appendChild(row);

            if (log.meta && Object.keys(log.meta).length > 0) {
                const metaRow = document.createElement('tr');
                metaRow.className = 'log-meta-row';
                metaRow.dataset.metaFor = log._id;
                metaRow.innerHTML = `<td colspan="5" class="log-meta-cell"><div class="log-meta-content"><pre>${sanitizeHTML(JSON.stringify(log.meta, null, 2))}</pre></div></td>`;
                fragment.appendChild(metaRow);
            }
        });
        ui.logTableBody.innerHTML = '';
        ui.logTableBody.appendChild(fragment);
        updateStatus(`${totalLogs} total logs found.`);
    };

    const renderPagination = (data) => {
        const { currentPage, totalPages } = data;
        appState.page = currentPage; appState.totalPages = totalPages;
        if (totalPages <= 1) {
            ui.paginationControls.innerHTML = '';
            return;
        }
        ui.paginationControls.innerHTML = `
            <button id="prev-page" class="btn" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
            <span>Page ${currentPage} of ${totalPages}</span>
            <button id="next-page" class="btn" ${currentPage >= totalPages ? 'disabled' : ''}>Next</button>
        `;
    };

    const updateStatus = message => { ui.statusBar.textContent = message; };

    const fetchLogs = async () => {
        if (appState.isLoading) return;
        appState.isLoading = true;
        showMessage('loading', 'Fetching latest logs...');
        updateStatus('Fetching logs...');

        const cacheKey = `${appState.level}|${appState.search}|${appState.page}`;
        const isAutoRefreshing = appState.autoRefreshInterval !== null;
        if (logCache.has(cacheKey) && !isAutoRefreshing) {
            const data = logCache.get(cacheKey);
            renderLogs(data);
            renderPagination(data);
            appState.isLoading = false;
            return;
        }

        const params = new URLSearchParams({ page: appState.page, level: appState.level, search: appState.search });
        try {
            const response = await fetch(`api/logs?${params.toString()}`);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();
            if (!isAutoRefreshing) {
                logCache.set(cacheKey, data);
            }
            renderLogs(data);
            renderPagination(data);
        } catch (error) {
            updateStatus(`Error: ${error.message}`);
            showMessage('error', `Failed to load logs: ${error.message}`);
        } finally {
            appState.isLoading = false;
        }
    };
    
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); };
    };
    
    const debouncedFetch = debounce(fetchLogs, 400);

    const init = () => {
        ui.navContainer.addEventListener('click', e => {
            const button = e.target.closest('button.nav-item');
            if (!button || button.classList.contains('active')) return;
            ui.navContainer.querySelector('.active').classList.remove('active');
            button.classList.add('active');
            appState.level = button.dataset.level;
            ui.logTitle.textContent = `${button.textContent.trim()} Logs`;
            appState.page = 1; 
            fetchLogs();
            if (window.innerWidth <= 1024) toggleSidebar(false);
        });

        ui.paginationControls.addEventListener('click', e => {
            const button = e.target.closest('button');
            if (!button || button.disabled) return;
            if (button.id === 'prev-page' && appState.page > 1) { appState.page--; fetchLogs(); }
            if (button.id === 'next-page' && appState.page < appState.totalPages) { appState.page++; fetchLogs(); }
        });

        ui.logTableBody.addEventListener('click', e => {
            const row = e.target.closest('.log-table-row');
            if (row) {
                const metaRow = ui.logTableBody.querySelector(`[data-meta-for="${row.dataset.logId}"]`);
                if (metaRow) metaRow.classList.toggle('expanded');
            }
        });

        ui.searchInput.addEventListener('input', () => { appState.search = ui.searchInput.value; appState.page = 1; debouncedFetch(); });

        ui.autoRefreshToggle.addEventListener('change', () => {
            clearInterval(appState.autoRefreshInterval);
            appState.autoRefreshInterval = null;
            if (ui.autoRefreshToggle.checked) {
                appState.autoRefreshInterval = setInterval(fetchLogs, 5000);
                updateStatus('Auto-refresh enabled.');
            } else {
                updateStatus('Auto-refresh disabled.');
            }
        });

        ui.clearBtn.addEventListener('click', () => toggleModal(true));
        ui.modalCancel.addEventListener('click', () => toggleModal(false));
        ui.modalConfirm.addEventListener('click', async () => {
            updateStatus('Clearing all logs...');
            toggleModal(false);
            try {
                const res = await fetch('api/logs/clear-all', { method: 'POST' });
                if (!res.ok) throw new Error(await res.text() || 'Failed to clear logs');
                logCache.clear();
                appState.page = 1; 
                fetchLogs();
                updateStatus('All logs cleared successfully.');
            } catch (error) { updateStatus(`Error: ${error.message}`); }
        });
        
        ui.themeToggle.addEventListener('click', () => {
            appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('traderiser-theme', appState.theme);
            renderTheme();
        });

        ui.menuToggle.addEventListener('click', () => toggleSidebar());
        ui.sidebarOverlay.addEventListener('click', () => toggleSidebar(false));

        const savedTheme = localStorage.getItem('traderiser-theme');
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) appState.theme = savedTheme;
        
        document.body.className = appState.theme;
        renderTheme();
        fetchLogs();
    };

    init();
});