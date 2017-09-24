var generate_skybox_fragment_shader = `
#version 300 es
#define M_PI 3.1415926535897932384626433832795

precision highp float;

out vec4 color;
in vec3 localPos;

uniform sampler2D environmentMap;
uniform int isHDR;

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
    vec2 uv = SampleSphericalMap(normalize(localPos)); // make sure to normalize localPos
    vec3 tempColor = isHDR == 1 ? texture(environmentMap, uv).rgb : pow(texture(environmentMap, uv).rgb, vec3(2.2));
    
    color = vec4(tempColor, 1.0);
    //color = vec4 (0.0,1.0,0.0,1.0);
}
`;