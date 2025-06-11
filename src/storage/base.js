class BaseStore {
    constructor() {
        if (this.constructor === BaseStore) {
            throw new TypeError('Abstract class "BaseStore" cannot be instantiated directly.');
        }
    }

    async init() {
        return Promise.resolve();
    }

    add(logEntry) {
        throw new Error("Method 'add()' must be implemented.");
    }

    async get(options) {
        throw new Error("Method 'get()' must be implemented.");
    }

    async clear() {
        throw new Error("Method 'clear()' must be implemented.");
    }
}

module.exports = BaseStore;