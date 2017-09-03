// Webgl program
var gl;
// Shader programs
var shaderProgram;
var depthProgram;

// Shadowmap size
var shadowSize = {SHADOW_WIDTH : 1024, SHADOW_HEIGHT : 1024};   // 640 * 480
// Shadowmap FBO
var depthMapFBO;
// Shadowmap texture
var depthMap;
// Uniform to update shadow map location in fragment shader
var shadowMapUniform;

// Debug quads
var quadVertexArray;
var drawUniformDepthLocation;

// Main canvas we're drawing in
var canvas;
// Camera
var camera = new Camera();

// Projection matrix
var pMatrix;
// ModelView matrix
var mvMatrix;
// Normal matrix
var nMatrix;

// UBOS
var uniformPerDrawBuffer;
var uniformPerPassBuffer;

// VAOs
var vaos = [];
var depthVaos = [];

// Contains matrices: projection, modelView and normals
var transforms;
// Contains the geometry and material properties of the object
var meshes = [];
// Contains every renderable object, including lights debug models 
var entities = [];
// Contains the lights of the scene
var lights = [];
// Same as lights but with position * modelViewMatrix
var dataLights = [];
var max_lights = 5;
// Size of the cube representing the light when rendering
var cubeSize = 0.2;

var iblUniform;
var envCubemap;
var skyboxProgram;
var skyboxViewUniform;
var skyboxProjUniform;
var vertexArray;

function start() {
    canvas = document.getElementById('glCanvas');
    
    // Initialize the GL context
    gl = canvas.getContext('webgl2', 
        {   
            antialias: true 
        });
    var isWebGL2 = !!gl;
    if(!isWebGL2) {
        alert("Your browser does not support WebGL2 :/");
        return;
    }

    // Only continue if WebGL is available and working
    if (!gl) {
        return;
    }

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    // Near things obscure far things
    gl.depthFunc(gl.LEQUAL);
    // Enable culling 
    gl.enable(gl.CULL_FACE);
    // Cull only back faces
    gl.cullFace(gl.BACK);
    // Set clear color to light blue
    gl.clearColor(0.0, 0.0, 1.0, 0.1);
    // Clear the color as well as the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Initiate shaders
    initShaders();

    iblUniform =  gl.getUniformLocation(shaderProgram, "isIBL");
    gl.uniform1i(iblUniform, 0);

    // Set texture uniforms
    setSamplerUniforms();
    
    // Contains every object declaration with material
    loadObjects()

    // Fill the uniform buffers
    initUBOs();

    // Test IBL
    initSkyBox();
}

function startNext(){

    gl.useProgram(shaderProgram);  

    // Create VAOs and data buffers
    for(var i=0; i<entities.length; i++){
        var verticesBuffer          = gl.createBuffer();
        var verticesIndexBuffer     = gl.createBuffer();
        var verticesNormalBuffer    = gl.createBuffer();
        var verticesTexCoordsBuffer = gl.createBuffer();

        var hasUV = (entities[i].mesh.m_UV.length > 0);
    
        // Initiate buffers
        initBuffers(entities[i].mesh, verticesBuffer, verticesIndexBuffer, verticesNormalBuffer, verticesTexCoordsBuffer, hasUV);
        // Init VAO
        initVAO(verticesBuffer, verticesIndexBuffer, verticesNormalBuffer, verticesTexCoordsBuffer, hasUV);
        // Init DepthVAO
        initDepthVAO(verticesBuffer, verticesIndexBuffer);
    }

    // Debug quads
    //initQuad();

    // Display GUI
    initGui();

    // Activate mouse / keyboard input
    initInputs();

    // Load depth shaders, generate depth texture and framebuffer to compute shadow maps
    initShadowMapFrameBuffer();

    console.log("Main initialization done");

    // The scene will be drawn only if the default texture is loaded
    drawSceneIfReady();
}

function initShaders() {
    vertex_shader = vertex_shader.replace(/^\s+|\s+$/g, '');
    fragment_shader = fragment_shader.replace(/^\s+|\s+$/g, '');
    shaderProgram = createProgram(gl, vertex_shader, fragment_shader);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    }

    gl.useProgram(shaderProgram);
}

