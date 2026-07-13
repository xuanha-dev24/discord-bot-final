require('dotenv').config();

module.exports = {
    // Discord credentials
    token: process.env.DISCORD_TOKEN,
    clientID: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID || null,

    // Channel IDs
    logChannelID: process.env.LOG_CHANNEL_ID,
    musicChannelIDs: (process.env.MUSIC_CHANNEL_IDS || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean),

    // Bot behavior flags
    enableAutoGreeting: process.env.ENABLE_AUTO_GREETING !== 'false',   // Default: true
    enableDailyGreeting: process.env.ENABLE_DAILY_GREETING === 'true', // Default: false
    enableMusicBlocker: process.env.ENABLE_MUSIC_BLOCKER !== 'false',  // Default: true

    // Auto-greeting
    greetingBotId: process.env.GREETING_BOT_ID || '',

    // Audio paths
    soundsDir: process.env.SOUNDS_DIR || 'sounds',
    soundboardDir: process.env.SOUNDBOARD_DIR || 'commands/soundboard',

    // Data paths
    dataDir: process.env.DATA_DIR || 'data',
    abbreviationsFile: process.env.ABBREVIATIONS_FILE || 'data/abbreviations.json',
};
