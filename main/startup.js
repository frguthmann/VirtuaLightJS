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

// Main canvas we're drawing in
var canvas;
// Camera
var camera;

// Projection matrix
var pMatrix;
// ModelView matrix
var mvMatrix;
// Normal matrix
var nMatrix;

// UBOS
var uniformPerDrawBuffer;
var uniformPerPassBuffer;
var cameraUniform;

// VAOs
var vaos = [];
var depthVaos = [];

// Contains matrices: projection, modelView and normals
var transforms;
// Contains every renderable object, including lights debug models 
var entities = [];
// Contains the lights of the scene
var lights = [];
var max_lights = 5;
// Size of the cube representing the light when rendering
var cubeSize = 0.2;

// All the infos relevant to the skybox
var skybox = {
    mesh            : 0,
    envCubemap      : 0,
    irradianceMap   : 0,
    program         : 0,
    viewUniform     : 0,
    projUniform     : 0,
    proj            : 0,
    vao             : 0,
    res             : 1024
}

var rendering = {
    exposure : {value : 1.0, uniform : undefined},
    gamma : {value : 2.2, uniform : undefined},
    ambientIntensity : {value : 1.0, uniform : undefined},
    hasChanged : false
}

function start() {

    canvas = document.getElementById('glCanvas');
    camera = new Camera();
    
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
    shaderProgram = initShaders(vertex_shader, fragment_shader);
    gl.useProgram(shaderProgram);

    // Init skybox / Irradiance
    initSkybox("ibl/desert/desert.hdr");

    // Set texture uniforms
    setSamplerUniforms();
    
    // Contains every object declaration with material
    loadObjects()

    // Fill the uniform buffers
    initUBOs();

    // Create VAOs and data buffers
    for(var i=0; i<entities.length; i++){
        if(entities[i].mesh){
            var verticesBuffer          = gl.createBuffer();
            var verticesIndexBuffer     = gl.createBuffer();
            var verticesNormalBuffer    = entities[i].mesh.m_normals.length > 0 ? gl.createBuffer() : false;
            var verticesTexCoordsBuffer = entities[i].mesh.m_UV.length > 0 ? gl.createBuffer() : false;
        
            // Initiate buffers
            initBuffers(entities[i].mesh, verticesBuffer, verticesIndexBuffer, verticesNormalBuffer, verticesTexCoordsBuffer);
            // Init VAO
            vaos.push(initVAO(verticesBuffer, verticesIndexBuffer, verticesNormalBuffer, verticesTexCoordsBuffer, true));
            // Init DepthVAO
            depthVaos.push(initVAO(verticesBuffer, verticesIndexBuffer));
        }
    }

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

function initShaders(vs, fs) {
    vs = vs.replace(/^\s+|\s+$/g, '');
    fs = fs.replace(/^\s+|\s+$/g, '');
    var prog = createProgram(gl, vs, fs);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.log('Unable to initialize the shader program: ' + gl.getProgramInfoLog(prog));
    }

    return prog;
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
    gl.uniform1i(gl.getUniformLocation(shaderProgram, 'prefilterMap'), 7);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, 'brdfLUT'), 8);
}

// This might be used to synchronize several asynchronous functions, not used anymore
function drawSceneIfReady(){

    // Check to see if the counter has been initialized
    if (!drawSceneIfReady.counter) {
        // It has not... perform the initialization
        drawSceneIfReady.counter = 0;
    }
    
    // Add one use of it
    drawSceneIfReady.counter++;

    // This function should be called X times before we can draw the scene
    if(drawSceneIfReady.counter == 1){
        console.log("drawing");
        drawScene();
    }
}

