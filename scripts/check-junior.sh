#!/usr/bin/env bash
# Checks the junior dev's work before Deepak reads it. Every line must say ok.
# Usage: scripts/check-junior.sh <commit at handoff> [allowed paths regex]
set -u
base="${1:?usage: scripts/check-junior.sh <commit at handoff> [allowed paths regex]}"
allowed="${2:-^(lib/|docs/flow\.md$)}"
fail=0

if git diff --quiet "$base" -- tests/ && [ -z "$(git ls-files --others --exclude-standard tests/)" ]; then
  echo "ok   tests/ unchanged since $base"
else
  echo "FAIL tests/ changed since $base"; git diff --stat "$base" -- tests/; fail=1
fi

changed=$( { git diff --name-only "$base"; git ls-files --others --exclude-standard; } | sort -u | grep -Ev "$allowed" )
if [ -z "$changed" ]; then echo "ok   only allowed paths touched"; else echo "FAIL changed outside allowed paths:"; echo "$changed"; fail=1; fi

if npx vitest run >/dev/null 2>&1; then echo "ok   vitest"; else echo "FAIL vitest"; fail=1; fi
if npx tsc --noEmit >/dev/null 2>&1; then echo "ok   tsc"; else echo "FAIL tsc"; fail=1; fi

if git log "$base"..HEAD --format=%B | grep -qiE "co-authored-by|generated with"; then echo "FAIL a commit message has an AI trailer"; fail=1; else echo "ok   commit messages"; fi
if git log "$base"..HEAD --format='%an <%ae>' | grep -vqx 'Deepak <fansforever711@gmail.com>'; then echo "FAIL a commit is not authored by Deepak"; fail=1; else echo "ok   commit author"; fi

exit $fail
