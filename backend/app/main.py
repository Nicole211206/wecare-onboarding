from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import fotos, form, ia, onboarding, vistoria

Base.metadata.create_all(bind=engine)

app = FastAPI(title="WeCare Onboarding")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(onboarding.router)
app.include_router(form.router)
app.include_router(vistoria.router)
app.include_router(fotos.router)
app.include_router(ia.router)


@app.get("/")
def root():
    return {"ok": True, "service": "wecare-onboarding-backend"}
