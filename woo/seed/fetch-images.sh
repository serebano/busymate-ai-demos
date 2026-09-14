#!/usr/bin/env bash
# Fetch the PINNED Wikimedia Commons photographs listed in images.json and write
# IMAGE-CREDITS.md next to this script. Pinned by file name so a rebuild cannot
# quietly change the pictures under us.
#
#   bash fetch-images.sh [OUT_DIR]        # default: ./img
#
# Needs: curl, jq. Re-running is cheap: a file already on disk is not refetched.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-$HERE/img}"
API=https://commons.wikimedia.org/w/api.php
UA='BusymateDemoSeed/1.0 (https://demo.busymate.ai; admin@busymate.ai)'
WIDTH=$(jq -r '.width // 1400' "$HERE/images.json")

mkdir -p "$OUT"
CREDITS="$HERE/IMAGE-CREDITS.md"
{
  echo "# Image credits — Fernweh Supply Co. demo store"
  echo
  echo "Every photograph below comes from Wikimedia Commons under a free licence and is"
  echo "**pinned by file name** in \`images.json\`. They show generic objects: no real"
  echo "company's product and no identifiable person's face. Regenerate with"
  echo "\`bash fetch-images.sh\`."
  echo
  echo "| Used as | Commons file | Author | Licence |"
  echo "|---|---|---|---|"
} >"$CREDITS"

jq -r '.images[] | [.id, .file] | @tsv' "$HERE/images.json" | while IFS=$'\t' read -r id file; do
  meta=$(curl -sS -H "User-Agent: $UA" -G "$API" \
    --data-urlencode 'action=query' --data-urlencode 'format=json' \
    --data-urlencode "titles=$file" \
    --data-urlencode 'prop=imageinfo' \
    --data-urlencode 'iiprop=url|extmetadata|mime' \
    --data-urlencode "iiurlwidth=$WIDTH")

  if echo "$meta" | jq -e '.query.pages | to_entries[0].value.missing' >/dev/null 2>&1; then
    echo "FATAL: pinned Commons file not found: $file" >&2; exit 1
  fi
  thumb=$(echo "$meta" | jq -r '.query.pages | to_entries[0].value.imageinfo[0].thumburl')
  page=$(echo  "$meta" | jq -r '.query.pages | to_entries[0].value.imageinfo[0].descriptionurl')
  lic=$(echo   "$meta" | jq -r '.query.pages | to_entries[0].value.imageinfo[0].extmetadata.LicenseShortName.value // "?"')
  art=$(echo   "$meta" | jq -r '.query.pages | to_entries[0].value.imageinfo[0].extmetadata.Artist.value // "?"' \
        | sed -e 's/<[^>]*>//g' -e 's/&amp;/\&/g' -e 's/  */ /g' -e 's/^ *//' -e 's/ *$//')

  [ -s "$OUT/$id.jpg" ] || curl -sS -H "User-Agent: $UA" -o "$OUT/$id.jpg" "$thumb"
  printf '| `%s` | [%s](%s) | %s | %s |\n' "$id" "${file#File:}" "$page" "$art" "$lic" >>"$CREDITS"
  echo "ok  $id  <- $file  ($lic)"
done

echo
echo "images -> $OUT"
echo "credits -> $CREDITS"
