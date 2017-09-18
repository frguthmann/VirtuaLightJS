var generate_irradiance_map_fragment_shader = `
#version 300 es
precision highp float;
precision lowp int;

const float M_PI = 3.14159265359;
const uint NB_SAMPLE = 16000u;

out vec4 FragColor;
in vec3 localPos;

uniform samplerCube environmentMap;

float RadicalInverse_VdC(uint bits); 
vec2 Hammersley(uint i, uint N);

float noise2(vec2 co);

void main()
{       
    // the sample direction equals the hemisphere's orientation 
    vec3 normal = normalize(localPos);
    vec3 irradiance = vec3(0.0);  

    // To World base
    vec3 up = abs(normal.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 right = normalize(cross(up, normal));
    up         = cross(normal, right);

    // Take nb_sample samples
    for(uint i = 0u; i < NB_SAMPLE; i++)
    {
        vec2 rand2 = Hammersley(i, NB_SAMPLE);
        // Randomly generate theta and phi for a uniform distribution over the sphere
        float cosTheta = sqrt(1.0-rand2.x);     // acos[0,1] => theta in [Pi/2, 0]
        float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
        float phi = rand2.y * 2.0 * M_PI;       // phi in [0,2*Pi]
        // spherical to cartesian (in tangent space)
        vec3 tangentSample = vec3(sinTheta * cos(phi),  sinTheta * sin(phi), cosTheta);
        // tangent space to world
        vec3 sampleVec = tangentSample.x * right + tangentSample.y * up + tangentSample.z * normal; 

        irradiance += texture(environmentMap, sampleVec).rgb * cosTheta * sinTheta;
    }
    irradiance = M_PI * irradiance * (1.0 / float(NB_SAMPLE));

    FragColor = vec4(irradiance, 1.0);
}

float RadicalInverse_VdC(uint bits) 
{
    bits = (bits << 16u) | (bits >> 16u);
    bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
    bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
    bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
    bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
    return float(bits) * 2.3283064365386963e-10; // / 0x100000000
}

vec2 Hammersley(uint i, uint N)
{
    return vec2(float(i)/float(N), RadicalInverse_VdC(i));
}
`;