/**
 * Command registry – single source of truth for all slash commands.
 * Both the bot client and deploy script import from here.
 */

const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const COMMANDS_DIR = __dirname;

/**
 * Recursively load all command modules from the commands/ directory.
 * @returns {Map<string, object>} Map of commandName → command module
 */
function loadCommands() {
    const commands = new Map();

    function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
                try {
                    const cmd = require(fullPath);
                    if (cmd.data && cmd.execute) {
                        commands.set(cmd.data.name, cmd);
                    } else {
                        logger.warn(`Command at ${fullPath} is missing "data" or "execute".`);
                    }
                } catch (err) {
                    logger.error(`Failed to load command ${fullPath}: ${err.message}`);
                }
            }
        }
    }

    walk(COMMANDS_DIR);
    logger.info(`Loaded ${commands.size} commands.`);
    return commands;
}

/**
 * Get all command JSON data for deployment.
 * @returns {object[]}
 */
function getCommandData() {
    const commands = loadCommands();
    return Array.from(commands.values()).map(cmd => cmd.data.toJSON());
}

module.exports = { loadCommands, getCommandData };
