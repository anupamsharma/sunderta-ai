from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import access, admin, analyses, chat, comparisons, health, history, products, profile, routines
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.responses import error_response
from app.db.indexes import ensure_indexes
from app.db.mongo import close_client, get_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    try:
        ensure_indexes(get_db())
    except Exception:
        # Allow API process to start; /api/ready reports dependency health.
        pass
    yield
    close_client()


settings = get_settings()
app = FastAPI(title="Sunderta AI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = FastAPI()
# Mount routes under /api via include with prefix on main
app.include_router(health.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(access.router, prefix="/api")
app.include_router(analyses.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(comparisons.router, prefix="/api")
app.include_router(routines.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(profile.router, prefix="/api")


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        code = detail.get("code", "HTTP_ERROR")
        message = detail.get("message", str(detail))
    else:
        code = "HTTP_ERROR"
        message = str(detail)
    return error_response(code, message, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    return error_response("VALIDATION_ERROR", "Invalid request", status_code=422, details=exc.errors())


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    return error_response("INTERNAL_ERROR", "An unexpected error occurred", status_code=500)
