const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        // Autocomplete
        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (command?.autocomplete) {
                try {
                    await command.autocomplete(interaction);
                } catch (err) {
                    logger.error(`Autocomplete error /${interaction.commandName}: ${err.message}`);
                }
            }
            return;
        }

        // Slash commands
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            logger.warn(`Unknown command: /${interaction.commandName}`);
            return;
        }

        logger.command(interaction.user.tag, interaction.commandName, interaction.guild?.name || 'DM');

        try {
            await command.execute(interaction);
        } catch (err) {
            logger.error(`Command /${interaction.commandName} failed: ${err.message}`);

            const errorMsg = '❌ Có lỗi xảy ra khi thực thi lệnh này!';
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMsg, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMsg, ephemeral: true });
                }
            } catch {
                // Best effort
            }
        }
    },
};
