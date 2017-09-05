var vertex_shader = `
#version 300 es
precision highp float;
precision highp int;

layout(std140, column_major) uniform;

struct Transform
{
    mat4 uMVMatrix;
    mat4 uNormalMatrix;
    mat4 uPMatrix;
    mat4 uDepthMVP;
};

uniform PerDraw
{
    Transform transform;
} u_perDraw;

layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec2 aTexCoords;

out highp vec4 worldPos ;
out highp vec3 vNormal;
out highp vec4 vFragPosLightSpace;
out highp vec2 vTexCoords;

void main(void) {

    worldPos  = u_perDraw.transform.uMVMatrix * vec4(position, 1.0);
    vNormal = (u_perDraw.transform.uNormalMatrix * vec4(normal, 0.0)).xyz;
    vFragPosLightSpace = u_perDraw.transform.uDepthMVP * vec4(position, 1.0);
    vTexCoords = aTexCoords;

    gl_Position = u_perDraw.transform.uPMatrix * worldPos;
}
`;