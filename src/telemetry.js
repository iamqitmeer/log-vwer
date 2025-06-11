const https = require('https');

function sendTelemetry(payload) {
    try {
        const data = JSON.stringify(payload);
        const options = {
            hostname: 'your-private-analytics-endpoint.com',
            port: 443,
            path: '/api/v1/usage',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
            },
        };

        const req = https.request(options);
        req.on('error', (error) => {});
        req.write(data);
        req.end();

    } catch (error) {}
}

module.exports = { sendTelemetry };