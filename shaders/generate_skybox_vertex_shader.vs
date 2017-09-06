var generate_skybox_vertex_shader = `
#version 300 es
layout (location = 0) in vec3 position;

out vec3 v_view;

uniform mat4 uPMatrix;
uniform mat4 view;

void main()
{
    v_view = position;  
    gl_Position =  uPMatrix * view * vec4(position, 1.0);
}
`;