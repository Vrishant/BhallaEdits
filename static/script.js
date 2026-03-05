const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let offsetX = 0;
let offsetY = 0;
let currentImage = null;

document.getElementById("upload").onchange = function(e){

    const reader = new FileReader();

    reader.onload = function(event){

        const img = new Image();

        img.onload = function(){

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img,0,0);

            currentImageObj = img;

            sendImage(event.target.result);
        }

        img.src = event.target.result;
    }

    reader.readAsDataURL(e.target.files[0]);
    undo();
}


// function sendImage(){

//     fetch("/upload",{
//         method:"POST",
//         headers:{'Content-Type':'application/json'},
//         body:JSON.stringify({image:currentImage})
//     })
// }

function sendImage(image){

    fetch("/upload",{
        method:"POST",
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({image:image})
    })
}

canvas.addEventListener("click",function(e){

    // const rect = canvas.getBoundingClientRect();

    // const scaleX = canvas.width / rect.width;
    // const scaleY = canvas.height / rect.height;

    // const x = Math.floor((e.clientX - rect.left) * scaleX);
    // const y = Math.floor((e.clientY - rect.top) * scaleY);
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor(((e.clientX - rect.left) * scaleX) / zoomLevel);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / zoomLevel);

    const color = document.getElementById("colorPicker").value;

    const r = parseInt(color.substr(1,2),16);
    const g = parseInt(color.substr(3,2),16);
    const b = parseInt(color.substr(5,2),16);

    fetch("/change_color",{
        method:"POST",
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({x,y,r,g,b})
    })
    .then(res=>res.json())
    .then(updateImage)

});


function shiftPixels(){

    const shift = parseInt(document.getElementById("shift").value) || 0;

    fetch("/shift_pixels",{
        method:"POST",
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({shift})
    })
    .then(res=>res.json())
    .then(updateImage)
}


function undo(){

    fetch("/undo",{
        method:"POST"
    })
    .then(res=>res.json())
    .then(updateImage)

}


let currentImageObj;

function updateImage(data){

    const img = new Image();

    img.onload = function(){

        currentImageObj = img;

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img,0,0);

    }

    img.src = "data:image/png;base64," + data.image;

}

let startX, startY, endX, endY;
let selecting = false;

canvas.addEventListener("touchstart", e=>{
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
});

canvas.addEventListener("mousedown", function(e){

    const rect = canvas.getBoundingClientRect();

    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    selecting = true;

});

canvas.addEventListener("mousemove", function(e){

    if(!selecting) return;

    const rect = canvas.getBoundingClientRect();

    endX = e.clientX - rect.left;
    endY = e.clientY - rect.top;

    redrawCanvas();

});
canvas.addEventListener("mouseup", function(e){

    const rect = canvas.getBoundingClientRect();

    endX = e.clientX - rect.left;
    endY = e.clientY - rect.top;

    selecting = false;

});

function redrawCanvas(){
    if(!currentImageObj){ undo(); return;}
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(currentImageObj,0,0);

    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 1;   // thinner box
    ctx.setLineDash([5,5]);  // dashed professional look

    ctx.strokeRect(
        startX,
        startY,
        endX - startX,
        endY - startY
    );

}

function downloadImage(){

    const link = document.createElement("a");

    link.download = "Bhalla Edits.png";
    link.href = canvas.toDataURL("image/png");

    link.click();

}

// function shiftRegion(){

//     const shift = parseInt(document.getElementById("shift").value);

//     if(isNaN(shift)){
//         alert("Please enter a shift value");
//         return;
//     }

//     fetch("/shift_region",{
//         method:"POST",
//         headers:{'Content-Type':'application/json'},
//         body:JSON.stringify({
//             x1:Math.floor(Math.min(startX,endX)),
//             y1:Math.floor(Math.min(startY,endY)),
//             x2:Math.floor(Math.max(startX,endX)),
//             y2:Math.floor(Math.max(startY,endY)),
//             shift:shift
//         })
//     })
//     .then(res=>res.json())
//     .then(updateImage)

// }
function shiftRegion(){

    const shift = parseInt(document.getElementById("shift").value) || 0;

    fetch("/shift_region",{
        method:"POST",
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
            x1: Math.floor(Math.min(startX,endX)),
            y1: Math.floor(Math.min(startY,endY)),
            x2: Math.floor(Math.max(startX,endX)),
            y2: Math.floor(Math.max(startY,endY)),
            shift: shift
        })
    })
    .then(res=>res.json())
    .then(data=>{

        updateImage(data);

        // MOVE SELECTION BOX WITH THE SHIFT
        startX += shift;
        endX += shift;

        redrawCanvas();

    });

}


function updateTransform(){
    canvas.style.transform =
        `translate(${offsetX}px, ${offsetY}px) scale(${zoomLevel})`;
}

let zoomLevel = 1;

function zoomIn(){
    zoomLevel += 0.1;
    updateTransform();
}

function zoomOut(){
    zoomLevel = Math.max(0.2, zoomLevel - 0.1);
    updateTransform();
}

function resetZoom(){
    zoomLevel = 1;
    offsetX = 0;
    offsetY = 0;
    updateTransform();
}

//Move Controls
function moveLeft(){
    offsetX += 50;
    updateTransform();
}

function moveRight(){
    offsetX -= 50;
    updateTransform();
}

function moveUp(){
    offsetY += 50;
    updateTransform();
}

function moveDown(){
    offsetY -= 50;
    updateTransform();
}

function updateZoom(){
    canvas.style.transform = `scale(${zoomLevel})`;
}