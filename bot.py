import os
import time
import asyncio
from flask import Flask
from threading import Thread
import discord
from discord.ext import commands
import yt_dlp

# --- 1. SERVER WEB PENTRU RENDER ---
app = Flask('')

@app.route('/')
def home():
    return "Melodix Bot (Python) este online!"

def run_web():
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)

def keep_alive():
    t = Thread(target=run_web)
    t.start()

# --- 2. CONFIGURARE BOT DISCORD ---
intents = discord.Intents.default()
intents.message_content = True
intents.voice_states = True

bot = commands.Bot(command_prefix='!', intents=intents)

ytdl_format_options = {
    'format': 'bestaudio/best',
    'noplaylist': True,
    'quiet': True,
    'no_warnings': True,
    'default_search': 'auto',
    'source_address': '0.0.0.0'
}

ytdl = yt_dlp.YoutubeDL(ytdl_format_options)

class YTDLSource(discord.PCMVolumeTransformer):
    def __init__(self, source, *, data, volume=0.5):
        super().__init__(source, volume)

    @classmethod
    async def from_url(cls, url, *, loop=None):
        loop = loop or asyncio.get_event_loop()
        data = await loop.run_in_executor(None, lambda: ytdl.extract_info(url, download=False))
        
        if 'entries' in data:
            data = data['entries'][0]

        filename = data['url']
        return cls(discord.FFmpegPCMAudio(filename, executable="ffmpeg", options="-vn"), data=data)

@bot.event
async def on_ready():
    print(f'✅ [DISCORD] Botul este online și conectat ca {bot.user.name}!')

@bot.command(name='connect')
async def connect(ctx):
    if not ctx.author.voice:
        return await ctx.send("❌ Trebuie să fii într-un canal vocal!")
    channel = ctx.author.voice.channel
    if ctx.voice_client is not None:
        await ctx.voice_client.move_to(channel)
    else:
        await channel.connect()
    await ctx.send(f"✅ M-am conectat în canalul: **{channel.name}**")

@bot.command(name='play')
async def play(ctx, *, query):
    if not ctx.author.voice:
        return await ctx.send("❌ Trebuie să fii într-un canal vocal!")
    
    channel = ctx.author.voice.channel
    if ctx.voice_client is None:
        await channel.connect()
    elif ctx.voice_client.channel != channel:
        await ctx.voice_client.move_to(channel)

    async with ctx.typing():
        try:
            player = await YTDLSource.from_url(query, loop=bot.loop)
            ctx.voice_client.play(player, after=lambda e: print(f'Eroare player: {e}') if e else None)
            await ctx.send(f"▶️ Acum rulează: **{query}**")
        except Exception as e:
            print(e)
            await ctx.send("❌ A apărut o eroare la redarea piesei.")

@bot.command(name='skip')
async def skip(ctx):
    if ctx.voice_client and ctx.voice_client.is_playing():
        ctx.voice_client.stop()
        await ctx.send("⏭️ S-a dat skip la piesă!")
    else:
        await ctx.send("❌ Nu este nicio piesă în redare.")

@bot.command(name='stop')
async def stop(ctx):
    if ctx.voice_client:
        await ctx.voice_client.disconnect()
        await ctx.send("⏹️ Am oprit muzica și am ieșit de pe canal.")
    else:
        await ctx.send("❌ Botul nu este conectat pe niciun canal.")

# --- 3. PORNIRE CU PROTECȚIE LA EROAREA 429 ---
if __name__ == "__main__":
    keep_alive()
    TOKEN = os.environ.get('DISCORD_TOKEN')
    
    if not TOKEN:
        print("❌ EROARE: DISCORD_TOKEN nu este setat!")
    else:
        print("🔄 Încerc conectarea la Discord...")
        while True:
            try:
                bot.run(TOKEN)
                break
            except discord.errors.HTTPException as e:
                if e.status == 429:
                    print("⚠️ Primit cod 429 (Too Many Requests). Aștept 30 de secunde înainte de reconectare...")
                    time.sleep(30)
                else:
                    raise e
                    
