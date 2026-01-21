import asyncio
import os
import uvicorn
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request, HTTPException, UploadFile, File, BackgroundTasks
import bot
import rag_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    asyncio.create_task(bot.start_discord_bot())
    yield
    # Shutdown
    await bot.stop_discord_bot()

app = FastAPI(lifespan=lifespan)

@app.post("/update-config")
async def webhook_update(request: Request):
    # Verify signature
    admin_key = os.getenv("ADMIN_KEY")
    if not admin_key:
        raise HTTPException(status_code=500, detail="ADMIN_KEY not configured")
    
    provided_key = request.headers.get("X-Admin-Key")
    if provided_key != admin_key:
        raise HTTPException(status_code=401, detail="Unauthorized")

    await bot.update_bot_config()
    return {"status": "updated"}


# Simplify signature check usage
from fastapi import Header
@app.post("/upload-doc")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    x_admin_key: str = Header(None, alias="X-Admin-Key")
):
    admin_key = os.getenv("ADMIN_KEY")
    if not admin_key or x_admin_key != admin_key:
         raise HTTPException(status_code=401, detail="Unauthorized")
    
    if not bot.supabase:
         raise HTTPException(status_code=503, detail="Database not connected")

    content = await file.read()
    
    # 1. Create upload record
    res = bot.supabase.table("uploads").insert({
        "filename": file.filename,
        "status": "processing"
    }).execute()
    
    upload_id = res.data[0]['id']

    # 2. Schedule background task
    background_tasks.add_task(
        rag_service.process_and_store_document_background, 
        content, 
        file.filename, 
        upload_id, 
        bot.supabase
    )
    
    return {"status": "queued", "upload_id": upload_id}

@app.get("/")
def read_root():
    return {"status": "Discord Copilot Backend Running"}

if __name__ == "__main__":
    PORT= int(os.getenv('PORT') or 8000)
    if os.getenv("ENV") == "DEPLOYEMENT":
        uvicorn.run("main:app", host="[IP_ADDRESS]", port=PORT, reload=True)
    else:
        uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)
