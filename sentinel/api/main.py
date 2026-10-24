"""FastAPI Application Entrypoint for SENTINEL."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sentinel.api.routes import router

app = FastAPI(
    title="SENTINEL AI Agent Firewall API",
    description="Deterministic action policy enforcement, receipt auditing, and attack lab simulation.",
    version="0.1.0",
)

# Enable CORS for web console
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "sentinel-firewall", "version": "0.1.0"}


if __name__ == "__main__":
    uvicorn.run("sentinel.api.main:app", host="0.0.0.0", port=8000, reload=True)
