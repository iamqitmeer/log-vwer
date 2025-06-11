const fs = require('fs/promises');
const path = require('path');
const BaseStore = require('./base');

class FileStore extends BaseStore {
    constructor({ filePath }) {
        super();
        this.filePath = filePath;
        this.logs = [];
    }

    async init() {
        try {
            await fs.mkdir(path.dirname(this.filePath), { recursive: true });
            const data = await fs.readFile(this.filePath, 'utf-8');
            this.logs = JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.logs = [];
                await this._persist();
            } else {
                console.error('log-vwer: Failed to initialize file store', error);
                throw error;
            }
        }
    }

    async _persist() {
        try {
            await fs.writeFile(this.filePath, JSON.stringify(this.logs, null, 2));
        } catch (error) {
            console.error('log-vwer: Failed to write to log file', error);
        }
    }

    add(logEntry) {
        this.logs.unshift(logEntry);
        if (this.logs.length > 10000) {
            this.logs.pop();
        }
        this._persist();
    }
    
    async get({ page = 1, limit = 50, level = '', search = '' }) {
        let filteredLogs = this.logs;

        if (level) {
            filteredLogs = filteredLogs.filter(log => log.level === level);
        }
        if (search) {
            const searchTerm = search.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
                log.message.toLowerCase().includes(searchTerm) || 
                JSON.stringify(log.meta).toLowerCase().includes(searchTerm)
            );
        }

        const totalLogs = filteredLogs.length;
        const totalPages = Math.ceil(totalLogs / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const logs = filteredLogs.slice(startIndex, endIndex);

        return { logs, totalLogs, currentPage: page, totalPages };
    }

    async clear() {
        this.logs = [];
        await this._persist();
    }
}

module.exports = FileStore;