window.createProgram = function(gl, vertexShaderSource, fragmentShaderSource) {
    var program = gl.createProgram();
    var vshader = createShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    var fshader = createShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    gl.attachShader(program, vshader);
    gl.deleteShader(vshader);
    gl.attachShader(program, fshader);
    gl.deleteShader(fshader);
    gl.linkProgram(program);

    var log = gl.getProgramInfoLog(program);
    if (log) {
        console.log(log);
    }

    log = gl.getShaderInfoLog(vshader);
    if (log) {
        console.log(log);
    }

    log = gl.getShaderInfoLog(fshader);
    if (log) {
        console.log(log);
    }

    return program;
};

function createShader(gl, source, type) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

function setSamplerUniforms(){
    gl.uniform1i(gl.getUniformLocation(shaderProgram, 'shadowMap'), 0);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "albedoMap"), 1);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "normalMap"), 2);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "roughnessMap"), 3);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "aoMap"), 4);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "fresnelMap"), 5);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, 'environmentMap'), 6);
}

// Wait for both default texture and main initialization code to finish before drawing
function drawSceneIfReady(){

    // Check to see if the counter has been initialized
    if (!drawSceneIfReady.counter) {
        // It has not... perform the initialization
        drawSceneIfReady.counter = 0;
    }
    
    // Add one use of it
    drawSceneIfReady.counter++;

    // This function should be called twice before we can draw the scene (default texture + main thread)
    if(drawSceneIfReady.counter == 2){
        console.log("drawing");
        drawScene();
    }
}

function loadObjects(){

    // Start drawing the scene one the texture is loaded
    MeshMaterial.loadDefaultTexture(function(){
        console.log("Default texture loaded");
        // The scene will be drawn only if the main initialization is done
        drawSceneIfReady();
    });

    // Load and transform the gun object
    material = new MeshMaterial(
        "models/mask/mask_BC.jpg",
        "models/mask/mask_N.jpg",
        "models/mask/mask_R.jpg",
        "models/mask/mask_AO.jpg",
        "models/mask/mask_M.jpg");
    mesh = new Mesh(material);
    mesh.loadPly(maskjs);
    entities.push(new Entity(mesh, "Mask", Matrix.I(4)));
    entities[entities.length-1].pos = [-1.3,1,0];
    entities[entities.length-1].scale = 1.3;

     // Ball thingy
    material = new MeshMaterial(
        "models/ball/ball_BC.png",
        "models/ball/ball_N.png",
        "models/ball/ball_R.png",
        "models/ball/ball_AO.png",
        "models/ball/ball_M.png");
    mesh = new Mesh(material);
    mesh.loadPly(balljs);
    entities.push(new Entity(mesh, "Ball", Matrix.I(4)));
    entities[entities.length-1].pos = [1.25,0.355,0];
    //entities[entities.length-1].scale = 0.1;

    // Sword
    material = new MeshMaterial(
        "models/sword/sword_BC.jpg",
        "models/sword/sword_N.png",
        "models/sword/sword_R.jpg",
        "textures/default.png",
        "models/sword/sword_M.jpg");
    mesh = new Mesh(material);
    mesh.loadPly(swordjs);
    entities.push(new Entity(mesh, "Sword", Matrix.I(4)));
    entities[entities.length-1].pos = [0,1.8,-2];

    // Create a plan underneath both objects
    material = new MeshMaterial(
        "textures/floor/tiles_BC.png",
        "textures/floor/tiles_N.png",
        "textures/floor/tiles_R.png",
        "textures/floor/tiles_AO.png");
    /*material = new MeshMaterial( shaderProgram,
        "textures/brick/brick_BC.jpg",
        "textures/brick/brick_N.jpg");*/
    mesh = new Mesh(material);
    mesh.makePlan(3.0, 50);
    entities.push(new Entity(mesh, "Floor", Matrix.I(4)));

    // BACKGROUND PLAN
    material = new MeshMaterial(
        "textures/rust/rust_BC.png",
        "textures/rust/rust_N.png",
        "textures/rust/rust_R.png",
        "textures/rust/rust_AO.png",
        "textures/rust/rust_M.png");
    mesh = new Mesh(material);
    mesh.makePlan2(1.0);
    entities.push(new Entity(mesh, "Background", Matrix.I(4)));
    entities[entities.length-1].pos = [1.5,1.5,-3];
    entities[entities.length-1].rot = [0,90];
    entities[entities.length-1].scale = 1.5;
    /*entities[entities.length-1].rot = [0,90];
    entities[entities.length-1].scale = 5.0;*/

    // Test cube
    /*material = new MeshMaterial();
    material.assignTexture("albedo", "ibl/Arches_E_PineTree/Arches_E_PineTree_3k.hdr", true);*/
    mesh = new Mesh(material);
    mesh.makeCube(0.2);
    mesh.computeCubeUV();
    entities.push(new Entity(mesh, "Cube", Matrix.I(4)));
    entities[entities.length-1].pos = [0,1.5,0];
}

