var cubeRotation = 0.0;
var lastCubeUpdateTime = null;

function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    pMatrix = makePerspective(45, 640.0/480.0, 0.1, 100.0);

    loadIdentity();
    mvTranslate([-0.0, 0.0, -6.0]);

    mvPushMatrix();
    rotateTheCube();
    
    // Only if the mesh changed
    // Send vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Send normals
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesNormalBuffer);
    gl.vertexAttribPointer(vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

    // Send colors
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesColorBuffer);
    gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);
    

    // Update transforms
    setMatrixUniforms();

    // Updating UBOs before drawing
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerDrawBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, transforms);

    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerPassBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, light);

    // Send triangles
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);
    gl.drawElements(gl.TRIANGLES, mesh.m_triangles.length * 3, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix();

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