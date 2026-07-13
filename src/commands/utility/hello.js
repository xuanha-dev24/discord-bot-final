const { SlashCommandBuilder } = require('discord.js');

const GREETINGS = [
    (name) => `Dân chơi ${name}! đây rồiiii`,
    (name) => `Konichiwa ${name}! 🎉`,
    (name) => `Hế lô ${name}! ✨`,
    (name) => `Chào mừng ${name}! 🌟`,
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hello')
        .setDescription('Bot sẽ chào bạn! Chào kiểu hehehehe'),

    async execute(interaction) {
        const name = interaction.user.displayName || interaction.user.username;
        const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)](name);

        await interaction.reply({ content: greeting, ephemeral: false });
    },
};
