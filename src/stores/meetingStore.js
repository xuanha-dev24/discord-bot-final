const { Events } = require('discord.js');
const logger = require('../utils/logger');

/**
 * Centralized state for meeting-time tracking.
 *
 * Key: `${guildId}-${channelId}`
 * Value: {
 *   channelId, channelName,
 *   startTime, startedBy,
 *   memberData: Map<userId, { username, displayName, joinTime, totalTime, isCurrentlyInChannel }>,
 *   listener: Function  // the voiceStateUpdate listener reference
 * }
 */

const sessions = new Map();

function get(key) {
    return sessions.get(key);
}

function set(key, session) {
    sessions.set(key, session);
}

function remove(key) {
    const session = sessions.get(key);
    if (session?.listener) {
        // Cleanup is handled externally by the caller removing the listener
    }
    sessions.delete(key);
}

function has(key) {
    return sessions.has(key);
}

function size() {
    return sessions.size;
}

// ---- Voice-state listener factory ----

/**
 * Create a voiceStateUpdate listener that tracks joins/leaves
 * for a specific session's channel. The caller must attach
 * this to the client and detach when done.
 */
function createTrackingListener(sessionKey) {
    return (oldState, newState) => {
        const session = sessions.get(sessionKey);
        if (!session) return;

        const member = newState.member;
        if (!member) return;

        const now = Date.now();

        // Joined the tracked channel
        if (
            newState.channelId === session.channelId &&
            oldState.channelId !== session.channelId
        ) {
            if (!session.memberData.has(member.id)) {
                session.memberData.set(member.id, {
                    username: member.user.tag,
                    displayName: member.displayName,
                    joinTime: now,
                    totalTime: 0,
                    isCurrentlyInChannel: true,
                });
            } else {
                const data = session.memberData.get(member.id);
                data.joinTime = now;
                data.isCurrentlyInChannel = true;
            }
        }

        // Left the tracked channel
        if (
            oldState.channelId === session.channelId &&
            newState.channelId !== session.channelId
        ) {
            const data = session.memberData.get(member.id);
            if (data?.isCurrentlyInChannel) {
                data.totalTime += now - data.joinTime;
                data.isCurrentlyInChannel = false;
            }
        }
    };
}

module.exports = { get, set, remove, has, size, createTrackingListener };
