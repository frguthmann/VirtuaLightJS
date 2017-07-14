class MeshMaterial{
    constructor(mesh = new Mesh()){
        // Buffer is apparently 16-aligned, must pad with 2 floats => 4*1 + 3*1 + 1*3 + 1*2 padding => 12
        this.diffuse    = mesh.diffuse.elements;
        this.specular   = mesh.specular.elements;
        this.shininess  = mesh.shininess;
        this.roughness  = mesh.roughness;
        this.fresnel    = mesh.fresnel;
        this.maxDist    = Math.sqrt(cubeSize*cubeSize*3);
        this.padding    = -1;
    }
}