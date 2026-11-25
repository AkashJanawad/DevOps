# NebulaStream Mobile LLM

This folder is the Termux side of the NebulaStream chatbot. The website talks to your phone through `ngrok`, and your phone forwards those requests into `llama-server`.

## 1. Install Termux correctly

Use the current Termux app from F-Droid or the Termux GitHub releases. The Play Store build is outdated.

## 2. Install packages in Termux

```bash
pkg update && pkg upgrade -y
pkg install -y git cmake make clang python wget tar
pip install --upgrade pip
pip install flask requests huggingface_hub
```

## 3. Build `llama.cpp`

```bash
cd $HOME
git clone https://github.com/ggml-org/llama.cpp.git
cd llama.cpp
cmake -B build
cmake --build build --config Release -j2 --target llama-server
```

## 4. Download a small 0.5B model

This project is tuned for `Qwen2.5-0.5B-Instruct-GGUF`, which is small enough to be realistic on a phone.

```bash
mkdir -p $HOME/nebulastream-mobile/models
cd $HOME/nebulastream-mobile/models
huggingface-cli download Qwen/Qwen2.5-0.5B-Instruct-GGUF qwen2.5-0.5b-instruct-q5_k_m.gguf --local-dir . --local-dir-use-symlinks False
```

If your phone is weak on RAM, use the smaller `q4_k_m` or `q3_k_m` file from the same model page instead.

## 5. Copy the bridge script to Termux

Copy [nebula_bridge.py](./nebula_bridge.py) and [start-nebula-mobile.sh](./start-nebula-mobile.sh) into `$HOME/nebulastream-mobile/`.

## 6. Install and configure ngrok

1. Create a free ngrok account.
2. Download the Android/Linux ngrok agent from the official docs: `https://ngrok.com/docs/guides/device-gateway/linux/`
3. In Termux, place the `ngrok` binary in `$PREFIX/bin/ngrok` and make it executable:

```bash
chmod +x $PREFIX/bin/ngrok
```

4. Add your auth token once:

```bash
ngrok config add-authtoken YOUR_NGROK_TOKEN
```

## 7. Start everything

```bash
cd $HOME/nebulastream-mobile
bash start-nebula-mobile.sh
```

That script starts:

- `llama-server` on `127.0.0.1:8080`
- the Nebula bridge on `0.0.0.0:8787`
- `ngrok http 8787`

## 8. Connect the website

When ngrok starts, copy the HTTPS forwarding URL. In the website chatbot settings, paste:

```text
https://your-ngrok-url.ngrok-free.app
```

The website stores that URL locally, so updating the phone endpoint later is just one paste-and-save action.

## 9. If the phone is off

The website shows `Phone model offline` and keeps retrying every 15 seconds. Once you relaunch the script in Termux, the chatbot reconnects.

## Recommended phone settings

- Disable battery optimization for Termux.
- Keep Wi-Fi/mobile data on while using ngrok.
- Keep at least 3 to 4 GB free storage for the model and binaries.

## Useful references

- `llama-server` API: `https://github.com/ggml-org/llama.cpp`
- Qwen 0.5B GGUF: `https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF`
- ngrok install docs: `https://ngrok.com/docs/guides/device-gateway/linux/`
