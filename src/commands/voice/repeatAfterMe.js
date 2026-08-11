const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const franc = require('franc-min');
const voiceService = require('../../services/voiceService');
const { generateTTS, deleteFile } = require('../../services/ttsService');
const { escapeRegex, getDisplayName, autoDeleteReply, normalizeText } = require('../../utils/helpers');
const logger = require('../../utils/logger');

// ---- Abbreviation store ----

const DATA_DIR = path.join(process.cwd(), 'data');
const ABBREVIATIONS_FILE = path.join(DATA_DIR, 'abbreviations.json');

// Below this length, language detection is too unreliable — default to Vietnamese.
const MIN_LENGTH_FOR_DETECTION = 4;
// Only treat text as English when it beats Vietnamese by more than this margin.
const ENGLISH_CONFIDENCE_MARGIN = 0.1;

function loadAbbreviations() {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        if (fs.existsSync(ABBREVIATIONS_FILE)) {
            const raw = JSON.parse(fs.readFileSync(ABBREVIATIONS_FILE, 'utf8'));
            // Normalize keys to lowercase so lookups stay case-insensitive
            // even for entries saved before this change.
            const normalized = {};
            for (const [key, value] of Object.entries(raw)) {
                normalized[key.toLowerCase()] = value;
            }
            return normalized;
        }
    } catch (err) {
        logger.error(`Load abbreviations error: ${err.message}`);
    }
    return {};
}

function saveAbbreviations(data) {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(ABBREVIATIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        logger.error(`Save abbreviations error: ${err.message}`);
        return false;
    }
}

/**
 * Guess whether text is Vietnamese vs. English, so single-letter
 * abbreviations (e.g. "a" → "anh") don't get expanded inside English
 * sentences. Statistical detection is unreliable on short/casual chat
 * text, so this defaults to Vietnamese (the bot's primary language)
 * unless English clearly wins by a margin, scored only against Vietnamese
 * (comparing against all ~80 languages franc supports is far less
 * accurate for short text than a direct vi-vs-en comparison).
 */
function isLikelyVietnamese(text) {
    const trimmed = text.trim();
    if (trimmed.length < MIN_LENGTH_FOR_DETECTION) return true;

    const scores = Object.fromEntries(franc.all(trimmed, { minLength: 1 }));
    const vi = scores['vie'] || 0;
    const en = scores['eng'] || 0;

    return en - vi <= ENGLISH_CONFIDENCE_MARGIN;
}

