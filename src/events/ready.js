const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,

    execute(client) {
        logger.info(`✅ Bot đã sẵn sàng! Đăng nhập: ${client.user.tag}`);
        logger.info(`📊 Đang phục vụ ${client.guilds.cache.size} server(s)`);
        logger.info(`👤 ${client.users.cache.size} user(s)`);
        logger.info(`⏰ ${new Date().toLocaleString('vi-VN')}`);

        client.user.setActivity('🎵 Soundboard Bot', { type: 'Listening' });
    },
};
