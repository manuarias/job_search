#!/usr/bin/env bash
#
# batch-process.sh — Process pending JDs through the CV pipeline
#
# Reads pending_jds.json, filters status=pending entries.
# For each pending JD:
#   1. Calls runPipeline(url, {lang:'es'}) via node
#   2. Evaluates score threshold: >= 75 AND matchLevel != 'skip' → processed
#   3. On qualify: generates PDF via build-pdf.js
#   4. On skip: marks status=skipped
#   5. On error: marks status=error, logs to stderr
#   6. Atomic state update after each JD
#
# Outputs summary JSON to stdout.
#
# Usage:
#   bash batch-process.sh
#
# Environment:
#   JOB_SEARCH_PATH — repo root (default: script dir/../../../..)

set -euo pipefail

# ── Resolve repo root ───────────────────────────────────────────────────────
REPO_ROOT="${JOB_SEARCH_PATH:-$(cd "$(dirname "$0")/../../../.." && pwd)}"
STATE_FILE="$REPO_ROOT/pending_jds.json"

# ── Validate dependencies ───────────────────────────────────────────────────
if ! command -v jq &>/dev/null; then
  echo '{"error":"jq is required but not installed."}' >&2
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo '{"error":"node is required but not installed."}' >&2
  exit 1
fi

# ── Help ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: bash batch-process.sh"
  echo ""
  echo "Processes all pending JDs in \$JOB_SEARCH_PATH/pending_jds.json"
  echo "through the CV optimization pipeline (runPipeline)."
  echo ""
  echo "For each qualifying JD (score >= 75, matchLevel != skip):"
  echo "  - Generates optimized CV, cover letter, and PDF"
  echo "  - Marks status=processed"
  echo ""
  echo "For low-score or skip JDs: marks status=skipped"
  echo "For errors (inaccessible URL, pipeline failure): marks status=error"
  echo ""
  echo "Outputs summary JSON to stdout with per-JD results."
  echo ""
  echo "Environment:"
  echo "  JOB_SEARCH_PATH   Repo root (default: auto-detected)"
  exit 0
fi

# ── Ensure state file exists ─────────────────────────────────────────────────
if [[ ! -f "$STATE_FILE" ]]; then
  echo '{"summary":{"total":0,"processed":0,"skipped":0,"error":0},"results":[]}'
  exit 0
fi

# ── Collect pending URLs once ─────────────────────────────────────────────────
# Build a newline-separated list of pending JD index + urlHash pairs
PENDING_LIST=$(jq -r 'to_entries | map(select(.value.status == "pending")) | .[] | "\(.key) \(.value.urlHash) \(.value.url // "") \(.value.title // "Unknown")"' "$STATE_FILE")
TOTAL=$(echo "$PENDING_LIST" | grep -c . || echo 0)

if [[ -z "$PENDING_LIST" || "$TOTAL" -eq 0 ]]; then
  echo "no hay ofertas pendientes" >&2
  echo '{"summary":{"total":0,"processed":0,"skipped":0,"error":0},"results":[]}'
  exit 0
fi

# ── Results accumulator ──────────────────────────────────────────────────────
RESULTS='[]'
PROCESSED=0
SKIPPED=0
ERRORS=0
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ── Update a single JD's status in the state file (atomic) ───────────────────
update_status() {
  local url_hash="$1"
  local new_status="$2"
  local TMP="$STATE_FILE.tmp"

  jq --arg h "$url_hash" --arg s "$new_status" --arg t "$NOW" \
    'map(if .urlHash == $h then .status = $s | .processedAt = $t else . end)' \
    "$STATE_FILE" > "$TMP"

  if jq empty "$TMP" 2>/dev/null; then
    mv "$TMP" "$STATE_FILE"
  else
    echo "WARNING: failed to validate temp state file — keeping original." >&2
    rm -f "$TMP"
  fi
}

