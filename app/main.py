import hashlib
import hmac
import os
from urllib.parse import parse_qsl

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse
from app.routers import tasks
from app.database import create_tables

app = FastAPI(title="Task Management API", version="1.0.0")

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Templates
templates = Jinja2Templates(directory="app/templates")

app.include_router(tasks.router)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
ALLOWED_TELEGRAM_USER = os.environ.get("TELEGRAM_ALLOWED_USER_ID")
AUTH_ENABLED = bool(TELEGRAM_BOT_TOKEN and ALLOWED_TELEGRAM_USER)


def verify_telegram_init_data(init_data: str) -> int | None:
    data = dict(parse_qsl(init_data))
    received_hash = data.pop("hash", None)
    if not received_hash or not TELEGRAM_BOT_TOKEN:
        return None
    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(data.items()))
    secret_key = hashlib.sha256(TELEGRAM_BOT_TOKEN.encode()).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if hmac.compare_digest(computed_hash, received_hash):
        user_id = data.get("id")
        if user_id and user_id.isdigit():
            return int(user_id)
    return None

@app.on_event("startup")
async def startup_event():
    create_tables()

from fastapi.responses import RedirectResponse


@app.get("/")
async def root(request: Request):
    return RedirectResponse(url="/tasks-page")

def require_telegram_whitelist(request: Request) -> None:
    if not AUTH_ENABLED:
        return

    init_data = request.query_params.get("init_data") or request.query_params.get("initData")
    if not init_data:
        raise HTTPException(status_code=403, detail="Telegram authentication required")

    user_id = verify_telegram_init_data(init_data)
    if not user_id or str(user_id) != ALLOWED_TELEGRAM_USER:
        raise HTTPException(status_code=403, detail="Unauthorized Telegram user")


@app.get("/tasks-page")
async def tasks_page(request: Request):
    require_telegram_whitelist(request)
    return templates.TemplateResponse("tasks.html", {"request": request})

@app.get("/new-task")
async def new_task_page(request: Request):
    return templates.TemplateResponse("new_task.html", {"request": request})