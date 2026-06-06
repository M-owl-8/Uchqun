#!/usr/bin/env bash
# Enforce project rule: work on `main` only.
# Blocks branch-creating git commands and any `git push` that targets
# a ref other than `main`. Reads PreToolUse JSON on stdin.
#
# To disable temporarily: remove or comment the PreToolUse Bash hook in
# .claude/settings.json. To override for a single command, the user can
# re-issue the command after editing that file.

set -e

cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null || true)
[ -z "$cmd" ] && exit 0

deny() {
  jq -c -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

# 1. Block branch creation.
#    Catches: git checkout -b X, git switch -c X, git branch <newname>,
#    git worktree add ... (creates a branch by default).
if echo "$cmd" | grep -qE '(^|[[:space:];&|`(])git[[:space:]]+(checkout[[:space:]]+-b\b|switch[[:space:]]+-c\b|worktree[[:space:]]+add\b)'; then
  deny "Project rule (.claude/settings.json): work on main only. Branch creation is blocked."
fi

# `git branch <name>` with an arg that isn't a flag and isn't an existing-ref
# inspection is also creation. Allow `git branch`, `git branch -a`, `git branch --show-current`, etc.
if echo "$cmd" | grep -qE '(^|[[:space:];&|`(])git[[:space:]]+branch[[:space:]]+[^-][^[:space:]]*([[:space:]]|$)'; then
  deny "Project rule (.claude/settings.json): work on main only. Creating a branch via 'git branch <name>' is blocked."
fi

# 2. Inspect `git push` — allow only pushes that target main.
if echo "$cmd" | grep -qE '(^|[[:space:];&|`(])git[[:space:]]+push\b'; then
  # Isolate the push invocation: from `git push` up to (but not including)
  # the next pipe, terminator, redirection, or end of line.
  push_seg=$(echo "$cmd" \
    | sed -E 's/.*\bgit[[:space:]]+push\b/git push/' \
    | sed -E 's/[[:space:]]+[0-9]*[<>][^[:space:]]*([[:space:]]+[^[:space:];&|]+)?//g' \
    | sed -E 's/[[:space:]]*[|;&].*//')
  # Allowed forms:
  #   git push
  #   git push --tags
  #   git push origin
  #   git push origin main         (and main:main / HEAD:main)
  #   git push -u origin main      (and --set-upstream variant)
  if echo "$push_seg" | grep -qE '^git[[:space:]]+push([[:space:]]+--tags)?[[:space:]]*$|^git[[:space:]]+push[[:space:]]+(-u[[:space:]]+|--set-upstream[[:space:]]+)?origin([[:space:]]+(main(:main)?|HEAD:main))?[[:space:]]*$'; then
    :  # allowed
  else
    deny "Project rule (.claude/settings.json): push directly to main only. Refusing push: $push_seg"
  fi
fi

exit 0
