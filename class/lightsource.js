class LightSource{
    constructor(position = $V([0,0,0,1]), color = $V([1,1,1]), intensity = 10, aconst = 1, alin = 1, aquad = 1){
        this.position   = position
        this.color      = color;
        this.intensity  = intensity;
        this.aconst     = aconst; 
        this.alin       = alin;
        this.aquad      = aquad;
        this.padding    = -1;
    }

    getIntensityFromPosition (objPos){
      var d = objPos.distanceFrom(this.position);
      var intFromDist = this.intensity / (this.aconst + this.alin*d + this.aquad*d*d);
      return this.color * intFromDist;
    }
     
}