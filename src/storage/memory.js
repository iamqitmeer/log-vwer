const BaseStore = require('./base');

class MemoryStore extends BaseStore {
    constructor() {
        super();
        this.logs = [];
    }

    add(logEntry) {
        this.logs.unshift(logEntry);
        if (this.logs.length > 5000) {
            this.logs.pop();
        }
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
    }
}

module.exports = MemoryStore;