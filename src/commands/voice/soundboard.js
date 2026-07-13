const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionsBitField,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const voiceService = require('../../services/voiceService');
const { autoDeleteReply, createSafeFileName } = require('../../utils/helpers');
const logger = require('../../utils/logger');

const SOUNDBOARD_DIR = path.join(__dirname, '..', '..', '..', 'commands', 'soundboard');
const MAPPING_FILE = path.join(SOUNDBOARD_DIR, 'mapping.json');

// Ensure directories exist
[SOUNDBOARD_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
if (!fs.existsSync(MAPPING_FILE)) {
    fs.writeFileSync(MAPPING_FILE, JSON.stringify({}, null, 2));
}

// ---- Helpers ----

function loadMapping() {
    try { return JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8')); }
    catch { return {}; }
}

function saveMapping(mapping) {
    fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
}

function getSoundList() {
    if (!fs.existsSync(SOUNDBOARD_DIR)) return [];
    const mapping = loadMapping();
    const reversed = Object.fromEntries(Object.entries(mapping).map(([k, v]) => [v, k]));

    return fs.readdirSync(SOUNDBOARD_DIR)
        .filter(f => f.endsWith('.mp3') || f.endsWith('.ogg'))
        .map(file => ({
            displayName: reversed[file] || file.replace(/\.(mp3|ogg)$/, ''),
            fileName: file,
            ext: path.extname(file),
        }));
}

// ---- Command ----

module.exports = {
    category: 'Voice',
    data: new SlashCommandBuilder()
        .setName('soundboard')
        .setDescription('Quản lý soundboard')
        .addSubcommand(s => s.setName('show').setDescription('Hiển thị danh sách soundboard'))
        .addSubcommand(s => s
            .setName('add')
            .setDescription('Thêm âm thanh mới')
            .addStringOption(o => o.setName('name').setDescription('Tên âm thanh').setRequired(true).setMaxLength(30))
            .addAttachmentOption(o => o.setName('file').setDescription('File âm thanh (.mp3/.ogg)').setRequired(true)))
        .addSubcommand(s => s
            .setName('remove')
            .setDescription('Xóa âm thanh')
            .addStringOption(o => o.setName('name').setDescription('Tên âm thanh cần xóa').setRequired(true).setAutocomplete(true)))
        .addSubcommand(s => s.setName('list').setDescription('Xem danh sách tất cả âm thanh')),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const sounds = getSoundList();
        const filtered = sounds.filter(s =>
            s.displayName.toLowerCase().includes(focused.toLowerCase())
        );
        await interaction.respond(
            filtered.slice(0, 25).map(s => ({ name: s.displayName, value: s.displayName }))
        );
    },

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        switch (sub) {
            case 'show': await handleShow(interaction); break;
            case 'add': await handleAdd(interaction); break;
            case 'remove': await handleRemove(interaction); break;
            case 'list': await handleList(interaction); break;
        }
    },
};

// ---- Subcommand handlers ----

