import base64
import io
import threading

import cv2
import onnxruntime as ort
from flask import Flask
from flask_restful import reqparse, Resource, Api
from PIL import Image

from mmdet.core.export.model_wrappers import ONNXRuntimeDetector
from mmdet.datasets import replace_ImageToTensor
from mmdet.datasets.pipelines import Compose

import mmcv
from mmcv import Config
from mmcv.parallel import collate

import torch
import os
import re

from werkzeug.datastructures import FileStorage

app = Flask(__name__)
# Express accepts images up to 10 MB and ONNX models up to 500 MB; anything larger is refused
# before it is read
app.config['MAX_CONTENT_LENGTH'] = 512 * 1024 * 1024

# Only Express talks to this server (it is not published outside the Docker network): no CORS,
# and the per-user inference quota is enforced there, where the user is known.

api = Api(app, catch_all_404s=True)

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}
IMAGE_SIGNATURES = (b'\xff\xd8\xff', b'\x89PNG\r\n\x1a\n')
MAX_IMAGE_PIXELS = 25_000_000
MAX_IMAGE_BYTES = 10 * 1024 * 1024
UNREADABLE_IMAGE = 'No se pudo leer la imagen, debe ser un JPG o PNG válido'
CLASSES = ('person',)
# model_name is used to build file paths
MODEL_NAME_RE = re.compile(r'^[A-Za-z0-9_-]+$')
# boxes drawn on the result image
SCORE_THR = 0.7

REPOSITORY_CONFIGS_DIR = 'configs/models'
UPLOADED_CONFIGS_DIR = 'configs/uploaded'


def message(text, status):
    return {'message': text}, status


def valid_model_name(model_name):
    return bool(model_name) and MODEL_NAME_RE.match(model_name) is not None


def list_configs(directory):
    if not os.path.isdir(directory):
        return []
    return sorted(f[:-3] for f in os.listdir(directory) if f.endswith('.py'))


def repository_configs():
    return list_configs(REPOSITORY_CONFIGS_DIR)


def config_path(model_name):
    """Config of a model, or None if it has none."""
    for directory in (REPOSITORY_CONFIGS_DIR, UPLOADED_CONFIGS_DIR):
        path = f'{directory}/{model_name}.py'
        if os.path.isfile(path):
            return path
    return None


def model_exists(model_name):
    return os.path.isfile(f'configs/checkpoints/{model_name}.onnx') and config_path(model_name) is not None


