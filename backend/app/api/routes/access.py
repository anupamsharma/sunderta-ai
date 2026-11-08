from typing import Optional

from fastapi import APIRouter, Cookie, HTTPException, Request

from app.core.responses import success_response
from app.core.security import (
    SESSION_COOKIE,
    clear_cookie,
    read_signed_cookie,
    set_signed_cookie,
)
from app.schemas.access import PasswordBody
from app.services import access_link_service

router = APIRouter(prefix="/access", tags=["access"])


@router.get("/me")
def access_me(sunderta_session: Optional[str] = Cookie(default=None, alias=SESSION_COOKIE)):
    data = read_signed_cookie(sunderta_session)
    if not data or data.get("role") != "invitee":
        raise HTTPException(status_code=401, detail="Authentication required")
    return success_response(access_link_service.get_invitee_profile(str(data["user_id"])))


@router.post("/logout")
def access_logout():
    response = success_response({"ok": True})
    clear_cookie(response, SESSION_COOKIE)
    return response


@router.get("/{token}/info")
def access_info(token: str):
    return success_response(access_link_service.public_info(token))


@router.post("/{token}/login")
def access_login(token: str, body: PasswordBody, request: Request):
    invitee = access_link_service.authenticate(token, body.password)
    response = success_response({"name": invitee["name"], "user_id": invitee["user_id"]})
    set_signed_cookie(
        response,
        request,
        SESSION_COOKIE,
        {"role": "invitee", "user_id": invitee["user_id"], "token": invitee["token"]},
    )
    return response
