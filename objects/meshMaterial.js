class MeshMaterial{

    constructor(albedo, normal, roughness, ao, fresnel){

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
        this.assignTexture("albedo", albedo, false);
        this.assignTexture("normal", normal, false);
        this.assignTexture("roughness", roughness, false);
        this.assignTexture("ao", ao, false);
        this.assignTexture("fresnel", fresnel, false);
    }

    assignTexture(attribute, texturePath, isHDR){    
        let meshMat = this;
        /*  Assign only when the texture is loaded. 
            The default texture is set as place holder in the meantime.*/
        if(!isHDR){
            MeshMaterial.loadTexture(texturePath, false, textureLoadCallback);
        }else{
            MeshMaterial.loadTexture(texturePath, true, textureLoadCallback);
        }

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
        
        var image;
        if(!isHDR){
            image = new Image(); 
        }else{
            image = new HDRImage();
        }
        
        var texture = gl.createTexture();

        image.onload=function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            // set the texture wrapping/filtering options (on the currently bound texture object)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            // load and generate the texture
            if(!isHDR){
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, image.width, image.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image);
                gl.generateMipmap(gl.TEXTURE_2D);
            }else{
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, image.width, image.height, 0, gl.RGB, gl.FLOAT, image.dataFloat)
            }
            gl.bindTexture(gl.TEXTURE_2D, null);

            //console.log("Loaded " + texturePath + " successfully");

            if(callback){
                callback(texture);
            }
        };
        
        image.onerror=function() { // when .png failed
            console.log("Couldn't load " + texturePath);   
        };
        
        image.src = texturePath; // execute the test
        
        return texture;
    }

    static loadDefaultTexture(callback){    
        const texturePath = "textures/default.png"
        /*  Assign texture now, even if it's not loaded yet.
            The callback will notify main when the texture is ready*/
        MeshMaterial.defaultTexture = MeshMaterial.loadTexture(texturePath, false, callback);
    }

}