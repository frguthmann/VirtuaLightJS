var isMouseLDown = false;
var isMouseRDown = false;
var previousX;
var previousY;

function initInputs(){
    canvas.addEventListener("mousemove", getCoords);
    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("mouseup", mouseUp);
    canvas.addEventListener("mousewheel", mouseWheelHandler, false);
    document.addEventListener("keydown", keyboardHandler);
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
        camera.rotateByMouse(dX,dY);
        lastUpdateTime = Date.now() + 2000;
    }else if(isMouseRDown){
        camera.translateByMouse(dX,dY);
    }
    previousX = x;
    previousY = y;
}

function mouseDown(e) {
    switch(e.button){
        case 0:
            isMouseLDown = true;
            lastUpdateTime = Date.now() + 2000;
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
    camera.zoom(-delta);
}

function keyboardHandler(e) {
    switch(e.keyCode){
        case 82:
            isRotating = !isRotating;
        break;
        default:
            console.log("You pressed: " + e.keyCode);
        break;
    }
    return false;
}