_base_ = [
    '../_base_/models/faster_rcnn_r50_sspnet.py',
    '../_base_/datasets/TinyPerson_detection_640x512.py',
    '../_base_/schedules/schedule_1x.py',
    '../_base_/default_runtime.py'
]
# Baseline for the SSPNet ablation: same recipe as faster_rcnn_r50_sspnet_1x_Tiny.py
# (anchors, data, schedule, test settings) with a plain FPN neck instead of SSFPN and
# random negative sampling instead of SSPNet's ICNegSampler.
model = dict(
    type='FasterRCNN',
    neck=dict(type='FPN'),
    train_cfg=dict(rpn=dict(sampler=dict(type='RandomSampler'))))
# 1 GPU x 2 images per batch
optimizer = dict(lr=0.0025)
