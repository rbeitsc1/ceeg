from __future__ import annotations

import html
import json
import os
from dotenv import load_dotenv
load_dotenv()
import os
import json
from dotenv import load_dotenv

load_dotenv()
print("DEBUG TICKETMASTER_API_KEY =", os.getenv("TICKETMASTER_API_KEY"))
import re
import threading
import urllib.parse
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DEFAULT_PLANNING_FILE = DATA_DIR / "planning_state.json"
PLANNING_FILE = Path(os.getenv("PLANNING_STATE_FILE", str(DEFAULT_PLANNING_FILE)))
PLANNING_STATE_KV_URL = (os.getenv("KV_REST_API_URL") or "").rstrip("/")
PLANNING_STATE_KV_TOKEN = os.getenv("KV_REST_API_TOKEN", "")
PLANNING_STATE_KV_KEY = os.getenv("PLANNING_STATE_KV_KEY", "ceeg:planning_state")
PLANNING_STATE_BACKEND = "kv" if PLANNING_STATE_KV_URL and PLANNING_STATE_KV_TOKEN else "file"

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

HOME_CONTEXT = {
    "address": "21150 NE 38th Ave, Aventura, Florida 33180",
    "latitude": 25.9734,
    "longitude": -80.1437,
    "radius_miles": 100,
    "timezone": "America/New_York",
}

TICKETMASTER_API_URL = "https://app.ticketmaster.com/discovery/v2/events.json"
ARSHT_SITEMAP_URL = "https://www.arshtcenter.org/sitemap.xml"
FGO_HOME_URL = "https://fgo.org/"
FGO_SEASON_URLS = [
    "https://fgo.org/",
    "https://fgo.org/season25-26/",
    "https://fgo.org/season26-27/",
]
FGO_LINK_PATTERN = re.compile(
    r"https://fgo\.org/(?:(?:season|season\d{2}-\d{2})/[^\"'#?\s]+|season\d{2}-\d{2}/[^\"'#?\s]+|\d{4}-gala/|85gala/)",
    re.I,
)
FGO_EXCLUDED_PATHS = {
    "season",
    "season25-26",
    "season26-27",
}
FGO_MONTH_PATTERN = r"(?:January|February|March|April|May|June|July|August|September|October|November|December)"
FGO_DATETIME_PATTERN = re.compile(
    rf"{FGO_MONTH_PATTERN}\s+\d{{1,2}},\s+\d{{4}}(?:\s*(?:at|\|)\s*\d{{1,2}}:\d{{2}}\s*[AP]M)?",
    re.I,
)
FGO_VENUE_PATTERN = re.compile(
    r"(Adrienne Arsht Center[^<\n]{0,220}|Broward Center[^<\n]{0,220}|Knight Concert Hall[^<\n]{0,160}|Au-Rene Theater[^<\n]{0,160}|Ziff Ballet Opera House[^<\n]{0,160})",
    re.I,
)
HOME_TIMEZONE = ZoneInfo(HOME_CONTEXT["timezone"])
TICKETMASTER_ALLOWED_SEGMENTS = {"music", "arts & theatre"}
TICKETMASTER_EXCLUDED_SEGMENTS = {"sports", "miscellaneous"}
TICKETMASTER_EXCLUDED_CLASSIFICATION_TERMS = {
    "sports",
    "baseball",
    "basketball",
    "football",
    "soccer",
    "hockey",
    "golf",
    "tennis",
    "racing",
    "motorsports",
    "wrestling",
    "mma",
    "boxing",
    "monster truck",
    "rodeo",
}

CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", str(15 * 60)))
cache_lock = threading.Lock()
planning_state_lock = threading.Lock()
cache_state: dict[str, Any] = {
    "timestamp": None,
    "payload": None,
}
planning_state_memory: dict[str, dict[str, Any]] = {}


class PlanningStateStorageError(RuntimeError):
    pass

ARSHT_CENTER_COORDS = (25.7871, -80.1892)
BROWARD_CENTER_COORDS = (26.1224, -80.1439)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def ensure_data_dir() -> None:
    if PLANNING_STATE_BACKEND != "file":
        return
    try:
        PLANNING_FILE.parent.mkdir(parents=True, exist_ok=True)
    except OSError:
        return
    if not PLANNING_FILE.exists():
        try:
            PLANNING_FILE.write_text("{}", encoding="utf-8")
        except OSError:
            return