function loadObjects(){
    var debug = 0;
    if(debug){
        var mats = 
        {
            mask : {
                albedo      : "models/mask/mask_BC.jpg",
                normal      : "models/mask/mask_N.jpg",
                roughness   : "models/mask/mask_R.jpg",
                ao          : "models/mask/mask_AO.jpg",
                fresnel     : "models/mask/mask_M.jpg",
            },
            ball: {
                albedo      : "models/ball/ball_BC.png",
                normal      : "models/ball/ball_N.png",
                roughness   : "models/ball/ball_R.png",
                ao          : "models/ball/ball_AO.png",
                fresnel     : "models/ball/ball_M.png",
            },
            sword : {
                albedo      : "models/sword/sword_BC.jpg",
                normal      : "models/sword/sword_N.png",
                roughness   : "models/sword/sword_R.jpg",
                ao          : "textures/default.png",
                fresnel     : "models/sword/sword_M.jpg",
            },
            floor : {
                albedo      : "textures/floor/tiles_BC.png",
                normal      : "textures/floor/tiles_N.png",
                roughness   : "textures/floor/tiles_R.png",
                ao          : "textures/floor/tiles_AO.png",
                fresnel     : undefined,
            },
            background : {
                albedo      : "textures/rust/rust_BC.png",
                normal      : "textures/rust/rust_N.png",
                roughness   : "textures/rust/rust_R.png",
                ao          : "textures/rust/rust_AO.png",
                fresnel     : "textures/rust/rust_M.png",
            },
            gold : {
                albedo      : "textures/gold/gold_BC2.png",
                normal      : "textures/gold/gold_N.png",
                roughness   : "textures/gold/gold_R.png",
                ao          : undefined,
                fresnel     : "textures/gold/gold_M.png",
            }
        };
    }else{
        var mats = 
        {
            mask : {
                albedo      : "https://i.imgur.com/wFBr71x.jpg",
                normal      : "https://i.imgur.com/i7ayCYF.jpg",
                roughness   : "https://i.imgur.com/vfjTFzs.jpg",
                ao          : "https://i.imgur.com/0tuvwzV.jpg",
                fresnel     : "https://i.imgur.com/Me4jjLn.jpg",
            },
            ball: {
                albedo      : "https://i.imgur.com/2Bv8bfF.jpg",
                normal      : "https://i.imgur.com/vS2wJcD.jpg",
                roughness   : "https://i.imgur.com/LEBf18e.png",
                ao          : "https://i.imgur.com/MtZ3wdH.png",
                fresnel     : "https://i.imgur.com/DnBrkti.png",
            },
            sword : {
                albedo      : "https://i.imgur.com/VognpHu.jpg",
                normal      : "https://i.imgur.com/iKCTZ86.png",
                roughness   : "https://i.imgur.com/PjF7OPh.jpg",
                ao          : "textures/default.png",
                fresnel     : "https://i.imgur.com/CAFmeh3.jpg",
            },
            floor : {
                albedo      : "https://i.imgur.com/hcI7jaA.jpg",
                normal      : "https://i.imgur.com/j9DA0JB.png",
                roughness   : "https://i.imgur.com/R0K0XiA.png",
                ao          : "https://i.imgur.com/iPPTZoU.png",
                fresnel     : undefined,
            },
            background : {
                albedo      : "https://i.imgur.com/IOknncI.jpg",
                normal      : "https://i.imgur.com/dbkRGWy.png",
                roughness   : "https://i.imgur.com/9E3kUMv.png",
                ao          : "https://i.imgur.com/2Ozqith.png",
                fresnel     : "https://i.imgur.com/GPTXRqV.png",
            },
            gold : {
                albedo      : "https://i.imgur.com/YXOv2dd.png",
                normal      : "https://i.imgur.com/692eM2G.png",
                roughness   : "https://i.imgur.com/iHru905.png",
                ao          : undefined,
                fresnel     : "https://i.imgur.com/drvFyQF.png",
            }
        };
    }

    // Need that to prevent errors when drawing
    Texture.loadDefaultTexture();

    // Load and transform the mask object
    material = new MeshMaterial(mats.mask);
    var mesh = new Mesh(material);
    mesh.loadPly(maskjs);
    entities.push(new Entity(mesh, "Mask", Matrix.I(4)));
    entities[entities.length-1].pos = [-1.3,1,0];
    entities[entities.length-1].scale = 1.3;

    // Ball thingy
    material = new MeshMaterial(mats.ball);
    mesh = new Mesh(material);
    mesh.loadPly(balljs);
    entities.push(new Entity(mesh, "Material Ball", Matrix.I(4)));
    entities[entities.length-1].pos = [1.25,0.355,0];
    //entities[entities.length-1].scale = 0.1;

    // Sword
    material = new MeshMaterial(mats.sword);
    mesh = new Mesh(material);
    mesh.loadPly(swordjs);
    entities.push(new Entity(mesh, "Sword", Matrix.I(4)));
    entities[entities.length-1].pos = [0,1.8,-2];

    // Create a plan underneath both objects
    material = new MeshMaterial(mats.floor);
    mesh = new Mesh(material);
    mesh.makePlan(3.0, 50);
    entities.push(new Entity(mesh, "Floor", Matrix.I(4)));

    // BACKGROUND PLAN
    material = new MeshMaterial(mats.background);
    mesh = new Mesh(material);
    mesh.makePlan2(1.0);
    entities.push(new Entity(mesh, "Background", Matrix.I(4)));
    entities[entities.length-1].pos = [1.5,1.5,-3];
    entities[entities.length-1].rot = [0,90];
    entities[entities.length-1].scale = 1.5;

    // Test cube with uniform values
    material = new MeshMaterial(mats.gold);
    material.generateTextures([0.996,0.805,0.406],0.25,1.0);
    mesh = new Mesh(material);
    mesh.loadPly(spherejs);
    entities.push(new Entity(mesh, "Gold Sphere", Matrix.I(4)));
    entities[entities.length-1].pos = [0,0.5,2];
    entities[entities.length-1].scale = 0.5;

    //PBRScale(7, 7, spherejs)
    
}

