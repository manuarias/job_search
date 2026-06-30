#!/usr/bin/env bash
#
# append-jds.sh — Deduplicate web_search results and append to pending_jds.json
#
# Reads a JSON array from stdin:
#   [{"url": "https://...", "title": "...", "company": "..."}, ...]
#
# For each entry:
#   1. Normalize URL: strip trailing slash, lowercase protocol+host
#   2. Compute SHA-256 hash of normalized URL
#   3. Check if urlHash already exists in pending_jds.json
#   4. If new: append with status=pending, timestamps
#   5. If duplicate: print "duplicate: <url>" to stderr, skip
#
# Atomic write: writes to .tmp, validates JSON, then mv to pending_jds.json
#
# Usage:
#   echo '[{"url":"...","title":"...","company":"..."}]' | bash append-jds.sh
#   bash append-jds.sh < input.json
#
# Environment:
#   JOB_SEARCH_PATH — repo root (default: script dir/../../../..)

set -euo pipefail

# ── Resolve repo root ───────────────────────────────────────────────────────
REPO_ROOT="${JOB_SEARCH_PATH:-$(cd "$(dirname "$0")/../../../.." && pwd)}"
STATE_FILE="$REPO_ROOT/pending_jds.json"

# ── Validate dependencies ───────────────────────────────────────────────────
if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required but not installed." >&2
  exit 1
fi

if ! command -v sha256sum &>/dev/null && ! command -v shasum &>/dev/null; then
  echo "ERROR: sha256sum or shasum is required but not installed." >&2
  exit 1
fi

# ── Help ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: bash append-jds.sh < input.json"
  echo ""
  echo "Reads a JSON array of JD search results from stdin."
  echo "Each entry must have: url, title, company (optional)."
  echo ""
  echo "Deduplicates by SHA-256 of normalized URL."
  echo "Appends new entries to \$JOB_SEARCH_PATH/pending_jds.json"
  echo ""
  echo "Environment:"
  echo "  JOB_SEARCH_PATH   Repo root (default: auto-detected from script location)"
  exit 0
fi

# ── Hash function ───────────────────────────────────────────────────────────
hash_url() {
  local url="$1"
  # Normalize: strip trailing slash
  url="${url%/}"
  # Normalize: lowercase protocol+host only (preserve path case)
  if [[ "$url" =~ ^(https?://)([^/]+)(.*) ]]; then
    local proto="${BASH_REMATCH[1]}"
    local host="${BASH_REMATCH[2]}"
    local path="${BASH_REMATCH[3]}"
    host=$(echo "$host" | tr '[:upper:]' '[:lower:]')
    url="${proto}${host}${path}"
  fi
  if command -v sha256sum &>/dev/null; then
    echo -n "$url" | sha256sum | cut -d' ' -f1
  else
    echo -n "$url" | shasum -a 256 | cut -d' ' -f1
  fi
}

# ── Read input from stdin ───────────────────────────────────────────────────
INPUT=$(cat)

# Validate: input must not be empty
if [[ -z "$INPUT" || "$INPUT" == "null" ]]; then
  echo "No input provided — nothing to append." >&2
  exit 0
fi

# Validate JSON
if ! echo "$INPUT" | jq empty 2>/dev/null; then
  echo "ERROR: input is not valid JSON." >&2
  exit 1
fi

# Ensure it's an array (wrap single object if needed)
if echo "$INPUT" | jq -e 'type == "array"' >/dev/null 2>&1; then
  : # already an array
elif echo "$INPUT" | jq -e 'type == "object"' >/dev/null 2>&1; then
  INPUT=$(echo "$INPUT" | jq -s '.')
else
  echo "ERROR: input must be a JSON array or object." >&2
  exit 1
fi

# ── Ensure state file exists ─────────────────────────────────────────────────
if [[ ! -f "$STATE_FILE" ]]; then
  echo "[]" > "$STATE_FILE"
fi

# ── Process each input entry ─────────────────────────────────────────────────
ADDED=0
DUPLICATE=0
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Temporary file for atomic write
TMP_FILE="$STATE_FILE.tmp"

# Read existing hashes into a bash array for fast lookup
EXISTING_HASHES=$(jq -r '.[].urlHash // empty' "$STATE_FILE" 2>/dev/null || echo "")

# Start with existing entries
cp "$STATE_FILE" "$TMP_FILE"

# Read input entries count
ENTRY_COUNT=$(echo "$INPUT" | jq 'length')

for ((i=0; i<ENTRY_COUNT; i++)); do
  URL=$(echo "$INPUT" | jq -r ".[$i].url // empty")
  if [[ -z "$URL" ]]; then
    echo "WARNING: entry $i has no url field — skipping." >&2
    continue
  fi

  TITLE=$(echo "$INPUT" | jq -r ".[$i].title // \"Unknown\"")

  # Detect source from URL
  SOURCE="unknown"
  if [[ "$URL" == *"greenhouse.io"* ]]; then SOURCE="greenhouse"; fi
  if [[ "$URL" == *"lever.co"* ]]; then SOURCE="lever"; fi
  if [[ "$URL" == *"myworkdayjobs.com"* ]]; then SOURCE="workday"; fi
  if [[ "$URL" == *"linkedin.com"* ]]; then SOURCE="linkedin"; fi

  # Compute hash
  URL_HASH=$(hash_url "$URL")

  # Check for duplicates
  if echo "$EXISTING_HASHES" | grep -qFx "$URL_HASH"; then
    echo "duplicate: $URL" >&2
    DUPLICATE=$((DUPLICATE + 1))
    continue
  fi

  # Build new entry and append to temp file
  NEW_ENTRY=$(jq -n \
    --arg url "$URL" \
    --arg urlHash "$URL_HASH" \
    --arg title "$TITLE" \
    --arg source "$SOURCE" \
    --arg addedAt "$NOW" \
    '{url: $url, urlHash: $urlHash, title: $title, source: $source, status: "pending", addedAt: $addedAt, processedAt: null}')

  # Append to temp file
  jq --argjson entry "$NEW_ENTRY" '. + [$entry]' "$TMP_FILE" > "${TMP_FILE}.new"
  mv "${TMP_FILE}.new" "$TMP_FILE"

  # Add to existing hashes for dedup within this batch
  EXISTING_HASHES="$EXISTING_HASHES"$'\n'"$URL_HASH"

  ADDED=$((ADDED + 1))
done

# ── Validate and commit ─────────────────────────────────────────────────────
if [[ $ADDED -gt 0 ]]; then
  # Validate temp file is valid JSON
  if ! jq empty "$TMP_FILE" 2>/dev/null; then
    echo "ERROR: temp file JSON is invalid — not committing." >&2
    rm -f "$TMP_FILE"
    exit 1
  fi
  # Atomic rename
  mv "$TMP_FILE" "$STATE_FILE"
  echo "$ADDED nuevas ofertas agregadas ($DUPLICATE duplicados ignorados)." >&2
else
  # No changes — clean up temp file
  rm -f "$TMP_FILE"
  echo "0 nuevas ofertas ($DUPLICATE duplicados ignorados)." >&2
fi

exit 0
