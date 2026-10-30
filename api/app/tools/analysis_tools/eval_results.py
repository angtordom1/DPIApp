# Evaluate saved predictions (pickle from tools/test.py or tools/deployment/test.py --out)
# with the config's evaluation settings, same as tools/test.py --eval bbox.
# usage: python tools/analysis_tools/eval_results.py <config> <results.pkl>
import sys

import mmcv
from mmcv import Config

from mmdet.datasets import build_dataset

cfg = Config.fromfile(sys.argv[1])
cfg.data.test.test_mode = True
dataset = build_dataset(cfg.data.test)
outputs = mmcv.load(sys.argv[2])
# ONNX exports pad every image to max_per_img boxes without the score threshold;
# apply the config's rcnn score_thr so ONNX and PyTorch results are filtered alike.
score_thr = cfg.model.test_cfg.rcnn.score_thr
n_before = sum(len(c) for r in outputs for c in r)
outputs = [[c[c[:, 4] >= score_thr] for c in r] for r in outputs]
print(f'detections: {n_before} -> {sum(len(c) for r in outputs for c in r)} (score >= {score_thr})')
eval_kwargs = cfg.get('evaluation', {}).copy()
for key in ['interval', 'tmpdir', 'start', 'gpu_collect', 'save_best', 'rule']:
    eval_kwargs.pop(key, None)
eval_kwargs.update(dict(metric='bbox'))
print(dataset.evaluate(outputs, **eval_kwargs))
