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

# In-memory storage for session-based images (Vercel compatible)
# Format: {session_id: {"image": base64_string, "history": [base64_strings]}}
session_storage = {}


def decode_image(data):
    """Decode base64 image data to OpenCV image"""
    if not data:
        return None
    
    if "," in data:
        data = data.split(",")[1]
    
    try:
        nparr = np.frombuffer(base64.b64decode(data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None


def encode_image(img):
    """Encode OpenCV image to base64 string"""
    if img is None:
        return None
    
    try:
        _, buffer = cv2.imencode('.png', img)
        return base64.b64encode(buffer).decode('utf-8')
    except Exception as e:
        print(f"Error encoding image: {e}")
        return None


def get_session_id():
    """Get session ID from request or generate new one"""
    # Try to get session_id from request JSON
    session_id = None
    if request.is_json:
        session_id = request.json.get('session_id')
    
    # Fall back to Flask session
    if not session_id:
        session_id = session.get('session_id')
    
    # Generate new session ID if none exists
    if not session_id:
        session_id = secrets.token_hex(16)
        session['session_id'] = session_id
    
    return session_id


def get_image(session_id):
    """Get current image for session"""
    if session_id not in session_storage:
        return None
    
    data = session_storage[session_id].get("image")
    if not data:
        return None
    
    return decode_image(data)


def save_image(session_id, img):
    """Save image to session storage"""
    if session_id not in session_storage:
        session_storage[session_id] = {"image": None, "history": []}
    
    encoded = encode_image(img)
    if encoded:
        session_storage[session_id]["image"] = encoded
        
        # Update history
        history = session_storage[session_id].get("history", [])
        history.append(encoded)
        
        # Keep only last 50 history items to save memory
        if len(history) > 50:
            history = history[-50:]
        
        session_storage[session_id]["history"] = history


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload():
    session_id = get_session_id()
    
    data = request.json.get('image')
    if not data:
        return jsonify({"error": "No image provided", "session_id": session_id}), 400
    
    img = decode_image(data)
    if img is None:
        return jsonify({"error": "Invalid image data", "session_id": session_id}), 400
    
    # Resize if too large
    max_size = 1200
    h, w = img.shape[:2]
    
    if max(h, w) > max_size:
        scale = max_size / max(h, w)
        img = cv2.resize(img, (int(w*scale), int(h*scale)))
    
    encoded = encode_image(img)
    
    # Initialize session storage
    session_storage[session_id] = {
        "image": encoded,
        "history": [encoded]
    }
    
    return jsonify({
        "image": encoded,
        "session_id": session_id
    })


@app.route('/change_color', methods=['POST'])
def change_color():
    session_id = get_session_id()
    
    img = get_image(session_id)
    if img is None:
        return jsonify({"error": "No image loaded", "session_id": session_id}), 400
    
    x = int(request.json.get('x', 0))
    y = int(request.json.get('y', 0))
    r = int(request.json.get('r', 0))
    g = int(request.json.get('g', 0))
    b = int(request.json.get('b', 0))
    
    # Validate coordinates
    if x < 0 or x >= img.shape[1] or y < 0 or y >= img.shape[0]:
        return jsonify({"error": "Invalid coordinates", "session_id": session_id}), 400
    
    # OpenCV uses BGR format
    img[y, x] = [b, g, r]
    
    save_image(session_id, img)
    
    encoded = encode_image(img)
    
    return jsonify({
        "image": encoded,
        "session_id": session_id
    })


@app.route('/shift_pixels', methods=['POST'])
def shift_pixels():
    session_id = get_session_id()
    
    img = get_image(session_id)
    if img is None:
        return jsonify({"error": "No image loaded", "session_id": session_id}), 400
    
    n = int(request.json.get('shift', 0) or 0)
    
    img = np.roll(img, n, axis=1)
    
    save_image(session_id, img)
    
    encoded = encode_image(img)
    
    return jsonify({
        "image": encoded,
        "session_id": session_id
    })


@app.route('/undo', methods=['POST'])
def undo():
    session_id = get_session_id()
    
    if session_id not in session_storage:
        return jsonify({"error": "No session found", "session_id": session_id}), 400
    
    history = session_storage[session_id].get("history", [])
    
    if len(history) > 1:
        history.pop()
        session_storage[session_id]["history"] = history
        session_storage[session_id]["image"] = history[-1]
    
    current_image = session_storage[session_id].get("image")
    
    return jsonify({
        "image": current_image,
        "session_id": session_id
    })


@app.route('/shift_region', methods=['POST'])
def shift_region():
    session_id = get_session_id()
    
    img = get_image(session_id)
    if img is None:
        return jsonify({"error": "No image loaded", "session_id": session_id}), 400
    
    x1 = int(request.json.get('x1', 0))
    y1 = int(request.json.get('y1', 0))
    x2 = int(request.json.get('x2', 0))
    y2 = int(request.json.get('y2', 0))
    shift = int(request.json.get('shift', 0) or 0)
    
    # Validate coordinates
    if x1 < 0 or y1 < 0 or x2 > img.shape[1] or y2 > img.shape[0]:
        return jsonify({"error": "Invalid selection coordinates", "session_id": session_id}), 400
    
    region = img[y1:y2, x1:x2].copy()
    
    height = y2 - y1
    width = x2 - x1
    
    # Fill the original area with pixels from above
    layer_count = min(random.randint(1, 3), y1)
    
    if layer_count > 0:
        source = img[y1-layer_count:y1, x1:x2]
        
        for i in range(height):
            for j in range(width):
                r = random.randint(0, layer_count-1)
                c = random.randint(0, width-1)
                img[y1+i, x1+j] = source[r, c]
    else:
        # If no rows above, fill with white
        img[y1:y2, x1:x2] = [255, 255, 255]
    
    # Shift the region
    new_x1 = x1 + shift
    new_x2 = new_x1 + width
    
    # Handle boundary
    if new_x2 > img.shape[1]:
        overflow = new_x2 - img.shape[1]
        region = region[:, :-overflow]
        new_x2 = img.shape[1]
        new_x1 = new_x2 - region.shape[1]
    
    # Place the shifted region
    if new_x1 >= 0 and region.shape[1] > 0:
        img[y1:y1+region.shape[0], new_x1:new_x1+region.shape[1]] = region
    
    save_image(session_id, img)
    
    encoded = encode_image(img)
    
    return jsonify({
        "image": encoded,
        "session_id": session_id
    })


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

