const prefix = process.env.PREFIX || '!';

const helpData = {
  '🔨 Moderation': [
    { cmd: 'kick @user [reason]', desc: 'Kick a member' },
    { cmd: 'ban @user [days] [reason]', desc: 'Ban a member' },
    { cmd: 'unban <userID>', desc: 'Unban a user' },
    { cmd: 'mute @user <mins> [reason]', desc: 'Timeout a member' },
    { cmd: 'unmute @user', desc: 'Remove timeout' },
    { cmd: 'warn @user [reason]', desc: 'Warn a member (auto-escalates at 3/5)' },
    { cmd: 'warnings [@user]', desc: 'View warnings' },
    { cmd: 'purge <1-100> [@user]', desc: 'Bulk delete messages' },
  ],
  '🎵 Music': [
    { cmd: 'play <song/url>', desc: 'Play from YouTube' },
    { cmd: 'skip', desc: 'Skip current song' },
    { cmd: 'stop', desc: 'Stop & leave voice' },
    { cmd: 'queue', desc: 'View music queue' },
    { cmd: 'loop', desc: 'Toggle loop' },
    { cmd: 'nowplaying', desc: 'Show current song' },
  ],
  '🎮 Mini Games': [
    { cmd: 'trivia [category]', desc: 'Trivia question (general/science/history/sports/music/gaming)' },
    { cmd: 'guess start', desc: 'Start a number guessing game' },
    { cmd: 'guess <number>', desc: 'Guess the number' },
  ],
};

module.exports = {
  name: 'help',
  description: 'Show all commands',
  usage: '!help',
  async execute(message, args, client) {
    let text = `**🤖 Bot Commands** — prefix: \`${prefix}\`\n\n`;

    for (const [category, commands] of Object.entries(helpData)) {
      text += `**${category}**\n`;
      for (const { cmd, desc } of commands) {
        text += `\`${prefix}${cmd}\` — ${desc}\n`;
      }
      text += '\n';
    }

    text += `**🛡️ Auto-Mod** (always active)\n`;
    text += `Spam filter • Profanity filter • Caps filter • Mention spam detection\n`;
    text += `Configure in \`config/automod.js\``;

    message.channel.send(text);
  },
};
