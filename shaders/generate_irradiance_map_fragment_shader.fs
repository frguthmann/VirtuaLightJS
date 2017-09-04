var generate_irradiance_map_fragment_shader = `
#version 300 es
precision highp float;
precision lowp int;

const float M_PI = 3.14159265359;
const int NB_SAMPLE = 16000;

out vec4 FragColor;
in vec3 v_view;

uniform samplerCube environmentMap;

float rand(float n);
float noise(float p);
float rand(vec2 co);

void main()
{       
    // the sample direction equals the hemisphere's orientation 
    vec3 normal = normalize(v_view);
    vec3 irradiance = vec3(0.0);  

    // To World base
    vec3 up    = vec3(0.0, 1.0, 0.0);
    vec3 right = cross(up, normal);
    up         = cross(normal, right);

    float seed = 43758.5453; 

    // Take nb_sample samples
    for(int i = 0; i < NB_SAMPLE; i++)
    {
        // Randomly generate theta and phi for a uniform distribution over the sphere
        float theta = acos(noise(seed++));         // acos[0,1] => theta in [Pi/2, 0]
        float phi = noise(seed++) * 2.0 * M_PI;    // phi in [0,2*Pi]
        
        // spherical to cartesian (in tangent space)
        vec3 tangentSample = vec3(sin(theta) * cos(phi),  sin(theta) * sin(phi), cos(theta));
        // tangent space to world
        vec3 sampleVec = tangentSample.x * right + tangentSample.y * up + tangentSample.z * normal; 

        irradiance += texture(environmentMap, sampleVec).rgb * cos(theta) * sin(theta);
    }
    irradiance = M_PI * irradiance * (1.0 / float(NB_SAMPLE));

    FragColor = vec4(irradiance, 1.0);
}

// https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
float rand(float n){
    return fract(sin(n) * 43758.5453123);
}

float noise(float p){
    float fl = floor(p);
    float fc = fract(p);
    return mix(rand(fl), rand(fl + 1.0), fc);
}

float rand(vec2 co)
{
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}
`;