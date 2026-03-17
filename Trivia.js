const https = require('https');

const CATEGORIES = {
  general: 9,
  science: 17,
  history: 23,
  sports: 21,
  music: 12,
  gaming: 15,
};

function fetchQuestion(category) {
  const catId = CATEGORIES[category] || 9;
  return new Promise((resolve, reject) => {
    https.get(`https://opentdb.com/api.php?amount=1&type=multiple&category=${catId}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.results[0]);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function decodeHTML(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = {
  name: 'trivia',
  description: 'Start a trivia game!',
  usage: '!trivia [category: general|science|history|sports|music|gaming]',
  cooldown: 5,
  async execute(message, args, client) {
    const channelId = message.channel.id;

    if (client.triviaGames.has(channelId)) {
      return message.reply('⚠️ A trivia game is already running in this channel! Answer it first.');
    }

    const category = (args[0] || 'general').toLowerCase();
    if (!CATEGORIES[category]) {
      return message.reply(`❌ Unknown category. Choose from: ${Object.keys(CATEGORIES).join(', ')}`);
    }

    let question;
    try {
      question = await fetchQuestion(category);
    } catch {
      return message.reply('❌ Failed to fetch a trivia question. Try again later.');
    }

    const correctAnswer = decodeHTML(question.correct_answer);
    const wrongAnswers = question.incorrect_answers.map(decodeHTML);
    const allAnswers = shuffle([correctAnswer, ...wrongAnswers]);
    const letters = ['A', 'B', 'C', 'D'];

    const correctLetter = letters[allAnswers.indexOf(correctAnswer)];

    const optionsText = allAnswers
      .map((ans, i) => `**${letters[i]}.** ${ans}`)
      .join('\n');

    client.triviaGames.set(channelId, {
      correctLetter,
      correctAnswer,
      players: new Set(),
    });

    message.channel.send(
      `🎮 **TRIVIA** — Category: *${category}* | Difficulty: *${question.difficulty}*\n\n` +
      `**${decodeHTML(question.question)}**\n\n${optionsText}\n\n` +
      `Reply with **A**, **B**, **C**, or **D** — you have **20 seconds!**`
    );

    // Collect answers
    const filter = m => !m.author.bot && ['A','B','C','D'].includes(m.content.toUpperCase());
    const collector = message.channel.createMessageCollector({ filter, time: 20000 });
    const winners = [];
    const wrong = [];

    collector.on('collect', m => {
      const game = client.triviaGames.get(channelId);
      if (!game || game.players.has(m.author.id)) return;
      game.players.add(m.author.id);
      if (m.content.toUpperCase() === correctLetter) {
        winners.push(m.author.username);
      } else {
        wrong.push(m.author.username);
      }
    });

    collector.on('end', () => {
      client.triviaGames.delete(channelId);
      let result = `⏰ Time's up! The correct answer was **${correctLetter}. ${correctAnswer}**\n\n`;
      if (winners.length > 0) {
        result += `🏆 Correct: ${winners.map(w => `**${w}**`).join(', ')}\n`;
      }
      if (wrong.length > 0) {
        result += `❌ Wrong: ${wrong.map(w => `~~${w}~~`).join(', ')}`;
      }
      if (winners.length === 0 && wrong.length === 0) {
        result += '😴 Nobody answered!';
      }
      message.channel.send(result);
    });
  },
};
