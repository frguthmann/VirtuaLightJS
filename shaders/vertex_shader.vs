var vertex_shader = `
#version 300 es
precision highp float;
precision highp int;

layout(std140, column_major) uniform;

struct Transform
{
    mat4 uPMatrix;
    mat4 uMVMatrix;
    mat4 uNormalMatrix;
};

uniform PerDraw
{
    Transform transform;
} u_perDraw;

layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec4 color;

out highp vec4 v_view ;
out highp vec3 vNormal;
out highp vec4 vColor;

void main(void) {

    v_view  = u_perDraw.transform.uMVMatrix * vec4(position, 1.0);
    vNormal = (u_perDraw.transform.uNormalMatrix * vec4(normal, 0.0)).xyz;
    vColor  = color;

    gl_Position = u_perDraw.transform.uPMatrix * v_view;
    
    /*if(color.w < 0.0){
        vColor.w = abs(color.w) * 0.15;
    }*/
}
`;