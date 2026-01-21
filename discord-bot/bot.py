import discord
import os
import asyncio
from supabase import create_client, Client
from chain import generate_response
import rag_service

# Global state
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")

# Initialize Supabase client if credentials exist, else None
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

class DiscordCopilot(discord.Client):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.allowed_channels = []
        self.system_instruction = "You are a helpful assistant." # Default

    async def on_ready(self):
        print(f'Logged in as {self.user} (ID: {self.user.id})')
        await self.refresh_config()

    async def refresh_config(self):
        print("Refreshing config from Supabase...")
        if not supabase:
            print("Supabase not initialized.")
            return

        try:
            # Fetch instructions
            inst_response = supabase.table('configurations').select('value').eq('key', 'system_instructions').execute()
            if inst_response.data:
                self.system_instruction = inst_response.data[0]['value']
            
            # Fetch allowed channels
            channels_response = supabase.table('allowed_channels').select('channel_id').execute()
            self.allowed_channels = [int(r['channel_id']) for r in channels_response.data]
            
            print(f"Config updated. Instructions len: {len(self.system_instruction)}, Channels: {self.allowed_channels}")
        except Exception as e:
            print(f"Error refreshing config: {e}")

    async def on_message(self, message):
        if message.author == self.user:
            return

        # Check allowed channels (if list is not empty, strict mode)
        # If list is empty, maybe allow all or none? Let's assume strict allow-list if configured.
        if self.allowed_channels and message.channel.id not in self.allowed_channels:
            return
        
        # If allowed_channels is empty, we might want to allow mentions? 
        # For now, if allowed_channels is populated, enforce it. 
        # If empty, maybe just log or reply? 
        # Let's assume allow-list is mandatory.
        if not self.allowed_channels and supabase:
             pass # Don't reply if not configured

        # If supabase is down or not configed, maybe just reply?
        # But we want to be safe.
        
        # Call LLM with memory
        # Fetch recent memories (simple context window)
        memory_context = ""
        if supabase:
            try:
                mem_res = supabase.table('memories').select('*').order('created_at', desc=True).limit(10).execute()
                # Reverse to chronological
                history = mem_res.data[::-1]
                for msg in history:
                    memory_context += f"{msg['role']}: {msg['content']}\n"
            except Exception as e:
                print(f"Error fetching memory: {e}")

        # RAG Retrieval
        rag_context = ""
        if supabase:
            try:
                chunks = await rag_service.retrieve_relevant_chunks(message.content, supabase, k=5)
                if chunks:
                    rag_context = "\n".join([f"- {c['content']} (Source: {c['metadata'].get('source', 'unknown')})" for c in chunks])
                    print(f"Retrieved {len(chunks)} chunks for context.")
            except Exception as e:
                print(f"Error in RAG retrieval: {e}")

        # Combine instructions and memory
        full_system_prompt = f"{self.system_instruction}\n\nConversation History:\n{memory_context}"

        response = await generate_response(full_system_prompt, message.content, rag_context)
        
        # Save to memory
        if supabase:
            try:
                # Save User Message
                supabase.table('memories').insert({'content': message.content, 'role': 'user'}).execute()
                # Save Bot Response
                supabase.table('memories').insert({'content': response, 'role': 'assistant'}).execute()
            except Exception as e:
                print(f"Error saving memory: {e}")

        await message.channel.send(response)

intents = discord.Intents.default()
intents.message_content = True
client = DiscordCopilot(intents=intents)

async def start_discord_bot():
    if not DISCORD_TOKEN:
        print("DISCORD_TOKEN not set. Bot will not start.")
        return
    await client.start(DISCORD_TOKEN)

async def stop_discord_bot():
    if not client.is_closed():
        await client.close()

async def update_bot_config():
    await client.refresh_config()
