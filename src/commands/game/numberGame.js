const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');
const gameStore = require('../../stores/gameStore');
const logger = require('../../utils/logger');

const ITEMS_PER_PAGE = 20;

// ---- Command ----

module.exports = {
    category: 'Game',
    data: new SlashCommandBuilder()
        .setName('game')
        .setDescription('Quản lý trò chơi đoán số trung bình')
        .addSubcommand(s => s.setName('add').setDescription('Thêm người chơi vào game'))
        .addSubcommand(s => s.setName('remove').setDescription('Xóa người chơi khỏi game'))
        .addSubcommand(s => s.setName('clear').setDescription('Xóa tất cả người chơi'))
        .addSubcommand(s => s.setName('sethost').setDescription('Đặt chủ trò chơi'))
        .addSubcommand(s => s.setName('list').setDescription('Xem danh sách người chơi'))
        .addSubcommand(s => s.setName('start').setDescription('Bắt đầu trò chơi'))
        .addSubcommand(s => s.setName('abort').setDescription('Hủy ván game đang diễn ra'))
        .addSubcommand(s => s
            .setName('submit')
            .setDescription('Gửi số của bạn (50-100)')
            .addIntegerOption(o => o.setName('number').setDescription('Số bạn chọn (50-100)').setRequired(true).setMinValue(50).setMaxValue(100)))
        .addSubcommand(s => s
            .setName('hostsubmit')
            .setDescription('Chủ trò gửi phần trăm (75-125)')
            .addIntegerOption(o => o.setName('percentage').setDescription('Phần trăm (75-125)').setRequired(true).setMinValue(75).setMaxValue(125))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const gameState = gameStore.get(interaction.guildId);

        switch (sub) {
            case 'add': return handleAdd(interaction, gameState);
            case 'remove': return handleRemove(interaction, gameState);
            case 'clear': return handleClear(interaction, gameState);
            case 'sethost': return handleSetHost(interaction, gameState);
            case 'list': return handleList(interaction, gameState);
            case 'start': return handleStart(interaction, gameState);
            case 'abort': return handleAbort(interaction, gameState);
            case 'submit': return handleSubmit(interaction, gameState);
            case 'hostsubmit': return handleHostSubmit(interaction, gameState);
        }
    },
};

// ---- Handlers ----

