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