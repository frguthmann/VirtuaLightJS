class MeshMaterial2{

    constructor(shaderProg,
                albedo      = "textures/default.png", 
                normal      = "textures/default.png",
                roughness   = "textures/default.png",
                ao          = "textures/default.png",
                fresnel     = "textures/default.png" 
                ){

        this.albedo     = this.loadTexture(shaderProg, albedo, "albedoMap", 1);
        this.normal     = this.loadTexture(shaderProg, normal, "normalMap", 2);
        this.roughness  = this.loadTexture(shaderProg, roughness, "roughnessMap", 3);
        this.ao         = this.loadTexture(shaderProg, ao, "aoMap", 4);
        this.fresnel    = this.loadTexture(shaderProg, fresnel, "fresnelMap", 5);
    }

    loadTexture(shaderProg, texturePath, textureMap, location){
        
        var tester = new Image();
        var texture = gl.createTexture();

        tester.onload=function() {
            console.log("Loaded successfully " + texturePath);

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
            gl.uniform1i(gl.getUniformLocation(shaderProg, textureMap), location);
        };
        
        tester.onerror=function() { // when .png failed
            console.log("Couldn't load " + texturePath);   
        };
        
        tester.src = texturePath; // execute the test
        
        return texture;
    }
}