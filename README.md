Bhalla Edits – Pixel Manipulation Web Editor

Bhalla Edits is a lightweight web-based image editor that allows users to perform pixel-level modifications directly in the browser. The application uses Python-based image processing on the backend and a dynamic canvas interface on the frontend to enable precise pixel editing operations.

The tool supports region selection, pixel shifting, color modification, zooming, and exporting edited images.

Features
Image Upload

Users can upload an image which is rendered inside a dynamic canvas environment for editing.

Pixel Color Modification

Individual pixels can be modified by selecting a color and clicking on the image.

Region Selection

Users can select a rectangular region of the image using a mouse drag selection box.

Region Pixel Shifting

Selected regions can be shifted horizontally by a specified number of pixels. The area left behind is automatically filled using repeated pixel layers sampled from above the shifted region.

Randomized Pixel Filling

To improve visual blending, pixel layers used for filling can be randomized vertically and horizontally.

Undo Functionality

Users can revert to previous states of the image.

Zoom and Navigation

The canvas supports:

Zoom in

Zoom out

Reset zoom

Pan movement in four directions

This allows large images to be edited comfortably within a fixed container.

Professional Selection Overlay

Selected regions display:

Solid rectangular borders

A translucent blue overlay

to clearly indicate the active editing area.

Image Export

Users can download the edited image with the default filename:

Bhalla Edits.png
Technology Stack

Frontend

HTML

CSS

JavaScript

HTML5 Canvas API

Backend

Python

Flask

OpenCV

Image Processing

NumPy

OpenCV pixel manipulation

Project Architecture
BhallaEdits/
│
├── app.py                # Flask backend server
├── templates/
│   └── index.html       # Main web interface
│
├── static/
│   ├── style.css        # Website styling
│   └── script.js        # Frontend logic
│
└── README.md
Installation
1. Clone the Repository
git clone https://github.com/yourusername/bhalla-edits.git
cd bhalla-edits
2. Install Dependencies
pip install flask opencv-python numpy
3. Run the Application
python app.py

The server will start locally.

Accessing the Application

Open your browser and navigate to:

http://localhost:5000
Mobile Access (Local Network)

To access the editor on your mobile device:

Run Flask with network access

app.run(host="0.0.0.0", port=5000)

Find your computer's local IP address

Open the following URL on your mobile device (same WiFi network)

http://YOUR_IP_ADDRESS:5000
Controls
Action	Description
Click	Change pixel color
Click + Drag	Select region
Shift Region	Move selected region
Zoom In/Out	Scale the image
Arrow Buttons	Move canvas
Undo	Revert last edit
Download	Save edited image
Known Limitations

Very large images may impact performance due to canvas redraw operations.

Mobile touch gestures require additional event handling for optimal selection interaction.

The editor currently supports rectangular selections only.

Future Improvements

Potential improvements include:

Multi-layer editing

Brush tools

Polygon selection tools

Performance optimizations using WebGL

Mobile touch gesture support

Multiple undo/redo stack

GPU-based image processing

License

This project is open source and available for educational and experimental purposes.
