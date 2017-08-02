// Webgl program
var gl;
// Main shader program
var shaderProgram;
var depthProgram;
// Depth shader used for shadow maps
var SHADOW_WIDTH = 1024;     // 640 
var SHADOW_HEIGHT = 1024;    //480
var depthMapFBO;
var depthMap;
var depthVaos = [];
var quadVertexArray;
var drawUniformDepthLocation;
var shadowMapUniform;

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
var uniformPerSceneBuffer;
// VAOs
var vaos = [];

// Contains matrices: projection, modelView and normals
var transforms;
// Contains the geometry and material properties of the object
var meshes = [];
var entities = [];
// Not in the mesh attribute but still necessary
var colors = [];
// Contains the lights of the scene
var lights = [];
// Same as lights but with position * modelViewMatrix
var dataLights = [];
var max_lights = 5;
// Size of the cube representing the light when rendering
var cubeSize = 0.2;

function start() {
    canvas = document.getElementById('glCanvas');
    
    // Initialize the GL context
    gl = canvas.getContext('webgl2', { antialias: true });
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
    // Enable ulling 
    gl.enable(gl.CULL_FACE);
    // Cull only back faces
    gl.cullFace(gl.BACK);
    // Set clear color to white, fully opaque
    gl.clearColor(0.0, 0.0, 1.0, 0.1);
    // Clear the color as well as the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Initiate shaders
    initShaders();

    // Load obj file:
    //mesh = new Mesh($V([0.1,0.2,0.3,1.0]),$V([0.5,0.6,0.7]),80.0,0.1,0.91); //Mesh($V([1.0,0.766,0.336,1.0]),$V([1.0,223.0/255.0,140.0/255.0]),80.0,0.1,0.91);
    //mesh = new Mesh($V([0.8,0.8,0.8,1.0]),$V([1.0,223.0/255.0,140.0/255.0]),80.0,0.1,0.91);
    
    // Load and transform the rhino object
    // Load and transform the rhino object
    var mesh = new Mesh($V([0.0,0.0,0.0,1.0]),$V([1.0,223.0/255.0,140.0/255.0]),80.0,0.1,20);
    mesh.loadOFF(rhinojs);
    entities.push(new Entity(mesh, "Rhino", Matrix.I(4), new MeshMaterial(mesh)));
    entities[entities.length-1].pos = [1,-0.5,0];
    entities[entities.length-1].rot = [90,0];
    
    // Load and transform the man object
    mesh = new Mesh($V([1.0,0.0,0.0,1.0]),$V([1.0,1.0,1.0]),80.0,0.2,0.91);
    mesh.loadOFF(manjs);
    entities.push(new Entity(mesh, "Man", Matrix.I(4), new MeshMaterial(mesh)));
    entities[entities.length-1].pos = [-1,-0.32,-0.3];
    entities[entities.length-1].rot = [180,0];
    entities[entities.length-1].scale = 0.45;

    // Create a plan underneath both objects
    mesh = new Mesh($V([1.0,1.0,1.0,1.0]),$V([1.0,1.0,1.0]),80.0,0.95,0.10);
    mesh.createPlan(3.0, 50);
    entities.push(new Entity(mesh, "Plan", Matrix.I(4), new MeshMaterial(mesh)));

    // Fill the uniform buffers
    initUBOs();

    for(var i=0; i<entities.length; i++){
        var verticesBuffer = gl.createBuffer();
        var verticesIndexBuffer = gl.createBuffer();
        var verticesNormalBuffer = gl.createBuffer();
        var verticesColorBuffer = gl.createBuffer();
    
        // Create the colors
        var colors = generateColors(entities[i].mesh);
        // Initiate buffers
        initBuffers(entities[i].mesh, verticesBuffer, verticesIndexBuffer, verticesNormalBuffer, verticesColorBuffer, colors);
        // Init VAO
        initVAO(verticesBuffer, verticesIndexBuffer, verticesNormalBuffer, verticesColorBuffer);
        // Init DepthVAO
        initDepthVAO(verticesBuffer, verticesIndexBuffer);
    }

    // Init quad shaders
    quad_vertex_shader = quad_vertex_shader.replace(/^\s+|\s+$/g, '');
    quad_fragment_shader = quad_fragment_shader.replace(/^\s+|\s+$/g, '');
    quadProgram = createProgram(gl, quad_vertex_shader, quad_fragment_shader);
    drawUniformDepthLocation = gl.getUniformLocation(quadProgram, 'depthMap');
    shadowMapUniform = gl.getUniformLocation(shaderProgram, 'shadowMap');
    initQuad();

    // Display GUI
    initGui();

    // Activate mouse / keyboard input
    initInputs();

    // Init depth shaders
    depth_vertex_shader = depth_vertex_shader.replace(/^\s+|\s+$/g, '');
    depth_fragment_shader = depth_fragment_shader.replace(/^\s+|\s+$/g, '');
    depthProgram = createProgram(gl, depth_vertex_shader, depth_fragment_shader);


    // Generate depth texture
    depthMap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthMap);
    gl.texImage2D(gl.TEXTURE_2D,
        0,
        gl.DEPTH_COMPONENT32F,      // uint16 vs float32?
        SHADOW_WIDTH,
        SHADOW_HEIGHT,
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
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, depthMapFBO);
    gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthMap, 0);;
    
    var status = gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE) {
        console.log('fb status: ' + status.toString(16));
        return;
    }
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

    var nbVertices = 0;
    var nbTriangles = 0;
    for(var i=0; i<entities.length; i++){
        nbVertices += entities[i].mesh.m_positions.length;
        nbTriangles += entities[i].mesh.m_triangles.length;
    }
    console.log(nbVertices, nbTriangles);

    // Draw the scene
    drawScene();

}

