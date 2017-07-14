// FPS counter
var stats;
var id;

function initGui() {
    initFPSCounter();

    var gui = new dat.GUI();
    var f1 = gui.addFolder('Lights');    
    for(var i=0; i<lights.length; i++){

        var f2 = f1.addFolder('L' + i);        
        var f31 = f2.addFolder('Position');
        f31.add(lights[i].position.elements, 0, -15, 15).name('Pos X').onFinishChange(function(value){
            updateLightPos(this.object, value);
        });
        f31.add(lights[i].position.elements, 1, -15, 15).name('Pos Y');
        f31.add(lights[i].position.elements, 2, -15, 15).name('Pos Z');

        var f32 = f2.addFolder('Color');
        f32.add(lights[i].color.elements, 0, 0, 1).name('Red');
        f32.add(lights[i].color.elements, 1, 0, 1).name('Green');
        f32.add(lights[i].color.elements, 2, 0, 1).name('Blue');

        f2.add(lights[i], 'intensity', 0, 150).name('Intensity');
        f2.open();
        f31.open();
    }
    f1.open();

    //gui.close();
};

function initFPSCounter(){
    stats = new Stats();
    stats.showPanel( 0 );
    document.body.appendChild( stats.dom );
}

function updateLightPos(lightPos, value){
    /*console.log(mesh.m_positions.length*3);
    console.log(lightPos, value);*/
    //console.log(offset, positions.length);
    //console.log();
    //console.log(pos);
    //gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(flattenObject(mesh.m_positions)));

    //var offset = mesh.m_positions.length*3 - 3*8;
    var pos = new Float32Array(flattenObject(boxFromLight(lightPos)));
    console.log(pos);
    /*gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, offset, pos);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);*/
}

// Works but is an absolute performance disaster
/*
gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
var pos = boxFromLight(lightPos);
for(var i=0; i<pos.length; i++){
    mesh.m_positions[mesh.m_positions.length-i-1] = pos[pos.length-1-i];
}
gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(flattenObject(mesh.m_positions)));
*/