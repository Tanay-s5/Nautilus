import json
import os

from dotenv import load_dotenv
from fastapi import HTTPException
from openai import OpenAI

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY not found in .env")

client = OpenAI(
    api_key=api_key,
    base_url="https://api.groq.com/openai/v1"
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
  "formalStructure": [<like an underlying mathamatical fomula eg-linear equation slope intercep , exponential curve]
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


def generate_card_data(user_prompt: str) -> dict:
    """Calls the Groq LLM and returns the parsed JSON dict for a card.

    Raises HTTPException on API failure or unparsable output.
    """
    prompt = build_prompt(user_prompt)

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=500,
            response_format={"type": "json_object"}
        )
        text = response.choices[0].message.content.strip()
    except Exception as e:
        print("RAW ERROR:", repr(e))
        error_str = str(e)
        # rate limit errors
        if "RESOURCE_EXHAUSTED" in error_str or "429" in error_str:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please retry in ~50 seconds. Consider enabling billing for higher limits."
            )
        # auth errors
        elif "PERMISSION_DENIED" in error_str or "403" in error_str:
            raise HTTPException(
                status_code=403,
                detail="API key is invalid or doesn't have permission. Check your GEMINI_API_KEY in .env"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"API error: {error_str}"
            )

    # Clean markdown if LLM adds it
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