def allowed_images(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def image_problem(image_bytes):
    """Why the upload can't be processed, or None. Reads the header only, nothing is decoded."""
    if len(image_bytes) > MAX_IMAGE_BYTES:
        return 'La imagen no puede superar 10 MB'
    if not image_bytes.startswith(IMAGE_SIGNATURES):
        return UNREADABLE_IMAGE
    try:
        width, height = Image.open(io.BytesIO(image_bytes)).size
    except Exception:
        return UNREADABLE_IMAGE
    if width * height > MAX_IMAGE_PIXELS:
        return 'La imagen es demasiado grande, el máximo son 25 megapíxeles'
    return None


def build_pipeline(cfg):
    """The model's test pipeline, fed with numpy images (BGR, HWC) instead of file paths."""
    test_cfg = cfg.data.test.copy()
    pipeline = [step.copy() for step in test_cfg.pipeline]
    pipeline[0].type = 'LoadImageFromWebcam'
    return Compose(replace_ImageToTensor(pipeline))


def preprocess(img, pipeline):
    data = pipeline({'img': img})
    data = collate([data], samples_per_gpu=1)
    data['img_metas'] = [m.data[0] for m in data['img_metas']]
    data['img'] = [t.data[0] for t in data['img']]
    return data


# One detector (ONNX session) and pipeline per model, loaded on first use. The lock stops two
# concurrent first requests from loading the same model twice; models already loaded are read
# without it, so they don't wait while another one loads.
_model_cache = {}
_model_lock = threading.Lock()


def get_model(model_name):
    cached = _model_cache.get(model_name)
    if cached:
        return cached
    with _model_lock:
        if model_name not in _model_cache:
            onnx_path = f'configs/checkpoints/{model_name}.onnx'
            cfg = Config.fromfile(config_path(model_name))
            detector = ONNXRuntimeDetector(onnx_path, CLASSES, device_id=0)
            _model_cache[model_name] = (detector, build_pipeline(cfg))
        return _model_cache[model_name]


class Inference(Resource):
    def __init__(self):
        self.parser = reqparse.RequestParser()

    def post(self, model_name):
        if not valid_model_name(model_name) or not model_exists(model_name):
            return message('Modelo no encontrado', 404)

        self.parser.add_argument('data', type=FileStorage, location='files')
        args = self.parser.parse_args()
        image = args.get('data')

        if not image or image.filename == '':
            return message('No se envió ninguna imagen', 400)
        if not allowed_images(image.filename):
            return message('Tipo de archivo no permitido, la imagen debe ser JPG o PNG', 400)

        image_bytes = image.read()
        problem = image_problem(image_bytes)
        if problem:
            return message(problem, 400)
        img = mmcv.imfrombytes(image_bytes)
        if img is None:
            return message(UNREADABLE_IMAGE, 400)

        detector, pipeline = get_model(model_name)
        data = preprocess(img, pipeline)

        with torch.no_grad():
            result = detector(return_loss=False, rescale=True, **data)[0]

        # encode in memory: a shared result file would mix up concurrent requests across workers
        annotated = detector.show_result(img, result, score_thr=SCORE_THR, font_size=0)
        ok, jpg = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not ok:
            return message('No se pudo generar la imagen resultado', 500)

        return {'img': base64.b64encode(jpg.tobytes()).decode()}, 200


class UploadModel(Resource):
    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument('onnx_file', type=FileStorage, location='files', required=True)
        parser.add_argument('model_name', type=str, required=True)
        parser.add_argument('base_config', type=str, required=True)
        args = parser.parse_args()

        model_name, base_config = args['model_name'], args['base_config']
        if not valid_model_name(model_name):
            return message('Nombre de modelo no válido', 400)
        if base_config not in repository_configs():
            return message('Configuración base no válida', 400)

        onnx_path = f'configs/checkpoints/{model_name}.onnx'
        if os.path.exists(onnx_path) or config_path(model_name):
            return message('Ya existe un modelo con ese código', 409)

        # keep the file only if ONNX Runtime can load it
        os.makedirs('configs/checkpoints', exist_ok=True)
        partial_path = f'{onnx_path}.part'
        args['onnx_file'].save(partial_path)
        try:
            ort.InferenceSession(partial_path, providers=['CPUExecutionProvider'])
        except Exception:
            os.remove(partial_path)
            return message('El archivo no es un modelo ONNX válido', 400)
        os.replace(partial_path, onnx_path)

        os.makedirs(UPLOADED_CONFIGS_DIR, exist_ok=True)
        with open(f'{UPLOADED_CONFIGS_DIR}/{model_name}.py', 'w') as f:
            f.write('# Generated by /upload-model: uploaded weights with a repository config\n'
                    f"_base_ = '../models/{base_config}.py'\n")

        return message('Modelo subido correctamente', 201)


class ConfigList(Resource):
    def get(self):
        return {'configs': repository_configs()}, 200


class ModelList(Resource):
    def get(self):
        checkpoints = set()
        checkpoints_dir = 'configs/checkpoints'
        if os.path.isdir(checkpoints_dir):
            for f in os.listdir(checkpoints_dir):
                if f.endswith('.onnx'):
                    checkpoints.add(f[:-5])
        configs = set(repository_configs()) | set(list_configs(UPLOADED_CONFIGS_DIR))
        return {'models': sorted(checkpoints & configs)}, 200


api.add_resource(Inference, '/inference/<string:model_name>')
api.add_resource(UploadModel, '/upload-model')
api.add_resource(ModelList, '/models')
api.add_resource(ConfigList, '/configs')

if __name__ == '__main__':
    app.run()
