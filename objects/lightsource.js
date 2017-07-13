class LightSource{
    // Need a vec4 for position for padding reasons. Color can be a vec3 as intensity fills the blank space
    constructor(position = $V([0,0,0,1]), color = $V([1,1,1]), intensity = 10, aconst = 1, alin = 1, aquad = 1, id = -1){
        this.position   = position;
        this.color      = color;
        this.intensity  = intensity;
        this.aconst     = aconst; 
        this.alin       = alin;
        this.aquad      = aquad;
        this.id         = id;
    }

    static createLightSource(l){
        return new LightSource(l.position, l.color, l.intensity, l.aconst, l.alin, l.aquad, l.id);
    }

    getIntensityFromPosition (objPos){
      var d = objPos.distanceFrom(this.position);
      var intFromDist = this.intensity / (this.aconst + this.alin*d + this.aquad*d*d);
      return this.color * intFromDist;
    }
     
}