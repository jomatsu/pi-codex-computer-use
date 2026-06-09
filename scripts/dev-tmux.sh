#!/usr/bin/env bash
set -euo pipefail

SESSION="${PI_CUA_TMUX_SESSION:-pi-cua-dev}"
LOG_FILE="${PI_CUA_LOG:-/tmp/pi-codex-computer-use.log}"

if tmux has-session -t "$SESSION" 2>/dev/null; then
  tmux attach-session -t "$SESSION"
  exit 0
fi

tmux new-session -d -s "$SESSION" -n dev

tmux send-keys -t "$SESSION:0.0" "printf 'Pi Codex Computer Use dev shell\\n'; npm run test" C-m

tmux split-window -h -t "$SESSION:0.0"
tmux send-keys -t "$SESSION:0.1" "PI_CUA_LOG='$LOG_FILE' npm run dev" C-m

tmux split-window -v -t "$SESSION:0.1"
tmux send-keys -t "$SESSION:0.2" "touch '$LOG_FILE'; tail -f '$LOG_FILE'" C-m

tmux split-window -v -t "$SESSION:0.0"
tmux send-keys -t "$SESSION:0.3" "printf 'Probe pane. Try: npm run probe:status\\n'" C-m

tmux select-pane -t "$SESSION:0.0"
tmux attach-session -t "$SESSION"