function PBRScale(nrRows, nrColumns, model){
    var spacing = 2.5;
    for (var row = 0; row < nrRows; ++row)
    {
        var bFresnel = row / nrRows;
        for (var col = 0; col < nrColumns; ++col)
        {
            var bRoughness = Math.min(Math.max(col / nrColumns, 0.05), 1.0);
            material = new MeshMaterial();
            material.generateTextures([0.996,0.805,0.406],bRoughness,bFresnel);
            mesh = new Mesh(material);
            mesh.loadPly(model);
            entities.push(new Entity(mesh, "Ball - " + row + "" + col, Matrix.I(4)));
            entities[entities.length-1].pos = [(col - (nrColumns / 2)) * spacing, (row - (nrRows / 2)) * spacing ,-2];
        }
    }
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

    cameraUniform = gl.getUniformLocation(shaderProgram, 'camPos');
    gl.uniform3fv(cameraUniform, flattenObject(camera.getPos()));
    rendering.exposure.uniform = gl.getUniformLocation(shaderProgram, 'exposure');
    rendering.gamma.uniform = gl.getUniformLocation(shaderProgram, 'gamma');
    rendering.ambientIntensity.uniform = gl.getUniformLocation(shaderProgram, 'ambientIntensity');
    gl.uniform1f(rendering.exposure.uniform, rendering.exposure.value);
    gl.uniform1f(rendering.gamma.uniform, rendering.gamma.value);
    gl.uniform1f(rendering.ambientIntensity.uniform, rendering.ambientIntensity.value);
}

function initBuffers(mesh, verticesBuffer, verticesIndexBuffer, verticesNormalBuffer, verticesTexCoordsBuffer) {

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
    if(verticesNormalBuffer){
        gl.bindBuffer(gl.ARRAY_BUFFER, verticesNormalBuffer);
        var normals = new Float32Array(flattenObject(mesh.m_normals));
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    // Texture Buffer
    if(verticesTexCoordsBuffer){
        gl.bindBuffer(gl.ARRAY_BUFFER, verticesTexCoordsBuffer);
        var texCoords = new Float32Array(flattenObject(mesh.m_UV));
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
}

function initVAO(verticesBuffer, verticesIndexBuffer, verticesNormalBuffer, verticesTexCoordsBuffer, bindUBO){

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
    if(verticesNormalBuffer){
        gl.bindBuffer(gl.ARRAY_BUFFER, verticesNormalBuffer);
        gl.enableVertexAttribArray(vertexNormalAttribute);   
        gl.vertexAttribPointer(vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
    }

    // Send texture coordinates
    if(verticesTexCoordsBuffer){
        gl.bindBuffer(gl.ARRAY_BUFFER, verticesTexCoordsBuffer);
        gl.enableVertexAttribArray(texCoordsAttribute);   
        gl.vertexAttribPointer(texCoordsAttribute, 2, gl.FLOAT, false, 0, 0);
    }

    // Send indexes
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);

    // Bind UBOs
    if(bindUBO){
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, uniformPerDrawBuffer);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 1, uniformPerPassBuffer);
    }

    gl.bindVertexArray(null);
    return vertexArray;
}

