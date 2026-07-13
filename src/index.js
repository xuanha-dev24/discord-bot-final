const { createClient, startClient } = require('./client/botClient');
const { deployCommands } = require('./deploy');
const logger = require('./utils/logger');
const http = require('http');

const PORT = process.env.PORT || 10000;

// ---- HTTP server (for Render / cloud hosting health checks) ----

function createHealthServer() {
    const server = http.createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Bot Discord is running!');
    });

    server.listen(PORT, '0.0.0.0', () => {
        logger.info(`✅ Health server listening on port ${PORT}`);
    });

    return server;
}

// ---- Main bootstrap ----

(async () => {
    // Open health server immediately so Render doesn't kill the process
    createHealthServer();

    // Deploy slash commands (non-blocking)
    deployCommands().catch(err => {
        logger.error(`❌ Command deployment failed: ${err.message}`);
    });

    // Start the bot
    try {
        const client = createClient();
        await startClient(client);
        logger.info('🚀 Bot is fully operational!');
    } catch (err) {
        logger.error(`❌ Fatal startup error: ${err.message}`);
        process.exit(1);
    }
})();
