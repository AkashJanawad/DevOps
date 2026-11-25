#!/data/data/com.termux/files/usr/bin/bash
set -e

WORKSPACE_DIR="$HOME/nebulastream-mobile"
MODEL_DIR="$WORKSPACE_DIR/models"
MODEL_FILE="$MODEL_DIR/qwen2.5-0.5b-instruct-q5_k_m.gguf"
LLAMA_CPP_DIR="$HOME/llama.cpp"
LLAMA_SERVER_BIN="$LLAMA_CPP_DIR/build/bin/llama-server"
BRIDGE_FILE="$WORKSPACE_DIR/nebula_bridge.py"

if [ ! -f "$MODEL_FILE" ]; then
  echo "Model not found: $MODEL_FILE"
  exit 1
fi

if [ ! -x "$LLAMA_SERVER_BIN" ]; then
  echo "llama-server binary not found: $LLAMA_SERVER_BIN"
  exit 1
fi

if [ ! -f "$BRIDGE_FILE" ]; then
  echo "Bridge file not found: $BRIDGE_FILE"
  exit 1
fi

mkdir -p "$WORKSPACE_DIR/logs"

echo "Starting llama-server on 127.0.0.1:8080"
"$LLAMA_SERVER_BIN" \
  -m "$MODEL_FILE" \
  --host 127.0.0.1 \
  --port 8080 \
  -c 4096 \
  -ngl 0 > "$WORKSPACE_DIR/logs/llama-server.log" 2>&1 &
LLAMA_PID=$!

sleep 5

echo "Starting Nebula bridge on 0.0.0.0:8787"
python "$BRIDGE_FILE" > "$WORKSPACE_DIR/logs/nebula-bridge.log" 2>&1 &
BRIDGE_PID=$!

sleep 2

cleanup() {
  echo "Stopping mobile services"
  kill "$BRIDGE_PID" 2>/dev/null || true
  kill "$LLAMA_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "Starting ngrok on port 8787"
ngrok http 8787
