from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Literal, Optional

from app.services.chat_service import chat_service

router = APIRouter()


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="Conversation so far, oldest first")
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional snapshot of the user's app data to ground the reply",
    )


class ChatResponse(BaseModel):
    success: bool
    reply: str
    model: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Scalpify chat assistant — a hair-loss / recovery helper backed by OpenAI.

    Send the running conversation in `messages` and an optional `context` snapshot
    (latest scan, meds, adherence, recovery phase) so replies reference the user's
    own data.
    """
    if not chat_service.enabled:
        raise HTTPException(
            status_code=503,
            detail="Chat assistant not available — OPENAI_API_KEY is not configured.",
        )

    if not request.messages:
        raise HTTPException(status_code=400, detail="At least one message is required.")

    try:
        reply = chat_service.reply(
            messages=[m.model_dump() for m in request.messages],
            context=request.context,
        )
        return ChatResponse(success=True, reply=reply, model=chat_service.model)
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001 — surface a clean error to the client
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")
