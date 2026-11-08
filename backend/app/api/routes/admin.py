from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.config import get_settings
from app.core.responses import success_response
from app.core.security import ADMIN_COOKIE, clear_cookie, require_admin, set_signed_cookie, verify_password
from app.schemas.access import CreateLinkRequest, PasswordBody, ResetPasswordRequest
from app.services import access_link_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/login")
def admin_login(body: PasswordBody, request: Request):
    settings = get_settings()
    ok = body.password == settings.admin_password
    if not ok and settings.admin_password.startswith("$2"):
        ok = verify_password(body.password, settings.admin_password)
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    response = success_response({"ok": True})
    set_signed_cookie(response, request, ADMIN_COOKIE, {"role": "admin"})
    return response


@router.post("/logout")
def admin_logout():
    response = success_response({"ok": True})
    clear_cookie(response, ADMIN_COOKIE)
    return response


@router.get("/me")
def admin_me(_: bool = Depends(require_admin)):
    return success_response({"role": "admin"})


@router.get("/links")
def list_links(_: bool = Depends(require_admin)):
    return success_response(access_link_service.list_links())


@router.post("/links")
def create_link(body: CreateLinkRequest, _: bool = Depends(require_admin)):
    return success_response(access_link_service.create_link(body.name, body.password), status_code=201)


@router.post("/links/{link_id}/reset-password")
def reset_password(link_id: str, body: ResetPasswordRequest, _: bool = Depends(require_admin)):
    return success_response(access_link_service.reset_password(link_id, body.password))


@router.delete("/links/{link_id}")
def delete_link(link_id: str, _: bool = Depends(require_admin)):
    return success_response(access_link_service.delete_link(link_id))
