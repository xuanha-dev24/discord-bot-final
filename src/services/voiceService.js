const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    entersState,
    VoiceConnectionStatus,
    getVoiceConnection,
} = require('@discordjs/voice');
const logger = require('../utils/logger');

/**
 * Shared voice service – all voice-channel interaction goes through here.
 *
 * Manages per-guild connection & player references so we never leak
 * connections or players across commands / events.
 */

/** guildId → VoiceConnection */
const connections = new Map();

/** guildId → AudioPlayer */
const players = new Map();

/** guildId → { queue: string[], playing: boolean } */
const queues = new Map();

/**
 * Connect to a voice channel and return the connection.
 * Reuses an existing connection if already in the same channel.
 */
async function connect(channel) {
    const guildId = channel.guild.id;

    // Reuse existing connection if still alive
    const existing = getVoiceConnection(guildId);
    if (existing) {
        if (existing.joinConfig.channelId === channel.id) {
            connections.set(guildId, existing);
            return existing;
        }
        existing.destroy();
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guildId,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
    } catch (err) {
        logger.error(`Voice connection timeout for guild ${guildId}: ${err.message}`);
        connection.destroy();
        throw err;
    }

    connections.set(guildId, connection);

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
        } catch {
            connection.destroy();
            connections.delete(guildId);
            players.delete(guildId);
            queues.delete(guildId);
        }
    });

    return connection;
}

/**
 * Create an AudioPlayer for a guild (or return existing).
 */
function getOrCreatePlayer(guildId) {
    if (players.has(guildId)) return players.get(guildId);

    const player = createAudioPlayer();
    players.set(guildId, player);

    player.on('error', (err) => {
        logger.error(`Audio player error in guild ${guildId}: ${err.message}`);
        processNextInQueue(guildId);
    });

    player.on(AudioPlayerStatus.Idle, () => {
        processNextInQueue(guildId);
    });

    return player;
}

/**
 * Play an audio file in a voice channel.
 * Returns a Promise that resolves when playback starts.
 */
async function playFile(channel, filePath) {
    const connection = await connect(channel);
    const player = getOrCreatePlayer(channel.guild.id);
    connection.subscribe(player);

    const resource = createAudioResource(filePath);
    player.play(resource);

    return new Promise((resolve, reject) => {
        player.once(AudioPlayerStatus.Playing, resolve);
        player.once('error', reject);
    });
}

/**
 * Enqueue a file for playback. Plays immediately if nothing is playing.
 */
function enqueueFile(guildId, filePath, channel) {
    if (!queues.has(guildId)) {
        queues.set(guildId, { queue: [], playing: false });
    }

    const q = queues.get(guildId);
    q.queue.push({ filePath, channel });

    if (!q.playing) {
        processNextInQueue(guildId);
    }
}

/**
 * Process the next item in a guild's audio queue.
 */
async function processNextInQueue(guildId) {
    const q = queues.get(guildId);
    if (!q || q.queue.length === 0) {
        if (q) q.playing = false;
        return;
    }

    q.playing = true;
    const { filePath, channel } = q.queue.shift();

    try {
        await playFile(channel, filePath);
    } catch (err) {
        logger.error(`Queue playback error in guild ${guildId}: ${err.message}`);
        q.playing = false;
        processNextInQueue(guildId);
    }
}

/**
 * Stop playback and clear the queue for a guild.
 */
function stop(guildId) {
    const player = players.get(guildId);
    if (player) player.stop(true);

    const q = queues.get(guildId);
    if (q) {
        q.queue = [];
        q.playing = false;
    }
}

/**
 * Disconnect from voice in a guild and clean up all state.
 */
function disconnect(guildId) {
    stop(guildId);

    const connection = connections.get(guildId) || getVoiceConnection(guildId);
    if (connection) {
        connection.destroy();
        connections.delete(guildId);
    }

    players.delete(guildId);
    queues.delete(guildId);
}

/**
 * Check if the bot is connected to voice in a guild.
 */
function isConnected(guildId) {
    return !!getVoiceConnection(guildId);
}

/**
 * Get the voice channel the bot is currently in.
 */
function getCurrentChannel(guildId) {
    const connection = getVoiceConnection(guildId);
    return connection?.joinConfig?.channelId || null;
}

module.exports = {
    connect,
    playFile,
    enqueueFile,
    stop,
    disconnect,
    isConnected,
    getCurrentChannel,
    getOrCreatePlayer,
};
