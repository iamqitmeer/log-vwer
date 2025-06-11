const { MongoClient } = require('mongodb');
const BaseStore = require('./base');

class MongoStore extends BaseStore {
    constructor({ mongoUrl, serviceName }) {
        super();
        this.client = new MongoClient(mongoUrl);
        this.dbName = this.client.s.url.split('/').pop().split('?')[0];
        this.collectionName = `logs_${serviceName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        this.collection = null;
    }

    async init() {
        try {
            await this.client.connect();
            const db = this.client.db(this.dbName);
            this.collection = db.collection(this.collectionName);
            this.collection.createIndex({ timestamp: -1 });
            this.collection.createIndex({ level: 1 });
            this.collection.createIndex({ message: "text", "meta_string": "text" });
        } catch (error) {
            console.error('❌ log-vwer: MongoDB connection FAILED!', error);
            throw error;
        }
    }

    add(logEntry) {
        if (!this.collection) {
            console.error('❌ log-vwer: Cannot add log, MongoDB collection is not available.');
            return;
        }
        const entryWithSearchableMeta = {
            ...logEntry,
            meta_string: JSON.stringify(logEntry.meta),
        };
        this.collection.insertOne(entryWithSearchableMeta).catch(err => {
            console.error('❌ log-vwer: Failed to INSERT log into MongoDB', err);
        });
    }

    async get({ page = 1, limit = 50, level = '', search = '' }) {
        if (!this.collection) {
            throw new Error('MongoDB not connected.');
        }

        const query = {};
        if (level) { query.level = level; }
        if (search) { query.$text = { $search: search }; }

        const skip = (page - 1) * limit;

        try {
            const totalLogs = await this.collection.countDocuments(query);
            const logs = await this.collection.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray();
            const totalPages = Math.ceil(totalLogs / limit);
            return { logs, totalLogs, currentPage: page, totalPages };
        } catch (err) {
            console.error('❌ log-vwer: Failed to GET logs from MongoDB', err);
            return { logs: [], totalLogs: 0, currentPage: 1, totalPages: 1 };
        }
    }

    async clear() {
        if (!this.collection) {
            throw new Error('MongoDB not connected.');
        }
        await this.collection.deleteMany({});
    }
}

module.exports = MongoStore;