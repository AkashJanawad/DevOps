from flask import Flask, jsonify, request
import requests

LLAMA_BASE_URL = "http://127.0.0.1:8080"
REQUEST_TIMEOUT_SECONDS = 120

app = Flask(__name__)


@app.after_request
def apply_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/health", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return ("", 204)

    try:
        upstream_response = requests.get(
            f"{LLAMA_BASE_URL}/health", timeout=5
        )
        upstream_response.raise_for_status()
        return jsonify(
            {
                "status": "online",
                "model": "Qwen2.5-0.5B-Instruct",
                "message": "Mobile model is ready.",
            }
        )
    except requests.RequestException:
        return (
            jsonify(
                {
                    "status": "offline",
                    "message": "llama-server is not reachable on the phone.",
                }
            ),
            503,
        )


@app.route("/v1/chat/completions", methods=["POST", "OPTIONS"])
def chat_completions():
    if request.method == "OPTIONS":
        return ("", 204)

    payload = request.get_json(silent=True) or {}

    try:
        upstream_response = requests.post(
            f"{LLAMA_BASE_URL}/v1/chat/completions",
            json=payload,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        return (
            upstream_response.text,
            upstream_response.status_code,
            {"Content-Type": "application/json"},
        )
    except requests.RequestException as exc:
        return (
            jsonify(
                {
                    "error": "Mobile LLM unreachable",
                    "details": str(exc),
                }
            ),
            503,
        )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8787)