def read_planning_state() -> dict[str, dict[str, Any]]:
    if PLANNING_STATE_BACKEND == "kv":
        return read_planning_state_from_kv()
    ensure_data_dir()
    if PLANNING_FILE.exists():
        try:
            return json.loads(PLANNING_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    with planning_state_lock:
        return dict(planning_state_memory)


def write_planning_state(state: dict[str, dict[str, Any]]) -> None:
    ensure_data_dir()
    with planning_state_lock:
        planning_state_memory.clear()
        planning_state_memory.update(state)
    if PLANNING_STATE_BACKEND == "kv":
        write_planning_state_to_kv(state)
        return
    try:
        PLANNING_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")
    except OSError:
        return


def planning_state_kv_request(method: str, path: str) -> Any:
    request = urllib.request.Request(
        f"{PLANNING_STATE_KV_URL}{path}",
        headers={"Authorization": f"Bearer {PLANNING_STATE_KV_TOKEN}"},
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = response.read().decode("utf-8", "ignore")
    except (OSError, urllib.error.HTTPError) as exc:
        raise PlanningStateStorageError(f"Planner state KV request failed: {exc}") from exc

    if not payload:
        return None

    try:
        return json.loads(payload)
    except json.JSONDecodeError as exc:
        raise PlanningStateStorageError("Planner state KV response was not valid JSON") from exc


def read_planning_state_from_kv() -> dict[str, dict[str, Any]]:
    response = planning_state_kv_request("GET", f"/get/{urllib.parse.quote(PLANNING_STATE_KV_KEY, safe='')}")
    value = response.get("result") if isinstance(response, dict) else None
    if value in (None, ""):
        return {}
    if not isinstance(value, str):
        raise PlanningStateStorageError("Planner state KV payload was not a JSON string")
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as exc:
        raise PlanningStateStorageError("Planner state KV payload was not valid JSON") from exc
    if not isinstance(parsed, dict):
        raise PlanningStateStorageError("Planner state KV payload was not an object")
    return parsed


def write_planning_state_to_kv(state: dict[str, dict[str, Any]]) -> None:
    serialized_state = urllib.parse.quote(json.dumps(state, separators=(",", ":")), safe="")
    response = planning_state_kv_request(
        "POST",
        f"/set/{urllib.parse.quote(PLANNING_STATE_KV_KEY, safe='')}/{serialized_state}",
    )
    if isinstance(response, dict) and response.get("error"):
        raise PlanningStateStorageError(f"Planner state KV write failed: {response['error']}")


def preserve_event_first_seen(
    events: list[dict[str, Any]],
    planning_state: dict[str, dict[str, Any]],
    *,
    observed_at: datetime,
) -> bool:
    state_changed = False
    observed_at_value = observed_at.isoformat()
    for event in events:
        event_id = event.get("id")
        if not event_id:
            continue
        stored = planning_state.get(event_id, {})
        stored_first_seen = stored.get("first_seen_at")
        parsed_first_seen = parse_iso_datetime(stored_first_seen) if isinstance(stored_first_seen, str) else None
        first_seen_at = parsed_first_seen.isoformat() if parsed_first_seen else observed_at_value
        if stored_first_seen != first_seen_at:
            planning_state[event_id] = {**stored, "first_seen_at": first_seen_at}
            state_changed = True
        event["date_added"] = first_seen_at
    return state_changed


def preserve_planning_metadata(entry: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in entry.items() if key == "first_seen_at"}


def http_get(url: str, *, headers: dict[str, str] | None = None, timeout: int = 20) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "CeegMVP/1.0 (+https://local.ceeg)",
            **(headers or {}),
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", "ignore")


def http_get_json(url: str, *, headers: dict[str, str] | None = None, timeout: int = 20) -> Any:
    return json.loads(http_get(url, headers=headers, timeout=timeout))


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    value = html.unescape(value)
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def strip_suffix(value: str, suffix: str) -> str:
    return value[: -len(suffix)].strip() if value.endswith(suffix) else value


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def format_cost(min_value: Any, max_value: Any, currency: str | None) -> str | None:
    if min_value in (None, "") and max_value in (None, ""):
        return None
    symbol = "$" if currency in (None, "USD") else f"{currency} "
    if min_value and max_value and min_value != max_value:
        return f"{symbol}{min_value:.0f} - {symbol}{max_value:.0f}"
    only_value = max_value or min_value
    return f"{symbol}{only_value:.0f}"


def categorize_text(text: str) -> tuple[str, list[str]]:
    normalized = text.lower()
    tags: list[str] = []

    def contains_phrase(value: str, phrase: str) -> bool:
        pattern = r"\b" + r"\s+".join(re.escape(part) for part in phrase.split()) + r"\b"
        return re.search(pattern, value) is not None

    rules = [
        ("opera", ["opera", "grand opera"]),
        ("ballet", ["ballet"]),
        ("dance", ["dance", "dancing"]),
        ("classical", ["symphony", "orchestra", "classical", "philharmonic", "chamber music", "concerto"]),
        ("theater", ["theatre", "theater", "broadway", "play"]),
        ("musical", ["musical"]),
        ("concert", ["concert", "live music", "recital", "gospel", "jazz", "choir"]),
        ("museum", ["museum"]),
        ("garden", ["garden", "botanical"]),
        ("art", ["art", "painting", "gallery", "exhibit", "exhibition"]),
    ]

    category = "Event"
    for candidate, needles in rules:
        if any(contains_phrase(normalized, needle) for needle in needles):
            category = candidate.title()
            tags.append(candidate)
            break

    if contains_phrase(normalized, "flower") or contains_phrase(normalized, "garden"):
        tags.append("flowers")
    if contains_phrase(normalized, "matinee"):
        tags.append("matinee")
    if any(contains_phrase(normalized, keyword) for keyword in ["opera", "ballet", "dance", "symphony", "art", "garden", "music"]):
        tags.append("arts-forward")
    if any(contains_phrase(normalized, keyword) for keyword in ["accessible", "wheelchair", "easy access"]):
        tags.append("accessible")

    deduped_tags = []
    for tag in tags:
        if tag not in deduped_tags:
            deduped_tags.append(tag)

    return category, deduped_tags


def classify_planning_window(starts_at: datetime) -> tuple[str, str]:
    today = now_utc().date()
    event_day = starts_at.date()
    delta_days = (event_day - today).days
    next_month_start = (today.replace(day=28) + timedelta(days=4)).replace(day=1)
    month_after_next_start = (next_month_start.replace(day=28) + timedelta(days=4)).replace(day=1)

    if delta_days <= 6:
        return "this_week", "This Week"
    if delta_days <= 10:
        return "next_10_days", "Next 10 Days"
    if event_day < next_month_start:
        return "this_month", "This Month"
    if event_day < month_after_next_start:
        return "next_month", "Next Month"
    if delta_days >= 0:
        return "book_ahead", "Book Ahead"
    return "this_week", "This Week"


def canonicalize_planning_window(window: str | None, starts_at: datetime | None) -> tuple[str, str]:
    if starts_at:
        normalized_window, normalized_label = classify_planning_window(starts_at)
        if window in (None, "", "upcoming"):
            return normalized_window, normalized_label
        if window != normalized_window:
            return normalized_window, normalized_label
        return normalized_window, normalized_label

    mapping = {
        "this_week": ("this_week", "This Week"),
        "next_10_days": ("next_10_days", "Next 10 Days"),
        "this_month": ("this_month", "This Month"),
        "next_month": ("next_month", "Next Month"),
        "book_ahead": ("book_ahead", "Book Ahead"),
        "upcoming": ("book_ahead", "Book Ahead"),
    }
    return mapping.get(window or "", ("book_ahead", "Book Ahead"))


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    from math import asin, cos, radians, sin, sqrt

    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    start_lat = radians(lat1)
    end_lat = radians(lat2)
    arc = sin(d_lat / 2) ** 2 + cos(start_lat) * cos(end_lat) * sin(d_lon / 2) ** 2
    return 3958.8 * 2 * asin(sqrt(arc))


def estimate_travel_label(
    *,
    source: str,
    venue: str,
    venue_latitude: float | None = None,
    venue_longitude: float | None = None,
) -> str:
    destination_coords: tuple[float, float] | None = None

    if venue_latitude is not None and venue_longitude is not None:
        destination_coords = (venue_latitude, venue_longitude)
    elif source == "Arsht Center" and "offsite" not in venue.lower():
        destination_coords = ARSHT_CENTER_COORDS
    elif source == "Florida Grand Opera":
        venue_key = venue.lower()
        if "arsht" in venue_key or "knight concert hall" in venue_key or "ziff ballet opera house" in venue_key:
            destination_coords = ARSHT_CENTER_COORDS
        elif "broward center" in venue_key or "au-rene theater" in venue_key:
            destination_coords = BROWARD_CENTER_COORDS

    if not destination_coords:
        return "Travel estimate from Aventura varies by venue"

    distance = haversine_miles(
        HOME_CONTEXT["latitude"],
        HOME_CONTEXT["longitude"],
        destination_coords[0],
        destination_coords[1],
    )
    drive_miles = max(3, round(distance * 1.2))
    drive_minutes = max(12, round(drive_miles * 2))
    return f"About {drive_miles} mi / {drive_minutes} min from Aventura"


def normalize_ticketmaster_booking_url(raw_event: dict[str, Any], venue: str) -> str:
    query = " ".join(part for part in [clean_text(raw_event.get("name")), clean_text(venue)] if part)
    if not query:
        query = clean_text(raw_event.get("id")) or "events"
    return f"https://www.ticketmaster.com/search?q={urllib.parse.quote(query)}"


def is_relevant_ticketmaster_event(raw_event: dict[str, Any]) -> bool:
    classifications = raw_event.get("classifications") or []
    if not classifications:
        return False

    allowed_segment_found = False
    for classification in classifications:
        if not isinstance(classification, dict):
            continue
        names = [
            clean_text(classification.get("segment", {}).get("name")),
            clean_text(classification.get("genre", {}).get("name")),
            clean_text(classification.get("subGenre", {}).get("name")),
            clean_text(classification.get("type", {}).get("name")),
            clean_text(classification.get("subType", {}).get("name")),
        ]
        normalized_names = [name.lower() for name in names if name]
        if any(name in TICKETMASTER_EXCLUDED_SEGMENTS for name in normalized_names):
            return False
        if any(term in name for name in normalized_names for term in TICKETMASTER_EXCLUDED_CLASSIFICATION_TERMS):
            return False
        if any(name in TICKETMASTER_ALLOWED_SEGMENTS for name in normalized_names):
            allowed_segment_found = True

    if not allowed_segment_found:
        return False

    details_text = " ".join(
        filter(
            None,
            [
                raw_event.get("name"),
                raw_event.get("info"),
                raw_event.get("pleaseNote"),
            ],
        )
    ).lower()
    if any(term in details_text for term in TICKETMASTER_EXCLUDED_CLASSIFICATION_TERMS):
        return False
    return True


def parse_iso_datetime(value: str | None, *, fallback_time: str | None = None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        if fallback_time:
            try:
                return datetime.fromisoformat(f"{value}T{fallback_time}")
            except ValueError:
                return None
    return None


def parse_local_datetime(value: str, formats: list[str]) -> datetime | None:
    normalized = clean_text(value).replace("–", "-")
    for pattern in formats:
        try:
            return datetime.strptime(normalized, pattern).replace(tzinfo=HOME_TIMEZONE)
        except ValueError:
            continue
    return None


def parse_arsht_date_range(value: str) -> datetime | None:
    value = clean_text(value).replace("–", "-")
    patterns = [
        r"([A-Za-z]+)\s+(\d{1,2})\s*-\s*(\d{1,2}),\s*(\d{4})",
        r"([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})",
    ]

    for pattern in patterns:
        match = re.search(pattern, value)
        if not match:
            continue
        month_name = match.group(1)
        day = int(match.group(2))
        year = int(match.group(match.lastindex))
        try:
            return datetime.strptime(f"{month_name} {day} {year}", "%B %d %Y").replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


def parse_fgo_datetime(value: str) -> datetime | None:
    return parse_local_datetime(
        value,
        [
            "%B %d, %Y at %I:%M %p",
            "%B %d, %Y | %I:%M %p",
            "%B %d, %Y",
        ],
    )


def parse_fgo_datetime_with_year(value: str, default_year: int | None = None) -> datetime | None:
    parsed = parse_fgo_datetime(value)
    if parsed:
        return parsed
    if default_year is None:
        return None
    normalized = clean_text(value)
    return parse_local_datetime(
        re.sub(rf"({FGO_MONTH_PATTERN}\s+\d{{1,2}})(?!,)", rf"\1, {default_year}", normalized, count=1, flags=re.I),
        [
            "%B %d, %Y at %I:%M %p",
            "%B %d, %Y",
        ],
    )


def parse_arsht_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)

    normalized = clean_text(str(value))
    if not normalized:
        return None

    parsed = parse_iso_datetime(normalized)
    if parsed:
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)

    for pattern in ("%m/%d/%Y %I:%M:%S %p", "%m/%d/%Y %H:%M:%S", "%m/%d/%Y"):
        try:
            return datetime.strptime(normalized, pattern).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return parse_arsht_date_range(normalized)


def extract_arsht_structured_event(page_html: str, url: str) -> dict[str, Any] | None:
    script_pattern = re.compile(
        r"<script[^>]+type=\"application/ld(?:\+|&#x2B;)json\"[^>]*>\s*(.*?)\s*</script>",
        re.I | re.S,
    )

    for match in script_pattern.finditer(page_html):
        raw_json = html.unescape(match.group(1)).strip()
        if not raw_json:
            continue
        try:
            payload = json.loads(raw_json)
        except json.JSONDecodeError:
            continue

        candidates: list[dict[str, Any]] = []
        if isinstance(payload, dict):
            if payload.get("@type") == "Event":
                candidates.append(payload)
            candidates.extend(item for item in payload.get("events", []) if isinstance(item, dict))
            candidates.extend(
                item for item in payload.get("@graph", []) if isinstance(item, dict) and item.get("@type") == "Event"
            )
        elif isinstance(payload, list):
            candidates.extend(item for item in payload if isinstance(item, dict) and item.get("@type") == "Event")

        for candidate in candidates:
            candidate_url = candidate.get("url") or url
            if candidate_url.rstrip("/") != url.rstrip("/"):
                continue
            starts_at = parse_arsht_datetime(candidate.get("startDate"))
            title = clean_text(candidate.get("name"))
            if not title or not starts_at:
                continue
            return candidate
    return None


def normalize_arsht_structured_event(raw_event: dict[str, Any], url: str, page_html: str) -> dict[str, Any] | None:
    starts_at = parse_arsht_datetime(raw_event.get("startDate"))
    title = clean_text(raw_event.get("name"))
    if not title or not starts_at:
        return None

    meta_description_match = re.search(r"<meta name=\"description\" content=\"([^\"]+)\"", page_html, re.I)
    description = clean_text(raw_event.get("description"))
    if not description:
        description = clean_text(meta_description_match.group(1) if meta_description_match else "")
    if not description:
        description = "Official Arsht Center event"

    image = raw_event.get("image")
    if isinstance(image, list):
        image = image[0] if image else None
    image = clean_text(image) or None
    if image and image.startswith("/"):
        image = f"https://www.arshtcenter.org{image}"

    location = raw_event.get("location") if isinstance(raw_event.get("location"), dict) else {}
    venue = clean_text(location.get("name")) or "Adrienne Arsht Center"

    offers = raw_event.get("offers")
    cost_display = None
    if isinstance(offers, dict):
        cost_display = format_cost(offers.get("lowPrice") or offers.get("price"), offers.get("highPrice"), offers.get("priceCurrency"))
    elif isinstance(offers, list):
        numeric_prices = []
        currency = None
        for offer in offers:
            if not isinstance(offer, dict):
                continue
            currency = currency or offer.get("priceCurrency")
            for key in ("lowPrice", "highPrice", "price"):
                value = offer.get(key)
                if isinstance(value, (int, float)):
                    numeric_prices.append(value)
                elif isinstance(value, str):
                    try:
                        numeric_prices.append(float(value))
                    except ValueError:
                        continue
        if numeric_prices:
            cost_display = format_cost(min(numeric_prices), max(numeric_prices), currency)

    if not cost_display:
        cost_match = re.search(r"\$[\d,]+(?:\s*-\s*\$[\d,]+)?", page_html)
        cost_display = cost_match.group(0) if cost_match else None

    category, tags = categorize_text(f"{title} {description}")
    if "arsht" not in tags:
        tags.append("arsht")

    return normalize_event(
        event_id=f"arsht:{slugify(url)}",
        source_event_id=url,
        title=title,
        venue=venue,
        source="Arsht Center",
        starts_at=starts_at,
        booking_url=clean_text(raw_event.get("url")) or url,
        category=category,
        image=image,
        description=description,
        cost_display=cost_display,
        tags=tags,
        travel_label=estimate_travel_label(source="Arsht Center", venue=venue),
    )


def normalize_event(
    *,
    event_id: str,
    title: str,
    venue: str,
    source: str,
    starts_at: datetime,
    booking_url: str,
    category: str,
    image: str | None,
    description: str,
    cost_display: str | None,
    tags: list[str],
    source_event_id: str | None = None,
    travel_label: str | None = None,
) -> dict[str, Any]:
    planning_window, planning_window_label = classify_planning_window(starts_at)
    return {
        "id": event_id,
        "source_event_id": source_event_id,
        "title": title,
        "venue": venue,
        "source": source,
        "starts_at": starts_at.isoformat(),
        "starts_at_display": starts_at.strftime("%b %d, %Y"),
        "booking_url": booking_url,
        "category": category,
        "image": image,
        "description": description,
        "cost_display": cost_display,
        "travel_label": travel_label or "Travel estimate coming soon",
        "tags": tags,
        "status": None,
        "planning_window": planning_window,
        "planning_window_label": planning_window_label,
    }


def extract_fgo_candidate_urls(page_html: str) -> list[str]:
    urls = []
    for match in FGO_LINK_PATTERN.finditer(page_html):
        url = clean_text(match.group(0)).rstrip("'")
        path = urllib.parse.urlparse(url).path.strip("/").lower()
        if path in FGO_EXCLUDED_PATHS:
            continue
        if path.endswith(("/program25-26", "/addendum")):
            continue
        if url not in urls:
            urls.append(url)
    return urls


def choose_fgo_image(page_html: str) -> str | None:
    patterns = [
        r'<meta\s+property="og:image"\s+content="([^"]+)"',
        r'<meta\s+name="twitter:image"\s+content="([^"]+)"',
        r'data-lazyload="//([^"]+wp-content/uploads[^"]+)"',
        r'data-depicter-src="([^"]+wp-content/uploads[^"]+)"',
        r'<img[^>]+src="([^"]+wp-content/uploads[^"]+)"',
    ]
    for pattern in patterns:
        match = re.search(pattern, page_html, re.I)
        if not match:
            continue
        image = clean_text(match.group(1))
        if image.startswith("//"):
            image = f"https:{image}"
        elif image.startswith("fgo.org/"):
            image = f"https://{image}"
        elif image.startswith("/"):
            image = urllib.parse.urljoin(FGO_HOME_URL, image)
        if image:
            return image
    return None


def extract_fgo_description(page_html: str) -> str:
    meta_match = re.search(r'<meta\s+name="description"\s+content="([^"]+)"', page_html, re.I)
    if meta_match:
        description = clean_text(meta_match.group(1))
        if description:
            return description

    paragraphs = [
        clean_text(match.group(1))
        for match in re.finditer(r"<p[^>]*>(.*?)</p>", page_html, re.I | re.S)
    ]
    for paragraph in paragraphs:
        if len(paragraph) < 60:
            continue
        lowered = paragraph.lower()
        if "buy tickets" in lowered or lowered.startswith(("miami", "broward", "director:", "conductor:")):
            continue
        if lowered.startswith("featuring "):
            continue
        return paragraph
    return "Official Florida Grand Opera event"


def extract_fgo_booking_url(page_html: str, fallback_url: str) -> str:
    patterns = [
        r'href="(https://tickets\.fgo\.org/[^"]+)"',
        r'href="(https://[^"]+givebutter\.com/[^"]+)"',
    ]
    for pattern in patterns:
        match = re.search(pattern, page_html, re.I)
        if match:
            return clean_text(match.group(1))
    return fallback_url


def get_fgo_page_title(page_html: str, url: str) -> str:
    patterns = [
        r'<meta\s+property="og:title"\s+content="([^"]+)"',
        r"<title>(.*?)</title>",
        r"<h1[^>]*>(.*?)</h1>",
    ]
    for pattern in patterns:
        match = re.search(pattern, page_html, re.I | re.S)
        if not match:
            continue
        title = clean_text(match.group(1))
        title = strip_suffix(title, "- Florida Grand Opera")
        if title:
            return title
    return clean_text(Path(urllib.parse.urlparse(url).path).stem.replace("-", " ")).title()


def extract_fgo_performances(page_html: str) -> list[dict[str, Any]]:
    performances: list[dict[str, Any]] = []

    for match in re.finditer(
        rf"({FGO_MONTH_PATTERN}\s+\d{{1,2}},\s+\d{{4}})\s*\|\s*([^<\n]+)",
        page_html,
        re.I,
    ):
        starts_at = parse_fgo_datetime(match.group(1))
        venue = clean_text(match.group(2))
        if starts_at and venue:
            performances.append({"starts_at": starts_at, "venue": venue})

    venue_matches = list(FGO_VENUE_PATTERN.finditer(page_html))
    date_matches = list(
        re.finditer(
            rf"{FGO_MONTH_PATTERN}\s+\d{{1,2}}(?:,\s+\d{{4}})?(?:\s*(?:at|\|)\s*\d{{1,2}}:\d{{2}}\s*[AP]M)?",
            page_html,
            re.I,
        )
    )
    current_year: int | None = None
    for date_match in date_matches:
        date_text = clean_text(date_match.group(0))
        explicit_year_match = re.search(r",\s*(\d{4})", date_text)
        if explicit_year_match:
            current_year = int(explicit_year_match.group(1))
        starts_at = parse_fgo_datetime_with_year(date_text, current_year)
        if not starts_at:
            continue
        venue = ""
        for venue_match in venue_matches:
            if venue_match.start() <= date_match.start() and date_match.start() - venue_match.start() < 1800:
                venue = clean_text(venue_match.group(1))
        if not venue and venue_matches:
            venue = clean_text(venue_matches[0].group(1))
        if venue:
            performances.append({"starts_at": starts_at, "venue": venue})

    unique: list[dict[str, Any]] = []
    seen = set()
    for performance in performances:
        key = (performance["starts_at"].isoformat(), canonicalize_venue_name(performance["venue"]))
        if key in seen:
            continue
        seen.add(key)
        unique.append(performance)
    return unique


def canonicalize_venue_name(venue: str) -> str:
    normalized = clean_text(venue).replace("–", "-")
    normalized = normalized.replace("  ", " ")
    return normalized


def normalize_fgo_events_from_page(url: str, page_html: str) -> list[dict[str, Any]]:
    title = get_fgo_page_title(page_html, url)
    booking_url = extract_fgo_booking_url(page_html, url)
    description = extract_fgo_description(page_html)
    image = choose_fgo_image(page_html)
    category, tags = categorize_text(f"{title} {description} Florida Grand Opera")
    if "fgo" not in tags:
        tags.append("fgo")

    events = []
    for performance in extract_fgo_performances(page_html):
        venue = canonicalize_venue_name(performance["venue"])
        starts_at = performance["starts_at"]
        events.append(
            normalize_event(
                event_id=f"fgo:{slugify(title)}:{starts_at.strftime('%Y%m%d%H%M')}:{slugify(venue)}",
                source_event_id=url,
                title=title,
                venue=venue,
                source="Florida Grand Opera",
                starts_at=starts_at,
                booking_url=booking_url,
                category=category,
                image=image,
                description=description,
                cost_display=None,
                tags=tags,
                travel_label=estimate_travel_label(source="Florida Grand Opera", venue=venue),
            )
        )
    return events


def merge_planning_status(events: list[dict[str, Any]], planning_state: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    for event in events:
        starts_at = parse_iso_datetime(event.get("starts_at"))
        planning_window, planning_window_label = canonicalize_planning_window(event.get("planning_window"), starts_at)
        event["planning_window"] = planning_window
        event["planning_window_label"] = planning_window_label
        stored = planning_state.get(event["id"], {})
        event["status"] = stored.get("status")
        event["date_added"] = stored.get("first_seen_at")
    return events


def fetch_ticketmaster_events() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    api_key = os.getenv("TICKETMASTER_API_KEY")
    if not api_key:
        return [], {
            "name": "Ticketmaster",
            "status": "unavailable",
            "message": "Set TICKETMASTER_API_KEY to enable live Ticketmaster events.",
        }

    start = now_utc()
    end = start + timedelta(days=120)
    base_params = {
        "apikey": api_key,
        "latlong": "25.9734,-80.1437",
        "radius": str(HOME_CONTEXT["radius_miles"]),
        "unit": "miles",
        "sort": "date,asc",
        "locale": "*",
        "size": "100",
        "startDateTime": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "endDateTime": end.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    segments = ["Arts & Theatre", "Music"]
    events_by_id: dict[str, dict[str, Any]] = {}
    pages_loaded = 0

    try:
        for segment in segments:
            page = 0
            total_pages = 1
            while page < total_pages and page < 8:
                params = urllib.parse.urlencode({**base_params, "segmentName": segment, "page": page})
                payload = http_get_json(f"{TICKETMASTER_API_URL}?{params}")
                page_info = payload.get("page", {})
                total_pages = max(1, int(page_info.get("totalPages", 1) or 1))
                pages_loaded += 1
                for raw_event in payload.get("_embedded", {}).get("events", []):
                    if not is_relevant_ticketmaster_event(raw_event):
                        continue
                    normalized = normalize_ticketmaster_event(raw_event)
                    if normalized:
                        events_by_id[normalized["id"]] = normalized
                page += 1
    except Exception as exc:  # pragma: no cover - network path
        return [], {
            "name": "Ticketmaster",
            "status": "error",
            "message": f"Ticketmaster fetch failed: {exc}",
        }

    return list(events_by_id.values()), {
        "name": "Ticketmaster",
        "status": "ready",
        "message": f"{len(events_by_id)} events loaded across {pages_loaded} page{'s' if pages_loaded != 1 else ''}",
    }


def normalize_ticketmaster_event(raw_event: dict[str, Any]) -> dict[str, Any] | None:
    name = clean_text(raw_event.get("name")) or ""
    embedded = raw_event.get("_embedded", {})
    venue_data = (embedded.get("venues") or [{}])[0]
    venue = clean_text(venue_data.get("name")) or "Venue TBD"
    start_info = raw_event.get("dates", {}).get("start", {})
    starts_at = parse_iso_datetime(
        start_info.get("dateTime") or start_info.get("localDate"),
        fallback_time=start_info.get("localTime"),
    )
    if not starts_at:
        return None

    details_text = " ".join(
        filter(
            None,
            [
                name,
                raw_event.get("info"),
                raw_event.get("pleaseNote"),
                " ".join(
                    classification.get("segment", {}).get("name", "")
                    + " "
                    + classification.get("genre", {}).get("name", "")
                    + " "
                    + classification.get("subGenre", {}).get("name", "")
                    for classification in raw_event.get("classifications", [])
                ),
            ],
        )
    )
    category, tags = categorize_text(details_text)

    if not tags and category == "Event":
        return None

    price_range = (raw_event.get("priceRanges") or [{}])[0]
    image = choose_ticketmaster_image(raw_event.get("images") or [])
    description = clean_text(raw_event.get("info") or raw_event.get("pleaseNote")) or "Ticketmaster event"

    return normalize_event(
        event_id=f"ticketmaster:{raw_event.get('id')}",
        source_event_id=raw_event.get("id"),
        title=name,
        venue=venue,
        source="Ticketmaster",
        starts_at=starts_at,
        booking_url=normalize_ticketmaster_booking_url(raw_event, venue),
        category=category,
        image=image,
        description=description,
        cost_display=format_cost(price_range.get("min"), price_range.get("max"), price_range.get("currency")),
        tags=tags + (["ticketmaster"] if "ticketmaster" not in tags else []),
        travel_label=estimate_travel_label(
            source="Ticketmaster",
            venue=venue,
            venue_latitude=float(venue_data.get("location", {}).get("latitude")) if venue_data.get("location", {}).get("latitude") else None,
            venue_longitude=float(venue_data.get("location", {}).get("longitude")) if venue_data.get("location", {}).get("longitude") else None,
        ),
    )


def choose_ticketmaster_image(images: list[dict[str, Any]]) -> str | None:
    if not images:
        return None
    ranked = sorted(images, key=lambda image: (image.get("width", 0) * image.get("height", 0)), reverse=True)
    return ranked[0].get("url")


def fetch_arsht_events() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    try:
        sitemap_xml = http_get(ARSHT_SITEMAP_URL)
        root = ET.fromstring(sitemap_xml)
    except Exception as exc:  # pragma: no cover - network path
        return [], {
            "name": "Arsht Center",
            "status": "error",
            "message": f"Arsht sitemap fetch failed: {exc}",
        }

    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    candidate_pages = []

    for url_node in root.findall("sm:url", namespace):
        loc = url_node.findtext("sm:loc", default="", namespaces=namespace)
        lastmod = url_node.findtext("sm:lastmod", default="", namespaces=namespace)
        if "/tickets/" not in loc or "/genre/" in loc:
            continue
        candidate_pages.append((loc, lastmod))

    candidate_pages.sort(key=lambda item: item[1], reverse=True)
    candidate_pages = candidate_pages[:28]

    events: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(fetch_arsht_event_page, url) for url, _ in candidate_pages]
        for future in as_completed(futures):
            event = future.result()
            if event:
                events.append(event)

    events.sort(key=lambda event: event["starts_at"])
    events = [event for event in events if parse_iso_datetime(event["starts_at"]) and parse_iso_datetime(event["starts_at"]) >= now_utc()]

    return events[:18], {
        "name": "Arsht Center",
        "status": "ready",
        "message": f"{len(events[:18])} events loaded",
    }


def fetch_arsht_event_page(url: str) -> dict[str, Any] | None:
    try:
        page_html = http_get(url)
    except Exception:
        return None

    structured_event = extract_arsht_structured_event(page_html, url)
    if structured_event:
        normalized = normalize_arsht_structured_event(structured_event, url, page_html)
        if normalized:
            return normalized

    title_match = re.search(r"<meta property=\"og:title\" content=\"([^\"]+)\"", page_html, re.I)
    title = clean_text(title_match.group(1) if title_match else "")
    if not title:
        h1_match = re.search(r"<h1>\s*(.*?)\s*</h1>", page_html, re.I | re.S)
        title = clean_text(h1_match.group(1) if h1_match else "")
    if not title:
        return None

    date_match = re.search(r"pdp-synopsis-info-date\">(.*?)</p>", page_html, re.I | re.S)
    starts_at = parse_arsht_date_range(date_match.group(1) if date_match else "")
    if not starts_at:
        return None

    synopsis_match = re.search(r"id=\"pdpSynopsis\">(.*?)</div>", page_html, re.I | re.S)
    description = clean_text(synopsis_match.group(1) if synopsis_match else "")
    if not description:
        description = "Official Arsht Center event"

    image_match = re.search(r"<source srcset=\"([^\"]+)\"", page_html, re.I)
    image = image_match.group(1).split("?")[0] if image_match else None
    if image and image.startswith("/"):
        image = f"https://www.arshtcenter.org{image}"

    venue_match = re.search(r"<h3>\s*Venue\s*</h3>\s*<p>\s*(.*?)\s*</p>", page_html, re.I | re.S)
    venue = clean_text(venue_match.group(1) if venue_match else "") or "Adrienne Arsht Center"

    cost_match = re.search(r"\$[\d,]+(?:\s*-\s*\$[\d,]+)?", page_html)
    cost_display = cost_match.group(0) if cost_match else None

    category, tags = categorize_text(f"{title} {description}")
    if "arsht" not in tags:
        tags.append("arsht")

    return normalize_event(
        event_id=f"arsht:{slugify(url)}",
        source_event_id=url,
        title=title,
        venue=venue,
        source="Arsht Center",
        starts_at=starts_at,
        booking_url=url,
        category=category,
        image=image,
        description=description,
        cost_display=cost_display,
        tags=tags,
        travel_label=estimate_travel_label(source="Arsht Center", venue=venue),
    )


def fetch_fgo_events() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    if os.getenv("FGO_SOURCE_ENABLED", "1").lower() in {"0", "false", "no"}:
        return [], {
            "name": "Florida Grand Opera",
            "status": "disabled",
            "message": "Florida Grand Opera source disabled by FGO_SOURCE_ENABLED.",
        }

    try:
        candidate_urls: list[str] = []
        for source_url in FGO_SEASON_URLS:
            page_html = http_get(source_url)
            for url in extract_fgo_candidate_urls(page_html):
                if url not in candidate_urls:
                    candidate_urls.append(url)
    except Exception as exc:  # pragma: no cover - network path
        return [], {
            "name": "Florida Grand Opera",
            "status": "error",
            "message": f"FGO source fetch failed: {exc}",
        }

    events_by_id: dict[str, dict[str, Any]] = {}
    fetched_pages = 0
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(http_get, url): url for url in candidate_urls[:18]}
        for future in as_completed(futures):
            url = futures[future]
            try:
                page_html = future.result()
            except Exception:
                continue
            fetched_pages += 1
            for event in normalize_fgo_events_from_page(url, page_html):
                starts_at = parse_iso_datetime(event["starts_at"])
                if not starts_at or starts_at < now_utc():
                    continue
                events_by_id[event["id"]] = event

    events = sorted(events_by_id.values(), key=lambda event: event["starts_at"])
    return events, {
        "name": "Florida Grand Opera",
        "status": "ready" if events else "warning",
        "message": f"{len(events)} events loaded across {fetched_pages} page{'s' if fetched_pages != 1 else ''}",
    }


def collect_events(*, force_refresh: bool = False) -> dict[str, Any]:
    with cache_lock:
        cached_timestamp = cache_state["timestamp"]
        cached_payload = cache_state["payload"]
        if (
            not force_refresh
            and cached_timestamp
            and cached_payload
            and (now_utc() - cached_timestamp).total_seconds() < CACHE_TTL_SECONDS
        ):
            return cached_payload

    observed_at = now_utc()
    planning_state = read_planning_state()
    ticketmaster_events, ticketmaster_source = fetch_ticketmaster_events()
    arsht_events, arsht_source = fetch_arsht_events()
    fgo_events, fgo_source = fetch_fgo_events()

    all_events = ticketmaster_events + arsht_events + fgo_events
    all_events.sort(key=lambda event: event["starts_at"])
    if preserve_event_first_seen(all_events, planning_state, observed_at=observed_at):
        write_planning_state(planning_state)
    merge_planning_status(all_events, planning_state)

    payload = {
        "generated_at": observed_at.isoformat(),
        "home_context": HOME_CONTEXT,
        "event_shape": {
            "id": "source-prefixed stable id",
            "title": "string",
            "venue": "string",
            "source": "Ticketmaster | Arsht Center | Florida Grand Opera",
            "starts_at": "ISO datetime",
            "date_added": "ISO datetime for first time Ceeg saw this normalized event id",
            "booking_url": "string",
            "category": "string",
            "image": "string | null",
            "description": "string",
            "cost_display": "string | null",
            "travel_label": "string travel estimate",
            "tags": ["ceeg-fit", "tags"],
            "status": "Considering | Booked | Completed | null",
            "planning_window": "this_week | next_10_days | this_month | next_month | book_ahead",
            "planning_window_label": "human readable label",
        },
        "sources": [ticketmaster_source, arsht_source, fgo_source],
        "events": all_events,
    }

    with cache_lock:
        cache_state["timestamp"] = now_utc()
        cache_state["payload"] = payload

    return payload


def reset_cache() -> None:
    with cache_lock:
        cache_state["timestamp"] = None
        cache_state["payload"] = None


def update_planning_state(payload: dict[str, Any]) -> tuple[dict[str, Any], int]:
    if payload.get("action") == "reset_not_interested":
        planning_state = read_planning_state()
        planning_state = {
            key: preserve_planning_metadata(value) if value.get("status") == "Not Interested" else value
            for key, value in planning_state.items()
            if value.get("status") != "Not Interested"
            or preserve_planning_metadata(value)
        }
        write_planning_state(planning_state)
        reset_cache()
        return {"ok": True, "action": "reset_not_interested"}, HTTPStatus.OK

    event_id = payload.get("event_id")
    event_ids = payload.get("event_ids") or []
    status = payload.get("status")
    if not event_id and not event_ids:
        return {"ok": False, "error": "event_id or event_ids is required"}, HTTPStatus.BAD_REQUEST

    planning_state = read_planning_state()
    target_ids = [event_id] if event_id else [candidate for candidate in event_ids if candidate]
    for target_id in target_ids:
        existing = planning_state.get(target_id, {})
        if status in ("Considering", "Booked", "Completed", "Not Interested"):
            planning_state[target_id] = {**existing, "status": status}
        else:
            preserved_metadata = preserve_planning_metadata(existing)
            if preserved_metadata:
                planning_state[target_id] = preserved_metadata
            else:
                planning_state.pop(target_id, None)

    write_planning_state(planning_state)
    reset_cache()
    return {"ok": True, "event_id": event_id, "event_ids": target_ids, "status": status}, HTTPStatus.OK


class CeegHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/api/events":
            force_refresh = urllib.parse.parse_qs(parsed.query).get("refresh") == ["1"]
            self.respond_json(collect_events(force_refresh=force_refresh))
            return

        if parsed.path in ("/", "/index.html"):
            self.serve_static("index.html", "text/html; charset=utf-8")
            return

        if parsed.path == "/styles.css":
            self.serve_static("styles.css", "text/css; charset=utf-8")
            return

        if parsed.path == "/app.js":
            self.serve_static("app.js", "application/javascript; charset=utf-8")
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def do_POST(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/api/planning":
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
        response_payload, status = update_planning_state(payload)
        self.respond_json(response_payload, status=status)

    def serve_static(self, filename: str, content_type: str) -> None:
        file_path = BASE_DIR / filename
        if not file_path.exists():
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return
        body = file_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def respond_json(self, payload: Any, *, status: int = HTTPStatus.OK) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return


def main() -> None:
    ensure_data_dir()
    server = ThreadingHTTPServer((HOST, PORT), CeegHandler)
    print(f"Ceeg running at http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Ceeg server")


if __name__ == "__main__":
    main()


try:
    from flask import Flask, jsonify, request, send_from_directory
except ImportError:  # pragma: no cover - optional deployment runtime
    Flask = None


if Flask:
    app = Flask(__name__, static_folder=None)

    @app.get("/")
    def flask_index() -> Any:
        return send_from_directory(BASE_DIR, "index.html")

    @app.get("/index.html")
    def flask_index_alias() -> Any:
        return send_from_directory(BASE_DIR, "index.html")

    @app.get("/styles.css")
    def flask_styles() -> Any:
        return send_from_directory(BASE_DIR, "styles.css", mimetype="text/css")

    @app.get("/app.js")
    def flask_app_js() -> Any:
        return send_from_directory(BASE_DIR, "app.js", mimetype="application/javascript")

    @app.get("/api/events")
    def flask_events() -> Any:
        force_refresh = request.args.get("refresh") == "1"
        return jsonify(collect_events(force_refresh=force_refresh))

    @app.post("/api/planning")
    def flask_planning() -> Any:
        response_payload, status = update_planning_state(request.get_json(silent=True) or {})
        return jsonify(response_payload), int(status)
