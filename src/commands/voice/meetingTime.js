const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const meetingStore = require('../../stores/meetingStore');
const { generateMeetingReport } = require('../../services/excelService');
const { formatDuration, formatTime, safeErrorReply } = require('../../utils/helpers');
const logger = require('../../utils/logger');

module.exports = {
    category: 'Voice',
    data: new SlashCommandBuilder()
        .setName('meetingtime')
        .setDescription('Theo dõi thời gian tham gia voice channel')
        .addStringOption(o => o.setName('channel').setDescription('Tên kênh voice').setRequired(true))
        .addStringOption(o => o
            .setName('action')
            .setDescription('Hành động: start hoặc end')
            .setRequired(true)
            .addChoices(
                { name: 'start', value: 'start' },
                { name: 'end', value: 'end' },
            )),

    async execute(interaction) {
        const channelName = interaction.options.getString('channel');
        const action = interaction.options.getString('action');

        try {
            const voiceChannel = interaction.guild.channels.cache.find(
                ch => ch.name === channelName && ch.isVoiceBased()
            );

            if (!voiceChannel) {
                return interaction.reply({
                    content: `❌ Không tìm thấy kênh voice "${channelName}".`,
                    ephemeral: true,
                });
            }

            const sessionKey = `${interaction.guild.id}-${voiceChannel.id}`;

            if (action === 'start') {
                if (meetingStore.has(sessionKey)) {
                    return interaction.reply({
                        content: `⚠️ Đã có phiên tracking đang chạy cho "${channelName}". Kết thúc phiên cũ trước.`,
                        ephemeral: true,
                    });
                }

                const members = voiceChannel.members;
                if (members.size === 0) {
                    return interaction.reply({
                        content: `⚠️ Không có ai trong kênh "${channelName}".`,
                        ephemeral: true,
                    });
                }

                const startTime = Date.now();
                const memberData = new Map();

                members.forEach(m => {
                    memberData.set(m.id, {
                        username: m.user.tag,
                        displayName: m.displayName,
                        joinTime: startTime,
                        totalTime: 0,
                        isCurrentlyInChannel: true,
                    });
                });

                const listener = meetingStore.createTrackingListener(sessionKey);
                interaction.client.on('voiceStateUpdate', listener);

                meetingStore.set(sessionKey, {
                    channelId: voiceChannel.id,
                    channelName: voiceChannel.name,
                    startTime,
                    memberData,
                    startedBy: interaction.user.tag,
                    listener,
                });

                logger.info(`Meeting tracking started: ${channelName} by ${interaction.user.tag}`);

                await interaction.reply({
                    content:
                        `✅ Bắt đầu tracking cho kênh **${channelName}**\n` +
                        `👥 ${members.size} thành viên\n` +
                        `🕐 ${formatTime(new Date(startTime))}`,
                    ephemeral: false,
                });

            } else if (action === 'end') {
                const session = meetingStore.get(sessionKey);
                if (!session) {
                    return interaction.reply({
                        content: `❌ Không có phiên tracking nào cho "${channelName}".`,
                        ephemeral: true,
                    });
                }

                await interaction.deferReply();

                // Remove listener
                if (session.listener) {
                    interaction.client.off('voiceStateUpdate', session.listener);
                }

                // Finalize times
                const endTime = Date.now();
                session.memberData.forEach((data) => {
                    if (data.isCurrentlyInChannel) {
                        data.totalTime += endTime - data.joinTime;
                    }
                });

                const filePath = await generateMeetingReport(session, endTime);

                await interaction.editReply({
                    content:
                        `✅ Kết thúc tracking cho **${channelName}**\n` +
                        `🕐 ${formatTime(new Date(endTime))}\n` +
                        `⏱️ Tổng: ${formatDuration(endTime - session.startTime)}`,
                    files: [filePath],
                });

                // Cleanup
                setTimeout(() => {
                    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
                }, 5000);

                meetingStore.remove(sessionKey);
                logger.info(`Meeting tracking ended: ${channelName}`);
            }
        } catch (error) {
            logger.error(`MeetingTime error: ${error.message}`);
            await safeErrorReply(interaction);
        }
    },
};
