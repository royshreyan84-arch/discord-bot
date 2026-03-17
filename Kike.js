module.exports = {
  name: 'kick',
  description: 'Kick a member from the server',
  usage: '!kick @user [reason]',
  permissions: ['KickMembers'],
  async execute(message, args, client) {
    if (!message.member.permissions.has('KickMembers')) {
      return message.reply('❌ You need the **Kick Members** permission.');
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a member to kick.');

    if (!target.kickable) {
      return message.reply('❌ I cannot kick that member (they may have a higher role).');
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await target.send(`👢 You have been **kicked** from **${message.guild.name}**.\nReason: ${reason}`).catch(() => {});
      await target.kick(reason);
      message.channel.send(`✅ **${target.user.tag}** has been kicked.\nReason: ${reason}`);
      logAction(client, message.guild, '👢 Kick', message.author, target.user, reason);
    } catch (e) {
      message.reply(`❌ Failed to kick: ${e.message}`);
    }
  },
};

function logAction(client, guild, action, mod, target, reason) {
  const ch = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
  if (!ch) return;
  ch.send(`**${action}** | Target: ${target.tag} | Mod: ${mod.tag} | Reason: ${reason} | <t:${Math.floor(Date.now()/1000)}:R>`);
}
