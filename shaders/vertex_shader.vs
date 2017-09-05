var vertex_shader = `
#version 300 es
precision highp float;
precision highp int;

layout(std140, column_major) uniform;

struct Transform
{
    mat4 uModel;
    mat4 uView;
    mat4 uProjection;
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

/*
    I can use mat3(uModel) as a normal matrix because all I do is either: translation, rotation or homogeneous scaling
    That means the matrix is orthogonal and I don't have to apply the transpose(invert(matrix)) to it
    https://gamedev.stackexchange.com/a/126115
*/

void main(void) {

    worldPos            = u_perDraw.transform.uModel * vec4(position, 1.0);
    vNormal             = mat3(u_perDraw.transform.uModel) * normal;
    vFragPosLightSpace  = u_perDraw.transform.uDepthMVP * vec4(position, 1.0);
    vTexCoords          = aTexCoords;

    gl_Position = u_perDraw.transform.uProjection * u_perDraw.transform.uView * worldPos;
}
`;