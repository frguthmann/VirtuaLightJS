var fragment_shader = `
#version 300 es
precision highp float;
precision highp int;

#define M_PI 3.1415926535897932384626433832795
#define MAX_LIGHTS 5

layout(std140, column_major) uniform;

struct LightSource
{
    vec4 position;
    vec4 color;
    float intensity;
    // Attenuation:
    float aconst;
    float alin;
    float aquad;
};

struct Mesh{
    float diffuse;
    float specular;
    float shininess;
    float roughness;
    float fresnel;
};

uniform PerScene
{
    Mesh mesh;
} u_perScene;

uniform PerPass
{
    LightSource lights[MAX_LIGHTS];
    float nbLights;
} u_perPass;

in highp vec4 vColor;
in highp vec4 vNormal;

out vec4 color;

void main(void) {
    color = vColor;
    if(u_perPass.nbLights != 1.0){
        color = vec4(0.0,1.0,1.0,1.0);
    }
}`
;