# ── Per-JD processing loop ───────────────────────────────────────────────────
while IFS=' ' read -r IDX URL_HASH URL TITLE; do
  [[ -z "$URL" ]] && continue

  echo "Procesando: $TITLE ($URL)" >&2

  # ── Call runPipeline ─────────────────────────────────────────────────────
  PIPELINE_RESULT=""
  set +e
  PIPELINE_RESULT=$(node -e "
    const {runPipeline} = require('$REPO_ROOT/lib/hermes');
    runPipeline(process.argv[1], {lang:'es'})
      .then(r => console.log(JSON.stringify({
        status: 'ok',
        score: r.score,
        matchLevel: r.matchLevel,
        ref: r.ref,
        files: r.files || [],
        reportCard: r.reportCard || '',
        dir: r.dir || ''
      })))
      .catch(e => console.log(JSON.stringify({
        status: 'error',
        message: e.message || String(e)
      })));
  " -- "$URL" 2>/dev/null)
  NODE_EXIT=$?
  set -e

  # ── Parse result ────────────────────────────────────────────────────────
  PIPELINE_STATUS=$(echo "$PIPELINE_RESULT" | jq -r '.status // "error"')
  SCORE=$(echo "$PIPELINE_RESULT" | jq -r '.score // 0')
  MATCH_LEVEL=$(echo "$PIPELINE_RESULT" | jq -r '.matchLevel // "skip"')
  REF=$(echo "$PIPELINE_RESULT" | jq -r '.ref // ""')
  FILES=$(echo "$PIPELINE_RESULT" | jq -r '.files // []')
  REPORT_CARD=$(echo "$PIPELINE_RESULT" | jq -r '.reportCard // ""')
  ERROR_MSG=$(echo "$PIPELINE_RESULT" | jq -r '.message // ""')

  if [[ "$PIPELINE_STATUS" == "error" || "$NODE_EXIT" -ne 0 ]]; then
    echo "  ❌ Error: ${ERROR_MSG:-pipeline failed}" >&2
    if [[ -n "$URL_HASH" ]]; then
      update_status "$URL_HASH" "error"
    fi
    ERRORS=$((ERRORS + 1))

    ERROR_RESULT=$(jq -n \
      --arg url "$URL" \
      --arg title "$TITLE" \
      --arg status "error" \
      --arg error "${ERROR_MSG:-pipeline failed}" \
      '{url: $url, title: $title, status: $status, error: $error}')
    RESULTS=$(echo "$RESULTS" | jq --argjson r "$ERROR_RESULT" '. + [$r]')
    continue
  fi

  # ── Score threshold decision ─────────────────────────────────────────────
  SCORE_INT=$(echo "$SCORE" | cut -d'.' -f1)
  QUALIFIES=false
  if [[ "$SCORE_INT" -ge 75 ]] && [[ "$MATCH_LEVEL" != "skip" ]]; then
    QUALIFIES=true
  fi

  if $QUALIFIES; then
    echo "  ✅ Score: $SCORE ($MATCH_LEVEL) — califica" >&2

    # Generate PDF
    PDF_OK=false
    set +e
    node "$REPO_ROOT/scripts/build-pdf.js" "$REF" --lang es 2>/dev/null
    PDF_EXIT=$?
    set -e
    if [[ $PDF_EXIT -eq 0 ]]; then
      PDF_OK=true
      FILES=$(echo "$FILES" | jq '. + ["arias_emanuel-es-'"$REF"'.pdf"]')
    else
      echo "  ⚠️  PDF generation failed for $REF" >&2
    fi

    if [[ -n "$URL_HASH" ]]; then
      update_status "$URL_HASH" "processed"
    fi
    PROCESSED=$((PROCESSED + 1))

    RESULT_ENTRY=$(jq -n \
      --arg url "$URL" \
      --arg title "$TITLE" \
      --arg status "processed" \
      --arg ref "$REF" \
      --argjson score "$SCORE" \
      --arg matchLevel "$MATCH_LEVEL" \
      --arg reportCard "$REPORT_CARD" \
      --argjson files "$FILES" \
      --argjson pdfOk "$PDF_OK" \
      '{url: $url, title: $title, status: $status, ref: $ref, score: $score, matchLevel: $matchLevel, reportCard: $reportCard, files: $files, pdfGenerated: $pdfOk}')
  else
    echo "  ⏭️  Score: $SCORE ($MATCH_LEVEL) — descartada" >&2

    if [[ -n "$URL_HASH" ]]; then
      update_status "$URL_HASH" "skipped"
    fi
    SKIPPED=$((SKIPPED + 1))

    RESULT_ENTRY=$(jq -n \
      --arg url "$URL" \
      --arg title "$TITLE" \
      --arg status "skipped" \
      --argjson score "$SCORE" \
      --arg matchLevel "$MATCH_LEVEL" \
      '{url: $url, title: $title, status: $status, score: $score, matchLevel: $matchLevel}')
  fi

  RESULTS=$(echo "$RESULTS" | jq --argjson r "$RESULT_ENTRY" '. + [$r]')
done <<< "$PENDING_LIST"

# ── Build summary ────────────────────────────────────────────────────────────
SUMMARY=$(jq -n \
  --argjson total "$TOTAL" \
  --argjson processed "$PROCESSED" \
  --argjson skipped "$SKIPPED" \
  --argjson error "$ERRORS" \
  --argjson results "$RESULTS" \
  '{summary: {total: $total, processed: $processed, skipped: $skipped, error: $error}, results: $results}')

echo "$SUMMARY" | jq .