function initUBOs(){

    // Find and link uniform blocks
    var uniformPerDrawLocation = gl.getUniformBlockIndex(shaderProgram, 'PerDraw');
    var uniformPerPassLocation = gl.getUniformBlockIndex(shaderProgram, 'PerPass'); 
    gl.uniformBlockBinding(shaderProgram, uniformPerDrawLocation, 0);
    gl.uniformBlockBinding(shaderProgram, uniformPerPassLocation, 1);

    // Create transform UBO and bind it to data
    transforms = createMatrixTransforms(shaderProgram, 0);
    uniformPerDrawBuffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerDrawBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, transforms, gl.DYNAMIC_DRAW);

    // Create and bind lights to light_UBO
    var lightData = createLights(shaderProgram, 1);
    uniformPerPassBuffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerPassBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, lightData, gl.DYNAMIC_DRAW);
    
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
}

function initBuffers(mesh, verticesBuffer, verticesIndexBuffer, verticesNormalBuffer, verticesTexCoordsBuffer, hasUV) {

    // Vertex Buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    var positions = new Float32Array(flattenObject(mesh.m_positions));
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);
    var triangles = new Uint16Array(flattenObject(mesh.m_triangles));
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangles, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // Normals Buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesNormalBuffer);
    var normals = new Float32Array(flattenObject(mesh.m_normals));
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Texture Buffer
    if(hasUV){
        gl.bindBuffer(gl.ARRAY_BUFFER, verticesTexCoordsBuffer);
        var texCoords = new Float32Array(flattenObject(mesh.m_UV));
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
}

function initVAO(verticesBuffer, verticesIndexBuffer, verticesNormalBuffer, verticesTexCoordsBuffer, hasUV){

    // Create buffer location attributes
    var vertexPositionAttribute = 0;
    var vertexNormalAttribute   = 1;
    var texCoordsAttribute      = 2;

    // Fill VAO with the right calls
    var vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);

    // Send vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.enableVertexAttribArray(vertexPositionAttribute);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Send normals
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesNormalBuffer);
    gl.enableVertexAttribArray(vertexNormalAttribute);   
    gl.vertexAttribPointer(vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

    // Send texture coordinates
    if(hasUV){
        gl.bindBuffer(gl.ARRAY_BUFFER, verticesTexCoordsBuffer);
        gl.enableVertexAttribArray(texCoordsAttribute);   
        gl.vertexAttribPointer(texCoordsAttribute, 2, gl.FLOAT, false, 0, 0);
    }

    // Send indexes
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);

    // Bind UBOs
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, uniformPerDrawBuffer);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 1, uniformPerPassBuffer);

    gl.bindVertexArray(null);
    vaos.push(vertexArray);
}

function initDepthVAO(verticesBuffer, verticesIndexBuffer){

    // Create buffer location attributes
    vertexPositionAttribute = 0;

    // Fill VAO with the right calls
    var vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);

    // Send vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.enableVertexAttribArray(vertexPositionAttribute);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    
    // Send indexes
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);

    // Bind UBOs
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, uniformPerDrawBuffer);

    gl.bindVertexArray(null);
    depthVaos.push(vertexArray);
}

