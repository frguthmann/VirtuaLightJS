// https://gist.github.com/penguinboy/762197
var flattenObject = function(ob) {
    var toReturn = [];
    
    for (var i in ob) {
        if (!ob.hasOwnProperty(i)) continue;
        
        if ((typeof ob[i]) == 'object') {
            var flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) continue;
                
                toReturn.push(flatObject[x]);
            }
        } else {
            toReturn.push(ob[i]);
        }
    }
    return toReturn;
};

// Extension of vector type for element wise multiplication
Vector.prototype.ewMult = function(vec2) {
    var result = []
    for(var i = 0; i < this.elements.length; i++) {
        result.push( this.elements[i] * vec2.elements[i])
    }
    return $V(result);
}