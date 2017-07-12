class Mesh {
    // Need a vec4 for diffuse for padding reasons. specular can be a vec3 as intensity fills the blank space
    constructor(diffuse = $V([1.0,0.0,0.0,1.0]), specular = $V([1.0,1.0,1.0]), shininess = 80.0, roughness = 0.1, fresnel=0.91) {
        this.diffuse = diffuse;
        this.specular = specular;
        this.shininess = shininess;
        this.roughness = roughness;
        this.fresnel = fresnel;
        this.firstPlaneVertex = 0;
        this.firstPlaneTriangle = 0;
        this.clear();
    }

    loadOFF(filename) {
        this.clear();
        var sizeV, sizeT, tmp;
        var items = filename.split('\n');
        //console.log(items);

        tmp = items[1].split(' ');
        //console.log(tmp);
        sizeV = parseInt(tmp[0]);
        sizeT = parseInt(tmp[1]);

        for(var i = 0; i < sizeV; i++){
            tmp = items[i+2].split(' ');
            this.m_positions[i] = $V([parseFloat(tmp[0]),parseFloat(tmp[1]),parseFloat(tmp[2])]);
            //console.log(this.m_positions[i]);
        }
        for(var i = 0; i < sizeT; i++) {
            tmp = items[i+2+sizeV].split(' ');
            this.m_triangles[i] = $V([parseInt(tmp[1]),parseInt(tmp[2]),parseInt(tmp[3])]);
            //console.log(this.m_triangles[i]);
        }
        
        this.centerAndScaleToUnit ();
        
        //addPlane();
        this.recomputeNormalsSimple ();
    }

    clear () {
        this.m_positions = [];
        this.m_normals   = [];
        this.m_triangles = [];
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

    recomputeNormalsSimple() {

        this.m_normals = [];
        var positionSize = this.m_positions.length;
        for(var i=0; i<positionSize; i++){
            this.m_normals[i] = $V([0,0,0]);
        }
        //console.log(this.m_normals);

        var trianglesSize = this.m_triangles.length;
        for (var i = 0; i < trianglesSize; i++) {
            var e01 = this.m_positions[this.m_triangles[i].elements[1]].subtract(this.m_positions[this.m_triangles[i].elements[0]]);
            var e02 = this.m_positions[this.m_triangles[i].elements[2]].subtract(this.m_positions[this.m_triangles[i].elements[0]]);
            var n = e01.cross(e02);
            //console.log(n, n.toUnitVector());
            n = n.toUnitVector();
            //console.log("post:", n);

            for(var j = 0; j < 3; j++){
                //console.log(n,this.m_normals[this.m_triangles[i].elements[j]], n.add(this.m_normals[this.m_triangles[i].elements[j]]));
                this.m_normals[this.m_triangles[i].elements[j]] = n.add(this.m_normals[this.m_triangles[i].elements[j]]);
                //console.log(this.m_normals[this.m_triangles[i].elements[j]]);
            }
        }

        var normalsSize =  this.m_normals.length;
        for (var i = 0; i <normalsSize; i++){
            this.m_normals[i] = this.m_normals[i].toUnitVector();
        }
        //console.log(this.m_normals);
    }

}