function expandAbbreviations(text) {
    const abbreviations = loadAbbreviations();
    const keys = Object.keys(abbreviations);
    if (keys.length === 0 || !isLikelyVietnamese(text)) {
        return text;
    }

    let result = text;
    const sorted = keys.sort((a, b) => b.length - a.length);

    for (const abbr of sorted) {
        const escaped = escapeRegex(abbr);
        // Case-insensitive match against the lowercase-normalized key.
        const regex = new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped})(?=[^\\p{L}\\p{N}]|$)`, 'giu');
        result = result.replace(regex, (_, prefix) => `${prefix}${abbreviations[abbr]}`);
    }

    return result;
}

// ---- Command ----

module.exports = {
    category: 'Voice',
    data: new SlashCommandBuilder()
        .setName('r')
        .setDescription('Bot sẽ nói lại đoạn text bạn nhập')
        .addSubcommand(s => s
            .setName('say')
            .setDescription('Bot nói text của bạn')
            .addStringOption(o => o.setName('text').setDescription('Đoạn text bạn muốn bot nói').setRequired(true)))
        .addSubcommand(s => s
            .setName('add')
            .setDescription('Thêm từ viết tắt')
            .addStringOption(o => o.setName('abbreviation').setDescription('Từ viết tắt (vd: T, m, k)').setRequired(true))
            .addStringOption(o => o.setName('fullform').setDescription('Từ đầy đủ (vd: Tao, mày, không)').setRequired(true)))
        .addSubcommand(s => s.setName('list').setDescription('Hiển thị danh sách từ viết tắt'))
        .addSubcommand(s => s
            .setName('remove')
            .setDescription('Xóa từ viết tắt')
            .addStringOption(o => o.setName('abbreviation').setDescription('Từ viết tắt muốn xóa').setRequired(false))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        switch (sub) {
            case 'say': return handleSay(interaction);
            case 'add': return handleAdd(interaction);
            case 'list': return handleList(interaction);
            case 'remove': return handleRemove(interaction);
        }
    },
};

// ---- Handlers ----

async function handleSay(interaction) {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
        return interaction.reply({ content: '❌ Bạn cần vào voice channel trước!', ephemeral: true });
    }

    const rawText = normalizeText(interaction.options.getString('text'));
    const text = expandAbbreviations(rawText);
    const nickname = getDisplayName(interaction.member);

    await interaction.deferReply();

    try {
        const filePath = await generateTTS(`${nickname} bảo là: ${text}`, `repeat_${interaction.user.id}`);
        await voiceService.playFile(voiceChannel, filePath);

        // Clean up file after playback
        setTimeout(() => deleteFile(filePath), 3000);

        const reply = await interaction.editReply(`🔊 Đang nói: *${text.substring(0, 100)}${text.length > 100 ? '...' : ''}*`);
        autoDeleteReply(reply, 3000);
    } catch (err) {
        logger.error(`Repeat say error: ${err.message}`);
        await interaction.editReply('❌ Lỗi khi phát âm thanh. Thử lại sau.');
    }
}

async function handleAdd(interaction) {
    const abbr = normalizeText(interaction.options.getString('abbreviation')).toLowerCase();
    const full = normalizeText(interaction.options.getString('fullform'));

    if (!abbr || !full) {
        return interaction.reply({ content: '❌ Không được để trống!', ephemeral: true });
    }

    const abbreviations = loadAbbreviations();
    if (abbreviations[abbr]) {
        return interaction.reply({
            content: `⚠️ Từ viết tắt **${abbr}** đã tồn tại → **${abbreviations[abbr]}**\nXóa từ cũ trước hoặc dùng từ khác.`,
            ephemeral: true,
        });
    }

    abbreviations[abbr] = full;
    if (saveAbbreviations(abbreviations)) {
        await interaction.reply(`✅ Đã thêm: **${abbr}** → **${full}**`);
    } else {
        await interaction.reply({ content: '❌ Lỗi khi lưu!', ephemeral: true });
    }
}

async function handleList(interaction) {
    const abbreviations = loadAbbreviations();
    const entries = Object.entries(abbreviations);

    if (entries.length === 0) {
        return interaction.reply({ content: '📝 Chưa có từ viết tắt nào.', ephemeral: true });
    }

    const desc = entries.map(([k, v], i) => `${i + 1}. **${k}** → ${v}`).join('\n');
    const embed = new EmbedBuilder()
        .setTitle('📝 Danh sách từ viết tắt')
        .setColor(0x00ae86)
        .setDescription(desc);

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleRemove(interaction) {
    const rawAbbr = interaction.options.getString('abbreviation');
    const abbr = rawAbbr ? normalizeText(rawAbbr).toLowerCase() : undefined;

    if (!abbr) {
        // Show list to pick from
        const abbreviations = loadAbbreviations();
        const entries = Object.entries(abbreviations);
        if (entries.length === 0) {
            return interaction.reply({ content: '📝 Chưa có từ nào để xóa.', ephemeral: true });
        }
        const list = entries.map(([k, v]) => `- **${k}** → ${v}`).join('\n');
        return interaction.reply({
            content: `📝 Dùng \`/r remove abbreviation:<từ>\` để xóa.\n\n${list}`,
            ephemeral: true,
        });
    }

    const abbreviations = loadAbbreviations();
    if (!abbreviations[abbr]) {
        return interaction.reply({ content: `❌ Không tìm thấy từ viết tắt "${abbr}".`, ephemeral: true });
    }

    const oldValue = abbreviations[abbr];
    delete abbreviations[abbr];
    saveAbbreviations(abbreviations);

    await interaction.reply(`✅ Đã xóa: **${abbr}** → ${oldValue}`);
}
