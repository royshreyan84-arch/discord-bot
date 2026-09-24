module.exports = {
  name: 'welcome',
  cooldown: 3,
  async execute(message) {
    if (!message.member.permissions.has('ManageGuild')) {
      return message.reply('❌ You need **Manage Server** permission to use this command.');
    }

    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('Usage: !welcome @user');
    }

    if (target.user.bot) {
      return message.reply('❌ Bots are not eligible for the welcome test.');
    }

    await message.channel.send({
      content: 'Welcome <@' + target.id + '> to **' + message.guild.name + '**! 🎉',
    });

    return message.reply('✅ Welcome message sent for **' + target.user.tag + '**.');
  },
};
