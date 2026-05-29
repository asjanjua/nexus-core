# LM Studio Feasibility + MoE Optimization (Apple M5 16GB)

This runbook implements a **hybrid runtime strategy**:
- **Primary path:** LM Studio (local server + native `/api/v1/*` API)
- **Fallback path:** direct `llama.cpp` only when LM Studio cannot expose a required control

## Why this plan on 16GB unified memory
- Large MoE model files can exceed practical resident RAM on 16GB systems.
- For local stability, this workflow **does not force `--no-mmap`** during large MoE phases.
- Start with already installed local models to establish baseline TTFT/TPS and swap behavior.

## Implemented tooling
- `npm run lmstudio:capability`
  - Locks runtime facts, local inventory, and advanced load-option probe.
  - Output:
    - `docs/lmstudio/results/capability-lock.json`
    - `docs/lmstudio/results/capability-lock.md`

- `npm run lmstudio:benchmark`
  - Baseline benchmark on local models.
  - Measures:
    - TTFT (streaming)
    - throughput tokens/sec (non-stream usage tokens)
    - swap deltas before/after
    - 20-minute stability loop (success/failure + latency samples)
  - Output:
    - `docs/lmstudio/results/baseline-benchmark.json`
    - `docs/lmstudio/results/baseline-benchmark.md`

- `npm run lmstudio:moe-probe`
  - Probes 30B-class MoE keys with `lms load --estimate-only`.
  - Output:
    - `docs/lmstudio/results/moe-probe.txt`

- `npm run lmstudio:all`
  - Runs the full sequence.

## Baseline policy (implemented defaults)
- Flash Attention: enabled in load payload
- Speculative decoding: disabled for MoE parity
- Context ladder: `8k -> 16k -> 32k` (skips values above model max context)
- Memory gate heuristic:
  - track swap used MB start/end and per-run delta
  - fail interpretation if swap continually climbs under repeated requests

## MoE phase in LM Studio
Use the MoE probe output to pick the first available 30B/35B-class target. For the first MoE load:
- Start with conservative GPU offload
- Keep mmap allowed
- Enable KV cache quantization if exposed
- Disable speculative decoding
- If available in runtime options, force experts to CPU (`num_experts`/expert controls)

## Direct `llama.cpp` fallback template
Use this only when LM Studio cannot expose required controls or becomes unstable.

```bash
# Example template only. Replace model path and expert count.
llama-cli \
  -m /path/to/model.gguf \
  -c 8192 \
  --n-cpu-moe 999 \
  --mlock \
  --cache-type-k q4_0 \
  --cache-type-v q4_0
```

Notes:
- Keep mmap enabled by default on 16GB systems unless a smaller quant comfortably fits RAM.
- Use `--mlock` only when memory headroom is confirmed.

## Acceptance gates
1. **Feasibility gate**
   - Runtime facts locked + load-option probe captured.
2. **Performance gate**
   - Baseline benchmark results recorded on at least two local models.
3. **Stability gate**
   - One model completes 20-minute loop without crash/reload.
4. **MoE readiness gate**
   - MoE estimate probe completed and candidate selected for first full load.

