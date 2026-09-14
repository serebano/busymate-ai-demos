#!/usr/bin/env bash
# Shared image pipeline for every demo (owner bar 2026-09-11: demos must look
# like real, polished projects — real/generated imagery, optimized).
#
#   sites/_shared/img-optimize.sh <manifest.tsv> <out-dir>
#
# manifest.tsv columns (tab-separated, `#` comments allowed):
#   <src-file>  <out-basename>  <widths e.g. 480,960>  <aspect e.g. 4:5 | keep>  [focus x,y in 0..1]
#
# Produces <out-dir>/<basename>-<w>.webp for every width (cwebp -q 78, center/
# focus crop to the aspect first). Keep the ORIGINAL out of the repo; commit
# only the webp outputs + the CREDITS.md the demo writes next to them.
set -euo pipefail
manifest="${1:?manifest.tsv}"; out="${2:?out-dir}"
mkdir -p "$out"
command -v cwebp >/dev/null || { echo "cwebp missing (brew install webp)" >&2; exit 1; }
tmp=$(mktemp -d)
while IFS=$'\t' read -r src base widths aspect focus; do
  [ -z "$src" ] && continue; case "$src" in \#*) continue;; esac
  [ -f "$src" ] || { echo "missing $src" >&2; exit 1; }
  IFS=',' read -r fx fy <<< "${focus:-0.5,0.5}"
  mkdir -p "$tmp/$(dirname "$base")" "$out/$(dirname "$base")"
  python3 - "$src" "$tmp/$base.png" "$aspect" "${fx:-0.5}" "${fy:-0.5}" <<'PY'
import sys; from PIL import Image, ImageOps
src,dst,aspect,fx,fy=sys.argv[1],sys.argv[2],sys.argv[3],float(sys.argv[4]),float(sys.argv[5])
im=ImageOps.exif_transpose(Image.open(src)).convert("RGB")
if aspect!="keep":
    aw,ah=[float(x) for x in aspect.split(":")]; w,h=im.size; t=aw/ah
    if w/h>t: nw=int(h*t); x=int((w-nw)*fx); im=im.crop((x,0,x+nw,h))
    else: nh=int(w/t); y=int((h-nh)*fy); im=im.crop((0,y,w,y+nh))
im.save(dst)
PY
  for w in ${widths//,/ }; do
    cwebp -quiet -q 78 -resize "$w" 0 "$tmp/$base.png" -o "$out/$base-$w.webp"
  done
  echo "$base: ${widths}"
done < "$manifest"
rm -rf "$tmp"
