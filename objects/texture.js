class Texture{

    constructor(texturePath, isHDR, wrap, filter, callback){

        if(!Texture.nbTextureToLoad){
            Texture.nbTextureToLoad = 0;
        }
        Texture.nbTextureToLoad++;

        var image;
        if(!isHDR){
            image = new Image(); 
        }else{
            image = new HDRImage();
        }
        image.crossOrigin = "anonymouss";

        var texture = gl.createTexture();

        image.onload=function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            // set the texture wrapping/filtering options (on the currently bound texture object)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
            // load and generate the texture
            if(!isHDR){
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, image.width, image.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image);
                gl.generateMipmap(gl.TEXTURE_2D);
            }else{
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB16F, image.width, image.height, 0, gl.RGB, gl.FLOAT, image.dataFloat)
            }
            gl.bindTexture(gl.TEXTURE_2D, null);

            //console.log("Loaded " + texturePath + " successfully");

            // Keep track of how much there is left to load
            if(!Texture.nbTextureLoaded){
                Texture.nbTextureLoaded = 0;
            }
            Texture.nbTextureLoaded++;

            updateSpinner();

            if(callback){
                callback(texture);
            }
        };
        
        image.onerror=function() {
            console.log("Couldn't load " + texturePath);   
        };
        
        image.src = texturePath; // execute the test
        
        return texture;
    }

    static loadDefaultTexture(callback){    
        const texturePath = "textures/default.png"
        /*  Assign texture now, even if it's not loaded yet.
            The callback will notify main when the texture is ready*/
        Texture.defaultTexture = new Texture(texturePath, false, gl.REPEAT, gl.NEAREST, callback);
    }
}