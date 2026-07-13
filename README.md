# 🎵 XuanHa Discord Bot

A multi-purpose Discord Bot built with **Node.js** and **discord.js v14**, featuring a soundboard, number-guessing game, meeting time tracker, auto voice-chat greetings, and more.

## ✨ Features

| Feature                | Description                                                            |
| ---------------------- | ---------------------------------------------------------------------- |
| 🎙️ **Soundboard**      | Play custom sounds in voice channels via slash commands                |
| 🔊 **Repeat After Me** | Bot reads out your messages using Vietnamese Text-to-Speech            |
| 🎮 **Number Game**     | A number-guessing game with player management and host controls        |
| ⏱️ **Meeting Time**    | Track voice channel participation time and export reports to Excel     |
| 👋 **Auto Greeting**   | Bot automatically joins voice channels to greet new members with voice |
| 🌅 **Daily Greetings** | Sends time-of-day greeting messages when users come online             |
| 🏓 **Ping**            | Check bot latency                                                      |
| 📖 **Help**            | Display the full list of available commands                            |

## 📋 Slash Commands

| Command                               | Description                                |
| ------------------------------------- | ------------------------------------------ |
| `/ping`                               | Check bot latency                          |
| `/hello`                              | Bot greets you with a random message       |
| `/game add`                           | Add a player to the number game            |
| `/game remove`                        | Remove a player from the game              |
| `/game clear`                         | Clear all players                          |
| `/game sethost`                       | Set the game host                          |
| `/game list`                          | Show current player list                   |
| `/game start`                         | Start the game                             |
| `/game abort`                         | Abort the running game                     |
| `/soundboard`                         | Play a sound in your voice channel         |
| `/repeat`                             | Bot reads your message aloud in voice chat |
| `/meetingtime <channel> <start\|end>` | Start/stop tracking voice channel time     |
| `/help`                               | Show all available commands                |

## 🚀 Setup & Usage

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** (bundled with Node.js)
- **FFmpeg** (required for audio features)
- A **Discord Application** + Bot Token from the [Discord Developer Portal](https://discord.com/developers/applications)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd discord-bot

# 2. Install dependencies
npm install

# 3. Create a .env file from the template
cp .env.example .env

# 4. Edit .env with your actual credentials
# DISCORD_TOKEN=your_bot_token_here
# CLIENT_ID=your_application_client_id
```

### `.env` Configuration

```env
# Discord Bot Token (REQUIRED)
DISCORD_TOKEN=your_bot_token_here

# Discord Application Client ID (REQUIRED)
CLIENT_ID=your_client_id_here

# Log channel ID (optional)
LOG_CHANNEL_ID=

# HTTP server port (default: 10000)
PORT=10000
```

### Running the Bot

```bash
# Development (with nodemon — auto-restart on code changes)
npm run dev

# Production
npm start
```

The bot will automatically deploy slash commands to Discord on startup.

## 📁 Project Structure

```
discord-bot/
├── main.js                  # Entry point — starts bot & HTTP server
├── index.js                 # Discord client setup, loads commands & events
├── deploy-commands.js       # Deploys slash commands to Discord API
├── config/
│   └── config.js            # Loads environment variables from .env
├── commands/
│   ├── ping.js              # Ping command
│   ├── hello.js             # Hello command
│   ├── numberGame.js        # Number-guessing game
│   ├── soundboard.js        # Soundboard
│   ├── repeatAfterMe.js     # TTS repeat command
│   ├── countMeetingTime.js  # Voice time tracker
│   └── soundboard/
│       └── mapping.json     # Sound name → file mapping
├── events/
│   ├── ready.js             # Bot ready event
│   ├── voiceStateUpdate.js  # Auto-greet on voice join
│   └── presenceUpdate.js    # Greeting/goodbye on online/offline
├── utils/
│   ├── helper.js            # Help command (/help)
│   └── logger.js            # File-based logger
├── sounds/                  # Sound files directory
├── data/                    # Data files (abbreviations.json)
├── .env.example             # Environment variables template
├── .gitignore
└── package.json
```

## 🛠️ Tech Stack

| Package                                                                      | Purpose                            |
| ---------------------------------------------------------------------------- | ---------------------------------- |
| [discord.js](https://discord.js.org/) v14                                    | Discord API interaction            |
| [@discordjs/voice](https://github.com/discordjs/voice)                       | Voice connection & audio streaming |
| [discord-player](https://discord-player.js.org/)                             | Music player framework             |
| [gtts](https://github.com/zlargon/google-tts)                                | Google Text-to-Speech (Vietnamese) |
| [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static)                 | FFmpeg binary for audio processing |
| [@ffmpeg-installer/ffmpeg](https://github.com/kribblo/node-ffmpeg-installer) | Auto FFmpeg installer              |
| [exceljs](https://github.com/exceljs/exceljs)                                | Meeting time Excel export          |
| [dotenv](https://github.com/motdotla/dotenv)                                 | Environment variable management    |
| [axios](https://axios-http.com/)                                             | HTTP client                        |
| [canvas](https://github.com/Automattic/node-canvas)                          | Image rendering                    |

## 🔒 Security

- **NEVER** commit the `.env` file containing your real token to GitHub
- The `.env` file is listed in `.gitignore`
- Use `.env.example` as a template with placeholder values
- If your token is ever exposed, **regenerate** it immediately on the Discord Developer Portal

## 📄 License

ISC

---

Made with ❤️ by XuanHa
