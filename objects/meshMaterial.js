class MeshMaterial{

    constructor(albedo, normal, roughness, ao, fresnel){

        // Default texture first because loading might take a while
        this.albedo     = MeshMaterial.defaultTexture;
        this.normal     = MeshMaterial.defaultTexture;
        this.roughness  = MeshMaterial.defaultTexture;
        this.ao         = MeshMaterial.defaultTexture;
        this.fresnel    = MeshMaterial.defaultTexture;

        // Async loading of actual textures, webgl will start rendering before this is over
        this.assignTexture("albedo", albedo);
        this.assignTexture("normal", normal);
        this.assignTexture("roughness", roughness);
        this.assignTexture("ao", ao);
        this.assignTexture("fresnel", fresnel);
    }

    static loadTexture(texturePath, callback){

        if(!texturePath){
            return MeshMaterial.defaultTexture;
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
                callback(texture);
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
        /*  Assign texture now, even if it's not loaded yet.
            The callback will notify main when the texture is ready*/
        MeshMaterial.defaultTexture = MeshMaterial.loadTexture(texturePath, callback);
    }

    assignTexture(attribute, texturePath){    
        let meshMat = this;
        /*  Assign only when the texture is loaded. 
            The default texture is set as place holder in the meantime.*/
        MeshMaterial.loadTexture(texturePath, function(texture){
            meshMat[attribute] = texture;
        });
    }
}