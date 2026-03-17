module.exports = {
  // Spam detection
  spam: {
    enabled: true,
    maxMessages: 5,        // max messages in the time window
    timeWindow: 5000,      // ms (5 seconds)
    muteMinutes: 10,       // how long to timeout spammers
  },

  // Profanity filter
  profanity: {
    enabled: true,
    // Add/remove words as needed
    blockedWords: [
      'badword1', 'badword2', 'badword3',
      // Add your list here
    ],
    action: 'delete',      // 'delete' | 'warn' | 'mute'
  },

  // Link filter
  links: {
    enabled: false,        // Set true to block all links by default
    whitelist: [           // Domains always allowed
      'discord.com',
      'youtube.com',
    ],
  },

  // Caps filter
  caps: {
    enabled: true,
    threshold: 0.7,        // 70% caps triggers filter
    minLength: 10,         // Only check messages >= 10 chars
  },

  // Mention spam
  mentionSpam: {
    enabled: true,
    maxMentions: 5,        // Max @mentions per message
  },

  // Roles exempt from auto-mod (role IDs)
  exemptRoles: [],

  // Channels exempt from auto-mod (channel IDs)
  exemptChannels: [],
};
