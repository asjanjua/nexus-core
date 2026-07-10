# LM Studio Baseline Benchmark

Generated: 2026-05-19T12:20:10.459Z
Base URL: `http://127.0.0.1:1234`

## Baseline Policy
- Flash Attention: enabled
- Speculative decoding: disabled
- Context ladder: 8192

## Benchmark Table
| Model | Context | TTFT (ms) | Tokens/sec | Swap Before (MB) | Swap After (MB) |
|---|---:|---:|---:|---:|---:|
| qwen/qwen3-14b | 8192 | n/a | n/a | 25443.69 | 28155 |
| google/gemma-3-12b | 8192 | 712.5 | 14.3 | 30251.31 | 26414.69 |

## Stability Gate
- Model: `qwen/qwen3-14b`
- Duration: 1 minutes
- Requests: 1
- Failures: 1
- Success rate: 0%

## Memory Gate
- Start swap: 19807.62 MB
- End swap: 26629.69 MB
- Delta swap: 6822.07 MB

See machine-readable output: `docs/lmstudio/results/baseline-benchmark.json`
