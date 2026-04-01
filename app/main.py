from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.routers import tasks
from app.database import create_tables

app = FastAPI(title="Task Management API", version="1.0.0")

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Templates
templates = Jinja2Templates(directory="app/templates")

app.include_router(tasks.router)

@app.on_event("startup")
async def startup_event():
    create_tables()

from fastapi.responses import RedirectResponse


@app.get("/")
async def root(request: Request):
    return RedirectResponse(url="/tasks-page")

@app.get("/tasks-page")
async def tasks_page(request: Request):
    return templates.TemplateResponse("tasks.html", {"request": request})

@app.get("/new-task")
async def new_task_page(request: Request):
    return templates.TemplateResponse("new_task.html", {"request": request})