function initQuad(){
    // Init quad shaders
    quad_vertex_shader = quad_vertex_shader.replace(/^\s+|\s+$/g, '');
    quad_fragment_shader = quad_fragment_shader.replace(/^\s+|\s+$/g, '');
    quadProgram = createProgram(gl, quad_vertex_shader, quad_fragment_shader);
    drawUniformDepthLocation = gl.getUniformLocation(quadProgram, 'depthMap');

    var quadPositions = new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
         1.0,  1.0,
         1.0,  1.0,
        -1.0,  1.0,
        -1.0, -1.0
    ]);
    var quadVertexPosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadPositions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    var quadTexcoords = new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        1.0, 1.0,
        0.0, 1.0,
        0.0, 0.0
    ]);
    var quadVertexTexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexTexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadTexcoords, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);


    quadVertexArray = gl.createVertexArray();
    gl.bindVertexArray(quadVertexArray);
    var drawVertexPosLocation = 0; // set with GLSL layout qualifier
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexPosBuffer);
    gl.vertexAttribPointer(drawVertexPosLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(drawVertexPosLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    var drawVertexTexLocation = 4; // set with GLSL layout qualifier
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexTexBuffer);
    gl.vertexAttribPointer(drawVertexTexLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(drawVertexTexLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
}

function initSkyBox(){

    //var ext = gl.getExtension('EXT_color_buffer_half_float');

    var captureFBO = gl.createFramebuffer();
    var captureRBO = gl.createRenderbuffer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, captureFBO);
    gl.bindRenderbuffer(gl.RENDERBUFFER, captureRBO);

    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, 512, 512);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, captureRBO);  

    generate_skybox_vertex_shader = generate_skybox_vertex_shader.replace(/^\s+|\s+$/g, '');
    generate_skybox_fragment_shader = generate_skybox_fragment_shader.replace(/^\s+|\s+$/g, '');
    var generateSkyboxProgram = createProgram(gl, generate_skybox_vertex_shader, generate_skybox_fragment_shader);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(generateSkyboxProgram, gl.LINK_STATUS)) {
        console.log('Unable to initialize the shader program: ' + gl.getProgramInfoLog(generateSkyboxProgram));
    }

    gl.useProgram(generateSkyboxProgram);  

    var equiRectUniform = gl.getUniformLocation(generateSkyboxProgram, "equirectangularMap");
    gl.uniform1i(equiRectUniform, 0);
    
    /*var image = new HDRImage();    
    var hdrTexture = gl.createTexture();

    image.onload=function() {
        gl.bindTexture(gl.TEXTURE_2D, hdrTexture);
        // set the texture wrapping/filtering options (on the currently bound texture object)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // load and generate the texture
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB16F, image.width, image.height, 0, gl.RGB, gl.FLOAT, image.dataFloat)
        gl.bindTexture(gl.TEXTURE_2D, null);
        console.log("loaded texture sucessfully");
        renderSkybox(hdrTexture, captureFBO, generateSkyboxProgram, image);
    };
    
    image.onerror=function() { // when .png failed
        console.log("Couldn't load " + texturePath);   
    };
    
    image.src = "ibl/Arches_E_PineTree/Arches_E_PineTree_3k.hdr";*/

    
    // Test pour mapper des textures directement sur les faces de la cubemap
    var image = new Image();    
    var hdrTexture = gl.createTexture();

    image.onload=function() {
        gl.bindTexture(gl.TEXTURE_2D, hdrTexture);
        // set the texture wrapping/filtering options (on the currently bound texture object)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // load and generate the texture
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, image.width, image.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
        console.log("loaded texture sucessfully");
        renderSkybox(hdrTexture, captureFBO, generateSkyboxProgram, image);
    };
    
    image.onerror=function() { // when .png failed
        console.log("Couldn't load " + texturePath);   
    };
    
    image.src = "textures/floor/tiles_BC.png";
}

