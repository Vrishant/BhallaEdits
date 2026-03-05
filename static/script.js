const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let offsetX = 0;
let offsetY = 0;
let currentImage = null;
let currentImageObj = null;
let sessionId = null;

// Generate or retrieve session ID
function getSessionId() {
    if (!sessionId) {
        sessionId = localStorage.getItem('bhalla_edits_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Math.random().toString(36).substr(2, 16);
            localStorage.setItem('bhalla_edits_session_id', sessionId);
        }
    }
    return sessionId;
}

document.getElementById("upload").onchange = function(e) {
    const reader = new FileReader();

    reader.onload = function(event) {
        const img = new Image();

        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);

            currentImageObj = img;
            currentImage = event.target.result;

            sendImage(event.target.result);
        }

        img.src = event.target.result;
    }

    reader.readAsDataURL(e.target.files[0]);
}

function sendImage(image) {
    const sid = getSessionId();
    
    fetch("/upload", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: image, session_id: sid })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            console.error("Upload error:", data.error);
            alert("Error uploading image: " + data.error);
            return;
        }
        if (data.session_id) {
            sessionId = data.session_id;
            localStorage.setItem('bhalla_edits_session_id', sessionId);
        }
        updateImage(data);
    })
    .catch(err => {
        console.error("Upload failed:", err);
        alert("Failed to upload image");
    });
}

canvas.addEventListener("click", function(e) {
    if (!currentImageObj) return;
    
    // Don't change color if we were selecting
    if (selecting) return;

    const rect = canvas.getBoundingClientRect();

    // Calculate canvas coordinates accounting for zoom and pan
    const canvasX = (e.clientX - rect.left - offsetX) / zoomLevel;
    const canvasY = (e.clientY - rect.top - offsetY) / zoomLevel;

    const x = Math.floor(canvasX);
    const y = Math.floor(canvasY);

    // Validate coordinates
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;

    const color = document.getElementById("colorPicker").value;

    const r = parseInt(color.substr(1, 2), 16);
    const g = parseInt(color.substr(3, 2), 16);
    const b = parseInt(color.substr(5, 2), 16);

    const sid = getSessionId();
    
    fetch("/change_color", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, r, g, b, session_id: sid })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            console.error("Change color error:", data.error);
            alert("Error changing color: " + data.error);
            return;
        }
        updateImage(data);
    })
    .catch(err => {
        console.error("Change color failed:", err);
    });
});

function shiftPixels() {
    const shift = parseInt(document.getElementById("shift").value) || 0;
    const sid = getSessionId();

    fetch("/shift_pixels", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift, session_id: sid })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            console.error("Shift pixels error:", data.error);
            alert("Error shifting pixels: " + data.error);
            return;
        }
        updateImage(data);
    })
    .catch(err => {
        console.error("Shift pixels failed:", err);
    });
}

function undo() {
    const sid = getSessionId();

    fetch("/undo", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sid })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            console.error("Undo error:", data.error);
            return;
        }
        updateImage(data);
    })
    .catch(err => {
        console.error("Undo failed:", err);
    });
}

function updateImage(data) {
    if (!data.image) {
        console.error("No image in response");
        return;
    }

    const img = new Image();

    img.onload = function() {
        currentImageObj = img;

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        // Redraw selection if active
        if (selecting || (startX !== undefined && endX !== undefined)) {
            redrawCanvas();
        }
    };

    img.onerror = function() {
        console.error("Failed to load image from data");
    };

    img.src = "data:image/png;base64," + data.image;
}

let startX, startY, endX, endY;
let selecting = false;

canvas.addEventListener("mousedown", function(e) {
    const rect = canvas.getBoundingClientRect();
    
    // Convert screen coordinates to canvas coordinates
    startX = (e.clientX - rect.left - offsetX) / zoomLevel;
    startY = (e.clientY - rect.top - offsetY) / zoomLevel;
    
    endX = startX;
    endY = startY;

    selecting = true;
});

