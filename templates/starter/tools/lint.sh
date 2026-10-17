#!/usr/bin/env bash
# ./tools/lint.sh [files or dirs...]   default: src docs
# 1) node --check  2) U+FFFD mojibake (bytes EF BF BD)  3) nondeterministic APIs in src (Math.random / Date.now / new Date / performance.now)
cd "$(dirname "$0")/.."; T=("$@"); [ ${#T[@]} -eq 0 ] && T=(src docs tools)
fail=0
while IFS= read -r f; do node --check "$f" 2>/tmp/lint_err || { echo "SYNTAX $f"; cat /tmp/lint_err | head -5; fail=1; }; done < <(find "${T[@]}" -name '*.js' -not -path '*/node_modules/*' 2>/dev/null)
if grep -rlP '\xEF\xBF\xBD' "${T[@]}" --include='*.js' --include='*.mjs' --include='*.md' --include='*.json' 2>/dev/null; then echo "^^ U+FFFD mojibake found"; grep -rnP '\xEF\xBF\xBD' "${T[@]}" --include='*.js' --include='*.md' --include='*.json' | head -20; fail=1; fi
if grep -rnE 'Math\.random\(|Date\.now\(|new Date\(|performance\.now\(' $(printf '%s\n' "${T[@]}" | grep -E '^src') --include='*.js' 2>/dev/null | grep -v 'src/main.js'; then echo "^^ nondeterministic API in src"; fail=1; fi
[ $fail -eq 0 ] && echo "lint OK" || { echo "lint FAILED"; exit 1; }
