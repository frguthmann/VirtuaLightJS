var scene = {mode : 4};
var depthVP;

function drawScene() {
    stats.begin();

    // mvMatrix contains the position of the camera, move it here
    if(camera.shouldSetup){
        camera.setup();
        camera.shouldSetup = false;
    }

    // Pass 1: Render depth map   
    computeDepthMap(); 

    // Pass 2: Render lighting
    render();

    // Pass 3: Render Skybox
    if(skybox.program){
        drawSkybox();
    }

    // Pass X: debug
    //debugDrawOnQuad();

    requestAnimationFrame(drawScene);
    stats.end();
}

function computeDepthMap(){
    gl.useProgram(depthProgram);
    // Activate front face culling to remove shadowmaps artifacts
    gl.cullFace(gl.FRONT);
    // Generate light view-projection matrix
    var idx = 0;//lights.length - 1;
    var lightSpaceMatrix = makeLookAt(lights[idx].position.e(1), lights[idx].position.e(2), lights[idx].position.e(3), 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
    depthVP = camera.orthoProj.multiply(lightSpaceMatrix);
    // Update viewport to match texture size
    gl.viewport(0,0, shadowSize.SHADOW_WIDTH, shadowSize.SHADOW_HEIGHT);
    // Render depth map to texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthMapFBO);
    gl.clear(gl.DEPTH_BUFFER_BIT);    
    drawAllObjectsDepth();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function render(){
    gl.useProgram(shaderProgram);
    // Update lights and camera uniforms
    updateUniforms();
    // Get back to backface culling for normal rendering
    //gl.cullFace(gl.BACK);
    gl.disable(gl.CULL_FACE);
    // Reload original viewport
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // Activate and use depth texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, depthMap);
    drawAllObjects();
    gl.enable(gl.CULL_FACE);
}

function drawSkybox(){
    gl.useProgram(skybox.program);
    // We're inside the cube, must remove cull face
    gl.disable(gl.CULL_FACE);
    // Enable environnement map
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skybox.envCubemap);

    // Update uniforms
    gl.uniformMatrix4fv(skybox.viewUniform, false, new Float32Array(flattenObject(mvMatrix.inverse())));
    gl.uniformMatrix4fv(skybox.projUniform, false, new Float32Array(flattenObject(skybox.proj)));

    // Bind VAO
    gl.bindVertexArray(skybox.vao);
    gl.drawElements(gl.TRIANGLES, skybox.mesh.m_triangles.length * 3, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
    gl.enable(gl.CULL_FACE);
}

function debugDrawOnQuad(texture){
    gl.useProgram(quadProgram);
    gl.uniform1i(gl.getUniformLocation(quadProgram, 'albedo'), 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, Texture.defaultTexture);
    gl.bindVertexArray(quadVertexArray);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
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
    var depthMVP = depthVP.multiply(entities[i].mvMatrix);
    transforms = new Float32Array(((entities[i].mvMatrix.flatten().concat(mvMatrix.flatten())).concat(pMatrix.flatten())).concat(depthMVP.flatten()));
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerDrawBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, transforms);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
}

function updateMatrixUniformBufferDepth(i){
    var depthMVP = depthVP.multiply(entities[i].mvMatrix);
    transforms = new Float32Array(depthMVP.flatten());
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerDrawBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, transforms);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
}

function updateUniforms(){
    // Pushing the lights UBO with updated coordinates
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerPassBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, new Float32Array(flattenObject(lights)));
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    // Send camera position too
    gl.uniform3fv(cameraUniform, flattenObject(camera.getPos()));
}

function setTextures(material){
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
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skybox.irradianceMap);
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skybox.prefilterMap);
    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D, skybox.brdfLUTTexture);
}

function updateSpinner(){
    var loadPercent = document.getElementById("loadPercent");
    loadPercent.textContent = Math.floor((Texture.nbTextureLoaded / Texture.nbTextureToLoad) * 100) + "%";
    if(Texture.nbTextureLoaded == Texture.nbTextureToLoad){
        var spinner = document.getElementById("loader");
        spinner.parentNode.removeChild(spinner);
    }
}