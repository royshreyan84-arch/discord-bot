module.exports = {
  name: 'purge',
  description: 'Bulk delete messages',
  usage: '!purge <amount> [@user]',
  async execute(message, args, client) {
    if (!message.member.permissions.has('ManageMessages')) {
      return message.reply('❌ You need the **Manage Messages** permission.');
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply('❌ Please provide a number between 1 and 100.');
    }

    await message.delete().catch(() => {});

    const target = message.mentions.members.first();
    let messages = await message.channel.messages.fetch({ limit: 100 });

    if (target) {
      messages = messages.filter(m => m.author.id === target.user.id);
    }

    // Discord only allows bulk deleting messages < 14 days old
    const twoWeeks = Date.now() - 14 * 24 * 60 * 60 * 1000;
    messages = messages.filter(m => m.createdTimestamp > twoWeeks);
    messages = messages.first(amount);

    try {
      const deleted = await message.channel.bulkDelete(messages, true);
      const confirm = await message.channel.send(
        `🗑️ Deleted **${deleted.size}** message(s)${target ? ` from ${target.user.tag}` : ''}.`
      );
      setTimeout(() => confirm.delete().catch(() => {}), 5000);
    } catch (e) {
      message.channel.send(`❌ Failed to purge: ${e.message}`);
    }
  },
};
