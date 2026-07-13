const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Kiểm tra độ trễ của bot'),

    async execute(interaction) {
        const sent = await interaction.reply({
            content: 'Pinging...',
            fetchReply: true,
        });

        const latency = sent.createdTimestamp - interaction.createdTimestamp;

        await interaction.editReply(
            `🏓 Pong!\n⏱️ Độ trễ: ${latency}ms\n💓 API Latency: ${Math.round(interaction.client.ws.ping)}ms`
        );
    },
};
