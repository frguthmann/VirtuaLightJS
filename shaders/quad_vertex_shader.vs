var quad_vertex_shader = `
#version 300 es
#define POSITION_LOCATION 0
#define TEXCOORD_LOCATION 4
precision highp float;
precision highp int;
layout(location = POSITION_LOCATION) in vec2 position;
layout(location = TEXCOORD_LOCATION) in vec2 textureCoordinates;
out vec2 v_st;
void main()
{
    v_st = textureCoordinates;
    gl_Position = vec4(position, 0.0, 1.0);
}
`;