function initQuad(){
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

function initBuffers(mesh, verticesBuffer, verticesIndexBuffer, verticesNormalBuffer, verticesColorBuffer, colors) {

    // Vertex Buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    var positions = new Float32Array(flattenObject(mesh.m_positions));
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);
    var triangles = new Uint16Array(flattenObject(mesh.m_triangles));
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangles), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // Normals Buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesNormalBuffer);
    var normals = new Float32Array(flattenObject(mesh.m_normals));
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Color Buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesColorBuffer);
    var col = new Float32Array(colors);
    gl.bufferData(gl.ARRAY_BUFFER, col, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function initUBOs(){

    // Find and link uniform blocks
    var uniformPerDrawLocation = gl.getUniformBlockIndex(shaderProgram, 'PerDraw');
    var uniformPerPassLocation = gl.getUniformBlockIndex(shaderProgram, 'PerPass');
    var uniformPerSceneLocation = gl.getUniformBlockIndex(shaderProgram, 'PerScene'); 
    gl.uniformBlockBinding(shaderProgram, uniformPerDrawLocation, 0);
    gl.uniformBlockBinding(shaderProgram, uniformPerPassLocation, 1);
    gl.uniformBlockBinding(shaderProgram, uniformPerSceneLocation, 2);

    // Create transform UBO and bind it to data
    createMatrixTransforms();
    uniformPerDrawBuffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerDrawBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, transforms, gl.DYNAMIC_DRAW);

    // Create and bind light to light UBO
    var lightData = createLights();
    uniformPerPassBuffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerPassBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, lightData, gl.DYNAMIC_DRAW);

    // Create material UBO and bind it to data
    var meshMaterial = new Float32Array(flattenObject(new MeshMaterial()));
    uniformPerSceneBuffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerSceneBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, meshMaterial, gl.DYNAMIC_DRAW);
    
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
}

function initVAO(verticesBuffer, verticesIndexBuffer, verticesNormalBuffer, verticesColorBuffer){

    // Create buffer location attributes
    vertexPositionAttribute = 0;
    vertexNormalAttribute   = 1;
    vertexColorAttribute    = 2;

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

    // Send colors
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesColorBuffer);
    gl.enableVertexAttribArray(vertexColorAttribute); 
    gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);
    
    // Send indexes
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);

    // Bind UBOs
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, uniformPerDrawBuffer);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 1, uniformPerPassBuffer);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 2, uniformPerSceneBuffer);

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

function createMatrixTransforms(){
    pMatrix = makePerspective(camera.fovAngle, canvas.width/canvas.height, camera.nearPlane, camera.farPlane);
    nMatrix  = Matrix.I(4);
    // mvMatrix + nMatrix + pMatrix
    transforms = new Float32Array(((mvMatrix.flatten().concat(nMatrix.flatten())).concat(pMatrix.flatten())).concat(Matrix.I(4).flatten()));
}

function createLights(){
    // Actual lights of the scene
    lights.push(new LightSource($V([5,5,-5,1]),$V([1,1,1]),100,1,1,1,lights.length));
    lights.push(new LightSource($V([-5,5,5,1]),$V([1,1,0.5]),100,1,1,1,lights.length));
    
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
    
    var floatArray = new Float32Array(flattenObject(dataLights).concat(lights.length));
    // Forget about the dummy data, we just had to send it once to the graphic card
    dataLights = dataLights.slice(0,lights.length);
    return floatArray;
}

function enableLightDisplay(lightPos, i){
    
    var mesh = new Mesh();
    var entity = new Entity(mesh, "Light " + i, Matrix.Translation(Vector.create(lightPos)), new MeshMaterial(mesh));
    entities.push(entity);

    var pos = boxFromLight(lightPos);
    mesh.m_positions = mesh.m_positions.concat(pos);

    var idx = [
        $V([0,  2,  1]),      $V([2,  3,  1]),   // front
        $V([4,  5,  6]),      $V([5,  7,  6]),   // back
        $V([4,  0,  5]),      $V([0,  1,  5]),   // top
        $V([6,  7,  2]),      $V([7,  3,  2]),   // bottom
        $V([6,  0,  4]),      $V([6,  2,  0]),   // right
        $V([5,  1,  7]),      $V([1,  3,  7])    // left*/
    ];
    mesh.m_triangles = mesh.m_triangles.concat(idx);

    var norm = [
        $V([ 1,  1, -1]),
        $V([-1,  1, -1]),
        $V([ 1, -1, -1]),
        $V([ 1,  1,  1]),
        $V([-1,  1,  1]),
        $V([ 1, -1,  1]),
        $V([-1, -1, -1]),
        $V([-1, -1,  1])
    ];
    mesh.m_normals = mesh.m_normals.concat(norm);

    var col = [
         1.0,  1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,  1.0, 
         1.0,  1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,  1.0 
    ];
    colors = colors.concat(col);
}

function generateColors(mesh){
    var col = [];
    for(var i=0; i<mesh.m_positions.length; i++){
        col.push(mesh.diffuse);
    }
    return flattenObject(col);
}

function boxFromLight(lightPos){
    return [
        $V([ cubeSize,  cubeSize, -cubeSize]),
        $V([-cubeSize,  cubeSize, -cubeSize]),
        $V([ cubeSize, -cubeSize, -cubeSize]),
        $V([-cubeSize, -cubeSize, -cubeSize]),
        $V([ cubeSize,  cubeSize,  cubeSize]),
        $V([-cubeSize,  cubeSize,  cubeSize]),
        $V([ cubeSize, -cubeSize,  cubeSize]),
        $V([-cubeSize, -cubeSize,  cubeSize])
    ];
}