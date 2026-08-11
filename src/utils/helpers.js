/**
 * Escape regex special characters.
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get the best display name for a member.
 * Priority: nickname > globalName > username > 'Unknown'
 */
function getDisplayName(member) {
    return member?.nickname
        || member?.user?.globalName
        || member?.user?.username
        || 'Unknown';
}

/**
 * Format milliseconds into a human-readable duration string.
 * Example: 3661000 → "1h 1m 1s"
 */
function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(' ');
}

/**
 * Format a Date into a localized time string.
 */
function formatTime(date) {
    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Create a safe file name (remove diacritics, special chars).
 */
function createSafeFileName(name) {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase()
        .substring(0, 50);
}

/**
 * Normalize free-text input: Unicode NFC form, trimmed, collapsed whitespace.
 */
function normalizeText(text) {
    return text.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/**
 * Auto-delete a Discord reply after a delay.
 */
function autoDeleteReply(reply, delayMs = 5000) {
    if (reply && typeof reply.delete === 'function') {
        setTimeout(() => reply.delete().catch(() => {}), delayMs);
    }
}

/**
 * Safe error reply – handles deferred vs non-deferred interactions.
 */
async function safeErrorReply(interaction, message = '❌ Có lỗi xảy ra. Vui lòng thử lại.') {
    try {
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: message });
        } else {
            await interaction.reply({ content: message, ephemeral: true });
        }
    } catch {
        // Best effort
    }
}

module.exports = {
    escapeRegex,
    getDisplayName,
    formatDuration,
    formatTime,
    createSafeFileName,
    normalizeText,
    autoDeleteReply,
    safeErrorReply,
};
