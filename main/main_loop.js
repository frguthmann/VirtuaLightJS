var objRotation = 0.0;
var mvMatrixStack = [];

function drawScene() {
    stats.begin();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
 
    // mvMatrix contains the position of the camera, move it here
    if(camera.shouldSetup){
        camera.setup();
        camera.shouldSetup = false;
    }

    // Compute light positions relative to this camera and update UBO
    updateLightsUniformBuffer();

    // Render all entities with specific VAO / VBO / UBO 
    for(var i=0; i<vaos.length; i++){
        
        // The mvMatrix will be changed for each object, we need to store the original state
        mvPushMatrix();

        // TODO: Change lastUpdateTime to entity value
        if(entities[i].isRotating == true){
            rotateEntity(i); 
        }else{
            entities[i].lastUpdateTime = Date.now();
        }

        // Update material for mesh
        updateMeshMaterialUniform(i);

        // Compute and update transforms UBOs according to mvMatrix
        updateMatrixUniformBuffer(i);

        // Bind VAO
        gl.bindVertexArray(vaos[i]);
        // Draw triangles
        gl.drawElements(gl.TRIANGLES, entities[i].mesh.m_triangles.length * 3, gl.UNSIGNED_SHORT, 0);
        // UNBIND VAO
        gl.bindVertexArray(null);

        // entities[i].mvMatrix = mvMatrix;
        mvPopMatrix();
    }

    requestAnimationFrame(drawScene);
    stats.end();
}

function rotateEntity(i){
    var currentTime = Date.now();
    if (entities[i].lastUpdateTime) {
        var delta = currentTime - entities[i].lastUpdateTime;
        objRotation = (60 * delta) / 1000.0;
    }else{
       entities[i].lastUpdateTime = currentTime; 
    }
    if(delta > 0 ){
        entities[i].rot[0] = (entities[i].rot[0] + objRotation) % 360;
        updateMVMatrix(i);
        entities[i].lastUpdateTime = currentTime;
    }
}

function updateMatrixUniformBuffer(i) {
    //console.log(mvMatrix,entities[i].mvMatrix);
    mvMatrix = mvMatrix.multiply(entities[i].mvMatrix);
    nMatrix = mvMatrix.inverse();
    nMatrix = nMatrix.transpose();
    transforms = new Float32Array((mvMatrix.flatten().concat(nMatrix.flatten())).concat(pMatrix.flatten()));
    
    // Updating transforms UBOs: projection matrix not updated, it's never changed
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerDrawBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, transforms, 0, transforms.length*(2.0/3.0));
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
}

function updateLightsUniformBuffer(){
    // Update position with the new mvMatrix
    for(var i=0; i<lights.length; i++){
        dataLights[i].position = mvMatrix.multiply(lights[i].position);
        dataLights[i].intensity = lights[i].intensity;
    }
        // Pushing the lights UBO with updated coordinates
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerPassBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, new Float32Array(flattenObject(dataLights)));
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
}

function updateMeshMaterialUniform(i){
    var meshMaterial = entities[i].material;
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerSceneBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, new Float32Array(flattenObject(meshMaterial)));
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
}