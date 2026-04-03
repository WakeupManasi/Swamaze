import json
import hashlib
from openai import AsyncOpenAI

client = AsyncOpenAI()
_cache: dict = {}
_call_count: int = 0
_cache_hits: int = 0

async def reason(prompt: str, context: dict) -> str:
    global _call_count, _cache_hits
    cache_key = hashlib.md5((prompt + json.dumps(context, sort_keys=True)).encode()).hexdigest()
    if cache_key in _cache:
        _cache_hits += 1
        return _cache[cache_key]
    _call_count += 1
    try:
        resp = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a traffic routing agent in a multi-agent simulation. "
                        "Respond concisely in 1-2 sentences with your routing decision. "
                        "Reference grid coordinates and costs when relevant."
                    )
                },
                {
                    "role": "user",
                    "content": f"{prompt}\n\nContext: {json.dumps(context)}"
                }
            ],
            max_tokens=200,
            temperature=0.3
        )
        result = resp.choices[0].message.content.strip()
    except Exception as e:
        result = f"LLM error: {str(e)[:60]}. Falling back to heuristic routing."
    _cache[cache_key] = result
    return result

def get_stats() -> dict:
    return {
        "total_calls": _call_count,
        "cache_hits": _cache_hits,
        "cache_size": len(_cache),
        "cache_hit_rate": round(_cache_hits / max(1, _call_count+_cache_hits), 3)
    }

def clear_cache():
    global _cache
    _cache = {}
