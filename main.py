from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from api.websocket import ws_router

app = FastAPI(title="SWAMAZE", version="1.0.0", description="Multi-Agent Traffic Simulation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(ws_router)

@app.get("/")
async def root():
    return {"status": "SWAMAZE backend online", "version": "1.0.0"}
