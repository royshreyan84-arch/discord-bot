const automodConfig = require('../config/automod');

// Spam tracking: userId -> [timestamp, ...]
const spamTracker = new Map();

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const prefix = process.env.PREFIX || '!';

    // ── Auto-mod ──────────────────────────────────────────────
    const isExemptChannel = automodConfig.exemptChannels.includes(message.channel.id);
    const memberRoles = message.member?.roles?.cache.map(r => r.id) || [];
    const isExemptRole = automodConfig.exemptRoles.some(r => memberRoles.includes(r));

    if (!isExemptChannel && !isExemptRole) {
      const modResult = await runAutoMod(message, client);
      if (modResult) return; // message was handled
    }

    // ── Mention DM Notification ───────────────────────────────
    // If someone mentions a user, DM that user the message
    if (message.mentions.users.size > 0) {
      for (const [userId, user] of message.mentions.users) {
        // Skip bots
        if (user.bot) continue;
        // Only notify if the OWNER_ID is set and matches, OR notify all mentioned users
        const ownerId = process.env.OWNER_ID;
        if (ownerId && userId !== ownerId) continue;

        try {
          await user.send(
            `🔔 **You were mentioned in #${message.channel.name}** on **${message.guild.name}**\n\n` +
            `👤 **From:** ${message.author.tag}\n` +
            `💬 **Message:** ${message.content}\n` +
            `🔗 **Jump to message:** ${message.url}`
          );
        } catch {
          // User has DMs closed — silently ignore
        }
      }
    }

    // ── Command handler ───────────────────────────────────────
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) return;

    // Cooldown
    const { cooldowns } = client;
    if (!cooldowns.has(command.name)) cooldowns.set(command.name, new Map());
    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;
    if (timestamps.has(message.author.id)) {
      const expiration = timestamps.get(message.author.id) + cooldownAmount;
      if (now < expiration) {
        const left = ((expiration - now) / 1000).toFixed(1);
        return message.reply(`⏳ Please wait **${left}s** before using \`${command.name}\` again.`);
      }
    }
    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    try {
      await command.execute(message, args, client);
    } catch (err) {
      console.error(err);
      message.reply('❌ An error occurred while running that command.');
    }
  },
};

// ── Auto-mod logic ─────────────────────────────────────────────
async function runAutoMod(message, client) {
  const cfg = automodConfig;
  const content = message.content;
  const userId = message.author.id;

  // 1. Profanity filter
  if (cfg.profanity.enabled) {
    const lower = content.toLowerCase();
    const hit = cfg.profanity.blockedWords.find(w => lower.includes(w));
    if (hit) {
      await message.delete().catch(() => {});
      const warn = await message.channel.send(
        `🚫 ${message.author}, that language isn't allowed here.`
      );
      setTimeout(() => warn.delete().catch(() => {}), 5000);
      await logAction(client, message.guild, `🔤 Profanity filtered`, message.author, `Matched word in message`);
      if (cfg.profanity.action === 'warn') {
        addWarn(client, userId, 'Profanity');
      } else if (cfg.profanity.action === 'mute') {
        await timeoutMember(message.member, cfg.spam.muteMinutes, 'Profanity filter');
      }
      return true;
    }
  }

  // 2. Caps filter
  if (cfg.caps.enabled && content.length >= cfg.caps.minLength) {
    const upper = content.replace(/[^a-zA-Z]/g, '');
    if (upper.length > 0) {
      const ratio = (content.match(/[A-Z]/g) || []).length / upper.length;
      if (ratio >= cfg.caps.threshold) {
        await message.delete().catch(() => {});
        const warn = await message.channel.send(
          `📢 ${message.author}, please don't use excessive caps.`
        );
        setTimeout(() => warn.delete().catch(() => {}), 5000);
        return true;
      }
    }
  }

  // 3. Mention spam
  if (cfg.mentionSpam.enabled) {
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;
    if (mentionCount >= cfg.mentionSpam.maxMentions) {
      await message.delete().catch(() => {});
      await timeoutMember(message.member, cfg.spam.muteMinutes, 'Mention spam');
      await message.channel.send(
        `🔇 ${message.author} has been timed out for mention spam.`
      );
      await logAction(client, message.guild, `📣 Mention spam`, message.author, `${mentionCount} mentions in one message`);
      return true;
    }
  }

  // 4. Link filter
  if (cfg.links.enabled) {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const links = content.match(urlRegex) || [];
    const badLink = links.find(link => {
      const domain = new URL(link).hostname.replace('www.', '');
      return !cfg.links.whitelist.includes(domain);
    });
    if (badLink) {
      await message.delete().catch(() => {});
      const warn = await message.channel.send(
        `🔗 ${message.author}, links are not allowed here.`
      );
      setTimeout(() => warn.delete().catch(() => {}), 5000);
      return true;
    }
  }

  // 5. Spam detection
  if (cfg.spam.enabled) {
    const now = Date.now();
    if (!spamTracker.has(userId)) spamTracker.set(userId, []);
    const timestamps = spamTracker.get(userId).filter(t => now - t < cfg.spam.timeWindow);
    timestamps.push(now);
    spamTracker.set(userId, timestamps);

    if (timestamps.length >= cfg.spam.maxMessages) {
      spamTracker.delete(userId);
      await timeoutMember(message.member, cfg.spam.muteMinutes, 'Message spam');
      await message.channel.send(
        `🔇 ${message.author} has been timed out for **${cfg.spam.muteMinutes} minutes** due to spamming.`
      );
      await logAction(client, message.guild, `🔁 Spam detected`, message.author, `${cfg.spam.maxMessages} messages in ${cfg.spam.timeWindow / 1000}s`);
      return true;
    }
  }

  return false;
}

async function timeoutMember(member, minutes, reason) {
  try {
    await member.timeout(minutes * 60 * 1000, reason);
  } catch (e) {
    console.error('Timeout failed:', e.message);
  }
}

function addWarn(client, userId, reason) {
  if (!client.warnData.has(userId)) client.warnData.set(userId, []);
  client.warnData.get(userId).push({ reason, date: new Date().toISOString() });
}

async function logAction(client, guild, action, user, reason) {
  const logChannelId = process.env.LOG_CHANNEL_ID;
  if (!logChannelId) return;
  const channel = guild.channels.cache.get(logChannelId);
  if (!channel) return;
  channel.send(`**${action}** | User: ${user.tag} (${user.id}) | Reason: ${reason} | <t:${Math.floor(Date.now() / 1000)}:R>`);
}
