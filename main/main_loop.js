var scene = {mode : 4};
var depthVP;

function drawScene() {
    stats.begin();

    // mvMatrix contains the position of the camera, move it here
    if(camera.shouldSetup){
        camera.setup();
        camera.shouldSetup = false;
    }

    // Compute light positions relative to this camera and update UBO
    updateLightsUniformBuffer();

    // Pass 1: Render depth map   
    computeDepthMap(); 

    // Pass 2: Render lighting
    render();
    
    // debugDrawOnQuad();

    requestAnimationFrame(drawScene);
    stats.end();
}

function computeDepthMap(){
    // Activate front face culling to remove shadowmaps artifacts
    gl.cullFace(gl.FRONT);
    // Generate light view-projection matrix
    var lightSpaceMatrix = makeLookAt(lights[0].position.e(1), lights[0].position.e(2), lights[0].position.e(3), 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
    depthVP = camera.orthoProj.multiply(lightSpaceMatrix);
    // Update viewport to match texture size
    gl.viewport(0,0, shadowSize.SHADOW_WIDTH, shadowSize.SHADOW_HEIGHT);
    
    // Render depth map to texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthMapFBO);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(depthProgram);    
    drawAllObjectsDepth();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function render(){
    // Get back to backface culling for normal rendering
    gl.disable(gl.CULL_FACE);
    // Reload original viewport
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // Use lighting program
    gl.useProgram(shaderProgram);
    // Activate and use depth texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, depthMap);
    drawAllObjects();
    
    drawSkybox();
    gl.enable(gl.CULL_FACE);
}

function drawSkybox(){
    if(skybox.program){
        gl.useProgram(skybox.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, skybox.envCubemap);

        gl.uniformMatrix4fv(skybox.viewUniform, false, new Float32Array(flattenObject(mvMatrix)));   //Matrix.Diagonal([0.01,0.01,1,1]).x(Matrix.I(4))
        gl.uniformMatrix4fv(skybox.projUniform, false, new Float32Array(flattenObject(skybox.proj)));

        // Bind VAO
        gl.bindVertexArray(skybox.vao);
        // Draw triangles
        gl.drawElements(gl.TRIANGLES, 12 * 3, gl.UNSIGNED_SHORT, 0);
        // UNBIND VAO
        gl.bindVertexArray(null);
    }
}

function debugDrawOnQuad(texture){
    gl.clearColor(0.0, 0.0, 1.0, 0.1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Quad for debug
    gl.useProgram(quadProgram);
    gl.uniform1i(drawUniformDepthLocation, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.bindVertexArray(quadVertexArray);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawAllObjectsDepth(){
    // Render all entities with specific VAO / VBO / UBO 
    var size = depthVaos.length - lights.length;
    for(var i=0; i<size; i++){
        // Compute and update transforms UBOs according to mvMatrix
        updateMatrixUniformBufferDepth(i);
        // Bind VAO
        gl.bindVertexArray(depthVaos[i]);
        // Draw triangles
        gl.drawElements(scene.mode, entities[i].mesh.m_triangles.length * 3, gl.UNSIGNED_SHORT, 0);
        // UNBIND VAO
        gl.bindVertexArray(null);
    }
}

function drawAllObjects(){
    // Render all entities with specific VAO / VBO / UBO 
    for(var i=0; i<vaos.length; i++){
        // Handle automatic rotation
        if(entities[i].isRotating == true){
            rotateEntity(i); 
        }else{
            entities[i].lastUpdateTime = Date.now();
        }

        // Compute and update transforms UBOs according to mvMatrix
        updateMatrixUniformBuffer(i);

        // Set textures according to material or default if none found
        var material = entities[i].mesh.material; 
        setTextures(material);

        // Bind VAO
        gl.bindVertexArray(vaos[i]);
        // Draw triangles
        gl.drawElements(scene.mode, entities[i].mesh.m_triangles.length * 3, gl.UNSIGNED_SHORT, 0);
        // UNBIND VAO
        gl.bindVertexArray(null);
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
    nMatrix = mvMatrix.inverse();
    nMatrix = nMatrix.transpose();
    var depthMVP = depthVP.multiply(entities[i].mvMatrix);
    transforms = new Float32Array(((mvMatrix.multiply(entities[i].mvMatrix).flatten().concat(nMatrix.flatten())).concat(pMatrix.flatten())).concat(depthMVP.flatten()));
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerDrawBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, transforms);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
}

function updateMatrixUniformBufferDepth(i){
    //console.log(mvMatrix,entities[i].mvMatrix);
    var depthMVP = depthVP.multiply(entities[i].mvMatrix);
    transforms = new Float32Array(depthMVP.flatten());
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

function setTextures(material){
    if(skybox.envCubemap){
        gl.activeTexture(gl.TEXTURE6);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, skybox.envCubemap);
    }
    if(material){
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, material.albedo);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, material.normal);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, material.roughness);

        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, material.ao);

        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, material.fresnel);

    }else{
        // Put default white texture
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, MeshMaterial.defaultTexture);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, MeshMaterial.defaultTexture);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, MeshMaterial.defaultTexture);

        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, MeshMaterial.defaultTexture);

        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, MeshMaterial.defaultTexture);
    }
}

function updateSpinner(){
    var loadPercent = document.getElementById("loadPercent");
    loadPercent.textContent = Math.floor((MeshMaterial.nbTextureLoaded / MeshMaterial.nbTextureToLoad) * 100) + "%";
    if(MeshMaterial.nbTextureLoaded == MeshMaterial.nbTextureToLoad){
        var spinner = document.getElementById("loader");
        spinner.parentNode.removeChild(spinner);
    }
}