function initSkybox(src){
    new Texture(src, true, gl.CLAMP_TO_EDGE, gl.LINEAR, function(texture){
        createSkybox(texture);
    });
    skybox.irradianceMap  = initializeCubeMap();
    skybox.prefilterMap   = initializeCubeMap();
    skybox.brdfLUTTexture = Texture.generateTextureFromData(new Uint8Array([0.0, 0.0, 0.0]), 1, 1, false, gl.REPEAT, gl.NEAREST);
}

function initializeCubeMap(){
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    var data = new Uint8Array([255.0, 255.0, 255.0]);
    for (var i = 0; i < 6; ++i)
    {
        // This is probably poorly done, could be optimized
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, data);
    }
    return texture;
}

function createSkybox(hdrTexture){

    // Skybox geometry
    skybox.mesh = new Mesh();
    skybox.mesh.makeCube(1.0, false); 

    // Associated buffers and VAO
    var cubeVerticesBuffer = gl.createBuffer(); 
    var cubeVerticesIndexBuffer = gl.createBuffer();
    initBuffers(skybox.mesh, cubeVerticesBuffer,cubeVerticesIndexBuffer);
    skybox.vao = initVAO(cubeVerticesBuffer, cubeVerticesIndexBuffer, false);

    // Computing the cubeMap textures
    var generateSkyboxProgram = initShaders(generate_skybox_vertex_shader, generate_skybox_fragment_shader);
    gl.useProgram(generateSkyboxProgram);  
    skybox.envCubemap = renderToCubeMap(generateSkyboxProgram, hdrTexture, gl.TEXTURE_2D, skybox.res, skybox.vao, skybox.mesh.m_triangles.length * 3);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skybox.envCubemap);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

    initSkyboxShader();
    initIrradianceMap(shaderProgram);
    initSpecularMaps();
}

function initIrradianceMap(prog){
    var irradianceMapRes = 32;
    var generateIrradianceMapProgram = initShaders(generate_skybox_vertex_shader, generate_irradiance_map_fragment_shader);
    gl.useProgram(generateIrradianceMapProgram);
    skybox.irradianceMap = renderToCubeMap(generateIrradianceMapProgram, skybox.envCubemap, gl.TEXTURE_CUBE_MAP, irradianceMapRes, skybox.vao, skybox.mesh.m_triangles.length * 3);
}

function initSkyboxShader(){
    // Start skybox shader
    skybox.program = initShaders(skybox_vertex_shader, skybox_fragment_shader);
    gl.useProgram(skybox.program);  
    skybox.projUniform = gl.getUniformLocation(skybox.program, 'projection');
    skybox.proj = makePerspective(camera.fovAngle, canvas.clientWidth / canvas.clientHeight , 1.0, camera.farPlane);
    gl.uniformMatrix4fv(skybox.projUniform, false, new Float32Array(flattenObject(skybox.proj)));
    gl.uniform1i(gl.getUniformLocation(skybox.program, 'environmentMap'), 0);
    skybox.viewUniform = gl.getUniformLocation(skybox.program, 'view');
}

function renderToCubeMap(prog, src, srcType, res, vao, nbIndices){
    // Setup cubemap texture parameters
    var cubeMap = generateCubemapTexture(res, gl.LINEAR);
    // Set uniforms
    var viewUniform = setCubemapUniforms(prog);
    // Init frame buffers and source texture
    configureFramebufferAndContext(res, src, srcType);
    // Actual render on each face
    renderCubeMapFaces(viewUniform, cubeMap, vao, nbIndices, 0);
    // Restore context
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.enable(gl.CULL_FACE);
    return cubeMap;
}

