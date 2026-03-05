from flask import Flask, render_template, request, jsonify
import cv2
import numpy as np
import base64
import random

app = Flask(__name__)

image = None
history = []

def decode_image(data):
    encoded = data.split(",")[1]
    nparr = np.frombuffer(base64.b64decode(encoded), np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def encode_image(img):
    _, buffer = cv2.imencode('.png', img)
    return base64.b64encode(buffer).decode('utf-8')


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload():
    global image, history

    data = request.json['image']
    # image = decode_image(data)
    image = decode_image(data)

    max_size = 1200
    h, w = image.shape[:2]

    if max(h, w) > max_size:
        scale = max_size / max(h, w)
        image = cv2.resize(image, (int(w*scale), int(h*scale))) 
    history = [image.copy()]

    return jsonify({"status": "uploaded"})


@app.route('/change_color', methods=['POST'])
def change_color():
    global image, history

    x = int(request.json['x'])
    y = int(request.json['y'])
    r = int(request.json['r'])
    g = int(request.json['g'])
    b = int(request.json['b'])

    history.append(image.copy())

    image[y, x] = [b, g, r]

    return jsonify({
        "image": encode_image(image)
    })


@app.route('/shift_pixels', methods=['POST'])
def shift_pixels():
    global image, history

    n = int(request.json['shift'])

    history.append(image.copy())

    image = np.roll(image, n, axis=1)

    return jsonify({
        "image": encode_image(image)
    })


@app.route('/undo', methods=['POST'])
def undo():
    global image, history

    if len(history) > 1:
        history.pop()
        image = history[-1].copy()

    return jsonify({
        "image": encode_image(image)
    })

@app.route('/shift_region', methods=['POST'])
def shift_region():
    global image, history

    x1 = int(request.json['x1'])
    y1 = int(request.json['y1'])
    x2 = int(request.json['x2'])
    y2 = int(request.json['y2'])
    shift = int(request.json.get('shift', 0) or 0)

    history.append(image.copy())

    # Extract region
    region = image[y1:y2, x1:x2].copy()
        # image[y1:y2, x1:x2] = image[y1-height:y1, x1:x2]
    height = y2 - y1
    width = x2 - x1

    # choose 1–3 rows above the selection
    layer_count = min(random.randint(1,3), y1)

    if layer_count > 0:

        source = image[y1-layer_count:y1, x1:x2]

        for i in range(height):
            for j in range(width):

                # random row above
                r = random.randint(0, layer_count-1)

                # random column inside source block
                c = random.randint(0, width-1)

                image[y1+i, x1+j] = source[r, c]

    else:
        image[y1:y2, x1:x2] = [255,255,255]

    # Shift region horizontally
    new_x1 = x1 + shift
    new_x2 = new_x1 + width

    # Boundary protection
    if new_x2 > image.shape[1]:
        new_x2 = image.shape[1]
        region = region[:, :new_x2-new_x1]

    image[y1:y1+region.shape[0], new_x1:new_x1+region.shape[1]] = region

    return jsonify({
        "image": encode_image(image)
    })

if __name__ == "__main__":
    app.run(debug=True)