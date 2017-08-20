class Entity{
     constructor(mesh = new Mesh(), name = "defaultObj", mvMatrix = Matrix.I(4)){
        this.mesh        = mesh;
        this.name        = name;
        this.mvMatrix    = mvMatrix; 
    }
}