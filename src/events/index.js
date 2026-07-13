/**
 * Event registry – loads all event handlers from the events/ directory
 * and attaches them to the Discord client.
 */

const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const EVENTS_DIR = __dirname;

function registerEvents(client) {
    const entries = fs.readdirSync(EVENTS_DIR, { withFileTypes: true });

    let count = 0;
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.js') || entry.name === 'index.js') continue;

        const filePath = path.join(EVENTS_DIR, entry.name);
        try {
            const event = require(filePath);
            if (!event.name || !event.execute) {
                logger.warn(`Event at ${filePath} is missing "name" or "execute".`);
                continue;
            }

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }

            count++;
        } catch (err) {
            logger.error(`Failed to load event ${entry.name}: ${err.message}`);
        }
    }

    logger.info(`Registered ${count} events.`);
}

module.exports = { registerEvents };