async function handleShow(interaction) {
    const sounds = getSoundList();
    if (sounds.length === 0) {
        const reply = await interaction.reply({
            content: '❌ Chưa có âm thanh nào! Dùng `/soundboard add` để thêm.',
            ephemeral: true, fetchReply: true,
        });
        return autoDeleteReply(reply);
    }

    const ITEMS_PER_PAGE = 20;
    const totalPages = Math.ceil(sounds.length / ITEMS_PER_PAGE);
    let page = 0;

    const buildRows = (p) => {
        const rows = [];
        const slice = sounds.slice(p * ITEMS_PER_PAGE, (p + 1) * ITEMS_PER_PAGE);

        for (let i = 0; i < slice.length; i += 5) {
            const row = new ActionRowBuilder();
            slice.slice(i, i + 5).forEach(sound => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`sb_play_${sound.displayName}`)
                        .setLabel(sound.displayName.substring(0, 80))
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔊')
                );
            });
            rows.push(row);
        }

        if (totalPages > 1) {
            const navRow = new ActionRowBuilder();
            navRow.addComponents(
                new ButtonBuilder().setCustomId('sb_prev').setLabel('◀️').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
                new ButtonBuilder().setCustomId('sb_info').setLabel(`Trang ${p + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('sb_next').setLabel('▶️').setStyle(ButtonStyle.Secondary).setDisabled(p === totalPages - 1),
            );
            rows.push(navRow);
        }

        return rows;
    };

    const reply = await interaction.reply({
        content: '🔊 **Soundboard** – Chọn âm thanh để phát:',
        components: buildRows(page),
        fetchReply: true,
    });

    const collector = reply.createMessageComponentCollector({ time: 120_000 });

    collector.on('collect', async (btn) => {
        if (btn.customId === 'sb_prev') page--;
        else if (btn.customId === 'sb_next') page++;
        else if (btn.customId.startsWith('sb_play_')) {
            const soundName = btn.customId.slice('sb_play_'.length);
            const sound = sounds.find(s => s.displayName === soundName);
            if (!sound) return btn.reply({ content: '❌ Âm thanh không tồn tại.', ephemeral: true });

            const voiceChannel = btn.member?.voice?.channel;
            if (!voiceChannel) return btn.reply({ content: '❌ Bạn cần vào voice channel trước!', ephemeral: true });

            const filePath = path.join(SOUNDBOARD_DIR, sound.fileName);
            await btn.deferUpdate();
            try {
                await voiceService.playFile(voiceChannel, filePath);
            } catch (err) {
                logger.error(`Soundboard play error: ${err.message}`);
            }
            return;
        }

        await btn.update({ components: buildRows(page) });
    });

    collector.on('end', () => {
        reply.edit({ components: [] }).catch(() => {});
    });
}

async function handleAdd(interaction) {
    const name = interaction.options.getString('name');
    const attachment = interaction.options.getAttachment('file');

    if (!attachment.name.endsWith('.mp3') && !attachment.name.endsWith('.ogg')) {
        return interaction.reply({ content: '❌ Chỉ chấp nhận file .mp3 hoặc .ogg!', ephemeral: true });
    }

    const mapping = loadMapping();
    if (mapping[name]) {
        return interaction.reply({ content: `❌ Tên "${name}" đã tồn tại. Dùng tên khác hoặc xóa cũ trước.`, ephemeral: true });
    }

    const ext = path.extname(attachment.name);
    const fileName = `${createSafeFileName(name)}${ext}`;
    const filePath = path.join(SOUNDBOARD_DIR, fileName);

    await interaction.deferReply({ ephemeral: true });

    try {
        const response = await fetch(attachment.url);
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(filePath, buffer);

        mapping[name] = fileName;
        saveMapping(mapping);

        await interaction.editReply(`✅ Đã thêm âm thanh **${name}** (${fileName})`);
        logger.info(`Soundboard added: ${name} → ${fileName}`);
    } catch (err) {
        logger.error(`Soundboard add failed: ${err.message}`);
        await interaction.editReply('❌ Lỗi khi tải file. Thử lại sau.');
    }
}

async function handleRemove(interaction) {
    const name = interaction.options.getString('name');
    const mapping = loadMapping();

    if (!mapping[name]) {
        return interaction.reply({ content: `❌ Không tìm thấy âm thanh "${name}".`, ephemeral: true });
    }

    const filePath = path.join(SOUNDBOARD_DIR, mapping[name]);
    delete mapping[name];
    saveMapping(mapping);

    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}

    await interaction.reply(`✅ Đã xóa âm thanh **${name}**.`);
    logger.info(`Soundboard removed: ${name}`);
}

async function handleList(interaction) {
    const sounds = getSoundList();
    if (sounds.length === 0) {
        return interaction.reply({ content: '📝 Chưa có âm thanh nào.', ephemeral: true });
    }

    const list = sounds.map((s, i) => `${i + 1}. **${s.displayName}** (${s.fileName})`).join('\n');
    const embed = new EmbedBuilder()
        .setTitle('🔊 Danh sách Soundboard')
        .setColor(0x00ae86)
        .setDescription(list)
        .setFooter({ text: `Tổng: ${sounds.length} âm thanh` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
