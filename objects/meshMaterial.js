class MeshMaterial{

    constructor(material){

        // Default texture first because loading might take a while
        this.albedo     = MeshMaterial.defaultTexture;
        this.normal     = MeshMaterial.defaultTexture;
        this.roughness  = MeshMaterial.defaultTexture;
        this.ao         = MeshMaterial.defaultTexture;
        this.fresnel    = MeshMaterial.defaultTexture;

        if(!MeshMaterial.nbTextureToLoad){
            MeshMaterial.nbTextureToLoad = 0;
        }

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
        let meshMat = this;
        let path = texturePath;
        /*  Assign only when the texture is loaded. 
            The default texture is set as place holder in the meantime.*/
        MeshMaterial.loadTexture(texturePath, isHDR, textureLoadCallback);

        function textureLoadCallback(texture){
            meshMat[attribute] = texture;

                // Keep track of how much there is left to load
                if(!MeshMaterial.nbTextureLoaded){
                    MeshMaterial.nbTextureLoaded = 0;
                }
                MeshMaterial.nbTextureLoaded++;

                updateSpinner();
        }
    }
    
    static loadTexture(texturePath, isHDR, callback){

        if(!texturePath){
            return MeshMaterial.defaultTexture;
        }
        MeshMaterial.nbTextureToLoad++;
        return new Texture(texturePath, isHDR, gl.REPEAT, gl.NEAREST, callback);
    }

    static loadDefaultTexture(callback){    
        const texturePath = "textures/default.png"
        /*  Assign texture now, even if it's not loaded yet.
            The callback will notify main when the texture is ready*/
        MeshMaterial.defaultTexture = MeshMaterial.loadTexture(texturePath, false, callback);
    }

}