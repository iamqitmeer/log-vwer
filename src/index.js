const path = require('path');
const express = require('express');
const MemoryStore = require('./storage/memory');
const FileStore = require('./storage/file');
const MongoStore = require('./storage/mongodb');
const { sendTelemetry } = require('./telemetry');

class Logger {
    constructor(store, serviceName) {
        this.store = store;
        this.serviceName = serviceName;
    }

    _log(level, message, meta = {}) {
        const logEntry = {
            level,
            message: message.toString(),
            meta,
            service: this.serviceName,
            timestamp: new Date().toISOString(),
        };
        this.store.add(logEntry);
    }

    info(message, meta) { this._log('info', message, meta); }
    warn(message, meta) { this._log('warn', message, meta); }
    error(message, meta) { this._log('error', message, meta); }
    http(message, meta) { this._log('http', message, meta); }
    debug(message, meta) { this._log('debug', message, meta); }

    _getStore() {
        return this.store;
    }
}

async function setupLogger(options = {}) {
    if (!options.serviceName) {
        throw new Error('log-vwer: `serviceName` is a required option.');
    }

    let store;
    const storeType = options.store || 'memory';

    if (storeType === 'mongodb') {
        if (!options.mongoUrl) throw new Error('log-vwer: `mongoUrl` is required for mongodb store.');
        store = new MongoStore({ mongoUrl: options.mongoUrl, serviceName: options.serviceName });
    } else if (storeType === 'file') {
        if (!options.filePath) throw new Error('log-vwer: `filePath` is required for file store.');
        store = new FileStore({ filePath: options.filePath });
    } else {
        store = new MemoryStore();
    }

    await store.init();

    if (options.telemetry && options.telemetry.apiKey) {
        sendTelemetry({
            apiKey: options.telemetry.apiKey,
            serviceName: options.serviceName,
            storeType: storeType,
        });
    }

    return new Logger(store, options.serviceName);
}

function viewerMiddleware(logger) {
    if (!logger || typeof logger._getStore !== 'function') {
        throw new Error('log-vwer: Invalid logger instance provided to viewerMiddleware.');
    }
    const store = logger._getStore();

    const router = express.Router();
    const publicPath = path.join(__dirname, '..', 'public');

    router.get('/api/logs', async (req, res) => {
        try {
            const { page = 1, level = '', search = '' } = req.query;
            const limit = 50;
            const data = await store.get({
                page: parseInt(page, 10),
                limit,
                level,
                search,
            });
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch logs', message: error.message });
        }
    });

    router.post('/api/logs/clear-all', async (req, res) => {
        try {
            await store.clear();
            res.status(200).send('Logs cleared');
        } catch (error) {
            res.status(500).json({ error: 'Failed to clear logs', message: error.message });
        }
    });

    router.use(express.static(publicPath));

    return router;
}

module.exports = { setupLogger, viewerMiddleware };