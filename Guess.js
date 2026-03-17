// Active games: channelId -> { number, guesses, startedBy }
const activeGames = new Map();

module.exports = {
  name: 'guess',
  description: 'Play a number guessing game (1–100)',
  usage: '!guess [start | <number>]',
  cooldown: 2,
  async execute(message, args, client) {
    const channelId = message.channel.id;

    // Start a new game
    if (!activeGames.has(channelId) || args[0]?.toLowerCase() === 'start') {
      const number = Math.floor(Math.random() * 100) + 1;
      activeGames.set(channelId, { number, guesses: 0, startedBy: message.author.username });
      return message.channel.send(
        `🎲 I've picked a number between **1 and 100**!\nUse \`!guess <number>\` to guess. Good luck, **${message.author.username}**!`
      );
    }

    const game = activeGames.get(channelId);
    const guess = parseInt(args[0]);

    if (isNaN(guess) || guess < 1 || guess > 100) {
      return message.reply('❌ Please guess a number between 1 and 100.');
    }

    game.guesses++;

    if (guess === game.number) {
      activeGames.delete(channelId);
      return message.channel.send(
        `🎉 **${message.author.username}** got it! The number was **${game.number}** in **${game.guesses}** guess${game.guesses !== 1 ? 'es' : ''}!`
      );
    }

    const hint = guess < game.number ? '📈 Higher!' : '📉 Lower!';
    let extra = '';
    const diff = Math.abs(guess - game.number);
    if (diff <= 3) extra = ' 🔥 Very close!';
    else if (diff <= 10) extra = ' 🌡️ Warm!';
    else if (diff >= 40) extra = ' 🧊 Cold!';

    message.reply(`${hint}${extra} (Guess #${game.guesses})`);
  },
};
