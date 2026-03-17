module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} server(s)`);
    client.user.setActivity('!help | Moderating 🔨', { type: 'WATCHING' });
  },
};
