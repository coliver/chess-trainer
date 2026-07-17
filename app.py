# app.py
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

app = FastAPI(title="Chess Trainer")


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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
