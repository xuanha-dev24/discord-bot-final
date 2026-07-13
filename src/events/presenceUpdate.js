const { Events } = require('discord.js');
const config = require('../config/config');
const logger = require('../utils/logger');

const dailyGreeting = new Map();
const dailyGoodbye = new Map();

const GREETINGS = {
    morning: 'Chào buổi sáng',
    noon: 'Chào buổi trưa',
    afternoon: 'Chào buổi chiều',
    evening: 'Chào buổi tối',
};

module.exports = {
    name: Events.PresenceUpdate,

    execute(oldPresence, newPresence) {
        if (!config.enableDailyGreeting) return;

        // User came online
        if ((!oldPresence || oldPresence.status === 'offline') && newPresence.status === 'online') {
            handleUserOnline(newPresence);
        }

        // User went offline
        if (oldPresence && oldPresence.status !== 'offline' && newPresence.status === 'offline') {
            handleUserOffline(newPresence);
        }
    },
};

function handleUserOnline(presence) {
    const user = presence.user;
    const guild = presence.guild;
    if (!user || !guild) return;

    const now = new Date();
    const key = `${user.id}-${now.getDay()}-${now.getMonth()}`;

    if (dailyGreeting.has(key)) return;
    dailyGreeting.set(key, true);

    // Calculate VN time
    let hour = now.getUTCHours() + 7;
    if (hour >= 24) hour -= 24;

    const greeting = getGreeting(hour);
    const channel = guild.channels.cache.find(ch => ch.name === 'greeting');

    if (channel) {
        // Uncomment to enable:
        // channel.send(`${greeting} <@${user.id}> nhóe 🐼`).catch(() => {});
    }

    logger.info(`Daily greeting: ${user.tag} — ${greeting}`);
}

function handleUserOffline(presence) {
    const user = presence.user;
    const guild = presence.guild;
    if (!user || !guild) return;

    const now = new Date();
    const key = `${user.id}-${now.getDay()}-${now.getMonth()}`;

    if (dailyGoodbye.has(key)) return;
    dailyGoodbye.set(key, true);

    const channel = guild.channels.cache.find(ch => ch.name === 'greeting');

    if (channel) {
        // Uncomment to enable:
        // channel.send(`<@${user.id}> đã offline mịa rồiiii!`).catch(() => {});
    }
}

function getGreeting(hour) {
    if (hour <= 11 && hour >= 0) return GREETINGS.morning;
    if (hour <= 13) return GREETINGS.noon;
    if (hour <= 17) return GREETINGS.afternoon;
    if (hour <= 24) return GREETINGS.evening;
    return 'Bot lỗi hihi';
}
