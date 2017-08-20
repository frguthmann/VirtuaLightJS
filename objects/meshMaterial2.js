class MeshMaterial2{

    constructor(albedo, normal, roughness, ao, fresnel){

        // Default texture first because loading might take a while
        this.albedo     = MeshMaterial2.defaultTexture;
        this.normal     = MeshMaterial2.defaultTexture;
        this.roughness  = MeshMaterial2.defaultTexture;
        this.ao         = MeshMaterial2.defaultTexture;
        this.fresnel    = MeshMaterial2.defaultTexture;

        // Async loading of actual textures, webgl will start rendering before this is over
        /*this.albedo     = MeshMaterial2.loadTexture(albedo);
        this.normal     = MeshMaterial2.loadTexture(normal);
        this.roughness  = MeshMaterial2.loadTexture(roughness);
        this.ao         = MeshMaterial2.loadTexture(ao);
        this.fresnel    = MeshMaterial2.loadTexture(fresnel);*/
    }

    static loadTexture(texturePath, callback){

        if(!texturePath){
            return MeshMaterial2.defaultTexture;
        }
        
        var tester = new Image();
        var texture = gl.createTexture();

        tester.onload=function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            // set the texture wrapping/filtering options (on the currently bound texture object)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            // load and generate the texture
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, tester.width, tester.height, 0, gl.RGB, gl.UNSIGNED_BYTE, tester);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.bindTexture(gl.TEXTURE_2D, null);

            console.log("Loaded " + texturePath + " successfully");

            if(callback){
                callback();
            }
        };
        
        tester.onerror=function() { // when .png failed
            console.log("Couldn't load " + texturePath);   
        };
        
        tester.src = texturePath; // execute the test
        
        return texture;
    }

    static loadDefaultTexture(callback){    
        const texturePath = "textures/default.png"
        MeshMaterial2.defaultTexture = MeshMaterial2.loadTexture(texturePath, callback);
    }
}