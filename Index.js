const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

process.on('unhandledRejection', (error) => console.error('[UnhandledRejection]', error));
process.on('uncaughtException', (error) => console.error('[UncaughtException]', error));

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

const dataDir = path.join(__dirname, 'data');
const warningsFile = path.join(dataDir, 'warnings.json');
fs.mkdirSync(dataDir, { recursive: true });
try {
  const savedWarnings = JSON.parse(fs.readFileSync(warningsFile, 'utf8'));
  for (const [key, value] of Object.entries(savedWarnings)) client.warnData.set(key, value);
} catch {
  fs.writeFileSync(warningsFile, '{}');
}
client.saveWarnings = () => {
  const data = Object.fromEntries(client.warnData);
  fs.writeFileSync(warningsFile, JSON.stringify(data, null, 2));
};
client.musicQueues = new Map();
client.triviaGames = new Map();

const commandFiles = [
  'Ban.js', 'Kike.js', 'Mute.js', 'Warn.js', 'Warning.js', 'Purge.js',
  'Help.js', 'Play.js', 'Guess.js', 'Trivia.js', 'Eval.js', 'Fun.js',
];

for (const file of commandFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;
  const exported = require(filePath);

  if (exported?.name && typeof exported.execute === 'function') {
    client.commands.set(exported.name, exported);
  }

  for (const value of Object.values(exported || {})) {
    if (value && typeof value === 'object' && value.name && typeof value.execute === 'function') {
      client.commands.set(value.name, value);
    }
  }
}

const eventFiles = ['Massage.js', 'Ready.js'];
for (const file of eventFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;
  const event = require(filePath);
  if (!event?.name || typeof event.execute !== 'function') continue;

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

client.on('error', (error) => console.error('[ClientError]', error));
client.on('warn', (info) => console.warn('[ClientWarn]', info));

if (!process.env.DISCORD_TOKEN) {
  console.error('[LoginFailed] DISCORD_TOKEN is missing from environment variables.');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('[LoginFailed]', error);
  process.exit(1);
});
