module.exports = {
  name: 'ban',
  description: 'Ban a member from the server',
  usage: '!ban @user [days] [reason]',
  async execute(message, args, client) {
    if (!message.member.permissions.has('BanMembers')) {
      return message.reply('❌ You need the **Ban Members** permission.');
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a member to ban.');

    if (!target.bannable) {
      return message.reply('❌ I cannot ban that member.');
    }

    // !ban @user 7 spamming  — optional delete days
    let deleteMessageDays = 0;
    let reasonStart = 1;
    if (!isNaN(args[1])) {
      deleteMessageDays = Math.min(parseInt(args[1]), 7);
      reasonStart = 2;
    }
    const reason = args.slice(reasonStart).join(' ') || 'No reason provided';

    try {
      await target.send(`🔨 You have been **banned** from **${message.guild.name}**.\nReason: ${reason}`).catch(() => {});
      await target.ban({ deleteMessageDays, reason });
      message.channel.send(`✅ **${target.user.tag}** has been banned.\nReason: ${reason}`);
      logAction(client, message.guild, '🔨 Ban', message.author, target.user, reason);
    } catch (e) {
      message.reply(`❌ Failed to ban: ${e.message}`);
    }
  },
};

module.exports.unban = {
  name: 'unban',
  description: 'Unban a user by ID',
  usage: '!unban <userID> [reason]',
  async execute(message, args, client) {
    if (!message.member.permissions.has('BanMembers')) {
      return message.reply('❌ You need the **Ban Members** permission.');
    }
    const userId = args[0];
    if (!userId) return message.reply('❌ Please provide a user ID.');

    try {
      await message.guild.members.unban(userId, args.slice(1).join(' ') || 'Unbanned');
      message.channel.send(`✅ User **${userId}** has been unbanned.`);
    } catch (e) {
      message.reply(`❌ Failed to unban: ${e.message}`);
    }
  },
};

function logAction(client, guild, action, mod, target, reason) {
  const ch = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
  if (!ch) return;
  ch.send(`**${action}** | Target: ${target.tag} | Mod: ${mod.tag} | Reason: ${reason} | <t:${Math.floor(Date.now()/1000)}:R>`);
}
