# Crash Analysis — LM Studio Runtime (2026-05-19)

## Incident
- Source file: `~/Library/Logs/DiagnosticReports/node-2026-05-19-171057.ips`
- Parent process: `LM Studio`
- Crashed process: `node` runtime worker under LM Studio
- Exception: `EXC_BAD_ACCESS (SIGSEGV)` at `0x0000000000000028`
- Triggered thread: `libuv-worker`

## Key Stack Signals
Top frames indicate failure inside LM Studio's MLX/Python bridge path:
- `faulthandler_fatal_error`
- `take_gil`
- `PyEval_AcquireThread`
- `pybind11::gil_scoped_acquire::gil_scoped_acquire()`
- `llm_engine::MLXPythonHandle::nextSamplingOutput(...)`
- `llm_engine::MLXAmphibianEngine::predict(...)`

Interpretation:
- This is consistent with a runtime/backend crash in the MLX engine path (not a macOS kernel crash and not a Colima/Docker issue).

## Impact on benchmark
- `qwen/qwen3-14b` benchmark request path aborted.
- Stability test on that model failed.
- `google/gemma-3-12b` completed successfully in the same run.

## Immediate mitigations used
1. Added request timeouts in benchmark harness.
2. Reduced pressure defaults:
   - `parallel: 1`
   - narrower context ladder for safe reruns
3. Added crash-tolerant measurement handling so a single runtime failure does not stall the full suite.

## Next hardening actions
1. Prefer GGUF + llama.cpp path for stress tests on this machine.
2. Keep MLX runs on conservative contexts for baseline-only measurements.
3. Re-run MoE tests only after downloading a GGUF MoE model and forcing llama.cpp runtime path.

