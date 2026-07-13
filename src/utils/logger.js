const fs = require('fs');
const path = require('path');

class Logger {
    constructor(logDir = 'logs') {
        this.logDir = path.join(process.cwd(), logDir);
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    _format(level, message) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }

    _write(level, message) {
        const formatted = this._format(level, message);
        console.log(formatted);

        try {
            const today = new Date().toISOString().split('T')[0];
            const logFile = path.join(this.logDir, `${today}.log`);
            fs.appendFileSync(logFile, formatted + '\n');
        } catch {
            // Silent fail – don't crash because of logging
        }
    }

    info(message)  { this._write('info', message); }
    warn(message)  { this._write('warn', message); }
    error(message) { this._write('error', message); }
    debug(message) { this._write('debug', message); }

    /** Log a command invocation */
    command(userTag, commandName, guildName) {
        this.info(`/${commandName} — ${userTag} @ ${guildName}`);
    }

    /** Log a bot action */
    action(message) {
        this.info(`ACTION: ${message}`);
    }
}

module.exports = new Logger();
