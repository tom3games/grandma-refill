#!/bin/zsh
# 切り絵の元画像を生成する。生画像はリポジトリの外（_art_raw/grandma-refill）に置く
cd ~/Desktop/claudecode/grandma-refill/art
G=~/.claude/skills/3d-homepage/scripts/codex_imagegen.py
R=~/Desktop/claudecode/_art_raw/grandma-refill
run() { python3 $G $R/$1.png prompts/$1.md ${@:2} --quality high --size 1536x1024 > logs/$1.log 2>&1 && echo "$1 ok" || echo "$1 FAIL" }
if [[ $1 == 1 ]]; then
  for k in gma_a kid uncle dog photo; do run $k & done; wait
else
  run gma_b $R/gma_a.png & run gma_c $R/gma_a.png & run aunt $R/photo.png & run food_a & run food_b & wait
fi
