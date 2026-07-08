# backend/app/app.py
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from backend.app.routers.training import router as training_router
from backend.app.routers.auth import router as auth_router

app = FastAPI(title="Chess Trainer")

app.include_router(training_router, prefix="")
app.include_router(auth_router, prefix="")

class PingResponse(BaseModel):
    message: str


@app.get("/", response_class=HTMLResponse)
def home():
    return """
    <html>
      <body style="font-family: sans-serif; margin: 40px;">
        <h1>Chess Trainer API</h1>
        <p>Try <code>GET /ping</code>.</p>
      </body>
    </html>
    """


@app.get("/ping", response_model=PingResponse)
def ping():
    return {"message": "ok"}
