const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Hiển thị danh sách lệnh và mô tả'),

    async execute(interaction) {
        const commands = interaction.client.commands;

        const embed = new EmbedBuilder()
            .setTitle('📖 Danh sách lệnh')
            .setColor(0x00ae86)
            .setDescription('Dưới đây là các lệnh mà bạn có thể sử dụng:')
            .setFooter({ text: `Tổng: ${commands.size} lệnh` });

        // Group commands by category
        const categorized = new Map();
        for (const [name, cmd] of commands) {
            const cat = cmd.category || 'Khác';
            if (!categorized.has(cat)) categorized.set(cat, []);
            categorized.get(cat).push({ name, description: cmd.data.description });
        }

        for (const [category, cmds] of categorized) {
            const fieldValue = cmds.map(c => `\`/${c.name}\` — ${c.description || 'Không có mô tả'}`).join('\n');
            embed.addFields({ name: `📁 ${category}`, value: fieldValue, inline: false });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