function generateCubemapTexture(res, minFilter){
    var cubeMap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
    for (var i = 0; i < 6; ++i)
    {
        // This is probably poorly done, could be optimized
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGB, res, res, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
    }
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return cubeMap;
}

function setCubemapUniforms(prog){
    var projUniform = gl.getUniformLocation(prog, "uPMatrix");
    var environmentMapUniform = gl.getUniformLocation(prog, "environmentMap");
    var viewUniform = gl.getUniformLocation(prog, "view");
    var captureProjection = makePerspective(90.0, 1.0, 0.48, 10.0); 
    gl.uniformMatrix4fv(projUniform, false, new Float32Array(flattenObject(captureProjection)));
    gl.uniform1i(environmentMapUniform, 0);
    return viewUniform; 
}

function configureFramebufferAndContext(res, src, srcType){
    // Just frame buffer things => render to a render buffer
    var captureFBO = gl.createFramebuffer();
    var captureRBO = gl.createRenderbuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, captureFBO);
    gl.bindRenderbuffer(gl.RENDERBUFFER, captureRBO);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, res, res);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, captureRBO);  

    // Configure context for cube rendering
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(srcType, src);
    gl.viewport(0, 0, res, res); // don't forget to configure the viewport to the capture dimensions.
    gl.bindFramebuffer(gl.FRAMEBUFFER, captureFBO);
    gl.disable(gl.CULL_FACE);
    return captureRBO;
}

function renderCubeMapFaces(viewUniform, cubeMap, vao, nbIndices, mip){
    var captureDirections = [ 
        makeLookAtVector($V([0.0, 0.0, 0.0]), $V([ 1.0,  0.0,  0.0]), $V([0.0, -1.0,  0.0])),
        makeLookAtVector($V([0.0, 0.0, 0.0]), $V([-1.0,  0.0,  0.0]), $V([0.0, -1.0,  0.0])),
        makeLookAtVector($V([0.0, 0.0, 0.0]), $V([ 0.0, -1.0,  0.0]), $V([0.0,  0.0, -1.0])),
        makeLookAtVector($V([0.0, 0.0, 0.0]), $V([ 0.0,  1.0,  0.0]), $V([0.0,  0.0,  1.0])),
        makeLookAtVector($V([0.0, 0.0, 0.0]), $V([ 0.0,  0.0,  1.0]), $V([0.0, -1.0,  0.0])),
        makeLookAtVector($V([0.0, 0.0, 0.0]), $V([ 0.0,  0.0, -1.0]), $V([0.0, -1.0,  0.0]))
    ];
    for (var i = 0; i < 6; ++i)
    {
        gl.uniformMatrix4fv(viewUniform, false, new Float32Array(flattenObject(captureDirections[i])));
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                               gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, cubeMap, mip);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.bindVertexArray(vao);
        gl.drawElements(gl.TRIANGLES, nbIndices, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }
}

