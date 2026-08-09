const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const express = require('express');

// 1. Pornim serverul web pentru Render în background (pe portul 10000)
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('Melodix Bot este online și funcționează!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ [WEB] Serverul web rulează pe portul ${PORT}`);
});

// 2. Pornim botul de Discord în paralel
if (!process.env.DISCORD_TOKEN) {
    console.error("❌ EROARE CRITICA: Variabila DISCORD_TOKEN nu este setata pe Render!");
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const distube = new DisTube(client, {
    emitNewSongOnly: true,
    leaveOnStop: true,
    plugins: [new YtDlpPlugin()]
});

const PREFIX = '!';

client.once('ready', () => {
    console.log(`✅ [DISCORD] Botul este online și conectat ca ${client.user.tag}!`);
});

distube.on('error', (channel, error) => {
    console.error('Eroare DisTube:', error);
    if (channel) {
        channel.send(`❌ A apărut o eroare la redare.`);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const voiceChannel = message.member.voice.channel;

    if (command === 'connect') {
        if (!voiceChannel) return message.reply('❌ Trebuie să fii într-un canal vocal!');
        try {
            distube.voices.join(voiceChannel);
            message.reply(`✅ M-am conectat în canalul: **${voiceChannel.name}**`);
        } catch (error) {
            console.error(error);
            message.reply('❌ Eroare la conectare.');
        }
    }

    if (command === 'play') {
        if (!voiceChannel) return message.reply('❌ Trebuie să fii într-un canal vocal!');
        const query = args.join(' ');
        if (!query) return message.reply('❌ Introdu un link sau o piesă!');

        try {
            distube.play(voiceChannel, query, {
                textChannel: message.channel,
                member: message.member,
            });
        } catch (error) {
            console.error(error);
            message.reply('❌ Nu am putut rula piesa.');
        }
    }

    if (command === 'skip') {
        if (!voiceChannel) return message.reply('❌ Trebuie să fii într-un canal vocal!');
        try {
            const queue = distube.getQueue(message);
            if (!queue) return message.reply('❌ Nu e nicio piesă în redare.');
            const song = await distube.skip(message);
            message.reply(`⏭️ Skip! Urmează: **${song.name}**`);
        } catch (error) {
            console.error(error);
            message.reply('❌ Nu mai sunt piese în coadă.');
        }
    }

    if (command === 'stop') {
        if (!voiceChannel) return message.reply('❌ Trebuie să fii într-un canal vocal!');
        try {
            const queue = distube.getQueue(message);
            if (!queue) return message.reply('❌ Botul nu cântă nimic.');
            distube.stop(message);
            message.reply('⏹️ Am oprit muzica și am ieșit.');
        } catch (error) {
            console.error(error);
            message.reply('❌ Eroare.');
        }
    }
});

// Autentificarea pe Discord care se va executa imediat
client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("❌ EROARE LA LOGIN DISCORD:", err);
});
        
