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

    if (target.id === message.author.id) {
      return message.reply('❌ You cannot warn yourself.');
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';
    const key = `${message.guild.id}:${target.user.id}`;

    if (!client.warnData.has(key)) client.warnData.set(key, []);
    client.warnData.get(key).push({
      reason,
      date: new Date().toISOString(),
      mod: message.author.tag,
    });

    const warnCount = client.warnData.get(key).length;

    await target.send(
      `⚠️ You have been **warned** in **${message.guild.name}**.\nReason: ${reason}\nTotal warnings: **${warnCount}**`
    ).catch(() => {});

    await message.channel.send(
      `⚠️ **${target.user.tag}** has been warned. (Total: **${warnCount}**)\nReason: ${reason}`
    );

    if (warnCount >= 5) {
      if (target.bannable) {
        await target.ban({ reason: 'Auto-ban: 5 warnings reached' });
        await message.channel.send(`🔨 **${target.user.tag}** was auto-banned for reaching 5 warnings.`);
      } else {
        await message.channel.send('❌ I cannot auto-ban that member because of role hierarchy or permissions.');
      }
    } else if (warnCount >= 3) {
      if (target.moderatable) {
        await target.timeout(30 * 60 * 1000, 'Auto-mute: 3 warnings reached');
        await message.channel.send(`🔇 **${target.user.tag}** was auto-muted for 30 minutes (3 warnings).`);
      } else {
        await message.channel.send('❌ I cannot auto-mute that member because of role hierarchy or permissions.');
      }
    }

    logAction(client, message.guild, '⚠️ Warn', message.author, target.user, `${reason} (warn #${warnCount})`);
  },
};

function logAction(client, guild, action, mod, target, reason) {
  const ch = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
  if (!ch) return;
  ch.send(`**${action}** | Target: ${target.tag} | Mod: ${mod.tag} | Reason: ${reason} | <t:${Math.floor(Date.now()/1000)}:R>`).catch(() => {});
}
