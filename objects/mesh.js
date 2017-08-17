class Mesh {
    // 
    constructor(albedo = $V([1.0,0.0,0.0,1.0]), fresnel=0.91, roughness = 0.1, ao = 1.0) {
        this.albedo = albedo;
        this.fresnel = fresnel;
        this.roughness = roughness;
        this.ao = ao;
        this.clear();
    }

    loadOFF(filename) {
        this.clear();
        var sizeV, sizeT, tmp;
        var items = filename.split('\n');

        tmp = items[1].split(' ');
        sizeV = parseInt(tmp[0]);
        sizeT = parseInt(tmp[1]);

        for(var i = 0; i < sizeV; i++){
            tmp = items[i+2].split(' ');
            this.m_positions[i] = $V([parseFloat(tmp[0]),parseFloat(tmp[1]),parseFloat(tmp[2])]);
        }
        for(var i = 0; i < sizeT; i++) {
            tmp = items[i+2+sizeV].split(' ');
            this.m_triangles[i] = $V([parseInt(tmp[1]),parseInt(tmp[2]),parseInt(tmp[3])]);
        }
        
        this.centerAndScaleToUnit ();
        this.recomputeNormalsSimple ();
    }

    clear () {
        this.m_positions = [];
        this.m_normals   = [];
        this.m_triangles = [];
        this.m_UV        = [];
    }

    centerAndScaleToUnit () {
        var c = $V([0,0,0]);
        var positionsSize = this.m_positions.length;
        for(var i = 0; i < positionsSize; i++){
            c = c.add(this.m_positions[i]);
        }
        c = c.multiply(1.0/positionsSize);

        var maxD = this.m_positions[0].distanceFrom(c);
        for (var i = 0; i < positionsSize; i++){
            var m = this.m_positions[0].distanceFrom(c);
            if (m > maxD){
                maxD = m;
            }
        }

        for(var i = 0; i < positionsSize; i++){
            this.m_positions[i] = c.add((this.m_positions[i]).subtract(c).multiply( 1.0 / maxD)); // c + (p-c)*s
        }
    }

    computeSphericalUV() {

        this.m_UV = [];
        var positionSize = this.m_positions.length;
        for(var i=0; i<positionSize; i++){
            var n = (this.m_positions[i]).toUnitVector();
            var u = Math.atan(n.e(1), n.e(3)) / (2*Math.PI) + 0.5;
            var v = n.e(2) * 0.5 + 0.5;
            this.m_UV[i] = $V([u,v]);
        }
    }

    recomputeNormalsSimple() {

        this.m_normals = [];
        var positionSize = this.m_positions.length;
        for(var i=0; i<positionSize; i++){
            this.m_normals[i] = $V([0,0,0]);
        }

        var trianglesSize = this.m_triangles.length;
        for (var i = 0; i < trianglesSize; i++) {
            //console.log(this.m_triangles[i]);
            var e01 = this.m_positions[this.m_triangles[i].elements[1]].subtract(this.m_positions[this.m_triangles[i].elements[0]]);
            var e02 = this.m_positions[this.m_triangles[i].elements[2]].subtract(this.m_positions[this.m_triangles[i].elements[0]]);
            var n = e01.cross(e02);
            n = n.toUnitVector();

            for(var j = 0; j < 3; j++){
                this.m_normals[this.m_triangles[i].elements[j]] = n.add(this.m_normals[this.m_triangles[i].elements[j]]);
            }
        }

        var normalsSize =  this.m_normals.length;
        for (var i = 0; i <normalsSize; i++){
            this.m_normals[i] = this.m_normals[i].toUnitVector();
        }
    }

    makePlan(scale, res){

        var cpt = 0;
        // Let's generate res * res vertices
        for(var i=0; i<res; i++){
            for(var j=0; j<res; j++){
                // Trust me I'm an engineer, it works.
                var x = -scale + 2.0*scale*i/(res-1.0);
                var z = -scale + 2.0*scale*j/(res-1.0);
                this.m_positions[res*i+j] = $V([x,-1.25,z]);
                this.m_UV[res*i+j] = $V([(x+scale)/(2*scale), (z+scale)/(2*scale)]);
                // We need (res-1)*(res-1)*2 triangles
                if(i<res-1 && j<res-1){
                    this.m_triangles[2*cpt] = $V([res*i+j, res*i+j+1, res*(i+1)+j+1]);
                    this.m_triangles[2*cpt+1] = $V([res*i+j, res*(i+1)+j+1, res*(i+1)+j]);
                    cpt++;
                }
            }
        }

        this.recomputeNormalsSimple();
    }

    makePlan2(scale){

        // FRONT FACE

        // Vertices
        this.m_positions.push($V([-scale,0,-scale]));
        this.m_positions.push($V([-scale,0,scale]));
        this.m_positions.push($V([scale,0,-scale]));
        this.m_positions.push($V([scale,0,scale]));

        // Normals
        this.m_normals.push($V([0,1,0]));
        this.m_normals.push($V([0,1,0]));
        this.m_normals.push($V([0,1,0]));
        this.m_normals.push($V([0,1,0]));

        // UVs
        this.m_UV.push($V([0,0]));
        this.m_UV.push($V([0,1]));
        this.m_UV.push($V([1,0]));
        this.m_UV.push($V([1,1]));

        // Index
        this.m_triangles.push($V([2,0,1]));
        this.m_triangles.push($V([2,1,3]));

        
        // BACK FACE
        
        // Vertices
        this.m_positions.push($V([-scale,0,-scale]));
        this.m_positions.push($V([-scale,0,scale]));
        this.m_positions.push($V([scale,0,-scale]));
        this.m_positions.push($V([scale,0,scale]));

        // Normals
        this.m_normals.push($V([0,-1,0]));
        this.m_normals.push($V([0,-1,0]));
        this.m_normals.push($V([0,-1,0]));
        this.m_normals.push($V([0,-1,0]));

        // UVs
        this.m_UV.push($V([0,0]));
        this.m_UV.push($V([0,1]));
        this.m_UV.push($V([1,0]));
        this.m_UV.push($V([1,1]));
        
        // Index
        this.m_triangles.push($V([5,4,6]));
        this.m_triangles.push($V([7,5,6]));
    }

    // https://learnopengl.com/code_viewer_gh.php?code=src/6.pbr/1.2.lighting_textured/lighting_textured.cpp
    makeSphere2(res){
        this.clear();
        for (var y = 0; y <= res; ++y)
        {
            for (var x = 0; x <= res; ++x)
            {
                var xSegment = x / res;
                var ySegment = y / res;
                var xPos = Math.cos(xSegment * 2.0 * Math.PI) * Math.sin(ySegment * Math.PI);
                var yPos = Math.cos(ySegment * Math.PI);
                var zPos = Math.sin(xSegment * 2.0 * Math.PI) * Math.sin(ySegment * Math.PI);

                this.m_positions.push($V([xPos, yPos, zPos]));
                this.m_UV.push($V([xSegment, ySegment]));
                this.m_normals.push($V([xPos, yPos, zPos]));
            }
        }

        var oddRow = false;
        for (var y = 0; y < res; ++y)
        {
            if (!oddRow) // even rows: y == 0, y == 2; and so on
            {
                for (var x = 0; x <= res; ++x)
                {
                    this.m_triangles.push(y       * (res + 1) + x);
                    this.m_triangles.push((y + 1) * (res + 1) + x);
                }
            }
            else
            {
                for (var x = res; x >= 0; --x)
                {
                    this.m_triangles.push((y + 1) * (res + 1) + x);
                    this.m_triangles.push(y       * (res + 1) + x);
                }
            }
            oddRow = !oddRow;
        }
    }

    makeSphere(res){
        this.clear();
        var i =0;
        for(var a=0; a<res; a++){

            for(var b=0; b<res; b++){

                var phi   = a * Math.PI/(res-1);
                var theta = b * Math.PI*2/(res-1);

                // Position
                var pos = {x : 0, y : 0, z : 0};
                this.polar2Cartesian(theta,phi,1,pos);

                this.m_positions[3*i]   =  pos.x;
                this.m_positions[3*i+1] =  pos.y;
                this.m_positions[3*i+2] =  pos.z;

                // Indices des triangles 
                this.m_triangles[6*i]   = a*res + b;
                this.m_triangles[6*i+1] = a*res + b + res;
                this.m_triangles[6*i+2] = a*res + (b+1)%res;
                this.m_triangles[6*i+3] = a*res + b + res;
                this.m_triangles[6*i+4] = a*res + res + (b + 1)%res;
                this.m_triangles[6*i+5] = a*res + (b+1)%res;

                // Normales
                this.m_normals[3*i]   = pos.x;
                this.m_normals[3*i+1] = pos.y;
                this.m_normals[3*i+2] = pos.z;

                // Paramétrisation pour textures
                this.m_UV[2*i] = a / res;
                this.m_UV[2*i+1] = b / res;

                i++;
            }
        }
    }

    polar2Cartesian (phi, theta, r, pos) {
        pos.x = r * Math.sin (theta) * Math.cos (phi);
        pos.y = r * Math.sin (theta) * Math.sin (phi);
        pos.z = r * Math.cos (theta);
    }


}
