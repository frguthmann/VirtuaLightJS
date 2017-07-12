var cubeRotation = 0.0;
var lastCubeUpdateTime = null;

function drawScene() {
    stats.begin();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //mvPushMatrix();
    rotateTheCamera();    

    // Update transforms and lights positions
    setMatrixUniforms();
    transformLightPositions();

    // Updating UBOs before drawing
    // TODO: Do not update the projection matrix, it never changes
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerDrawBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, transforms);

    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerPassBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, new Float32Array(flattenObject(dataLights)));

    // Send triangles
    gl.drawElements(gl.TRIANGLES, mesh.m_triangles.length * 3, gl.UNSIGNED_SHORT, 0);
    //mvPopMatrix();

    requestAnimationFrame(drawScene);
    stats.end();
}

function rotateTheCamera(){
    var currentTime = Date.now();
    if (lastCubeUpdateTime) {
        var delta = currentTime - lastCubeUpdateTime;
        cubeRotation = (60 * delta) / 1000.0;
    }else{
       lastCubeUpdateTime = currentTime; 
    }

    if(delta > 0 ){
        //mvRotate(cubeRotation, [0, 1, 0]);
        rotateCameraByAngle(0,-cubeRotation*0.01);
        lastCubeUpdateTime = currentTime;
    }
}

function setMatrixUniforms() {
    nMatrix = mvMatrix.inverse();
    nMatrix = nMatrix.transpose();
    transforms = new Float32Array((pMatrix.flatten().concat(mvMatrix.flatten())).concat(nMatrix.flatten()));
}

function transformLightPositions(){
    // Update position with the new mvMatrix
    for(var i=0; i<lights.length; i++){
        dataLights[i].position = mvMatrix.multiply(lights[i].position);
    }
}