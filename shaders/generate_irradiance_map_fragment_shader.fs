var generate_irradiance_map_fragment_shader = `
#version 300 es
precision highp float;
precision lowp int;

const float M_PI = 3.14159265359;
const int NB_SAMPLE = 16000;

out vec4 FragColor;
in vec3 v_view;

uniform samplerCube environmentMap;
uniform int timestamp;
uniform int res;

float noise2(vec2 co);

void main()
{       
    // the sample direction equals the hemisphere's orientation 
    vec3 normal = normalize(v_view);
    vec3 irradiance = vec3(0.0);  

    // To World base
    vec3 up    = vec3(0.0, 1.0, 0.0);
    vec3 right = cross(up, normal);
    up         = cross(normal, right);

    //float seed = 43758.5453;
    vec2 seed = vec2(float(NB_SAMPLE) * (gl_FragCoord.y * float(res) + gl_FragCoord.x), float(timestamp));

    // Take nb_sample samples
    for(int i = 0; i < NB_SAMPLE; i++)
    {
        // Randomly generate theta and phi for a uniform distribution over the sphere
        float theta = acos(noise2(seed));         // acos[0,1] => theta in [Pi/2, 0]
        seed.x++;
        float phi = noise2(seed) * 2.0 * M_PI;    // phi in [0,2*Pi]
        seed.y++;
        // spherical to cartesian (in tangent space)
        vec3 tangentSample = vec3(sin(theta) * cos(phi),  sin(theta) * sin(phi), cos(theta));
        // tangent space to world
        vec3 sampleVec = tangentSample.x * right + tangentSample.y * up + tangentSample.z * normal; 

        irradiance += texture(environmentMap, sampleVec).rgb * cos(theta) * sin(theta);
    }
    irradiance = M_PI * irradiance * (1.0 / float(NB_SAMPLE));

    FragColor = vec4(irradiance, 1.0);
}

// http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-noise2-for-opengl-es-2-0/
float noise2(vec2 co)
{
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}
`;