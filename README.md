# Discord Bot

A multipurpose Discord bot built with **Node.js** and **discord.js**.

## Features

### 🛡️ Moderation
- Kick, ban, unban, mute, and unmute members
- Warning system with persistent warning data
- Message purge
- Automatic moderation for spam, profanity, excessive caps, mention spam, and links
- Warning escalation with automatic moderation actions

### 🎵 Music
- Play music from search terms or URLs
- Skip and stop playback
- View the queue and currently playing track
- Loop playback

### 🎮 Mini-Games
- Trivia with multiple categories
- Number guessing game

## Commands

The bot uses `!` as the default prefix.

Use `!help` in Discord to view the available commands and categories.

## Tech Stack

- Node.js
- discord.js
- Discord.js Voice
- FFmpeg
- ytdl-core
- yt-search

## Configuration

The bot uses environment variables for sensitive configuration such as the Discord bot token.

**Never commit your Discord token or other secrets to GitHub.**

## Project Status

This project is actively being developed. Automated GitHub Actions checks are used to validate JavaScript syntax on pushes and pull requests.

## License

This project is currently for personal development and experimentation.
