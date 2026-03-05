from flask import Flask, render_template, request, jsonify, session
import cv2
import numpy as np
import secrets
import base64
import random

app = Flask(
    __name__,
    template_folder="../templates",
    static_folder="../static"
)

app.secret_key = secrets.token_hex(16)


def decode_image(data):
    encoded = data.split(",")[1]
    nparr = np.frombuffer(base64.b64decode(encoded), np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def encode_image(img):
    _, buffer = cv2.imencode('.png', img)
    return base64.b64encode(buffer).decode('utf-8')


def get_image():
    data = session.get("image")
    if not data:
        return None
    return decode_image("data:image/png;base64," + data)


def save_image(img):
    encoded = encode_image(img)
    session["image"] = encoded

    history = session.get("history", [])
    history.append(encoded)
    session["history"] = history


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload():

    data = request.json['image']
    img = decode_image(data)

    max_size = 1200
    h, w = img.shape[:2]

    if max(h, w) > max_size:
        scale = max_size / max(h, w)
        img = cv2.resize(img, (int(w*scale), int(h*scale)))

    encoded = encode_image(img)

    session["image"] = encoded
    session["history"] = [encoded]

    return jsonify({"status": "uploaded"})


@app.route('/change_color', methods=['POST'])
def change_color():

    img = get_image()
    if img is None:
        return jsonify({"error": "No image"}), 400

    x = int(request.json['x'])
    y = int(request.json['y'])
    r = int(request.json['r'])
    g = int(request.json['g'])
    b = int(request.json['b'])

    img[y, x] = [b, g, r]

    save_image(img)

    return jsonify({
        "image": encode_image(img)
    })


@app.route('/shift_pixels', methods=['POST'])
def shift_pixels():

    img = get_image()
    if img is None:
        return jsonify({"error": "No image"}), 400

    n = int(request.json['shift'])

    img = np.roll(img, n, axis=1)

    save_image(img)

    return jsonify({
        "image": encode_image(img)
    })


@app.route('/undo', methods=['POST'])
def undo():

    history = session.get("history", [])

    if len(history) > 1:
        history.pop()
        session["history"] = history
        session["image"] = history[-1]

    return jsonify({
        "image": session["image"]
    })


@app.route('/shift_region', methods=['POST'])
def shift_region():

    img = get_image()
    if img is None:
        return jsonify({"error": "No image"}), 400

    x1 = int(request.json['x1'])
    y1 = int(request.json['y1'])
    x2 = int(request.json['x2'])
    y2 = int(request.json['y2'])
    shift = int(request.json.get('shift', 0) or 0)

    region = img[y1:y2, x1:x2].copy()

    height = y2 - y1
    width = x2 - x1

    layer_count = min(random.randint(1,3), y1)

    if layer_count > 0:

        source = img[y1-layer_count:y1, x1:x2]

        for i in range(height):
            for j in range(width):

                r = random.randint(0, layer_count-1)
                c = random.randint(0, width-1)

                img[y1+i, x1+j] = source[r, c]

    else:
        img[y1:y2, x1:x2] = [255,255,255]

    new_x1 = x1 + shift
    new_x2 = new_x1 + width

    if new_x2 > img.shape[1]:
        new_x2 = img.shape[1]
        region = region[:, :new_x2-new_x1]

    img[y1:y1+region.shape[0], new_x1:new_x1+region.shape[1]] = region

    save_image(img)

    return jsonify({
        "image": encode_image(img)
    })


if __name__ == "__main__":
    app.run(debug=True)