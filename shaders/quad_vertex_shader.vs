var quad_vertex_shader = `
#version 300 es
precision highp float;
precision highp int;
layout(location = 0) in vec3 position;
layout(location = 2) in vec2 aTexCoords;
out vec2 vTexCoords;
void main()
{
    vTexCoords = aTexCoords;
    gl_Position = vec4(position, 1.0);
}
`;