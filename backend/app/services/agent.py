import asyncio
from google import genai
from app.config import settings
from datetime import datetime

client = genai.Client(api_key=settings.gemini_api_key)

# Simple in-memory usage tracker — resets on server restart
_usage = {
    "total_calls": 0,
    "response_calls": 0,
    "summarize_calls": 0,
    "errors": 0,
    "estimated_input_tokens": 0,
    "estimated_output_tokens": 0,
    "session_started": datetime.now().strftime("%Y-%m-%d %H:%M"),
}


def get_usage() -> dict:
    cost_per_1k_input = 0.000075   # gemini-2.5-flash input $/1k tokens (approx)
    cost_per_1k_output = 0.0003    # gemini-2.5-flash output $/1k tokens (approx)
    estimated_cost = (
        (_usage["estimated_input_tokens"] / 1000) * cost_per_1k_input +
        (_usage["estimated_output_tokens"] / 1000) * cost_per_1k_output
    )
    return {**_usage, "estimated_cost_usd": round(estimated_cost, 5)}


def _track(prompt: str, response_text: str, call_type: str):
    # Rough token estimate: ~4 chars per token
    _usage["total_calls"] += 1
    _usage[f"{call_type}_calls"] += 1
    _usage["estimated_input_tokens"] += len(prompt) // 4
    _usage["estimated_output_tokens"] += len(response_text) // 4


def score_confidence(customer_message: str, ai_response: str, services: list[dict]) -> float:
    """
    Rule-based confidence score (0.0-1.0). No extra Gemini call.
    Checks: customer frustration, AI uncertainty, out-of-scope signals, booking success.
    """
    score = 85.0
    customer = customer_message.lower()
    ai = ai_response.lower()

    # Customer frustration — high risk, needs human
    frustration = ["angry", "furious", "ridiculous", "ridiculious", "rediculous",
                   "unacceptable", "worst", "terrible", "scam", "lawsuit", "cancel",
                   "refund", "never again", "horrible", "useless", "waste", "disgusting",
                   "pathetic", "rip off", "ripping me off", "no one picking", "nobody picking",
                   "no one answers", "nobody answers", "not picking up"]
    if any(w in customer for w in frustration):
        score -= 25

    # Escalation — customer wants a human, not a bot
    escalation = ["talk to the manager", "speak to the manager", "talk to a manager",
                  "speak to a manager", "talk to someone", "speak to someone",
                  "real person", "actual person", "talk to a human", "speak to a human",
                  "call me back", "call me right now", "need a call", "need someone to call",
                  "pick up the phone", "pick up the call", "picking up the call",
                  "anybody there", "is anyone there", "anyone available"]
    if any(w in customer for w in escalation):
        score -= 25

    # Out of scope — AI admitted it can't help
    out_of_scope = ["don't offer", "specialize only", "can't help with", "outside our",
                    "recommend a", "not something we", "don't do", "not our area",
                    "not a service we", "suggest you contact", "you'll need a",
                    "you would need a", "dedicated auto shop", "dedicated shop",
                    "auto body shop", "body shop", "licensed electrician elsewhere",
                    "suggest calling", "contact a specialist", "see your vet",
                    "mechanical repair", "we don't repair"]
    if any(w in ai for w in out_of_scope):
        score -= 20

    # AI uncertainty — hedging language
    uncertainty = ["not sure", "i think", "possibly", "i believe", "might be",
                   "i'm not certain", "not 100%", "you'd have to check", "not entirely sure"]
    if any(w in ai for w in uncertainty):
        score -= 15

    # Price hallucination — AI mentioned a $ amount but no services configured
    import re
    if re.search(r"\$\d+", ai) and not services:
        score -= 10

    # Booking confirmed = very high confidence
    if "booked!" in ai:
        score = min(97.0, score + 15)

    return round(max(0.0, min(100.0, score)) / 100.0, 2)


async def generate_json(prompt: str) -> str:
    """Call Gemini expecting a full JSON response — no SMS truncation."""
    last_err = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            text = response.text.strip()
            _track(prompt, text, "response")
            return text
        except Exception as e:
            last_err = e
            _usage["errors"] += 1
            print(f"Gemini JSON error (attempt {attempt + 1}/3): {e}")
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)
    print(f"Gemini JSON failed after 3 attempts: {last_err}")
    return ""


async def generate_response(prompt: str) -> tuple[str, float]:
    last_err = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            text = response.text.strip()
            if len(text) > 160:
                cut = text[:160]
                last_end = max(cut.rfind('.'), cut.rfind('!'), cut.rfind('?'))
                if last_end > 80:
                    text = cut[:last_end + 1]
                else:
                    # Word boundary — never cut mid-word
                    last_space = cut.rfind(' ')
                    text = cut[:last_space].rstrip() if last_space > 80 else cut
            _track(prompt, text, "response")
            return text, 0.85
        except Exception as e:
            last_err = e
            _usage["errors"] += 1
            print(f"Gemini error (attempt {attempt + 1}/3): {e}")
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)  # 1s, 2s
    print(f"Gemini failed after 3 attempts: {last_err}")
    return "Thank you for reaching out! We'll have someone contact you shortly.", 0.0


async def summarize_booking(messages: list[dict]) -> str:
    """Generate a short dispatcher note from conversation history."""
    history = "\n".join(
        f"{'Customer' if m['sender_type'] == 'customer' else 'Anna'}: {m['body']}"
        for m in messages
    )
    prompt = f"""Based on this SMS conversation, write a single short dispatcher note (max 100 characters) summarizing the job. Include: issue, location in home, and how long it's been happening. No fluff, just facts. Example: "Clogged kitchen sink, 2 days. Tried Drano. Ground floor."

Conversation:
{history}

Dispatcher note:"""

    for attempt in range(3):
        try:
            # Small delay before summarize — avoids back-to-back 503s right after generate_response
            if attempt == 0:
                await asyncio.sleep(2)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            text = response.text.strip()[:120]
            _track(prompt, text, "summarize")
            return text
        except Exception as e:
            _usage["errors"] += 1
            print(f"Summarize error (attempt {attempt + 1}): {e}")
            if attempt < 2:
                await asyncio.sleep(4)

    return "Issue — see conversation for details."
