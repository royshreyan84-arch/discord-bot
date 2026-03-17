const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');

// Queue structure per guild:
// { connection, player, songs: [{title, url, requestedBy}], volume: 1, loop: false }

async function getOrCreateQueue(client, message) {
  const guildId = message.guild.id;
  if (client.musicQueues.has(guildId)) return client.musicQueues.get(guildId);

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
    message.reply('❌ You need to be in a voice channel!');
    return null;
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId,
    adapterCreator: message.guild.voiceAdapterCreator,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  } catch {
    connection.destroy();
    message.reply('❌ Could not connect to voice channel.');
    return null;
  }

  const player = createAudioPlayer();
  connection.subscribe(player);

  const queue = { connection, player, songs: [], volume: 1, loop: false, textChannel: message.channel };
  client.musicQueues.set(guildId, queue);

  player.on(AudioPlayerStatus.Idle, () => {
    if (queue.loop && queue.songs.length > 0) {
      playSong(client, guildId, queue.songs[0]);
    } else {
      queue.songs.shift();
      if (queue.songs.length > 0) {
        playSong(client, guildId, queue.songs[0]);
      } else {
        queue.textChannel.send('✅ Queue finished! Use `!play` to add more songs.');
        setTimeout(() => {
          if (queue.songs.length === 0) {
            connection.destroy();
            client.musicQueues.delete(guildId);
          }
        }, 60_000);
      }
    }
  });

  player.on('error', err => {
    console.error('Player error:', err);
    queue.songs.shift();
    if (queue.songs.length > 0) playSong(client, guildId, queue.songs[0]);
  });

  return queue;
}

function playSong(client, guildId, song) {
  const queue = client.musicQueues.get(guildId);
  if (!queue || !song) return;

  const stream = ytdl(song.url, {
    filter: 'audioonly',
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
  });

  const resource = createAudioResource(stream);
  queue.player.play(resource);
  queue.textChannel.send(`🎵 Now playing: **${song.title}** (requested by ${song.requestedBy})`);
}

// ── Commands ─────────────────────────────────────────────────────

module.exports = {
  name: 'play',
  description: 'Play a song from YouTube',
  usage: '!play <song name or URL>',
  cooldown: 3,
  async execute(message, args, client) {
    if (!args.length) return message.reply('❌ Please provide a song name or URL.');

    const query = args.join(' ');
    let url, title;

    if (ytdl.validateURL(query)) {
      url = query;
      const info = await ytdl.getInfo(url);
      title = info.videoDetails.title;
    } else {
      const results = await ytSearch(query);
      const video = results.videos[0];
      if (!video) return message.reply('❌ No results found.');
      url = video.url;
      title = video.title;
    }

    const queue = await getOrCreateQueue(client, message);
    if (!queue) return;

    queue.songs.push({ title, url, requestedBy: message.author.username });

    if (queue.player.state.status === AudioPlayerStatus.Idle || queue.songs.length === 1) {
      playSong(client, message.guild.id, queue.songs[0]);
    } else {
      message.channel.send(`➕ Added to queue: **${title}** (position #${queue.songs.length})`);
    }
  },
};

module.exports.skip = {
  name: 'skip',
  description: 'Skip current song',
  async execute(message, args, client) {
    const queue = client.musicQueues.get(message.guild.id);
    if (!queue || queue.songs.length === 0) return message.reply('❌ Nothing is playing.');
    queue.player.stop();
    message.channel.send('⏭️ Skipped!');
  },
};

module.exports.stop = {
  name: 'stop',
  description: 'Stop music and leave voice',
  async execute(message, args, client) {
    const queue = client.musicQueues.get(message.guild.id);
    if (!queue) return message.reply('❌ Not in a voice channel.');
    queue.songs = [];
    queue.player.stop();
    queue.connection.destroy();
    client.musicQueues.delete(message.guild.id);
    message.channel.send('⏹️ Stopped music and left the channel.');
  },
};

module.exports.queue = {
  name: 'queue',
  description: 'Show music queue',
  async execute(message, args, client) {
    const queue = client.musicQueues.get(message.guild.id);
    if (!queue || queue.songs.length === 0) return message.reply('📭 The queue is empty.');
    const list = queue.songs
      .map((s, i) => `${i === 0 ? '▶️' : `${i}.`} **${s.title}** — ${s.requestedBy}`)
      .slice(0, 10)
      .join('\n');
    message.channel.send(`🎶 **Music Queue** (${queue.songs.length} songs):\n${list}`);
  },
};

module.exports.loop = {
  name: 'loop',
  description: 'Toggle loop for current song',
  async execute(message, args, client) {
    const queue = client.musicQueues.get(message.guild.id);
    if (!queue) return message.reply('❌ Nothing is playing.');
    queue.loop = !queue.loop;
    message.channel.send(`🔁 Loop is now **${queue.loop ? 'ON' : 'OFF'}**.`);
  },
};

module.exports.nowplaying = {
  name: 'nowplaying',
  description: 'Show current song',
  async execute(message, args, client) {
    const queue = client.musicQueues.get(message.guild.id);
    if (!queue || queue.songs.length === 0) return message.reply('❌ Nothing is playing.');
    const song = queue.songs[0];
    message.channel.send(`🎵 Now playing: **${song.title}**\nRequested by: ${song.requestedBy}\n🔁 Loop: ${queue.loop ? 'ON' : 'OFF'}`);
  },
};
