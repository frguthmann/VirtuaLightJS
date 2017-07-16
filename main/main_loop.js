var scene = {mode : 4, mvMatrixStack : []};
var lightSpaceMatrix;

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

    // Pass 1: Depth
    mvPushMatrix();
    var near_plane = 1.0, far_plane = 15.0;
    pMatrix = makeOrtho(-5.0, 5.0, -5.0, 5.0, camera.nearPlane, camera.farPlane);
    lightSpaceMatrix = makeLookAt(lights[0].position.e(1), lights[0].position.e(2), lights[0].position.e(3), 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
    mvMatrix = lightSpaceMatrix;
    gl.viewport(0,0, SHADOW_WIDTH, SHADOW_HEIGHT);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, depthMapFBO);
    gl.enable(gl.DEPTH_TEST); // Need to write depth
    gl.clear(gl.DEPTH_BUFFER_BIT);
    // Bind program
    gl.useProgram(depthProgram);    
    drawAllObjectsDepth();
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    mvPopMatrix();

    // Pass 2: Draw
    /*gl.clearColor(0.0, 0.0, 1.0, 0.1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Quad for debug
    gl.useProgram(quadProgram);
    gl.uniform1i(drawUniformDepthLocation, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, depthMap);
    gl.bindVertexArray(quadVertexArray);
    gl.drawArrays(gl.TRIANGLES, 0, 6);*/

    // 2. then render scene as normal with shadow mapping (using depth map)
    pMatrix = makePerspective(camera.fovAngle, canvas.width/canvas.height, camera.nearPlane, camera.farPlane);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(0.0, 0.0, 1.0, 0.1);
    gl.useProgram(shaderProgram);
    gl.uniform1i(shadowMapUniform, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, depthMap);
    drawAllObjects();

    requestAnimationFrame(drawScene);
    stats.end();
}

function drawAllObjectsDepth(){
    // Render all entities with specific VAO / VBO / UBO 
    for(var i=0; i<depthVaos.length - lights.length; i++){
        
        // The mvMatrix will be changed for each object, we need to store the original state
        mvPushMatrix();

        // Compute and update transforms UBOs according to mvMatrix
        updateMatrixUniformBuffer(i);

        // Bind VAO
        gl.bindVertexArray(depthVaos[i]);
        // Draw triangles
        gl.drawElements(scene.mode, entities[i].mesh.m_triangles.length * 3, gl.UNSIGNED_SHORT, 0);
        // UNBIND VAO
        gl.bindVertexArray(null);

        mvPopMatrix();
    }
}

function drawAllObjects(){
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
        gl.drawElements(scene.mode, entities[i].mesh.m_triangles.length * 3, gl.UNSIGNED_SHORT, 0);
        // UNBIND VAO
        gl.bindVertexArray(null);

        mvPopMatrix();
    }
}

function rotateEntity(i){
    var currentTime = Date.now();
    
    if (entities[i].lastUpdateTime) {
        var delta = currentTime - entities[i].lastUpdateTime;
        var objRotation = (60 * delta) / 1000.0;
    }else{
       entities[i].lastUpdateTime = currentTime; 
    }

    if(delta > 0 ){
        entities[i].rot[0] = (entities[i].rot[0] + objRotation) % 360;
        updateObjectMVMatrix(i);
        entities[i].lastUpdateTime = currentTime;
    }
}

function updateMatrixUniformBuffer(i) {
    //console.log(mvMatrix,entities[i].mvMatrix);
    mvMatrix = mvMatrix.multiply(entities[i].mvMatrix);
    lightSpaceMatrix = lightSpaceMatrix.multiply(entities[i].mvMatrix);
    nMatrix = mvMatrix.inverse();
    nMatrix = nMatrix.transpose();
    transforms = new Float32Array(((mvMatrix.flatten().concat(nMatrix.flatten())).concat(pMatrix.flatten())).concat(lightSpaceMatrix.flatten()));
    
    // Updating transforms UBOs: projection matrix not updated, it's never changed
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerDrawBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, transforms); //, 0, transforms.length*(2.0/3.0)
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