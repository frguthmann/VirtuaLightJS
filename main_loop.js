var cubeRotation = 0.0;
var lastCubeUpdateTime = null;

function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    perspectiveMatrix = makePerspective(45, 640.0/480.0, 0.1, 100.0);

    loadIdentity();
    mvTranslate([-0.0, 0.0, -6.0]);

    mvPushMatrix();
    rotateTheCube();
    
    // Send vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Send colors
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesColorBuffer);
    gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

    // Send triangles
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);
    setMatrixUniforms();
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