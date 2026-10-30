#!/bin/bash
set -e

# Add the app directory to PYTHONPATH so 'mmdet' is importable directly
export PYTHONPATH="$(pwd):${PYTHONPATH}"

MODELS=(
    "faster_rcnn_r50_fpn_1x_tiny"
    "faster_rcnn_r50_sspnet_1x"
    "faster_rcnn_r50_sspnet_1x_Tiny"
)

for model in "${MODELS[@]}"; do
    echo "==> Converting $model ..."
    python tools/deployment/pytorch2onnx.py \
        "configs/models/${model}.py" \
        "configs/checkpoints/${model}.pth" \
        --output-file "configs/checkpoints/${model}.onnx" \
        --shape 512 640 \
        --dynamic-export \
        --input-img "${INPUT_IMG:-/samples/youtube_V0000_I0006800.jpg}"
    echo "    Saved: configs/checkpoints/${model}.onnx"
done

echo "All models converted successfully."
