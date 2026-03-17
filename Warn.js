module.exports = {
  name: 'warn',
  description: 'Warn a member',
  usage: '!warn @user [reason]',
  async execute(message, args, client) {
    if (!message.member.permissions.has('ModerateMembers')) {
      return message.reply('❌ You need the **Moderate Members** permission.');
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a member.');

    const reason = args.slice(1).join(' ') || 'No reason provided';
    const userId = target.user.id;

    if (!client.warnData.has(userId)) client.warnData.set(userId, []);
    client.warnData.get(userId).push({ reason, date: new Date().toISOString(), mod: message.author.tag });

    const warnCount = client.warnData.get(userId).length;

    await target.send(`⚠️ You have been **warned** in **${message.guild.name}**.\nReason: ${reason}\nTotal warnings: **${warnCount}**`).catch(() => {});
    message.channel.send(`⚠️ **${target.user.tag}** has been warned. (Total: **${warnCount}**)\nReason: ${reason}`);

    // Auto-escalation
    if (warnCount >= 5) {
      await target.ban({ reason: 'Auto-ban: 5 warnings reached' }).catch(() => {});
      message.channel.send(`🔨 **${target.user.tag}** was auto-banned for reaching 5 warnings.`);
    } else if (warnCount >= 3) {
      await target.timeout(30 * 60 * 1000, 'Auto-mute: 3 warnings reached').catch(() => {});
      message.channel.send(`🔇 **${target.user.tag}** was auto-muted for 30 minutes (3 warnings).`);
    }

    logAction(client, message.guild, '⚠️ Warn', message.author, target.user, `${reason} (warn #${warnCount})`);
  },
};

function logAction(client, guild, action, mod, target, reason) {
  const ch = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
  if (!ch) return;
  ch.send(`**${action}** | Target: ${target.tag} | Mod: ${mod.tag} | Reason: ${reason} | <t:${Math.floor(Date.now()/1000)}:R>`);
}
