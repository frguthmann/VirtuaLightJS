var cubeRotation = 0.0;
var lastCubeUpdateTime = null;

function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mvPushMatrix();
    rotateTheCube();    

    // Update transforms
    setMatrixUniforms();

    // Updating UBOs before drawing
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerDrawBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, transforms);

    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerPassBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, new Float32Array(flattenObject(light)));

    // Send triangles
    gl.drawElements(gl.TRIANGLES, mesh.m_triangles.length * 3, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix();

    requestAnimationFrame(drawScene);
}


function rotateTheCube(){
    var currentTime = Date.now();
        if (lastCubeUpdateTime) {
            var delta = currentTime - lastCubeUpdateTime;
            cubeRotation += (30 * delta) / 1000.0;
        }
    mvRotate(cubeRotation, [1, 1, 0]);
    lastCubeUpdateTime = currentTime;
}

function setMatrixUniforms() {
    nMatrix = mvMatrix.inverse();
    nMatrix = nMatrix.transpose();
    transforms = new Float32Array((pMatrix.flatten().concat(mvMatrix.flatten())).concat(nMatrix.flatten()));
}