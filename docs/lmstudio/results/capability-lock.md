# LM Studio Capability Lock

Generated: 2026-05-19T11:16:30.928Z
Base URL: `http://127.0.0.1:1234`

## Locked Runtime Facts
- LM Studio app version: `0.4.12+1` (build `0.4.12+1`)
- LMS CLI: `/Users/alijanjua/.lmstudio/bin/lms`
- CLI commit: `CLI commit: 0b2a176`
- Server status: `The server is running on port 1234.`

## Runtime Engines
```
LLM ENGINE                                         SELECTED    MODEL FORMAT
llama.cpp-mac-arm64-apple-metal-advsimd@2.14.0        ✓            GGUF    
llama.cpp-mac-arm64-apple-metal-advsimd@2.13.0                     GGUF    
llama.cpp-mac-arm64-apple-metal-advsimd@2.12.0                     GGUF    
llama.cpp-mac-arm64-apple-metal-advsimd@2.10.1                     GGUF    
llama.cpp-mac-arm64-apple-metal-advsimd@2.8.0                      GGUF    
mlx-llm-mac-arm64-apple-metal-advsimd@1.3.0                        MLX     
mlx-llm-mac-arm64-apple-metal-nax-advsimd@1.6.0       ✓            MLX     
mlx-llm-mac-arm64-apple-metal-nax-advsimd@1.5.0                    MLX     
mlx-llm-mac-arm64-apple-metal-nax-advsimd@1.4.0                    MLX     
mlx-llm-mac-arm64-apple-metal-nax-advsimd@1.3.0                    MLX
```

## Hardware Survey
```
Survey by llama.cpp-mac-arm64-apple-metal-advsimd (2.14.0)
GPU/ACCELERATORS               VRAM     
Apple M5 (Metal, Integrated)   11.84 GiB

CPU: ARM64 (AdvSIMD)
RAM: 16.00 GiB
```

## Local LLM Inventory
- Count: **3**
- `qwen/qwen3-14b` | format=`safetensors` | params=`14B` | max_ctx=`40960`
- `google/gemma-3-12b` | format=`safetensors` | params=`12B` | max_ctx=`131072`
- `google/gemma-3-4b` | format=`safetensors` | params=`4B` | max_ctx=`131072`

## MoE/Advanced Load Option Probe
- Probe model: `qwen/qwen3-14b`
- Load attempted: **yes**
- This probe checks what LM Studio accepts/echoes for keys related to:
  - expert control (`num_experts`)
  - KV cache quantization
  - mmap and memory residency behavior

```json
{
  "attempted": true,
  "model": "qwen/qwen3-14b",
  "strictRequest": {
    "model": "qwen/qwen3-14b",
    "context_length": 8192,
    "echo_load_config": true,
    "flash_attention": true,
    "num_experts": 8,
    "keep_model_in_memory": true,
    "llama_k_cache_quantization_type": "q4_0",
    "llama_v_cache_quantization_type": "q4_0",
    "try_mmap": true
  },
  "strictResponse": {
    "ok": false,
    "status": 400,
    "body": {
      "error": {
        "message": "Unrecognized key(s) in object: 'keep_model_in_memory', 'llama_k_cache_quantization_type', 'llama_v_cache_quantization_type', 'try_mmap'",
        "type": "invalid_request",
        "code": "unrecognized_keys"
      }
    }
  },
  "compatibilityRequest": {
    "model": "qwen/qwen3-14b",
    "context_length": 8192,
    "echo_load_config": true,
    "flash_attention": true,
    "num_experts": 8
  },
  "compatibilityResponse": {
    "ok": true,
    "status": 200,
    "body": {
      "type": "llm",
      "instance_id": "qwen/qwen3-14b",
      "load_time_seconds": 18.435,
      "status": "loaded",
      "load_config": {
        "context_length": 8192,
        "parallel": 4
      }
    }
  }
}
```

See machine-readable output: `docs/lmstudio/results/capability-lock.json`
