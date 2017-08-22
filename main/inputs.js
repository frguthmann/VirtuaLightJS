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
            autoRotation.isRotating = !autoRotation.isRotating;
        break;
        case 87:
            if(scene.mode == gl.TRIANGLES){
                scene.mode = gl.LINES;
                guiObj.sceneMode = "Wireframe";
            }else{
                scene.mode = gl.TRIANGLES;
                guiObj.sceneMode = "Normal";
            }
        break;
        case 107:
            camera.zoom(-1.0);
        break;
        case 109:
            camera.zoom(1.0);
        break;
        default:
            console.log("You pressed: " + e.keyCode);
        break;
    }
    return false;
}