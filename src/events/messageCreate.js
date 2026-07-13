const { Events } = require('discord.js');
const config = require('../config/config');
const voiceService = require('../services/voiceService');
const logger = require('../utils/logger');

const MUSIC_PATTERNS = ['m!p', 'm!play'];
const KICK_BOT_ID = '411916947773587456'; // Hardcoded target bot ID

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot || !message.guild) return;
        if (!config.enableMusicBlocker) return;

        const channelID = message.channelId;
        const blockedChannels = config.musicChannelIDs.map(id => id.toString());

        if (blockedChannels.includes(channelID)) return;

        const hasMusicCommand = MUSIC_PATTERNS.some(pattern =>
            message.content.toLowerCase().includes(pattern)
        );
        if (!hasMusicCommand) return;

        const channel = message.guild.channels.cache.get(channelID);
        if (!channel) return;

        // Warning messages
        const warn1 = await channel.send(`Con vợ <@${message.author.id}> bật nhạc láo vl`);
        const warn2 = await channel.send('Xóa mẹ tin nhắn trong 10s.... zzzz');

        setTimeout(async () => {
            try {
                await kickBot(message);
                await warn2.delete().catch(() => {});
                await warn1.delete().catch(() => {});
            } catch (err) {
                logger.error(`Music blocker error: ${err.message}`);
            }
        }, 3000);

        // Schedule user message deletion
        setTimeout(async () => {
            try { await message.delete(); } catch {}
        }, 5000);
    },
};

async function kickBot(message) {
    const member = message.guild.members.cache.get(KICK_BOT_ID);
    if (member?.voice?.channel) {
        await member.voice.setChannel(null);
        logger.info(`Kicked bot ${member.user.tag} from voice.`);
    }
}
