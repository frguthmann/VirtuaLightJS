const ortho = 10.0;
class Camera {
    constructor(fovAngle = 53.0, nearPlane = 0.01, farPlane = 50.0, camTheta = 3*Math.PI/8.0, camPhi = 0.0,
                camDist2Target = 6.0, camTargetX = 0.0, camTargetY = 0.0, camTargetZ = 0.0) {
        this.fovAngle = fovAngle;
        this.nearPlane = nearPlane;
        this.farPlane = farPlane;
        this.camTheta = camTheta;
        this.camPhi = camPhi;
        this.camDist2Target = camDist2Target;
        this.camTargetX = camTargetX;
        this.camTargetY = camTargetY;
        this.camTargetZ = camTargetZ;
        this.shouldSetup = false;
        this.orthoProj = makeOrtho(-ortho, ortho, -ortho, ortho, nearPlane, farPlane);
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
        pMatrix = makePerspective(this.fovAngle, canvas.clientWidth / canvas.clientHeight, this.nearPlane, this.farPlane);
    }

    zoom(step){
                
        // Zoom in or out
        var posStep = step > 0 ? 1.1 : 0.90;
        this.camDist2Target = Math.max(Math.min(40,this.camDist2Target*posStep),0.001);
        
        // Update FOV accordingly for style
        var fovStp = Math.pow(60.0/30.0, 1.0 / (Math.log(40.0/0.001) / Math.log(1.1)) );
        var fovStep = step > 0 ? fovStp : 2.0-fovStp;
        this.fovAngle = Math.max(Math.min(60,this.fovAngle*fovStep),30);
        

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
}