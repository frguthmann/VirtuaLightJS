var generate_skybox_vertex_shader = `
#version 300 es
layout (location = 0) in vec3 position;

out vec3 localPos;

uniform mat4 uPMatrix;
uniform mat4 view;

void main()
{
    localPos = position;  
    gl_Position =  uPMatrix * view * vec4(position, 1.0);
}
`;