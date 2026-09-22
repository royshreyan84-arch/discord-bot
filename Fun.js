const ANIMALS = [
  { name: 'Fox', emoji: '🦊' },
  { name: 'Cat', emoji: '🐱' },
  { name: 'Wolf', emoji: '🐺' },
  { name: 'Panda', emoji: '🐼' },
  { name: 'Bunny', emoji: '🐰' },
  { name: 'Tiger', emoji: '🐯' },
  { name: 'Penguin', emoji: '🐧' },
  { name: 'Dragon', emoji: '🐉' },
];

const ANIME_STYLES = [
  '⚡ anime aura activated!',
  '✨ main-character energy!',
  '🔥 your anime arc just started!',
  '🌟 dramatic anime entrance!',
];

function random(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function targetUser(message) {
  return message.mentions.users.first();
}

const greet = {
  name: 'greet',
  aliases: ['hello', 'hi'],
  description: 'Greet another member with an anime/animal reaction.',
  usage: '`!greet @user`',
  cooldown: 3,
  async execute(message) {
    const target = targetUser(message);
    if (!target) return message.reply('👋 Mention someone to greet! Example: `!greet @user`');
    const animal = random(ANIMALS);
    return message.channel.send(
      `👋 ${message.author} greets ${target}! ${animal.emoji} ${animal.name} appears! ${random(ANIME_STYLES)}`
    );
  },
};

const punch = {
  name: 'punch',
  description: 'A harmless fictional anime-style punch interaction.',
  usage: '`!punch @user`',
  cooldown: 4,
  async execute(message) {
    const target = targetUser(message);
    if (!target) return message.reply('🥊 Mention someone! Example: `!punch @user`');
    if (target.id === message.author.id) return message.reply('🥊 You cannot punch yourself!');

    return message.channel.send(
      `🥊 ${message.author} throws a cartoon anime punch at ${target}! 💥 ${target} gets knocked back dramatically — no real damage!`
    );
  },
};

const kill = {
  name: 'kill',
  aliases: ['defeat', 'battle'],
  description: 'A fictional battle command with no graphic content.',
  usage: '`!kill @user`',
  cooldown: 5,
  async execute(message) {
    const target = targetUser(message);
    if (!target) return message.reply('⚔️ Mention an opponent! Example: `!kill @user`');
    if (target.id === message.author.id) return message.reply('⚔️ You need another opponent for a battle!');

    const winner = Math.random() < 0.5 ? message.author : target;
    const loser = winner.id === message.author.id ? target : message.author;

    return message.channel.send(
      `⚔️ **Anime Battle!** ${message.author} vs ${target}\n✨ ${random(ANIME_STYLES)}\n🏆 ${winner} wins the fictional battle! ${loser} has been defeated in-game.`
    );
  },
};

const pet = {
  name: 'pet',
  aliases: ['pat'],
  description: 'Pet a random animal.',
  usage: '`!pet`',
  cooldown: 3,
  async execute(message) {
    const animal = random(ANIMALS);
    return message.channel.send(
      `${animal.emoji} A wild **${animal.name}** approaches ${message.author}. ${message.author} gives it a gentle pat! 💖`
    );
  },
};

const hunt = {
  name: 'hunt',
  aliases: ['encounter'],
  description: 'Find a random animal encounter and earn XP.',
  usage: '`!hunt`',
  cooldown: 5,
  async execute(message) {
    const animal = random(ANIMALS);
    const xp = Math.floor(Math.random() * 21) + 10;
    return message.channel.send(
      `🌲 ${message.author} explores the wild...\n${animal.emoji} You encountered a **${animal.name}**!\n✨ You earned **${xp} XP** from the encounter.`
    );
  },
};

const animals = {
  name: 'animals',
  aliases: ['animal'],
  description: 'Show the animals available in the fun system.',
  usage: '`!animals`',
  cooldown: 3,
  async execute(message) {
    return message.reply(
      `🐾 **Animal collection**\n${ANIMALS.map(a => `${a.emoji} ${a.name}`).join(' • ')}`
    );
  },
};

module.exports = {
  greet,
  punch,
  kill,
  pet,
  hunt,
  animals,
};
