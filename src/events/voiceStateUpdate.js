const { Events } = require('discord.js');
const voiceService = require('../services/voiceService');
const { generateTTS, deleteFile } = require('../services/ttsService');
const { getDisplayName } = require('../utils/helpers');
const config = require('../config/config');
const logger = require('../utils/logger');

module.exports = {
    name: Events.VoiceStateUpdate,

    async execute(oldState, newState) {
        const member = newState.member;
        if (!member || member.user.bot) return;

        // Skip configured greeting bot
        if (config.greetingBotId && member.id === config.greetingBotId) return;

        // ---- Someone joined voice ----
        if (!oldState.channel && newState.channel) {
            logger.info(`${member.user.tag} joined voice: ${newState.channel.name}`);
            if (config.enableAutoGreeting) {
                await welcomeToChannel(member);
            }
        }

        // ---- Someone left voice ----
        if (oldState.channel && !newState.channel) {
            logger.info(`${member.user.tag} left voice: ${oldState.channel.name}`);
            await maybeDisconnect(oldState);
        }
    },
};

// ---- Auto-greeting ----

async function welcomeToChannel(member) {
    const voiceChannel = member.voice?.channel;
    if (!voiceChannel) return;

    const nickname = getDisplayName(member);
    const text = `Con vợ ${nickname} chào anh em nhé hẹ hẹ hẹ`;

    try {
        const filePath = await generateTTS(text, `hello_${member.id}`);
        await voiceService.playFile(voiceChannel, filePath);

        // Clean up temp file after playback
        setTimeout(() => deleteFile(filePath), 3000);
    } catch (err) {
        logger.error(`Voice greeting failed for ${member.user.tag}: ${err.message}`);
    }
}

// ---- Auto-disconnect ----

async function maybeDisconnect(oldState) {
    const channel = oldState.channel;
    if (!channel) return;

    const nonBotMembers = channel.members.filter(m => !m.user.bot);
    if (nonBotMembers.size === 0) {
        voiceService.disconnect(channel.guild.id);
        logger.info(`Bot auto-disconnected: no humans left in ${channel.name}`);
    }
}
