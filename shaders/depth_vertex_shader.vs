var depth_vertex_shader = `
#version 300 es
precision highp float;
precision highp int;

layout(std140, column_major) uniform;

struct Transform
{
    mat4 uMVMatrix;
    mat4 uNormalMatrix;
    mat4 uPMatrix;
};

uniform PerDraw
{
    Transform transform;
} u_perDraw;

layout(location = 0) in vec3 position;

void main(void) {

    // MVMatrix actually has the projection component in it too. WIP
    gl_Position = u_perDraw.transform.uMVMatrix * vec4(position,1.0);
    
}
`;