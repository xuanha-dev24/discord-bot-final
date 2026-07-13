const { REST, Routes } = require('discord.js');
const { token, clientID, guildId } = require('./config/config');
const { getCommandData } = require('./commands');
const logger = require('./utils/logger');

/**
 * Deploy all slash commands to Discord.
 * Uses guild-specific deployment when GUILD_ID is set (instant update),
 * otherwise deploys globally (can take up to 1 hour to propagate).
 */
async function deployCommands() {
    const commands = getCommandData();

    if (commands.length === 0) {
        logger.warn('No commands found to deploy.');
        return;
    }

    const rest = new REST().setToken(token);

    const route = guildId
        ? Routes.applicationGuildCommands(clientID, guildId)
        : Routes.applicationCommands(clientID);

    const scope = guildId ? `guild ${guildId}` : 'globally';

    try {
        logger.info(`🚀 Deploying ${commands.length} slash commands ${scope}...`);

        const data = await rest.put(route, { body: commands });

        logger.info(`✅ Deployed ${data.length} commands ${scope}:`);
        data.forEach(cmd => logger.info(`   /${cmd.name} — ${cmd.description}`));

    } catch (err) {
        logger.error(`❌ Deploy failed: ${err.message}`);

        if (err.code === 50001) {
            logger.warn('💡 Bot lacks permission. Re-invite with "applications.commands" scope.');
        } else if (err.code === 0) {
            logger.warn('💡 Check .env: DISCORD_TOKEN, CLIENT_ID, GUILD_ID');
        }
    }
}

// Allow standalone execution
if (require.main === module) {
    deployCommands();
}

module.exports = { deployCommands };
