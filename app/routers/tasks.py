from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db, TaskDB
from app.models import Task, TaskCreate

router = APIRouter()

@router.get("/tasks", response_model=list[Task])
async def get_tasks(db: Session = Depends(get_db)):
    # Update daily tasks: move incomplete overdue daily tasks to next day folder
    from datetime import datetime, timedelta
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    
    overdue_daily = db.query(TaskDB).filter(
        TaskDB.folder == "daily",
        TaskDB.completed == False,
        TaskDB.created_at < yesterday
    ).all()
    
    for task in overdue_daily:
        task.folder = f"daily-{today.isoformat()}"
        task.updated_at = datetime.utcnow()
    
    db.commit()
    
    tasks = db.query(TaskDB).all()
    return tasks

@router.post("/tasks", response_model=Task)
async def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    db_task = TaskDB(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: int, task: TaskCreate, db: Session = Depends(get_db)):
    db_task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    for key, value in task.dict().items():
        setattr(db_task, key, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task

@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted successfully"}