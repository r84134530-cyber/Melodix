const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');

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
    console.log(`Botul este online ca ${client.user.tag}!`);
});

// PREVENIRE CRASH: Dacă YouTube blochează temporar IP-ul, botul va trimite mesaj în chat în loc să se oprească
distube.on('error', (channel, error) => {
    console.error('Eroare DisTube:', error);
    if (channel) {
        channel.send(`❌ A apărut o eroare la redare (Posibil blocaj temporar YouTube: 429). Încearcă din nou.`);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const voiceChannel = message.member.voice.channel;

    if (command === 'connect') {
        if (!voiceChannel) return message.reply('❌ Trebuie să fii într-on canal vocal!');
        try {
            distube.voices.join(voiceChannel);
            message.reply(`✅ M-am conectat în canalul: **${voiceChannel.name}**`);
        } catch (error) {
            console.error(error);
            message.reply('❌ A apărut o eroare la conectare.');
        }
    }

    if (command === 'play') {
        if (!voiceChannel) return message.reply('❌ Trebuie să fii într-un canal vocal!');
        const query = args.join(' ');
        if (!query) return message.reply('❌ Te rog să introduci un link sau un termen de căutare!');

        try {
            distube.play(voiceChannel, query, {
                textChannel: message.channel,
                member: message.member,
            });
        } catch (error) {
            console.error(error);
            message.reply('❌ Nu am putut rula această piesă.');
        }
    }

    if (command === 'skip') {
        if (!voiceChannel) return message.reply('❌ Trebuie să fii într-un canal vocal!');
        try {
            const queue = distube.getQueue(message);
            if (!queue) return message.reply('❌ Nu este nicio piesă în redare acum.');
            const song = await distube.skip(message);
            message.reply(`⏭️ S-a dat skip! Acum urmează: **${song.name}**`);
        } catch (error) {
            console.error(error);
            message.reply('❌ Nu mai sunt alte piese în coadă.');
        }
    }

    if (command === 'stop') {
        if (!voiceChannel) return message.reply('❌ Trebuie să fii într-un canal vocal!');
        try {
            const queue = distube.getQueue(message);
            if (!queue) return message.reply('❌ Botul nu este conectat sau nu cântă nimic.');
            distube.stop(message);
            message.reply('⏹️ Am oprit muzica și am ieșit de pe canal.');
        } catch (error) {
            console.error(error);
            message.reply('❌ A apărut o eroare.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
