class MeshMaterial{

    constructor(material){

        // Default texture first because loading might take a while
        this.albedo     = Texture.defaultTexture;
        this.normal     = Texture.defaultTexture;
        this.roughness  = Texture.defaultTexture;
        this.ao         = Texture.defaultTexture;
        this.fresnel    = Texture.defaultTexture;

        // Async loading of actual textures, webgl will start rendering before this is over
        if(material){
            this.assignTexture("albedo", material.albedo, false);
            this.assignTexture("normal", material.normal, false);
            this.assignTexture("roughness", material.roughness, false);
            this.assignTexture("ao", material.ao, false);
            this.assignTexture("fresnel", material.fresnel, false);
        }
    }

    assignTexture(attribute, texturePath, isHDR){    
        // If no attribute is assigned, then the default texture is already in place and should stay that way
        if(!texturePath){
            return;
        }
        
        let meshMat = this;
        let path = texturePath;
        // Assign only when the texture is loaded. through call back
        new Texture(texturePath, isHDR, gl.REPEAT, gl.NEAREST, textureLoadCallback);
        function textureLoadCallback(texture){
            meshMat[attribute] = texture;
        }
    }

    generateTextures(albedo, roughness, fresnel){
        // Textures with Uint8 take values between 0 and 255
        albedo = new Uint8Array(albedo.map(i => Math.min(i * 255.0, 255.0)));
        roughness = new Uint8Array(3).fill(Math.min(roughness * 255.0, 255.0));
        fresnel = new Uint8Array(3).fill(Math.min(fresnel * 255.0, 255.0));

        // Generate single pixel textures with the desired value
        this.albedo     = Texture.generateTextureFromData(albedo, 1, 1, false, gl.REPEAT, gl.NEAREST);
        this.roughness  = Texture.generateTextureFromData(roughness, 1, 1, false, gl.REPEAT, gl.NEAREST);
        this.fresnel    = Texture.generateTextureFromData(fresnel, 1, 1, false, gl.REPEAT, gl.NEAREST);
        // Don't override normal and set AO as none
        this.normal     = Texture.defaultTexture;
        this.ao         = Texture.defaultTexture;
    }

}