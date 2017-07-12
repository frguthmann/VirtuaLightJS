// Camera initialization
var fovAngle = 45.0;
var nearPlane = 0.01;
var farPlane = 20.0;
var camTheta = 3*Math.PI/8.0;
var camPhi = 0.0;
var camDist2Target = 6.0;
var camTargetX = 0.0;
var camTargetY = 0.0;
var camTargetZ = 0.0;

function translateCameraByMouse(dX, dY){
    
    // Compute which direction onscreen horizontal movement is in the scene

    var mxX = Math.cos(camPhi);
    var myX = 0;
    var mzX = - Math.sin(camPhi);

    var mxY = Math.cos(camTheta) * Math.sin(camPhi);
    var myY = - Math.sin(camTheta);
    var mzY = Math.cos(camTheta) * Math.cos(camPhi);

    camTargetX += 0.01*(mxX*(dX) + mxY*(dY));
    camTargetY += 0.01*(myY*(dY));
    camTargetZ += 0.01*(mzX*(dX) + mzY*(dY));

    setupCamera();
}

function rotateCameraByMouse(dX, dY){
    camTheta+=(dY)*0.01;
    camPhi+=(dX)*0.01;
    if(camTheta<0.0001){
      camTheta = 0.0001;
    }
    if(camTheta > Math.PI - 0.0001){
        camTheta = Math.PI - 0.0001;
    }
    setupCamera();
}

function setupCamera () {
    mvMatrix = Matrix.I(4);
    var pos = {x:0,y:0,z:0};

    polar2CartesianCamera(camTheta, camPhi, camDist2Target, pos);

    pos.x += camTargetX;
    pos.y += camTargetY;
    pos.z += camTargetZ;
    mvMatrix = makeLookAt(pos.x, pos.y, pos.z, camTargetX, camTargetY, camTargetZ, 0.0, 1.0, 0.0); // Set up the current modelview matrix with camera transform
}

function zoomCamera(step){
    camDist2Target = Math.max(1,camDist2Target+step);
    console.log(camDist2Target);
    setupCamera();
}

function polar2CartesianCamera (theta, phi, r, pos) {
    pos.z = r * Math.sin (theta) * Math.cos (phi);
    pos.x = r * Math.sin (theta) * Math.sin (phi);
    pos.y = r * Math.cos (theta);
}

function rotateCameraByAngle(phi, pheta){
    camPhi+=pheta;
    camTheta+=phi;
    setupCamera();
}