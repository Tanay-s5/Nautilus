import json
import os
from typing import List

from dotenv import load_dotenv
from fastapi import HTTPException
from openai import AuthenticationError, OpenAI, PermissionDeniedError, RateLimitError

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY not found in .env")

client = OpenAI(
    api_key=api_key,
    base_url="https://api.groq.com/openai/v1"
)


def call_llm(prompt: str, max_tokens: int = 500, json_mode: bool = False) -> str:
    """
    Generic Groq call. Returns the raw (stripped) response text.
    Raises HTTPException on API failure.
    """
    kwargs = dict(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=max_tokens,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    try:
        response = client.chat.completions.create(**kwargs)
        return response.choices[0].message.content.strip()
    except RateLimitError as e:
        print("RATE LIMIT ERROR:", repr(e))
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please retry in ~50 seconds. Consider enabling billing for higher limits."
        )
    except (AuthenticationError, PermissionDeniedError) as e:
        print("AUTH ERROR:", repr(e))
        raise HTTPException(
            status_code=403,
            detail="API key is invalid or doesn't have permission. Check your GROQ_API_KEY in .env"
        )
    except Exception as e:
        print("RAW ERROR:", repr(e))
        raise HTTPException(
            status_code=500,
            detail=f"API error: {str(e)}"
        )


def build_prompt(user_prompt: str) -> str:
    return f"""
You must return ONLY valid JSON. No explanation. No markdown.

Format:
{{
  "title": "<max 5 words>",

  "previewSummary": "<20-30 words, extremely clear>",
  "previewBullets": [
    "<short point 5-10 words>",
    "<short point 5-10 words>",
    "<short point 5-10 words>"
  ],

  "details": "< Less than 50 words . MUST be a plain string. Use \\n for line breaks. No raw newlines.",
  "applications": [],
  "analogy": "<simple intuitive analogy>",
  "corePrinciples": [<Do not use the same points as previewBullets , make these more mathmatical or related to pyhsics or chemsitry>],
  "mechanism": [<A leads to B leads to C>],
  "examples": [],
  "misconceptions": [],
  "constraints": [],
  "problemPatterns": "",
  "formalStructure": [<Identify the abstract mathematical form this concept resembles. Use descriptive names rather than formulas. Examples: linear relationship, exponential decay, inverse relationship, threshold effect, equilibrium system, feedback loop.>]
}}

Rules:
- preview = ultra concise
- details = deep but structured (bullets, not paragraphs)
+ details MUST be a single string, never an object or array
- No fluff
- No empty arrays (minimum 1 items) 
- NEVER include actual newlines inside strings , ALWAYS use \\n for line breaks
- Keep "details" under 50 words
- Do NOT repeat ideas
- Do NOT exeed 500 tokens 
 
Topic: {user_prompt}
"""


def _field_snippet(card: dict, field: str) -> str:
    value = card.get(field, "")
    if isinstance(value, list):
        return "; ".join(value)
    return str(value)


def link_prompt(card_a: dict, card_b: dict, top_fields: List[str]) -> str:
    shared = "\n".join(
        f"- {field}:\n  A: {_field_snippet(card_a, field)}\n  B: {_field_snippet(card_b, field)}"
        for field in top_fields
    )

    return f"""
You must return ONLY valid JSON. No explanation. No markdown.

Format:
{{
  "reason": "<7-8 short, sentences with no filler>"
}}

Two knowledge cards were flagged as related by an embedding similarity model.

Card: "{card_a.get('title', '')}"
{card_a.get('previewSummary', '')}

Card: "{card_b.get('title', '')}"
{card_b.get('previewSummary', '')}

They matched most strongly on these fields:
{shared}

Rules:
- Explain the specific  connection between the cards 
- Be concrete, not generic no filler
- Do not restate the titles
- 7-8 sentences, short and dense
- Use the titles to reffer to the cards
- If there is no conection , just say there is no conection
"""


def generate_card_data(user_prompt: str) -> dict:
    prompt = build_prompt(user_prompt)
    text = call_llm(prompt, max_tokens=500, json_mode=True)

    text = text.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(text)
    except Exception as e:
        print("Invalid JSON from LLM:\n", text)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse model response as JSON: {str(e)}"
        )

    return data


def generate_link_reason(card_a: dict, card_b: dict, top_fields: List[str]) -> str:

    fallback = f"Related through {', '.join(top_fields)}."
    prompt = link_prompt(card_a, card_b, top_fields)

    try:
        text = call_llm(prompt, max_tokens=200, json_mode=True)
    except HTTPException as e:
        print("Link reason generation failed:", e.detail)
        return fallback

    text = text.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(text)
        reason = str(data.get("reason", "")).strip()
        return reason or fallback
    except Exception as e:
        print("Invalid JSON from LLM (link reason):\n", text)
        return fallback