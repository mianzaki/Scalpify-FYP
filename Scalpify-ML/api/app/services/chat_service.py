"""
Scalpify chat assistant service.

Wraps the OpenAI Chat Completions API behind a small, hair-loss-scoped assistant.
The system prompt is grounded with the caller's real app data (latest scan, meds,
adherence, recovery phase) so answers reference the user's own numbers instead of
generic advice. Falls back to a clear error if no OPENAI_API_KEY is configured.
"""
from typing import Any, Dict, List, Optional

from app.core.config import get_settings

settings = get_settings()

# Keep the assistant on-topic, safe, and concise.
BASE_SYSTEM_PROMPT = """You are "Scalpify Assistant", the in-app helper for Scalpify — a \
hair-loss analysis and hair-transplant recovery tracking app.

Your scope:
- Hair loss, scalp health, androgenetic alopecia, the Norwood scale.
- Hair-transplant (FUE/FUT) procedures and the post-op recovery timeline.
- Common treatments (finasteride, dutasteride, minoxidil, etc.) at a general,
  educational level.
- How to use the Scalpify app (scans, density/coverage, adherence, reminders,
  the hair-journey visualization).

Rules:
- Be warm, concise, and practical. Prefer short paragraphs and bullet points.
- Ground your answers in the user's data when it is provided below.
- You are NOT a doctor. For dosing changes, side effects, or anything medical,
  add a brief reminder to consult a qualified clinician/dermatologist.
- If asked something clearly outside hair/scalp/the app, gently steer back.
- Never invent specific numbers about the user; only use the data given to you.
"""


def _format_context(ctx: Optional[Dict[str, Any]]) -> str:
    """Render the user's app data into a compact block for the system prompt."""
    if not ctx:
        return "No personal data was shared for this conversation."

    lines: List[str] = []
    name = ctx.get("firstName")
    if name:
        lines.append(f"- Name: {name}")

    treatment_done = ctx.get("treatmentDone")
    if treatment_done is True:
        lines.append("- Has had a hair transplant: yes (in recovery)")
        day = ctx.get("recoveryDay")
        phase = ctx.get("recoveryPhase")
        if day is not None:
            lines.append(f"- Days since procedure: {day}")
        if phase:
            lines.append(f"- Current recovery phase: {phase}")
    elif treatment_done is False:
        lines.append("- Has had a hair transplant: no")

    age = ctx.get("age")
    if age:
        lines.append(f"- Age: {age}")
    sex = ctx.get("sex")
    if sex:
        lines.append(f"- Sex: {sex}")

    scan = ctx.get("latestScan")
    if scan:
        sev = scan.get("severity")
        nw = scan.get("norwood")
        bald = scan.get("baldnessPct")
        cover = scan.get("coveragePct")
        if sev:
            lines.append(f"- Latest scan severity: {sev}")
        if nw:
            lines.append(f"- Norwood stage: {nw}")
        if bald is not None:
            lines.append(f"- Bald/thinning area: {bald}%")
        if cover is not None:
            lines.append(f"- Hair coverage: {cover}%")
    else:
        lines.append("- No scan taken yet.")

    meds = ctx.get("medications")
    if meds:
        lines.append(f"- Current medications/reminders: {', '.join(meds)}")
    adherence = ctx.get("adherencePct")
    if adherence is not None:
        lines.append(f"- Today's medication adherence: {adherence}%")

    return "\n".join(lines) if lines else "No personal data was shared."


class ChatService:
    def __init__(self) -> None:
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_CHAT_MODEL
        self._client = None

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def _get_client(self):
        if self._client is None:
            # Imported lazily so the API still boots without the openai package.
            from openai import OpenAI
            self._client = OpenAI(api_key=self.api_key)
        return self._client

    def reply(
        self,
        messages: List[Dict[str, str]],
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Return the assistant's reply for a conversation. `messages` is a list of
        {role: 'user'|'assistant', content: str} in chronological order."""
        system_prompt = (
            BASE_SYSTEM_PROMPT
            + "\n\n--- The user's current Scalpify data ---\n"
            + _format_context(context)
        )

        # Keep only valid roles, cap history to the last 20 turns to control tokens.
        history = [
            {"role": m["role"], "content": m["content"]}
            for m in messages
            if m.get("role") in ("user", "assistant") and m.get("content")
        ][-20:]

        client = self._get_client()
        completion = client.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": system_prompt}, *history],
            temperature=0.5,
            max_tokens=600,
        )
        return completion.choices[0].message.content.strip()


chat_service = ChatService()
