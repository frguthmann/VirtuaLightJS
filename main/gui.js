// FPS counter
var stats;
var id;

function initGui() {
    initFPSCounter();

    var gui = new dat.GUI();
    
    // Let's create the menu for meshes / objects
    var f1 = gui.addFolder("Objects");
    for(var i=0; i<entities.length-lights.length; i++){
        
        // Add a folder with the name of the entity
        var f2 = f1.addFolder(entities[i].name);        
        // We need to store the menu values somewhere
        entities[i].pos   = [0,0,0];
        entities[i].rot   = [0,0];
        entities[i].scale = 1;

        /*  
            Immediately Invoked Function Expression (IIFE)
            i has a value when I'm creating the function but only then
            This lets me store the entity index in the updateMVMatrix function on creation
            Each slider has its own updateMVMatrix function with the right index :D
            Honnestly it's a shame I can't avoid this trick because of dat.gui...
        */
        (function(i) {

            var f31 = f2.addFolder('Position');
            f31.add(entities[i].pos, 0, -5, 5).name('Pos X').onChange(updateMVMatrix);
            f31.add(entities[i].pos, 1, -5, 5).name('Pos Y').onChange(updateMVMatrix);
            f31.add(entities[i].pos, 2, -5, 5).name('Pos Z').onChange(updateMVMatrix);

            var f32 = f2.addFolder('Rotation');
            f32.add(entities[i].rot, 0, 0, 360).name('Phi').onChange(updateMVMatrix);
            f32.add(entities[i].rot, 1, 0, 360).name('Theta').onChange(updateMVMatrix);

            f2.add(entities[i], "scale", 0.0001, 5).name('Scale').onChange(updateMVMatrix);

            function updateMVMatrix(){
                var idx = i;
                var trans     = Matrix.Translation(Vector.create(entities[idx].pos));
                var rotPhi    = Matrix.Rotation(entities[idx].rot[0] * Math.PI / 180.0, $V([0,1,0])).ensure4x4();
                var rotTheta  = Matrix.Rotation(entities[idx].rot[1] * Math.PI / 180.0, $V([1,0,0])).ensure4x4();
                var scale     = Matrix.Diagonal([entities[idx].scale, entities[idx].scale, entities[idx].scale, 1]);
                entities[idx].mvMatrix = trans.x(rotTheta).x(rotPhi).x(scale).x(Matrix.I(4));
            }

        }(i));

    }

    var f1 = gui.addFolder("Lights"); 
    for(var i=entities.length-lights.length; i<entities.length; i++){

        var idx = i - (entities.length - lights.length);
        //console.log(entities[i].mesh.m_positions);

        var f2 = f1.addFolder(entities[i].name);
        var f31 = f2.addFolder('Position');

        (function(idx) {
            f31.add(lights[idx].position.elements, 0, -15, 15).name('Pos X').onChange(updateMVMatrix);
            f31.add(lights[idx].position.elements, 1, -15, 15).name('Pos Y').onChange(updateMVMatrix);
            f31.add(lights[idx].position.elements, 2, -15, 15).name('Pos Z').onChange(updateMVMatrix);

            function updateMVMatrix(){
                var lidx = idx;
                var eidx = idx + lights.length;
                var lpos = lights[lidx].position.elements;
                var trans = Matrix.Translation(Vector.create([lpos[0],lpos[1],lpos[2]]));
                console.log(lpos);
                entities[eidx].mvMatrix = trans.x(Matrix.I(4));
            }

        }(idx));

        var f32 = f2.addFolder('Color');
        f32.add(lights[idx].color.elements, 0, 0, 1).name('Red');
        f32.add(lights[idx].color.elements, 1, 0, 1).name('Green');
        f32.add(lights[idx].color.elements, 2, 0, 1).name('Blue');
        

        f2.add(lights[idx], 'intensity', 0, 150).name('Intensity');
        f2.open();
        f31.open();
    }

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
    /*var pos = new Float32Array(flattenObject(boxFromLight(lightPos)));
    console.log(pos);*/
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