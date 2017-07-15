// FPS counter
var stats;
var guiObj = { sceneMode : "Normal" };

function initFPSCounter(){
    stats = new Stats();
    stats.showPanel( 0 );
    document.body.appendChild( stats.dom );
}

function initGui() {
    initFPSCounter();

    var gui = new dat.GUI();
    
    // Let's create the menu for meshes / objects
    var f1 = gui.addFolder("Objects");
    f1.open();
    for(var i=0; i<entities.length-lights.length; i++){
        
        // Add a folder with the name of the entity
        var f2 = f1.addFolder(entities[i].name);        
        // We need to store the menu values somewhere
        entities[i].pos   = [0,0,0];
        entities[i].rot   = [0,0];
        entities[i].scale = 1;
        entities[i].isRotating = false;

        /*  
            Immediately Invoked Function Expression (IIFE)
            i has a value when I'm creating the function but only then
            This lets me store the entity index in the updateMVMatrix function on creation
            Each slider has its own updateMVMatrix function with the right index :D
            Honnestly it's a shame I can't avoid this trick because of dat.gui...
        */

        (function(i) {

            var f31 = f2.addFolder('Position');
            f31.add(entities[i].pos, 0, -5, 5).name('Pos X').onChange(launchMatrixUpdate);
            f31.add(entities[i].pos, 1, -5, 5).name('Pos Y').onChange(launchMatrixUpdate);
            f31.add(entities[i].pos, 2, -5, 5).name('Pos Z').onChange(launchMatrixUpdate);

            var f32 = f2.addFolder('Rotation');
            f32.add(entities[i].rot, 0, 0, 360).name('Phi').onChange(launchMatrixUpdate).listen();
            f32.add(entities[i].rot, 1, 0, 360).name('Theta').onChange(launchMatrixUpdate);

            f2.add(entities[i], "scale", 0.0001, 5).name('Scale').onChange(launchMatrixUpdate);
            f2.add(entities[i], "isRotating").name('Rotation');

            function launchMatrixUpdate(){
                var idx = i;
                updateObjectMVMatrix(idx);
            }

        }(i));

    }

    var f1 = gui.addFolder("Lights");
    f1.open();
    for(var i=entities.length-lights.length; i<entities.length; i++){

        var idx = i - (entities.length - lights.length);
        //console.log(entities[i].mesh.m_positions);

        var f2 = f1.addFolder(entities[i].name);
        var f31 = f2.addFolder('Position');

        (function(idx) {
            f31.add(lights[idx].position.elements, 0, -15, 15).name('Pos X').onChange(updateLightMVMatrix);
            f31.add(lights[idx].position.elements, 1, -15, 15).name('Pos Y').onChange(updateLightMVMatrix);
            f31.add(lights[idx].position.elements, 2, -15, 15).name('Pos Z').onChange(updateLightMVMatrix);

            function updateLightMVMatrix(){
                var lidx = idx;
                var eidx = idx + lights.length;
                var trans = Matrix.Translation(lights[lidx].position);
                entities[eidx].mvMatrix = trans.x(Matrix.I(4));
            }

        }(idx));

        var f32 = f2.addFolder('Color');
        f32.add(lights[idx].color.elements, 0, 0, 1).name('Red');
        f32.add(lights[idx].color.elements, 1, 0, 1).name('Green');
        f32.add(lights[idx].color.elements, 2, 0, 1).name('Blue');
        

        f2.add(lights[idx], 'intensity', 0, 150).name('Intensity');
    }

    gui.add(guiObj, 'sceneMode', [ 'Normal', 'Wireframe']).name("Render Mode (W)").onChange(function(value){
        if(value == 'Normal'){
            scene.mode = gl.TRIANGLES;
        }else if(value == 'Wireframe'){
            scene.mode = gl.LINES;
        }
    });

};

function updateObjectMVMatrix(idx){
    var trans     = Matrix.Translation(Vector.create(entities[idx].pos));
    var rotPhi    = Matrix.Rotation(entities[idx].rot[0] * Math.PI / 180.0, $V([0,1,0])).ensure4x4();
    var rotTheta  = Matrix.Rotation(entities[idx].rot[1] * Math.PI / 180.0, $V([1,0,0])).ensure4x4();
    var scale     = Matrix.Diagonal([entities[idx].scale, entities[idx].scale, entities[idx].scale, 1]);
    entities[idx].mvMatrix = trans.x(rotTheta).x(rotPhi).x(scale).x(Matrix.I(4));
}
