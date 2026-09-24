const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    // Don't send welcome messages for bots.
    if (member.user.bot) return;

    const configuredChannelId = process.env.WELCOME_CHANNEL_ID;
    const channel =
      (configuredChannelId && member.guild.channels.cache.get(configuredChannelId)) ||
      member.guild.channels.cache.find(
        ch => ch.isTextBased() && ch.name.toLowerCase() === 'welcome'
      ) ||
      member.guild.systemChannel;

    if (!channel?.isTextBased()) {
      console.warn(`[Welcome] No suitable welcome channel found in ${member.guild.name}`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('👋 Welcome!')
      .setDescription(
        `Welcome <@${member.id}> to **${member.guild.name}**! 🎉\\n\\nWe're glad to have you here. Enjoy your stay!`
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: `Member #${member.guild.memberCount}` });

    try {
      await channel.send({ embeds: [embed] });
      console.log(`[Welcome] Welcomed ${member.user.tag} in ${member.guild.name}`);
    } catch (error) {
      console.error('[Welcome] Failed to send welcome message:', error.message);
    }
  },
};
