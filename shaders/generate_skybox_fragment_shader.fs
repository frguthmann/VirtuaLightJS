var generate_skybox_fragment_shader = `
#version 300 es
#define M_PI 3.1415926535897932384626433832795

precision highp float;

out vec4 color;
in vec3 v_view;

uniform sampler2D environmentMap;

const vec2 invAtan = vec2(1.0 / (2.0 * M_PI), 1.0 / M_PI);
vec2 SampleSphericalMap(vec3 v)
{
    vec2 uv = vec2(atan(v.z, v.x), asin(v.y));
    uv *= invAtan;
    uv += 0.5;
    return uv;
}

void main()
{       
    vec2 uv = SampleSphericalMap(normalize(v_view)); // make sure to normalize v_view
    vec3 tempColor = texture(environmentMap, uv).rgb;
    
    color = vec4(tempColor, 1.0);
    //color = vec4 (0.0,1.0,0.0,1.0);
}
`;