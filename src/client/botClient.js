const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadCommands } = require('../commands');
const { registerEvents } = require('../events');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Create and configure the Discord bot client.
 *
 * @param {object} [options]
 * @param {number[]} [options.intents] – Extra intents to merge with defaults
 * @returns {Client}
 */
function createClient(options = {}) {
    const intents = [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
        ...(options.intents || []),
    ];

    const client = new Client({ intents });

    // Attach command collection
    client.commands = loadCommands();

    // Register events
    registerEvents(client);

    // Debug logging
    client.on('debug', (msg) => logger.debug(msg));
    client.on('warn', (msg) => logger.warn(msg));
    client.on('error', (msg) => logger.error(`Client error: ${msg}`));

    return client;
}

/**
 * Login the client and return once it's ready.
 *
 * @param {Client} client
 * @returns {Promise<Client>}
 */
async function startClient(client) {
    if (!config.token) {
        logger.error('❌ DISCORD_TOKEN is not set. Check your .env file.');
        process.exit(1);
    }

    logger.info('⏳ Connecting to Discord...');
    await client.login(config.token);
    logger.info(`✅ Logged in as ${client.user?.tag}`);

    return client;
}

module.exports = { createClient, startClient };
