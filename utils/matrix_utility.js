function loadIdentity() {
    mvMatrix = Matrix.I(4);
}

function multMatrix(m) {
    mvMatrix = mvMatrix.x(m);
}

function mvTranslate(v) {
    multMatrix(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
}

/*function mvPushMatrix(m) {
    if (m) {
        scene.mvMatrixStack.push(m.dup());
        mvMatrix = m.dup();
    } else {
        scene.mvMatrixStack.push(mvMatrix.dup());
    }
}

function mvPopMatrix() {
    if (!scene.mvMatrixStack.length) {
        throw('Can\'t pop from an empty matrix stack.');
    }
  
    mvMatrix = scene.mvMatrixStack.pop();
    return mvMatrix;
}*/

function mvRotate(angle, v) {
    var inRadians = angle * Math.PI / 180.0;

    var m = Matrix.Rotation(inRadians, $V([v[0], v[1], v[2]])).ensure4x4();
    multMatrix(m);
}

function rotateMatrixByDegree(matrix, angle, axis){
    var inRadians = angle * Math.PI / 180.0;
    var m = Matrix.Rotation(inRadians, $V([axis[0], axis[1], axis[2]])).ensure4x4();
    return matrix.x(m);
}