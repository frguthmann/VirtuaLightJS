var isMouseLDown = false;
var isMouseRDown = false;
var previousX;
var previousY;

document.addEventListener("mousemove", getCoords);
document.addEventListener("mousedown", mouseDown);
document.addEventListener("mouseup", mouseUp);
document.addEventListener('contextmenu', function(e) {e.preventDefault();}, false);

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