function initSpecularMaps(){

    // Create shader program
    var generatePrefilterMapProgram = initShaders(generate_skybox_vertex_shader, generate_prefilter_map_fragment_shader);
    gl.useProgram(generatePrefilterMapProgram);  

    // Generate texture and mip_maps
    var res = 256;
    skybox.prefilterMap = generateCubemapTexture(res, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

    // Set uniforms
    var viewUniform = setCubemapUniforms(generatePrefilterMapProgram);
    var roughnesUniform = gl.getUniformLocation(generatePrefilterMapProgram, "roughness");
    gl.uniform1f(gl.getUniformLocation(generatePrefilterMapProgram, "resolution"), skybox.res); 

    // Init frame buffers and source texture
    var captureRBO = configureFramebufferAndContext(res, skybox.envCubemap, gl.TEXTURE_CUBE_MAP);
    
    // Generate a texture for each Mip level
    var maxMipLevels = 5;
    for (var mip = 0; mip < maxMipLevels; ++mip){
        // reisze framebuffer according to mip-level size.
        var mipRes  = res * Math.pow(0.5, mip);
        gl.bindRenderbuffer(gl.RENDERBUFFER, captureRBO);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, mipRes, mipRes);
        gl.viewport(0, 0, mipRes, mipRes);

        var roughness = mip / (maxMipLevels - 1);
        gl.uniform1f(roughnesUniform, roughness); 
        // Actual render on each face
        renderCubeMapFaces(viewUniform, skybox.prefilterMap, skybox.vao, skybox.mesh.m_triangles.length * 3, mip);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.enable(gl.CULL_FACE);

    skybox.brdfLUTTexture = initBrdfLut();
}

function initBrdfLut(){
    
    // Create shader program
    var brdfLUTProgram = initShaders(integrate_brdf_vertex_shader, integrate_brdf_fragment_shader);
    gl.useProgram(brdfLUTProgram);

    // Create 2D texture with attributes
    var res = 512;
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, res, res, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Just frame buffer things => render to a texture here
    var captureFBO = gl.createFramebuffer();
    var captureRBO = gl.createRenderbuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, captureFBO);
    gl.bindRenderbuffer(gl.RENDERBUFFER, captureRBO);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, res, res);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0); 

    // Update context, frame buffer writes to a texture
    gl.viewport(0, 0, res, res);
    gl.disable(gl.CULL_FACE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create quad mesh
    material = new MeshMaterial();
    mesh = new Mesh(material);
    mesh.makeQuad();

    // Init quad VAO
    var verticesBuffer          = gl.createBuffer();
    var verticesIndexBuffer     = gl.createBuffer();
    var verticesTexCoordsBuffer = gl.createBuffer();
    initBuffers(mesh, verticesBuffer, verticesIndexBuffer, false, verticesTexCoordsBuffer);
    var quadVertexArray = initVAO(verticesBuffer, verticesIndexBuffer, false, verticesTexCoordsBuffer, true);
    
    // Draw onto quad
    gl.bindVertexArray(quadVertexArray);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);

    // Restore context
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.enable(gl.CULL_FACE);

    // At last, bind texture
    return texture;
}

function initShadowMapFrameBuffer(){
    // Init depth shaders for shadow maps
    depthProgram = initShaders(depth_vertex_shader, depth_fragment_shader);

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
    
    // modelMatrix + viewMatrix + projectionMatrix + dummy data for Depth mvp
    var data = ((Matrix.I(4).flatten().concat(mvMatrix.flatten())).concat(pMatrix.flatten())).concat(Matrix.I(4).flatten());
    // Padding is implementation dependent (Windows vs Unix)
    getUBOPadding(data, prog, uboIdx);

    return new Float32Array(data);
}

function createLights(prog, uboIdx){
    // Actual lights of the scene
    lights.push(new LightSource($V([2.75,5,-2.75,1]),$V([1,1,1]),30,1,1,1,lights.length));
    lights.push(new LightSource($V([-2.75,5,-2.75,1]),$V([1,1,1]),30,1,1,1,lights.length));
    lights.push(new LightSource($V([11.9,7.1,8.8,1]),$V([0.996,0.945,0.878]),200,1,1,1,lights.length));
    var length = lights.length;

    // Filling dummy data for up to 5 lights because the UBO / shader expects 5 max
    for(var i=0; i<max_lights; i++){
        if(i<length){
            // Do this if you want to see a cube at the position of the lights
            enableLightDisplay(lights[i].position.elements, i);
        }else{
            // Dummy data
            lights.push(new LightSource());
        }
    }
    
    // Get all the data into an array
    var data = flattenObject(lights).concat(length);
    // Padding is implementation dependent (Windows vs Unix)
    getUBOPadding(data, prog, uboIdx);

    // Forget about the dummy data, we just had to send it once to the graphic card
    lights = lights.slice(0,length);

    // Send the data in the right format
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
    mesh.makeCube(cubeSize, false);
    // Don't display the last light, it is a light embedded in the environnement
    var entityName = "Light " + i;
    if(i==lights.length-1){
        mesh = undefined;
        entityName = "Sun";
    }
    var entity = new Entity(mesh, entityName, Matrix.Translation(Vector.create(lightPos)));
    entities.push(entity);
}