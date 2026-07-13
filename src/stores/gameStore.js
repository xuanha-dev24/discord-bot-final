/**
 * Centralized state for the number-guessing game.
 *
 * Structure per guild:
 * {
 *   players: Map<userId, { nickname, number }>,
 *   host: userId | null,
 *   isStarted: boolean,
 *   hostPercentage: number | null,
 * }
 */

const games = new Map();

function get(guildId) {
    if (!games.has(guildId)) {
        games.set(guildId, {
            players: new Map(),
            host: null,
            isStarted: false,
            hostPercentage: null,
        });
    }
    return games.get(guildId);
}

function reset(guildId) {
    games.set(guildId, {
        players: new Map(),
        host: null,
        isStarted: false,
        hostPercentage: null,
    });
}

function remove(guildId) {
    games.delete(guildId);
}

module.exports = { get, reset, remove };