async function handleAdd(interaction, gameState) {
    if (gameState.isStarted) {
        return interaction.reply({ content: '❌ Game đang diễn ra, không thể thêm!', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const members = await interaction.guild.members.fetch();
    const humanMembers = members.filter(m => !m.user.bot);
    const memberArray = Array.from(humanMembers.values());

    if (memberArray.length === 0) {
        return interaction.editReply('❌ Không tìm thấy thành viên nào!');
    }

    const totalPages = Math.ceil(memberArray.length / ITEMS_PER_PAGE);
    let currentPage = 0;

    const buildRows = (page) => {
        const rows = [];
        const start = page * ITEMS_PER_PAGE;
        const slice = memberArray.slice(start, start + ITEMS_PER_PAGE);

        for (let i = 0; i < slice.length; i += 5) {
            const row = new ActionRowBuilder();
            slice.slice(i, i + 5).forEach(member => {
                const inGame = gameState.players.has(member.id);
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`gm_toggle_${member.id}`)
                        .setLabel(member.displayName.substring(0, 80))
                        .setStyle(inGame ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setEmoji(inGame ? '✅' : '➕')
                );
            });
            rows.push(row);
        }

        if (totalPages > 1) {
            const navRow = new ActionRowBuilder();
            navRow.addComponents(
                new ButtonBuilder().setCustomId('gm_prev').setLabel('◀️ Trước').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('gm_info').setLabel(`Trang ${page + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('gm_next').setLabel('Sau ▶️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
            );
            rows.push(navRow);
        }

        const doneRow = new ActionRowBuilder();
        doneRow.addComponents(
            new ButtonBuilder().setCustomId('gm_done').setLabel('✅ Xong').setStyle(ButtonStyle.Success)
        );
        rows.push(doneRow);

        return rows;
    };

    const reply = await interaction.editReply({
        content: '👥 Chọn người chơi (xanh = đã chọn, xám = chưa chọn):',
        components: buildRows(currentPage),
    });

    const collector = reply.createMessageComponentCollector({ time: 180_000 });

    collector.on('collect', async (btn) => {
        if (btn.user.id !== interaction.user.id) {
            return btn.reply({ content: '❌ Bạn không phải người tạo!', ephemeral: true });
        }

        if (btn.customId === 'gm_prev') currentPage--;
        else if (btn.customId === 'gm_next') currentPage++;
        else if (btn.customId === 'gm_done') {
            collector.stop('done');
            await btn.update({ content: '✅ Đã chọn xong người chơi!', components: [] });
            return;
        } else if (btn.customId.startsWith('gm_toggle_')) {
            const memberId = btn.customId.slice('gm_toggle_'.length);
            if (gameState.players.has(memberId)) {
                gameState.players.delete(memberId);
            } else {
                const member = memberArray.find(m => m.id === memberId);
                if (member) gameState.players.set(memberId, { nickname: member.displayName, number: null });
            }
        }

        if (btn.customId !== 'gm_done') {
            await btn.update({ components: buildRows(currentPage) });
        }
    });

    collector.on('end', (_, reason) => {
        if (reason !== 'done') {
            reply.edit({ components: [] }).catch(() => {});
        }
    });
}

async function handleRemove(interaction, gameState) {
    if (gameState.isStarted) {
        return interaction.reply({ content: '❌ Game đang diễn ra!', ephemeral: true });
    }

    if (gameState.players.size === 0) {
        return interaction.reply({ content: '⚠️ Chưa có người chơi nào.', ephemeral: true });
    }

    const playerArray = Array.from(gameState.players.entries());
    const totalPages = Math.ceil(playerArray.length / ITEMS_PER_PAGE);
    let currentPage = 0;

    const buildRows = (page) => {
        const rows = [];
        const start = page * ITEMS_PER_PAGE;
        const slice = playerArray.slice(start, start + ITEMS_PER_PAGE);

        for (let i = 0; i < slice.length; i += 5) {
            const row = new ActionRowBuilder();
            slice.slice(i, i + 5).forEach(([id, data]) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`rm_${id}`)
                        .setLabel(data.nickname.substring(0, 80))
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );
            });
            rows.push(row);
        }

        if (totalPages > 1) {
            const navRow = new ActionRowBuilder();
            navRow.addComponents(
                new ButtonBuilder().setCustomId('rm_prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('rm_info').setLabel(`Trang ${page + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('rm_next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
            );
            rows.push(navRow);
        }

        return rows;
    };

    const reply = await interaction.reply({
        content: '❌ Chọn người chơi để xóa:',
        components: buildRows(currentPage),
        fetchReply: true,
        ephemeral: true,
    });

    const collector = reply.createMessageComponentCollector({ time: 120_000 });

    collector.on('collect', async (btn) => {
        if (btn.user.id !== interaction.user.id) {
            return btn.reply({ content: '❌ Bạn không phải người tạo!', ephemeral: true });
        }

        if (btn.customId === 'rm_prev') currentPage--;
        else if (btn.customId === 'rm_next') currentPage++;
        else if (btn.customId.startsWith('rm_')) {
            const memberId = btn.customId.slice('rm_'.length);
            gameState.players.delete(memberId);
            if (gameState.host === memberId) gameState.host = null;
        }

        await btn.update({ components: buildRows(currentPage) });
    });

    collector.on('end', () => {
        reply.edit({ components: [] }).catch(() => {});
    });
}

function handleClear(interaction, gameState) {
    if (gameState.isStarted) {
        return interaction.reply({ content: '❌ Game đang diễn ra!', ephemeral: true });
    }
    gameState.players.clear();
    gameState.host = null;
    gameState.hostPercentage = null;
    return interaction.reply('✅ Đã xóa tất cả người chơi.');
}

function handleSetHost(interaction, gameState) {
    const userId = interaction.user.id;
    if (!gameState.players.has(userId)) {
        return interaction.reply({ content: '❌ Bạn chưa có trong danh sách người chơi!', ephemeral: true });
    }
    gameState.host = userId;
    return interaction.reply(`✅ <@${userId}> đã được đặt làm chủ trò!`);
}

function handleList(interaction, gameState) {
    if (gameState.players.size === 0) {
        return interaction.reply({ content: '📝 Chưa có người chơi nào.', ephemeral: true });
    }

    const list = Array.from(gameState.players.entries())
        .map(([id, data], i) => `${i + 1}. <@${id}> ${id === gameState.host ? '👑 (Host)' : ''}`)
        .join('\n');

    const embed = new EmbedBuilder()
        .setTitle('👥 Danh sách người chơi')
        .setColor(0x00ae86)
        .setDescription(list);

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleStart(interaction, gameState) {
    if (gameState.players.size < 2) {
        return interaction.reply({ content: '❌ Cần ít nhất 2 người chơi!', ephemeral: true });
    }
    if (!gameState.host) {
        return interaction.reply({ content: '❌ Chưa có chủ trò! Dùng `/game sethost`.', ephemeral: true });
    }

    gameState.isStarted = true;
    logger.info(`Game started in guild ${interaction.guildId} with ${gameState.players.size} players`);

    await interaction.reply(
        `🎮 **Game đã bắt đầu!**\n` +
        `👑 Chủ trò: <@${gameState.host}>\n` +
        `👥 Người chơi: ${gameState.players.size}\n\n` +
        `📝 Mỗi người chơi dùng \`/game submit number:<số từ 50-100>\`\n` +
        `👑 Chủ trò dùng \`/game hostsubmit percentage:<75-125>\`\n` +
        `⏰ Bạn có 60 giây để submit!`
    );

    // Auto-resolve after 60s
    setTimeout(() => autoResolve(interaction, gameState), 60_000);
}

function handleAbort(interaction, gameState) {
    if (!gameState.isStarted) {
        return interaction.reply({ content: '⚠️ Không có game nào đang chạy.', ephemeral: true });
    }
    gameStore.reset(interaction.guildId);
    return interaction.reply('🛑 Game đã bị hủy. Tất cả đã được reset.');
}

function handleSubmit(interaction, gameState) {
    if (!gameState.isStarted) {
        return interaction.reply({ content: '❌ Game chưa bắt đầu!', ephemeral: true });
    }

    const userId = interaction.user.id;
    const player = gameState.players.get(userId);
    if (!player) {
        return interaction.reply({ content: '❌ Bạn không có trong danh sách người chơi!', ephemeral: true });
    }
    if (userId === gameState.host) {
        return interaction.reply({ content: '❌ Chủ trò dùng `/game hostsubmit` để gửi!', ephemeral: true });
    }
    if (player.number !== null) {
        return interaction.reply({ content: '❌ Bạn đã gửi số rồi!', ephemeral: true });
    }

    player.number = interaction.options.getInteger('number');
    return interaction.reply({ content: `✅ Bạn đã gửi số **${player.number}**! Chờ kết quả...`, ephemeral: true });
}

function handleHostSubmit(interaction, gameState) {
    if (!gameState.isStarted) {
        return interaction.reply({ content: '❌ Game chưa bắt đầu!', ephemeral: true });
    }
    if (interaction.user.id !== gameState.host) {
        return interaction.reply({ content: '❌ Chỉ chủ trò mới được dùng lệnh này!', ephemeral: true });
    }

    gameState.hostPercentage = interaction.options.getInteger('percentage');
    return interaction.reply({ content: `✅ Chủ trò đã gửi phần trăm **${gameState.hostPercentage}%**! Chờ kết quả...`, ephemeral: true });
}

// ---- Auto-resolve ----

function autoResolve(interaction, gameState) {
    if (!gameState.isStarted) return;

    gameState.isStarted = false;

    const submissions = Array.from(gameState.players.values()).filter(p => p.number !== null);

    if (submissions.length === 0) {
        interaction.channel?.send('⏰ Hết giờ! Không ai submit số cả. Game kết thúc.');
        gameStore.reset(interaction.guildId);
        return;
    }

    const sum = submissions.reduce((s, p) => s + p.number, 0);
    const avg = sum / submissions.length;
    const halfAvg = avg / 2;

    const percentage = gameState.hostPercentage ?? 100;
    const target = halfAvg * (percentage / 100);

    // Find the closest submission
    let winnerId = null;
    let closestDiff = Infinity;

    for (const [id, data] of gameState.players) {
        if (data.number === null || id === gameState.host) continue;
        const diff = Math.abs(data.number - target);
        if (diff < closestDiff) {
            closestDiff = diff;
            winnerId = id;
        }
    }

    const embed = new EmbedBuilder()
        .setTitle('🎯 Kết quả Game Đoán Số')
        .setColor(0xffd700)
        .addFields(
            { name: '📊 Trung bình', value: `${avg.toFixed(2)}`, inline: true },
            { name: '🎯 Nửa trung bình', value: `${halfAvg.toFixed(2)}`, inline: true },
            { name: '📐 Mục tiêu', value: `${target.toFixed(2)} (${percentage}%)`, inline: true },
            { name: '👑 Chủ trò', value: `<@${gameState.host}>`, inline: true },
        );

    if (winnerId) {
        embed.addFields({ name: '🏆 Người chiến thắng', value: `<@${winnerId}> với độ lệch ${closestDiff.toFixed(2)}` });
    } else {
        embed.addFields({ name: '🏆 Kết quả', value: 'Không có người chiến thắng (không ai submit hoặc chỉ có chủ trò).' });
    }

    interaction.channel?.send({ embeds: [embed] });
    gameStore.reset(interaction.guildId);
}
