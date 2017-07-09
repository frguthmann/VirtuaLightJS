var canvas;
var gl;
var shaderProgram;

var mvMatrix;
var perspectiveMatrix;

var verticesBuffer;
var verticesIndexBuffer;
var verticesColorBuffer;
var verticesNormalBuffer;

var uniformPerDrawBuffer;
var uniformPerPassBuffer;
var uniformPerSceneBuffer;

var transforms;
var meshMaterial;
var light;

var mesh;
var lights = [];

function start() {
    canvas = document.getElementById('glCanvas');

    // Initialize the GL context
    gl = canvas.getContext('webgl2', { antialias: false });

    // Only continue if WebGL is available and working
    if (!gl) {
    return;
    }

    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    // Near things obscure far things
    gl.depthFunc(gl.LEQUAL);
    // Clear the color as well as the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Initiate shaders
    initShaders();

    // Initiate lights
    initLights();

    // Initiate buffers
    initBuffers();

    // Draw the scene every 15ms ~ 60FPS
    setInterval(drawScene, 15);

}


function initWebGL(canvas) {
    gl = null;

    // Try to grab the standard context. If it fails, fallback to experimental.
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    // If we don't have a GL context, give up now
    if (!gl) {
    alert('Unable to initialize WebGL. Your browser may not support it.');
    }

    return gl;
}


function initShaders() {

    shaderProgram = createProgram(gl, getShaderSource('vs'), getShaderSource('fs'));

    // If creating the shader program failed, alert

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    }

    gl.useProgram(shaderProgram);

    var uniformPerDrawLocation = gl.getUniformBlockIndex(shaderProgram, 'PerDraw');
    var uniformPerPassLocation = gl.getUniformBlockIndex(shaderProgram, 'PerPass');
    var uniformPerSceneLocation = gl.getUniformBlockIndex(shaderProgram, 'PerScene');
    
    gl.uniformBlockBinding(shaderProgram, uniformPerDrawLocation, 0);
    gl.uniformBlockBinding(shaderProgram, uniformPerPassLocation, 1);
    gl.uniformBlockBinding(shaderProgram, uniformPerSceneLocation, 2);

    vertexPositionAttribute = 0;
    vertexNormalAttribute = 1;
    vertexColorAttribute = 2;

    gl.enableVertexAttribArray(vertexPositionAttribute);
    gl.enableVertexAttribArray(vertexNormalAttribute);  
    gl.enableVertexAttribArray(vertexColorAttribute);  

}

function initBuffers() {

    // Load obj file
    mesh = new Mesh();
    mesh.loadOFF(file);

    // Vertex Buffer
    verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    var positions = [];
    mesh.m_positions.forEach(function(pos){
        positions.push(pos.elements);
    });
    positions = [].concat.apply([], positions);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    //var positions = new Float32Array(flattenObject( mesh.m_positions));

    // Index buffer
    verticesIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);
    var triangles = [];
    mesh.m_triangles.forEach(function(tri){
        triangles.push(tri.elements);
    });
    triangles = [].concat.apply([], triangles);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangles), gl.STATIC_DRAW);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    // Normals Buffer
    verticesNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesNormalBuffer);
    var normals = [];
    mesh.m_normals.forEach(function(norm){
        normals.push(norm.elements);
    });
    normals = [].concat.apply([], normals);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    // Color Buffer
    verticesColorBuffer = gl.createBuffer();
    var colors = [];
    for(var i=0; i<positions.length; i++){
        colors.push(Math.random());
        colors.push(Math.random());
        colors.push(Math.random());
        colors.push(1.0);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    // Transform matrix uniform buffer object
    // mat4 P, mat4 MV, mat3 Mnormal
    transforms = new Float32Array([
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0,
            
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0, 
            
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0
    ]);
    uniformPerDrawBuffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerDrawBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, transforms, gl.DYNAMIC_DRAW);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, transforms);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    // Light uniform buffer object
    uniformPerPassBuffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerPassBuffer);
    light = new Float32Array(flattenObject(lights[0]));
    console.log(light);
    gl.bufferData(gl.UNIFORM_BUFFER, light, gl.DYNAMIC_DRAW);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, light);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    // Material uniform buffer object
    var padding = -1;
    // Buffer is apparently 16-aligned, must pad with 3 floats => 5*4 + 3*4 => 32
    meshMaterial = new Float32Array([
        mesh.diffuse,
        mesh.specular,
        mesh.shininess,
        mesh.roughness,
        mesh.fresnel,
        padding,
        padding,
        padding
    ]);
    uniformPerSceneBuffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, uniformPerSceneBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, meshMaterial, gl.STATIC_DRAW);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, meshMaterial);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    // Bind the UBOs
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, uniformPerDrawBuffer);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 1, uniformPerPassBuffer);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 2, uniformPerSceneBuffer);

}

function initLights(){
    var light = new LightSource($V([0,5,5,0.58]),$V([1,2,3,1]),100);
    lights.push(light);
}

window.getShaderSource = function(id) {
    return document.getElementById(id).textContent.replace(/^\s+|\s+$/g, '');
};

function createShader(gl, source, type) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
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

// https://gist.github.com/penguinboy/762197
var flattenObject = function(ob) {
    var toReturn = [];
    
    for (var i in ob) {
        if (!ob.hasOwnProperty(i)) continue;
        
        if ((typeof ob[i]) == 'object') {
            var flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) continue;
                
                toReturn.push(flatObject[x]);
            }
        } else {
            toReturn.push(ob[i]);
        }
    }
    return toReturn;
};