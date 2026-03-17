const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ✅ Global crash guards — add these FIRST
process.on('unhandledRejection', (error) => {
  console.error('[UnhandledRejection]', error);
});

process.on('uncaughtException', (error) => {
  console.error('[UncaughtException]', error);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.warnData = new Map();
client.musicQueues = new Map();
client.triviaGames = new Map();

// Load commands
const commandFolders = ['moderation', 'music', 'minigames'];
for (const folder of commandFolders) {
  const folderPath = path.join(__dirname, 'commands', folder);
  if (!fs.existsSync(folderPath)) continue;
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const command = require(path.join(folderPath, file));
    if (command.name) {
      client.commands.set(command.name, command);
    }
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
}

// ✅ Discord client error handler
client.on('error', (error) => {
  console.error('[ClientError]', error);
});

client.on('warn', (info) => {
  console.warn('[ClientWarn]', info);
});

// ✅ Safe login with error handling
client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('[LoginFailed]', error);
  process.exit(1);
});
