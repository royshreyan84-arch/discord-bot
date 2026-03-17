module.exports = {
  name: 'mute',
  description: 'Timeout (mute) a member',
  usage: '!mute @user <minutes> [reason]',
  async execute(message, args, client) {
    if (!message.member.permissions.has('ModerateMembers')) {
      return message.reply('❌ You need the **Moderate Members** permission.');
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a member.');

    const minutes = parseInt(args[1]);
    if (isNaN(minutes) || minutes < 1) {
      return message.reply('❌ Please provide a valid duration in minutes. e.g. `!mute @user 10 spamming`');
    }

    const reason = args.slice(2).join(' ') || 'No reason provided';
    const ms = minutes * 60 * 1000;
    const MAX = 28 * 24 * 60 * 60 * 1000; // 28 days (Discord max)

    if (ms > MAX) return message.reply('❌ Max timeout duration is 28 days.');

    try {
      await target.timeout(ms, reason);
      message.channel.send(`🔇 **${target.user.tag}** has been muted for **${minutes} minute(s)**.\nReason: ${reason}`);
      await target.send(`🔇 You have been muted in **${message.guild.name}** for **${minutes} minute(s)**.\nReason: ${reason}`).catch(() => {});
      logAction(client, message.guild, '🔇 Mute', message.author, target.user, `${minutes}m — ${reason}`);
    } catch (e) {
      message.reply(`❌ Failed to mute: ${e.message}`);
    }
  },
};

// Register unmute as a separate command by exporting it separately
// index.js loads all exports that have a `name` field
const unmute = {
  name: 'unmute',
  description: 'Remove a timeout from a member',
  usage: '!unmute @user',
  async execute(message, args, client) {
    if (!message.member.permissions.has('ModerateMembers')) {
      return message.reply('❌ You need the **Moderate Members** permission.');
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a member.');

    try {
      await target.timeout(null);
      message.channel.send(`🔊 **${target.user.tag}** has been unmuted.`);
      logAction(client, message.guild, '🔊 Unmute', message.author, target.user, '—');
    } catch (e) {
      message.reply(`❌ Failed to unmute: ${e.message}`);
    }
  },
};

// Attach unmute so index.js can pick it up if it iterates module exports
module.exports.unmute = unmute;

function logAction(client, guild, action, mod, target, reason) {
  const ch = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
  if (!ch) return;
  ch.send(`**${action}** | Target: ${target.tag} | Mod: ${mod.tag} | Reason: ${reason} | <t:${Math.floor(Date.now()/1000)}:R>`);
}