function renderSkybox(hdrTexture, captureFBO, generateSkyboxProgram, image){

    envCubemap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, envCubemap);

    for (var i = 0; i < 6; ++i)
    {
        // This is probably poorly done, could be optimized
        //gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        //gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGB, 512, 512, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGB16F, image.width, image.height, 0, gl.RGB, gl.FLOAT, image);
        //gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGB16F, 512, 512, 0, gl.RGB, gl.HALF_FLOAT, null);
    }
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    var captureProjection = makePerspective(90.0, 1.0, 0.1, 1.0);
    var projUniform = gl.getUniformLocation(generateSkyboxProgram, "uPMatrix");
    gl.uniformMatrix4fv(projUniform, false, new Float32Array(flattenObject(captureProjection)));

    var captureDirections = [ 
       makeLookAtVector($V([0.0, 0.0, 0.0]), $V([ 1.0,  0.0,  0.0]), $V([0.0, -1.0,  0.0])),
       makeLookAtVector($V([0.0, 0.0, 0.0]), $V([-1.0,  0.0,  0.0]), $V([0.0, -1.0,  0.0])),
       makeLookAtVector($V([0.0, 0.0, 0.0]), $V([ 0.0,  1.0,  0.0]), $V([0.0,  0.0,  1.0])),
       makeLookAtVector($V([0.0, 0.0, 0.0]), $V([ 0.0, -1.0,  0.0]), $V([0.0,  0.0, -1.0])),
       makeLookAtVector($V([0.0, 0.0, 0.0]), $V([ 0.0,  0.0,  1.0]), $V([0.0, -1.0,  0.0])),
       makeLookAtVector($V([0.0, 0.0, 0.0]), $V([ 0.0,  0.0, -1.0]), $V([0.0, -1.0,  0.0]))
    ];


    // Need to dl default texture first or loading wont go through.
    mesh = new Mesh();
    mesh.makeCube(1.0);    

     // Vertex Buffer
    var cubeVerticesBuffer = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesBuffer);
    var positions = new Float32Array(flattenObject(mesh.m_positions));
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Index buffer
    var cubeVerticesIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVerticesIndexBuffer);
    var triangles = new Uint16Array(flattenObject(mesh.m_triangles));
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangles, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // Create buffer location attributes
    var vertexPositionAttribute = 0;
    // Fill VAO with the right calls
    vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);
    // Send vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesBuffer);
    gl.enableVertexAttribArray(vertexPositionAttribute);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVerticesIndexBuffer);
    gl.bindVertexArray(null);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, hdrTexture);

    gl.viewport(0, 0, 512, 512); // don't forget to configure the viewport to the capture dimensions.
    gl.bindFramebuffer(gl.FRAMEBUFFER, captureFBO);
    
    gl.clearColor(1.0,0.0,0.0,1.0);
    var viewUniform = gl.getUniformLocation(generateSkyboxProgram, "view");
    /*gl.disable(gl.CULL_FACE);
    for (var i = 0; i < 6; ++i)
    {
        gl.uniformMatrix4fv(viewUniform, false, new Float32Array(flattenObject(captureDirections[i])));
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                               gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, envCubemap, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Bind VAO
        gl.bindVertexArray(vertexArray);
        // Draw triangles
        gl.drawElements(gl.TRIANGLES, mesh.m_triangles.length * 3, gl.UNSIGNED_SHORT, 0);
        // UNBIND VAO
        gl.bindVertexArray(null);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.enable(gl.CULL_FACE);*/

    gl.clearColor(0.0, 0.0, 1.0, 0.1);

    // Start skybox shader
    skybox_vertex_shader = skybox_vertex_shader.replace(/^\s+|\s+$/g, '');
    skybox_fragment_shader = skybox_fragment_shader.replace(/^\s+|\s+$/g, '');
    skyboxProgram = createProgram(gl, skybox_vertex_shader, skybox_fragment_shader);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(skyboxProgram, gl.LINK_STATUS)) {
        console.log('Unable to initialize the shader program: ' + gl.getProgramInfoLog(skyboxProgram));
    }

    gl.useProgram(skyboxProgram);  

    skyboxProjUniform = gl.getUniformLocation(skyboxProgram, 'projection');
    gl.uniformMatrix4fv(skyboxProjUniform, false, new Float32Array(flattenObject(pMatrix)));
    gl.uniform1i(gl.getUniformLocation(skyboxProgram, 'environmentMap'), 0);
    skyboxViewUniform = gl.getUniformLocation(skyboxProgram, 'view');

    startNext();
}

