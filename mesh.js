class Mesh {
    constructor() {
        this.diffuse = 1.0;
        this.specular = 1.0;
        this.shininess = 80.0;
        this.roughness = 0.1;
        this.fresnel=0.91;
        this.albedo = $V([1.0,0.0,0.0]);
        this.firstPlaneVertex = 0;
        this.firstPlaneTriangle = 0;
        this.clear();
    }

    loadOFF(filename) {
        this.clear();
        var sizeV, sizeT, tmp;
        var items = file.split('\n');
        //console.log(items);

        tmp = items[1].split(' ');
        //console.log(tmp);
        sizeV = parseInt(tmp[0]);
        sizeT = parseInt(tmp[1]);

        for(var i = 0; i < sizeV; i++){
            tmp = items[i+2].split(' ');
            this.m_positions[i] = [parseFloat(tmp[0]),parseFloat(tmp[1]),parseFloat(tmp[2])];
            //console.log(this.m_positions[i]);
        }
        for(var i = 0; i < sizeT; i++) {
            tmp = items[i+2+sizeV].split(' ');
            this.m_triangles[i] = [parseInt(tmp[1]),parseInt(tmp[2]),parseInt(tmp[3])];
            //console.log(this.m_triangles[i]);
        }
        
        //this.centerAndScaleToUnit ();
        
        //addPlane();
        //recomputeNormals ();
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
            c += this.m_positions[i];
        }
        c /= positionsSize;
        var maxD = $V(this.m_positions[0]).distanceFrom(c);
        
        for (var i = 0; i < positionsSize; i++){
            var m = $V(this.m_positions[0]).distanceFrom(c);
            if (m > maxD){
                maxD = m;
            }
        }

        for(var i = 0; i < positionsSize; i++){
            this.m_positions[i] = (this.m_positions[i] - c) / maxD;
        }
    }

}
