FROM python:3.8-slim

RUN apt-get update -y \
    && apt-get install --no-install-recommends -y libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

ENV LC_ALL=C.UTF-8 \
    LANG=C.UTF-8

EXPOSE 5000
WORKDIR /home/flaskapp

COPY requirements.txt .

RUN  python3 -m pip --no-cache-dir install -r requirements.txt \
    && python3 -m pip uninstall -y opencv-python opencv-python-headless \
    && python3 -m pip --no-cache-dir install opencv-python-headless==4.8.1.78

COPY . .

RUN useradd --create-home --uid 1000 flask
USER flask

CMD ["gunicorn","--bind","0.0.0.0:5000", "--timeout=120", "--workers=2", "wsgi:app"]