function initShadowMapFrameBuffer(){
    // Init depth shaders for shadow maps
    depth_vertex_shader = depth_vertex_shader.replace(/^\s+|\s+$/g, '');
    depth_fragment_shader = depth_fragment_shader.replace(/^\s+|\s+$/g, '');
    depthProgram = createProgram(gl, depth_vertex_shader, depth_fragment_shader);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(depthProgram, gl.LINK_STATUS)) {
        console.log('Unable to initialize the shader program: ' + gl.getProgramInfoLog(depthProgram));
    }

    // Generate depth texture
    depthMap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthMap);
    gl.texImage2D(gl.TEXTURE_2D,
        0,
        gl.DEPTH_COMPONENT32F,      // uint16 vs float32?
        shadowSize.SHADOW_WIDTH,
        shadowSize.SHADOW_HEIGHT,
        0,
        gl.DEPTH_COMPONENT,
        gl.FLOAT,
        null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL); 

    // Generate frame buffer
    depthMapFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthMapFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthMap, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE) {
        console.log('fb status: ' + status.toString(16));
        return;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function createMatrixTransforms(prog, uboIdx){
    pMatrix = makePerspective(camera.fovAngle, canvas.clientWidth / canvas.clientHeight , camera.nearPlane, camera.farPlane);
    nMatrix  = Matrix.I(4);
    
    // mvMatrix + nMatrix + pMatrix
    var data = ((mvMatrix.flatten().concat(nMatrix.flatten())).concat(pMatrix.flatten())).concat(Matrix.I(4).flatten());
    // Padding is implementation dependent (Windows vs Unix)
    getUBOPadding(data, prog, uboIdx);

    return new Float32Array(data);
}

function createLights(prog, uboIdx){
    // Actual lights of the scene
    lights.push(new LightSource($V([-5,5,5,1]),$V([1,1,1]),100,1,1,1,lights.length));
    lights.push(new LightSource($V([5,5,-5,1]),$V([1,1,0.5]),100,1,1,1,lights.length));
    
    // Filling dummy data for up to 5 lights because the UBO / shader expects 5 max
    for(var i=0; i<max_lights; i++){
        if(i<lights.length){
            // Do this if you want to see a cube at the position of the lights
            enableLightDisplay(lights[i].position.elements, i);
            // Update position with mvMatrix and store in dataLights
            var l = LightSource.createLightSource(lights[i]);
            l.position = mvMatrix.multiply(lights[i].position);
            dataLights.push(l);
        }else{
            // Dummy data
            dataLights.push(new LightSource());
        }
    }
    
    // Get all the data into an array
    var data = flattenObject(dataLights).concat(lights.length);
    // Padding is implementation dependent (Windows vs Unix)
    getUBOPadding(data, prog, uboIdx);

    // Forget about the dummy data, we just had to send it once to the graphic card
    dataLights = dataLights.slice(0,lights.length);

    // Send the dat in the right format
    return new Float32Array(data);
}

function getUBOPadding(data, prog, uboIdx){
    // Figure out how much we need to pad
    var paddingLeft = (gl.getActiveUniformBlockParameter(prog, uboIdx, gl.UNIFORM_BLOCK_DATA_SIZE) - data.length * 4) / 4.0;
    // Padd it with -1.0
    for(var i=0; i<paddingLeft; i++){
        data.push(-1.0);
    }
}

function enableLightDisplay(lightPos, i){
    
    var mesh = new Mesh();
    mesh.makeCube(cubeSize);
    var entity = new Entity(mesh, "Light " + i, Matrix.Translation(Vector.create(lightPos)));
    entities.push(entity);
}