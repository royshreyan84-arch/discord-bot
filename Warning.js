module.exports = {
  name: 'warnings',
  description: 'View warnings for a user',
  usage: '!warnings @user',
  async execute(message, args, client) {
    if (!message.member.permissions.has('ModerateMembers')) {
      return message.reply('❌ You need the **Moderate Members** permission.');
    }

    const target = message.mentions.members.first() || message.member;
    const warns = client.warnData.get(target.user.id) || [];

    if (warns.length === 0) {
      return message.channel.send(`✅ **${target.user.tag}** has no warnings.`);
    }

    const list = warns
      .map((w, i) => `**${i + 1}.** ${w.reason} — by ${w.mod} <t:${Math.floor(new Date(w.date).getTime()/1000)}:R>`)
      .join('\n');

    message.channel.send(`⚠️ **Warnings for ${target.user.tag}** (${warns.length} total):\n${list}`);
  },
};
