# ONNX Runtime latency on CPU (the serving path), same protocol as benchmark_single_gpu.py:
# batch 1, test-set crops through the model's test pipeline, 5 warm-up iters, data loading excluded.
# usage: CUDA_VISIBLE_DEVICES= python tools/analysis_tools/benchmark_onnx_cpu.py <config> <onnx> [n_iter]
import sys
import time

import numpy as np
import onnxruntime as ort
import torch
from mmcv import Config
from mmcv.parallel import MMDataParallel

from mmdet.core.export.model_wrappers import ONNXRuntimeDetector
from mmdet.datasets import build_dataloader, build_dataset

cfg_path, onnx_path = sys.argv[1], sys.argv[2]
max_iter = int(sys.argv[3]) if len(sys.argv) > 3 else 300
repeat, num_warmup = 3, 5
assert not torch.cuda.is_available(), 'run with CUDA_VISIBLE_DEVICES= to measure CPU'

cfg = Config.fromfile(cfg_path)
cfg.data.test.test_mode = True
dataset = build_dataset(cfg.data.test)
model = MMDataParallel(ONNXRuntimeDetector(onnx_path, dataset.CLASSES, 0), device_ids=[0])
cpu = open('/proc/cpuinfo').read().split('model name')[1].split('\n')[0].strip(': ')
print('CPU:', cpu, '| threads:', torch.get_num_threads(), '| ORT', ort.__version__,
      model.module.sess.get_providers(), flush=True)

results = []
for r in range(repeat):
    loader = build_dataloader(dataset, samples_per_gpu=1, workers_per_gpu=2, dist=False, shuffle=False)
    pure_inf_time = 0
    for i, data in enumerate(loader):
        start = time.perf_counter()
        with torch.no_grad():
            model(return_loss=False, rescale=True, **data)
        if i >= num_warmup:
            pure_inf_time += time.perf_counter() - start
        if i + 1 == max_iter:
            break
    ms = 1000 * pure_inf_time / (max_iter - num_warmup)
    results.append(ms)
    print(f'run {r + 1}: {ms:.1f} ms / crop', flush=True)
print(f'Mean: {np.mean(results):.1f} ms / crop (std {np.std(results):.1f})', flush=True)
