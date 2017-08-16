var fragment_shader = `
#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DShadow;

#define M_PI 3.1415926535897932384626433832795
#define MAX_LIGHTS 5

layout(std140, column_major) uniform;

struct LightSource
{
    vec3 position;
    vec3 color;
    float intensity;
    // Attenuation:
    float aconst;
    float alin;
    float aquad;
};

struct Mesh{
    vec3 albedo;
    float pad;
    float fresnel;
    float roughness;
    float ao;
    float maxDistLightCube;
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

uniform sampler2DShadow shadowMap;

in highp vec4 v_view ;
in highp vec3 vNormal;
in highp vec4 vColor;
in highp vec4 vFragPosLightSpace;

out vec4 color;

vec3 lambertDiffuse();
vec3 getIntensityFromPosition(LightSource l, vec3 p);
vec3 microFacetSpecular(vec3 incidentVector, vec3 excidentVector, vec3 n, vec3 fresnel, int distriNbr);
vec3 fresnelSchlick(vec3 incidentVector, vec3 excidentVector, vec3 f0);
vec4 getLightColor(LightSource l, vec3 p);
float ShadowCalculation(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir);

void main(void) {
    vec3 specular = vec3(0.);
    vec3 LO = vec3(0.);
    
    vec3 p = v_view.xyz;
    vec3 n = normalize(vNormal);

    int nbLights = int(u_perPass.nbLights);

    // Fresnel f0 term
    vec3 f0 = vec3(0.04); 
    f0 = mix(f0, u_perScene.mesh.albedo, u_perScene.mesh.fresnel);

    for (int i=0 ; i<nbLights; i++){

        if(distance(p,u_perPass.lights[i].position) <= u_perScene.mesh.maxDistLightCube ){
            color = getLightColor(u_perPass.lights[i], p);
            return;
        }

        vec3 incidentVector = normalize(u_perPass.lights[i].position-p);
        vec3 excidentVector = normalize(-p);
        float directionnalAttenuation = max(dot(n, incidentVector), 0.0);

        vec3 kS = fresnelSchlick(incidentVector, excidentVector, f0);
        vec3 kD = vec3(1.0) - kS;
        kD *= 1.0 - u_perScene.mesh.fresnel;

        specular = microFacetSpecular(incidentVector,excidentVector,n,kS,2);

        vec3 radiance = vec3(u_perPass.lights[i].color) * getIntensityFromPosition(u_perPass.lights[i],p);

        LO += (kD * lambertDiffuse() + specular) * radiance * directionnalAttenuation;

    }

    vec3 ambient = vec3(0.03) * u_perScene.mesh.albedo * u_perScene.mesh.ao;
    vec3 resultingColor = ambient + LO;

    /*resultingColor = resultingColor / (resultingColor + vec3(1.0));
    resultingColor = pow(resultingColor, vec3(1.0/2.2));*/

    // Shadow computation
    vec3 lightDir = normalize(u_perPass.lights[0].position-p);
    float shadowFactor = ShadowCalculation(vFragPosLightSpace, n, lightDir);
    
    color = vec4(resultingColor*shadowFactor,1.0);

}

// Diffuse response of material
vec3 lambertDiffuse(){
    return u_perScene.mesh.albedo / M_PI;
}

// Light intensity attenuation
vec3 getIntensityFromPosition(LightSource l, vec3 p){
    float d = distance(l.position,p);
    // Use intensity instead of 1 maybe?
    float intFromDist = l.intensity / (l.aconst + l.alin*d + l.aquad*d*d);
    return l.color * intFromDist;
}

// Microfacet BRDF, distribution number stands for: 1 = Beckmann, 2 = GGX
vec3 microFacetSpecular(vec3 incidentVector, vec3 excidentVector, vec3 n, vec3 fresnel, int distriNbr){
    // HalfVec
    vec3 halfVec = (incidentVector + excidentVector) / length(incidentVector + excidentVector);

    // Pre compute values:
    float excDotHalf = max(0.0001f,dot(excidentVector,halfVec));
    float normDotExc = max(0.0001f,dot(n,excidentVector));
    float normDotInc = max(0.0001f,dot(n,incidentVector));
    float normDotHalf = max(0.0001f,dot(n,halfVec));
    float normDotHalfSquared = normDotHalf*normDotHalf;
    float roughnessSquared = u_perScene.mesh.roughness*u_perScene.mesh.roughness;

    float distribution;
    float geometry;
    // Beckmann distribution
    if(distriNbr==1)
    {
        // Beckmann
        float factor = 1.0 / (M_PI * roughnessSquared * normDotHalfSquared * normDotHalfSquared);
        float exponent = (normDotHalfSquared-1.0) / (normDotHalfSquared*roughnessSquared);
        distribution = factor * exp(exponent);

        // Cook-Torrance
        float ombrage = (2.0*normDotHalf*normDotInc)/excDotHalf;
        float masquage = (2.0*normDotHalf*normDotExc)/excDotHalf;
        geometry = min(min(ombrage,masquage),float(1.0));
    }
    // GGX distribution
    else if(distriNbr==2){
        // GGX => roughness power 4?
        float denominator = M_PI * pow(1.0+(roughnessSquared-1.0)*normDotHalfSquared,2.0);
        distribution = roughnessSquared / denominator;

        // Boubekeur
        float r = u_perScene.mesh.roughness + 1.0;
        float k = r * r / 8.0;
        float geoInc = normDotInc / (normDotInc * (1.0 - k) + k);
        float geoExc = normDotExc / (normDotExc * (1.0 - k) + k);
        geometry = geoInc * geoExc;
    }
    else{
        distribution = 1.0;
        geometry = 1.0;
    }

    float denominator = 4.0 * normDotInc * normDotExc;
    vec3 numerator = distribution * fresnel * geometry;

    return numerator / denominator;
}

vec3 fresnelSchlick(vec3 incidentVector, vec3 excidentVector, vec3 f0)
{
    vec3 halfVec = (incidentVector + excidentVector) / length(incidentVector + excidentVector);
    vec3 schlick = f0 + (1.0-f0)*pow(1.0-max(0.0f,dot(incidentVector,halfVec)),5.0);
    return schlick;
}  

vec4 getLightColor(LightSource l, vec3 p){
    if(distance(p,l.position) >= u_perScene.mesh.maxDistLightCube*0.8 ){
        return vec4(0.0,0.0,0.0,1.0);
    }else{
        return vec4(l.color, 1.0);
    }
}

// http://ogldev.atspace.co.uk/www/tutorial42/tutorial42.html
// https://learnopengl.com/#!Advanced-Lighting/Shadows/Shadow-Mapping
float ShadowCalculation(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir)
{
    // perform perspective divide
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    // transform to [0,1] range
    projCoords = projCoords * 0.5 + 0.5;

    float shadow = 0.0;
    float bias = 0.00001;
    vec2 texelSize = 1.0 / vec2(textureSize(shadowMap, 0));
    for(float x = -1.0; x <= 1.0; x+=0.5)
    {
        for(float y = -1.0; y <= 1.0; y+=0.5)
        {
            vec3 UVC = vec3(projCoords.xy + vec2(x, y) * texelSize, projCoords.z + bias);
            shadow += texture(shadowMap, UVC) == 0.0 ? 0.3 : 1.0;        
        }    
    }

    shadow /= 25.0;

    float dotNL = dot(normal, lightDir);
    if(dotNL < 0.0) {
        shadow = 1.0;
    }

    return shadow;
}  

`;
