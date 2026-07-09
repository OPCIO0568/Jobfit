from fastapi import FastAPI

try:
    from backend.app.api import router
    from backend.app.middleware import install_middlewares
except ModuleNotFoundError:
    from app.api import router
    from app.middleware import install_middlewares


app = FastAPI(title="JobFit Agent Backend", version="0.1.0")
install_middlewares(app)
app.include_router(router)
