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
        f31.add(lights[i].position.elements, 0, -15, 15).name('Pos X').onChange(function(value){
            updateLightPos(this.object, value);
        });
        f31.add(lights[i].position.elements, 1, -15, 15).name('Pos Y');
        f31.add(lights[i].position.elements, 2, -15, 15).name('Pos Z');

        var f32 = f2.addFolder('Color');
        f32.add(lights[i].color.elements, 0, 0, 1).name('Red');
        f32.add(lights[i].color.elements, 1, 0, 1).name('Green');
        f32.add(lights[i].color.elements, 2, 0, 1).name('Blue');

        f2.add(lights[i], 'intensity', 0, 150).name('Intensity');
    }
    f1.open();

    f1.add(autoRotation, 'isRotating').name("Rotate (R)").listen(); 

    //gui.close();
};

function initFPSCounter(){
    stats = new Stats();
    stats.showPanel( 0 );
    document.body.appendChild( stats.dom );
}

function updateLightPos(light, value){
    console.log(light, value);
    //gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    var offset = mesh.m_positions.length*3;// + light.id;
    console.log(offset, positions.length);
    //gl.bufferSubData(gl.ARRAY_BUFFER, positions, value);
    //positions[X] = value;
}