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

out highp vec3 v_view ;
out highp vec3 vNormal;
out highp vec4 vColor;

void main(void) {

    vec4 pEC = u_perDraw.transform.uMVMatrix * vec4(position, 1.0);
    v_view  = (pEC).xyz;
    vNormal = (u_perDraw.transform.uNormalMatrix * vec4(normal, 0.0)).xyz;
    vColor  = color;

    gl_Position = u_perDraw.transform.uPMatrix * pEC;
    
    /*if(color.w < 0.0){
        vColor.w = abs(color.w) * 0.15;
    }*/
}
`;