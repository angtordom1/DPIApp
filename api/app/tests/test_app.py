"""Tests of the Flask inference server (run from api/app: the app uses relative paths)."""
import base64
import io
import os

import cv2
import numpy as np
import pytest

import app as flask_app

MODEL = 'faster_rcnn_r50_fpn_1x_tiny'
has_weights = os.path.isfile(f'configs/checkpoints/{MODEL}.onnx')


@pytest.fixture
def client():
    return flask_app.app.test_client()


@pytest.fixture
def validating_client(monkeypatch, client):
    # the image checks run before the model is loaded, so these tests need no weights
    monkeypatch.setattr(flask_app, 'model_exists', lambda name: True)
    return client


def encoded(ext, shape=(64, 80, 3)):
    ok, buf = cv2.imencode(ext, np.full(shape, 127, dtype=np.uint8))
    assert ok
    return buf.tobytes()


def post_image(client, content, filename, model=MODEL):
    return client.post(f'/inference/{model}', content_type='multipart/form-data',
                       data={'data': (io.BytesIO(content), filename)})


# --- /inference ---------------------------------------------------------------------------

def test_unknown_model(client):
    res = post_image(client, encoded('.jpg'), 'image.jpg', model='no_such_model')
    assert res.status_code == 404
    assert res.get_json() == {'message': 'Modelo no encontrado'}


def test_invalid_model_name(client):
    assert post_image(client, encoded('.jpg'), 'image.jpg', model='..%2Fapp').status_code == 404


def test_missing_image(validating_client):
    res = validating_client.post(f'/inference/{MODEL}', content_type='multipart/form-data', data={})
    assert res.status_code == 400
    assert res.get_json()['message'] == 'No se envió ninguna imagen'


def test_rejects_other_extensions(validating_client):
    res = post_image(validating_client, encoded('.bmp'), 'image.bmp')
    assert res.status_code == 400
    assert 'JPG o PNG' in res.get_json()['message']


def test_rejects_files_that_are_not_images(validating_client):
    res = post_image(validating_client, b'not an image', 'fake.jpg')
    assert res.status_code == 400
    assert 'no se pudo leer' in res.get_json()['message'].lower()


def test_rejects_other_formats_renamed_as_jpg(validating_client):
    # OpenCV would decode a WebP; it must not reach the decoder at all
    res = post_image(validating_client, encoded('.webp'), 'renamed.jpg')
    assert res.status_code == 400
    assert 'no se pudo leer' in res.get_json()['message'].lower()


def test_rejects_huge_images_before_decoding(validating_client):
    # ~30 MP of a single colour: a small PNG that would take ~90 MB once decoded
    res = post_image(validating_client, encoded('.png', shape=(5000, 6000)), 'huge.png')
    assert res.status_code == 400
    assert 'megapíxeles' in res.get_json()['message']


@pytest.mark.skipif(not has_weights, reason=f'needs configs/checkpoints/{MODEL}.onnx')
@pytest.mark.parametrize('ext', ['.png', '.jpg'])
def test_runs_on_png_and_jpg(client, ext):
    res = post_image(client, encoded(ext), f'image{ext}')
    assert res.status_code == 200
    result = cv2.imdecode(np.frombuffer(base64.b64decode(res.get_json()['img']), np.uint8), cv2.IMREAD_COLOR)
    assert result.shape == (64, 80, 3)


# --- /upload-model, /models, /configs (in a temporary configs tree) ------------------------

@pytest.fixture
def workdir(tmp_path, monkeypatch):
    (tmp_path / 'configs' / 'models').mkdir(parents=True)
    (tmp_path / 'configs' / 'models' / 'base_config.py').write_text('# repository config\n')
    monkeypatch.chdir(tmp_path)
    return tmp_path


def tiny_onnx():
    """A valid one-node ONNX model (Identity), enough for ONNX Runtime to load it."""
    from onnx import TensorProto, helper
    tensor = helper.make_tensor_value_info
    graph = helper.make_graph([helper.make_node('Identity', ['x'], ['y'])], 'tiny',
                              [tensor('x', TensorProto.FLOAT, [1])], [tensor('y', TensorProto.FLOAT, [1])])
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid('', 11)])
    model.ir_version = 7
    return model.SerializeToString()


def upload(client, content, model_name='uploaded_model', base_config='base_config'):
    return client.post('/upload-model', content_type='multipart/form-data', data={
        'onnx_file': (io.BytesIO(content), 'model.onnx'),
        'model_name': model_name,
        'base_config': base_config,
    })


def test_upload_creates_weights_and_config(workdir, client):
    res = upload(client, tiny_onnx())
    assert res.status_code == 201
    assert (workdir / 'configs' / 'checkpoints' / 'uploaded_model.onnx').is_file()
    config = (workdir / 'configs' / 'uploaded' / 'uploaded_model.py').read_text()
    assert "_base_ = '../models/base_config.py'" in config
    # the new model is listed and can't be uploaded twice
    assert client.get('/models').get_json() == {'models': ['uploaded_model']}
    assert upload(client, tiny_onnx()).status_code == 409


@pytest.mark.parametrize('model_name', ['../evil', 'with space', ''])
def test_upload_rejects_invalid_names(workdir, client, model_name):
    assert upload(client, tiny_onnx(), model_name=model_name).status_code == 400


@pytest.mark.parametrize('base_config', ['unknown', '../models/base_config'])
def test_upload_only_accepts_repository_configs(workdir, client, base_config):
    res = upload(client, tiny_onnx(), base_config=base_config)
    assert res.status_code == 400
    assert res.get_json()['message'] == 'Configuración base no válida'


def test_upload_rejects_invalid_onnx_and_leaves_nothing(workdir, client):
    res = upload(client, b'not an onnx model')
    assert res.status_code == 400
    assert list((workdir / 'configs' / 'checkpoints').iterdir()) == []
    assert not (workdir / 'configs' / 'uploaded').exists()


def test_models_need_weights_and_config(workdir, client):
    checkpoints = workdir / 'configs' / 'checkpoints'
    checkpoints.mkdir()
    (checkpoints / 'base_config.onnx').write_bytes(b'')  # weights + repository config
    (checkpoints / 'orphan.onnx').write_bytes(b'')       # weights without config
    assert client.get('/models').get_json() == {'models': ['base_config']}


def test_configs_lists_repository_configs(workdir, client):
    assert client.get('/configs').get_json() == {'configs': ['base_config']}
