class Entity{
     constructor(mesh = new Mesh(), name = "defaultObj", mvMatrix = Matrix.I(4), material = new MeshMaterial()){
        this.mesh        = mesh;
        this.name        = name;
        this.mvMatrix    = mvMatrix;
        this.material    = material; 
    }
}