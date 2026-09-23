const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const ytSearch = require('yt-search');

// Queue structure per guild:
// { connection, player, songs: [{title, url, requestedBy}], volume: 1, loop: false }

async function getOrCreateQueue(client, message) {
  const guildId = message.guild.id;
  if (client.musicQueues.has(guildId)) return client.musicQueues.get(guildId);

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
    await message.reply('❌ You need to be in a voice channel!');
    return null;
  }

  const permissions = voiceChannel.permissionsFor(message.guild.members.me);
  if (!permissions?.has(['Connect', 'Speak'])) {
    await message.reply('❌ I need **Connect** and **Speak** permissions in that voice channel.');
    return null;
  }

  console.log(`[MusicVoice] Joining voice channel: ${voiceChannel.name} (${voiceChannel.id}) in guild ${guildId}`);

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId,
    adapterCreator: message.guild.voiceAdapterCreator,
    selfDeaf: true,
    debug: true,
  });

  connection.on('stateChange', (oldState, newState) => {
    console.log(`[MusicVoice] State: ${oldState.status} -> ${newState.status}`);
    if (newState.networking) {
      console.log(`[MusicVoice] Networking state: ${newState.networking.state.code}`);
      newState.networking.on('debug', debug => console.log(`[MusicVoice][Networking] ${debug}`));
      newState.networking.on('error', error => console.error('[MusicVoice][Networking Error]', error));
      newState.networking.on('close', code => console.error('[MusicVoice][Networking Close] code:', code));
    }
  });

  connection.on('error', error => {
    console.error('[MusicVoice][Connection Error]', error);
  });

  console.log(`[MusicVoice] Initial state: ${connection.state.status}`);

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  } catch (error) {
    console.error('[MusicVoiceConnection] Failed to reach Ready state:', error);
    console.error('[MusicVoiceConnection] Final state:', connection.state.status);
    if (connection.state.networking) {
      console.error('[MusicVoiceConnection] Final networking state:', connection.state.networking.state.code);
    }
    connection.destroy();
    await message.reply(`❌ Could not connect to voice channel.\nState: **${connection.state.status}**\nError: \`${error?.message || 'Voice connection timed out'}\``);
    return null;
  }

  const player = createAudioPlayer({ debug: true });
  connection.subscribe(player);

  player.on('stateChange', (oldState, newState) => {
    console.log(`[MusicPlayer] State: ${oldState.status} -> ${newState.status}`);
    if (newState.resource) {
      console.log(`[MusicPlayer] Resource started=${newState.resource.started}, ended=${newState.resource.ended}, duration=${newState.resource.playbackDuration}ms`);
    }
  });

  const queue = { connection, player, songs: [], volume: 1, loop: false, textChannel: message.channel };
  client.musicQueues.set(guildId, queue);

  player.on(AudioPlayerStatus.Idle, () => {
    if (queue.loop && queue.songs.length > 0) {
      playSong(client, guildId, queue.songs[0]);
    } else {
      queue.songs.shift();
      if (queue.songs.length > 0) {
        void playSong(client, guildId, queue.songs[0]);
      } else {
        queue.textChannel.send('✅ Queue finished! I\'ll stay in the voice channel. Use `!play` to add more songs.');
      }
    }
  });

  player.on('error', err => {
    console.error('Player error:', err);
    queue.songs.shift();
    if (queue.songs.length > 0) void playSong(client, guildId, queue.songs[0]);
  });

  return queue;
}

async function playSong(client, guildId, song) {
  const queue = client.musicQueues.get(guildId);
  if (!queue || !song) return;

  try {
    console.log(`[MusicPlayer] Loading: ${song.title}`);
    const info = await ytdl.getInfo(song.url);
    const format = ytdl.chooseFormat(info.formats, {
      filter: format =>
        format.hasAudio &&
        !format.hasVideo &&
        format.container === 'webm' &&
        /opus/i.test(format.codecs || ''),
    });

    if (!format?.url) {
      throw new Error('No WebM/Opus audio format was available for this video.');
    }

    console.log(`[MusicPlayer] Selected WebM/Opus format: ${format.itag}`);

    const stream = ytdl.downloadFromInfo(info, {
      format,
      highWaterMark: 1 << 25,
    });

    stream.on('error', error => console.error('[MusicPlayer] YouTube stream error:', error));
    stream.on('end', () => console.log('[MusicPlayer] YouTube stream ended:', song.title));

    const resource = createAudioResource(stream, {
      inputType: StreamType.WebmOpus,
    });

    queue.player.play(resource);
    await queue.textChannel.send(`🎵 Now playing: **${song.title}** (requested by ${song.requestedBy})`);
  } catch (error) {
    console.error('[MusicPlayer] Failed to load/play song:', error);
    queue.songs.shift();
    await queue.textChannel.send(`❌ Could not play **${song.title}**. Check the console for the playback error.`);
    if (queue.songs.length > 0) void playSong(client, guildId, queue.songs[0]);
  }
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
      void playSong(client, message.guild.id, queue.songs[0]);
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
