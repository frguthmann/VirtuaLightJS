class Camera {
    constructor(fovAngle = 45.0, nearPlane = 0.01, farPlane = 50.0, camTheta = 3*Math.PI/8.0, camPhi = 0.0,
                camDist2Target = 6.0, camTargetX = 0.0, camTargetY = 0.0, camTargetZ = 0.0) {
        this.fovAngle = 45.0;
        this.nearPlane = 0.01;
        this.farPlane = 50.0;
        this.camTheta = 3*Math.PI/8.0;
        this.camPhi = 0.0;
        this.camDist2Target = 6.0;
        this.camTargetX = 0.0;
        this.camTargetY = 0.0;
        this.camTargetZ = 0.0;
        this.shouldSetup = false;
        this.setup();
    }

    translateByMouse(dX, dY){
        // Compute which direction onscreen horizontal movement is in the scene
        var mxX = Math.cos(this.camPhi);
        var myX = 0;
        var mzX = - Math.sin(this.camPhi);

        var mxY = Math.cos(this.camTheta) * Math.sin(this.camPhi);
        var myY = - Math.sin(this.camTheta);
        var mzY = Math.cos(this.camTheta) * Math.cos(this.camPhi);

        this.camTargetX += 0.01*(mxX*(dX) + mxY*(dY));
        this.camTargetY += 0.01*(myY*(dY));
        this.camTargetZ += 0.01*(mzX*(dX) + mzY*(dY));

        this.shouldSetup = true;
    }

    rotateByMouse(dX, dY){
        this.camTheta+=(dY)*0.01;
        this.camPhi+=(dX)*0.01;
        if(this.camTheta<0.0001){
          this.camTheta = 0.0001;
        }
        if(this.camTheta > Math.PI - 0.0001){
            this.camTheta = Math.PI - 0.0001;
        }
        this.shouldSetup = true;
    }

    setup() {
        mvMatrix = Matrix.I(4);
        var pos = {x:0,y:0,z:0};

        this.polar2Cartesian(this.camTheta, this.camPhi, this.camDist2Target, pos);

        pos.x += this.camTargetX;
        pos.y += this.camTargetY;
        pos.z += this.camTargetZ;
        mvMatrix = makeLookAt(pos.x, pos.y, pos.z, this.camTargetX, this.camTargetY, this.camTargetZ, 0.0, 1.0, 0.0); // Set up the current modelview matrix with camera transform
    }

    zoom(step){
        this.camDist2Target = Math.max(1,this.camDist2Target+step);
        this.shouldSetup = true;
    }

    polar2Cartesian(theta, phi, r, pos) {
        pos.z = r * Math.sin (theta) * Math.cos (phi);
        pos.x = r * Math.sin (theta) * Math.sin (phi);
        pos.y = r * Math.cos (theta);
    }

    rotateByAngle(phi, pheta){
        this.camPhi+=pheta;
        this.camTheta+=phi;
        this.shouldSetup = true;
    }

    addCubeMapDirections(){
        this.cameraDirections = [
            { cubemapFace : gl.TEXTURE_CUBE_MAP_POSITIVE_X, target : $V([ 1.0,  0.0,  0.0]), up : $V([0.0, -1.0,  0.0]) },
            { cubemapFace : gl.TEXTURE_CUBE_MAP_NEGATIVE_X, target : $V([-1.0,  0.0,  0.0]), up : $V([0.0, -1.0,  0.0]) },
            { cubemapFace : gl.TEXTURE_CUBE_MAP_POSITIVE_Y, target : $V([ 0.0,  1.0,  0.0]), up : $V([0.0,  0.0, -1.0]) },
            { cubemapFace : gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, target : $V([ 0.0, -1.0,  0.0]), up : $V([0.0,  0.0,  1.0]) },
            { cubemapFace : gl.TEXTURE_CUBE_MAP_POSITIVE_Z, target : $V([ 0.0,  0.0,  1.0]), up : $V([0.0, -1.0,  0.0]) },
            { cubemapFace : gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, target : $V([ 0.0,  0.0, -1.0]), up : $V([0.0, -1.0,  0.0]) }
        ];
    }
}