canvas.addEventListener("mousemove", function(e) {
    if (!selecting) return;

    const rect = canvas.getBoundingClientRect();
    
    endX = (e.clientX - rect.left - offsetX) / zoomLevel;
    endY = (e.clientY - rect.top - offsetY) / zoomLevel;

    redrawCanvas();
});

canvas.addEventListener("mouseup", function(e) {
    const rect = canvas.getBoundingClientRect();
    
    endX = (e.clientX - rect.left - offsetX) / zoomLevel;
    endY = (e.clientY - rect.top - offsetY) / zoomLevel;

    selecting = false;
});

canvas.addEventListener("mouseleave", function() {
    selecting = false;
});

function redrawCanvas() {
    if (!currentImageObj) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentImageObj, 0, 0);

    // Draw selection box with translucent blue overlay
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    if (width > 0 && height > 0) {
        // Translucent blue fill
        ctx.fillStyle = "rgba(96, 165, 250, 0.3)";
        ctx.fillRect(x, y, width, height);

        // Solid border - thickness scales with zoom
        const borderWidth = Math.max(2, Math.round(2 * zoomLevel));
        ctx.lineWidth = borderWidth;
        ctx.strokeStyle = "#60a5fa";
        ctx.setLineDash([]);
        
        ctx.strokeRect(x, y, width, height);
    }
}

function downloadImage() {
    const link = document.createElement("a");

    link.download = "Bhalla Edits.png";
    link.href = canvas.toDataURL("image/png");

    link.click();
}

function shiftRegion() {
    const shift = parseInt(document.getElementById("shift").value) || 0;
    const sid = getSessionId();

    // Ensure we have valid selection coordinates
    if (startX === undefined || endX === undefined) {
        alert("Please select an area first");
        return;
    }

    fetch("/shift_region", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            x1: Math.floor(Math.min(startX, endX)),
            y1: Math.floor(Math.min(startY, endY)),
            x2: Math.floor(Math.max(startX, endX)),
            y2: Math.floor(Math.max(startY, endY)),
            shift: shift,
            session_id: sid
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            console.error("Shift region error:", data.error);
            alert("Error shifting region: " + data.error);
            return;
        }

        updateImage(data);

        // Move selection box with the shift
        startX += shift;
        endX += shift;

        // Clear selection after shift (optional)
        // startX = undefined;
        // endX = undefined;
        
        redrawCanvas();
    })
    .catch(err => {
        console.error("Shift region failed:", err);
    });
}

function updateTransform() {
    canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoomLevel})`;
}

let zoomLevel = 1;

function zoomIn() {
    zoomLevel += 0.1;
    updateTransform();
    redrawCanvas();
}

function zoomOut() {
    zoomLevel = Math.max(0.2, zoomLevel - 0.1);
    updateTransform();
    redrawCanvas();
}

function resetZoom() {
    zoomLevel = 1;
    offsetX = 0;
    offsetY = 0;
    updateTransform();
    redrawCanvas();
}

// Move Controls
function moveLeft() {
    offsetX += 50;
    updateTransform();
    redrawCanvas();
}

function moveRight() {
    offsetX -= 50;
    updateTransform();
    redrawCanvas();
}

function moveUp() {
    offsetY += 50;
    updateTransform();
    redrawCanvas();
}

function moveDown() {
    offsetY -= 50;
    updateTransform();
    redrawCanvas();
}

// Touch Event Handling - Consolidated
canvas.addEventListener("touchstart", function(e) {
    if (e.touches.length !== 1) return;
    
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];

    // Convert touch coordinates to canvas coordinates
    startX = (touch.clientX - rect.left - offsetX) / zoomLevel;
    startY = (touch.clientY - rect.top - offsetY) / zoomLevel;
    
    endX = startX;
    endY = startY;

    selecting = true;
}, { passive: false });

canvas.addEventListener("touchmove", function(e) {
    if (!selecting || e.touches.length !== 1) return;
    
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];

    endX = (touch.clientX - rect.left - offsetX) / zoomLevel;
    endY = (touch.clientY - rect.top - offsetY) / zoomLevel;

    redrawCanvas();
}, { passive: false });

canvas.addEventListener("touchend", function(e) {
    selecting = false;
});

