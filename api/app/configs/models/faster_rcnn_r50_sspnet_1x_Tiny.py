_base_ = [
    '../_base_/models/faster_rcnn_r50_sspnet.py',
    '../_base_/datasets/TinyPerson_detection_640x512.py',
    '../_base_/schedules/schedule_1x.py', 
    '../_base_/default_runtime.py'
]
# 1 GPU x 2 images per batch
optimizer = dict(lr=0.0025)