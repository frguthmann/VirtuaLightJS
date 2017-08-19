class MeshMaterial{
    constructor(mesh = new Mesh()){
        // Buffer is apparently 16-aligned, must pad by 1
        this.albedo     = mesh.albedo.elements;
        this.fresnel    = mesh.fresnel;
        this.roughness  = mesh.roughness;
        this.ao         = mesh.ao;
        this.maxDist    = Math.sqrt(cubeSize*cubeSize*3);
        console.log(this.maxDist);
    }
}