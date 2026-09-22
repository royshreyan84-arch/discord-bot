module.exports = {
  name: 'warnings',
  description: 'View warnings for a user',
  usage: '!warnings [@user]',
  async execute(message, args, client) {
    if (!message.member.permissions.has('ModerateMembers')) {
      return message.reply('❌ You need the **Moderate Members** permission.');
    }

    const target = message.mentions.members.first() || message.member;
    const key = `${message.guild.id}:${target.user.id}`;
    const warns = client.warnData.get(key) || [];

    if (warns.length === 0) {
      return message.channel.send(`✅ **${target.user.tag}** has no warnings.`);
    }

    const list = warns
      .map((w, i) => {
        const timestamp = Math.floor(new Date(w.date).getTime() / 1000);
        return `**${i + 1}.** ${w.reason} — by ${w.mod || 'Unknown'} <t:${timestamp}:R>`;
      })
      .join('\n');

    return message.channel.send(
      `⚠️ **Warnings for ${target.user.tag}** (${warns.length} total):\n${list}`
    );
  },
};
