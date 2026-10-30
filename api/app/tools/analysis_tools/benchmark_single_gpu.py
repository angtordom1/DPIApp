# Single-process version of benchmark.py (same timing loop: batch 1, 5 warm-up iters,
# cuda.synchronize around the forward, data loading excluded). benchmark.py wraps the model in
# MMDistributedDataParallel, which fails with NCCL in Docker on WSL.
# usage: python tools/analysis_tools/benchmark_single_gpu.py <config> <checkpoint>
import sys
import time

import numpy as np
import torch
from mmcv import Config
from mmcv.parallel import MMDataParallel
from mmcv.runner import load_checkpoint

from mmdet.datasets import build_dataloader, build_dataset
from mmdet.models import build_detector

cfg_path, ckpt = sys.argv[1], sys.argv[2]
max_iter, repeat = 2000, 3
num_warmup = 5

cfg = Config.fromfile(cfg_path)
cfg.model.pretrained = None
cfg.data.test.test_mode = True
cfg.model.train_cfg = None
dataset = build_dataset(cfg.data.test)
model = build_detector(cfg.model, test_cfg=cfg.get('test_cfg'))
load_checkpoint(model, ckpt, map_location='cpu')
model = MMDataParallel(model.cuda(), device_ids=[0]).eval()
print('GPU:', torch.cuda.get_device_name(0), '| crops in test set:', len(dataset), flush=True)

results = []
for r in range(repeat):
    loader = build_dataloader(dataset, samples_per_gpu=1, workers_per_gpu=2, dist=False, shuffle=False)
    pure_inf_time = 0
    for i, data in enumerate(loader):
        torch.cuda.synchronize()
        start = time.perf_counter()
        with torch.no_grad():
            model(return_loss=False, rescale=True, **data)
        torch.cuda.synchronize()
        if i >= num_warmup:
            pure_inf_time += time.perf_counter() - start
        if i + 1 == max_iter:
            break
    ms = 1000 * pure_inf_time / (max_iter - num_warmup)
    results.append(ms)
    print(f'run {r + 1}: {ms:.1f} ms / crop', flush=True)
print(f'Mean: {np.mean(results):.1f} ms / crop (std {np.std(results):.1f})', flush=True)
