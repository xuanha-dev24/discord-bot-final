const path = require('path');
const fs = require('fs');
const gTTS = require('gtts');
const logger = require('../utils/logger');

const SOUNDS_DIR = path.join(process.cwd(), 'sounds');

/**
 * Generate a Vietnamese TTS MP3 file.
 * @param {string} text   – Vietnamese text to speak.
 * @param {string} prefix – File name prefix (e.g. member id).
 * @returns {Promise<string>} Absolute path to the generated MP3.
 */
function generateTTS(text, prefix = 'tts') {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(SOUNDS_DIR)) {
            fs.mkdirSync(SOUNDS_DIR, { recursive: true });
        }

        const fileName = `${prefix}_${Date.now()}.mp3`;
        const filePath = path.join(SOUNDS_DIR, fileName);

        const gtts = new gTTS(text, 'vi');
        gtts.save(filePath, (err) => {
            if (err) {
                logger.error(`TTS generation failed: ${err.message}`);
                return reject(err);
            }
            logger.info(`TTS file created: ${fileName}`);
            resolve(filePath);
        });
    });
}

/**
 * Safely delete a file (best-effort, never throws).
 */
function deleteFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.info(`Deleted temp file: ${path.basename(filePath)}`);
        }
    } catch (err) {
        logger.error(`Failed to delete file ${filePath}: ${err.message}`);
    }
}

module.exports = { generateTTS, deleteFile, SOUNDS_DIR };
