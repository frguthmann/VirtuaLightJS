var quad_fragment_shader = `
#version 300 es
precision highp float;
precision highp int;
uniform sampler2D albedoMap;
in highp vec2 vTexCoords;
out vec4 color;
void main()
{
    vec3 albedo = texture(albedoMap, vTexCoords).rgb;
    color = vec4(albedo, 1.0);
    color = vec4(1.0, 0.0, 0.0, 1.0);
}
`;