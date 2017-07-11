var isMouseLDown = false;
var isMouseRDown = false;
var previousX;
var previousY;

function initInputs(){
    canvas.addEventListener("mousemove", getCoords);
    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("mouseup", mouseUp);
    canvas.addEventListener("mousewheel", mouseWheelHandler, false);
    canvas.addEventListener('contextmenu', function(e) {e.preventDefault();}, false);
    // Firefox...
    canvas.addEventListener("DOMMouseScroll", mouseWheelHandler, false);
}

function getCoords(e) {
    // No buttons pressed
    if(e.buttons == 0){
        return;
    }

    var x = e.clientX;
    var y = e.clientY;
    var dX = previousX-x;
    var dY = previousY-y;

    if(isMouseLDown){
        rotateCameraByMouse(dX,dY); 
    }else if(isMouseRDown){
        translateCameraByMouse(dX,dY);
    }
    previousX = x;
    previousY = y;
}

function mouseDown(e) {
    switch(e.button){
        case 0:
            isMouseLDown = true;
            break;
        case 2:
            isMouseRDown = true;
            break;
    }
    previousX = e.clientX;
    previousY = e.clientY;
}

function mouseUp(e) {
    switch(e.button){
        case 0:
            isMouseLDown = false;
            break;
        case 2:
            isMouseRDown = false;
            break;
    }
}

function mouseWheelHandler(e) {
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
    zoomCamera(-delta);
}