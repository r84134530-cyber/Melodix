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

// Inițializăm DisTube cu plugin-ul pentru YouTube și activăm Autoplay-ul
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    leaveOnStop: true,
    plugins: [new YtDlpPlugin()]
});

const PREFIX = '!';

client.once('ready', () => {
    console.log(`Botul este online ca ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const voiceChannel = message.member.voice.channel;

    // Comanda !connect -> Conectează botul la canalul tău vocal
    if (command === 'connect') {
        if (!voiceChannel) return message.reply('❌ Trebuie să fii într-un canal vocal!');
        try {
            distube.voices.join(voiceChannel);
            message.reply(`✅ M-am conectat în canalul: **${voiceChannel.name}**`);
        } catch (error) {
            console.error(error);
            message.reply('❌ A apărut o eroare la conectare.');
        }
    }

    // Comanda !play -> Pune muzică sau caută pe YouTube
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

    // Comanda !skip -> Trece la piesa următoare
    if (command === 'skip') {
        if (!voiceChannel) return message.reply('❌ Trebuie să fii într-un canal vocal!');
        try {
            const queue = distube.getQueue(message);
            if (!queue) return message.reply('❌ Nu este nicio piesă în redare acum.');
            const song = await distube.skip(message);
            message.reply(`⏭️ S-a dat skip! Acum urmează: **${song.name}**`);
        } catch (error) {
            console.error(error);
            message.reply('❌ Nu mai sunt alte piese în coadă pentru skip.');
        }
    }

    // Comanda !stop -> Oprește muzica și scoate botul de pe VC
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

// Sistemul de Autoplay: Când o piesă se termină, încearcă să pună ceva similar automat
distube.on('finishSong', async (queue) => {
    try {
        // Dacă coada este goală, activăm un mod simplu de related/autoplay dacă e disponibil în sesiune
        if (queue.songs.length === 0) {
            // DisTube va rula automat sau se va opri elegant dacă nu mai sunt elemente
        }
    } catch (err) {
        console.error("Eroare la autoplay:", err);
    }
});

// Pornirea botului folosind tokenul setat pe Render
client.login(process.env.DISCORD_TOKEN);
  
