var cubeRotation = 0.0;
var lastUpdateTime = null;
var isRotating = true;

function drawScene() {
    stats.begin();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* 
        mvMatrix contains the position of the camera
        move the camera here
    */

    if(camera.shouldSetup){
        camera.setup();
        camera.shouldSetup = false;
    }

    // Compute light positions relative to this camera
    transformLightPositions();
    // Pushing the lights UBO with updated coordinates
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerPassBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, new Float32Array(flattenObject(dataLights)));
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    for(var i=0; i<vaos.length; i++){
        
        // The mvMatrix will be changed for each object, we need to store the original state
        mvPushMatrix();

        if(i==0){
            if(isRotating == true){
                rotateTheObject(); 
            }else{
                lastUpdateTime = Date.now();
            }
        }

        // Update transforms according to mvMatrix
        setMatrixUniforms();

        // Updating transforms UBOs before drawing: projection matrix not updated, it's never changed
        gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerDrawBuffer);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, transforms, 0, transforms.length*(2.0/3.0));

        // Bind VAO
        gl.bindVertexArray(vaos[i]);
        // Draw triangles
        gl.drawElements(gl.TRIANGLES, meshes[i].m_triangles.length * 3, gl.UNSIGNED_SHORT, 0);
        // UNBIND VAO
        gl.bindVertexArray(null);

        mvPopMatrix();
    }

    requestAnimationFrame(drawScene);
    stats.end();
}

function rotateTheObject(){
    var currentTime = Date.now();
    if (lastUpdateTime) {
        var delta = currentTime - lastUpdateTime;
        cubeRotation = (60 * delta) / 1000.0;
    }else{
       lastUpdateTime = currentTime; 
    }

    if(delta > 0 ){
        //console.log("Rotating", mvMatrix);
        mvRotate(cubeRotation, [0, 1, 0]);
        //console.log("Rotated", mvMatrix);
        //camera.rotateByAngle(0,-cubeRotation*0.01);
        lastUpdateTime = currentTime;
    }
}

function setMatrixUniforms() {
    nMatrix = mvMatrix.inverse();
    nMatrix = nMatrix.transpose();
    transforms = new Float32Array((mvMatrix.flatten().concat(nMatrix.flatten())).concat(pMatrix.flatten()));
}

function transformLightPositions(){
    // Update position with the new mvMatrix
    for(var i=0; i<lights.length; i++){
        dataLights[i].position = mvMatrix.multiply(lights[i].position);
        dataLights[i].intensity = lights[i].intensity;
    }
}