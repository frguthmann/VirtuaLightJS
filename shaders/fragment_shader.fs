var fragment_shader = `
#version 300 es
precision highp float;
precision highp int;

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
    vec3 diffuse;
    vec3 specular;
    float shininess;
    float roughness;
    float fresnel;
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

uniform sampler2D shadowMap;

in highp vec4 v_view ;
in highp vec3 vNormal;
in highp vec4 vColor;
in highp vec4 vFragPosLightSpace;

out vec4 color;

vec3 lambertDiffuse();
vec3 getIntensityFromPosition(LightSource l, vec3 p);
vec3 blinnPhongSpecular(vec3 p, vec3 n, vec3 incidentVector);
float microFacetSpecular(vec3 p, vec3 n, vec3 incidentVector, int distriNbr);
vec4 getLightColor(LightSource l, vec3 p);
float ShadowCalculation(vec4 FragPosLightSpace);

void main(void) {
    vec3 diffuse = vec3(0.0,0.0,0.0);
    vec3 specular = vec3(0.0,0.0,0.0);
    
    vec3 p = v_view.xyz;
    vec3 n = normalize(vNormal);

    int nbLights = int(u_perPass.nbLights);

    for (int i=0 ; i<nbLights; i++){

        if(distance(p,u_perPass.lights[i].position) <= u_perScene.mesh.maxDistLightCube ){
            color = getLightColor(u_perPass.lights[i], p);
            return;
        }

        vec3 incidentVector = normalize(u_perPass.lights[i].position-p);
        float directionnalAttenuation = max(dot(n, incidentVector), 0.0);

        diffuse += (directionnalAttenuation) * lambertDiffuse() * vec3(vColor) * getIntensityFromPosition(u_perPass.lights[i],p);
        //specular += blinnPhongSpecular(p,n,incidentVector)*directionnalAttenuation*getIntensityFromPosition(u_perPass.lights[i],p);
        specular += microFacetSpecular(p,n,incidentVector,2)*directionnalAttenuation*getIntensityFromPosition(u_perPass.lights[i],p);
    }
    // ----------------------------------------

    float shadowFactor = ShadowCalculation(vFragPosLightSpace);
    color = vec4(diffuse * shadowFactor,1.0) * vColor.w + vec4(specular * shadowFactor,1.0);

    vec3 projCoords = vFragPosLightSpace.xyz / vFragPosLightSpace.w;
    // transform to [0,1] range
    projCoords = projCoords * 0.5 + 0.5;
    // get closest depth value from light's perspective (using [0,1] range fragPosLight as coords)
    vec3 depth = vec3(texture(shadowMap,  projCoords.xy).r); 
    color = vec4(depth, 1.0);
}

// Diffuse response of material
vec3 lambertDiffuse(){
    return u_perScene.mesh.diffuse / M_PI;
}

// Light intensity attenuation
vec3 getIntensityFromPosition(LightSource l, vec3 p){
    float d = distance(l.position,p);
    float intFromDist = l.intensity / (l.aconst + l.alin*d + l.aquad*d*d);
    return l.color * intFromDist;
}

// Phong BRDF
vec3 blinnPhongSpecular(vec3 p, vec3 n, vec3 incidentVector){
    // HalfVec
    vec3 excidentVector = normalize(-p);
    vec3 halfVec = (incidentVector + excidentVector) / length(incidentVector + excidentVector);

    vec3 specularComponent = u_perScene.mesh.specular * pow(max(0.0001f,dot(n,halfVec)),u_perScene.mesh.shininess);
    return specularComponent;
}

// Microfacet BRDF, distribution number stands for: 1 = Beckmann, 2 = GGX
float microFacetSpecular(vec3 p, vec3 n, vec3 incidentVector, int distriNbr){
    // HalfVec
    vec3 excidentVector = normalize(-p);
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
        // GGX
        float denominator = M_PI * pow(1.0+(roughnessSquared-1.0)*normDotHalfSquared,2.0);
        distribution = roughnessSquared / denominator;

        float k = u_perScene.mesh.roughness * sqrt(2.0/M_PI);
        float geoInc = normDotInc / (normDotInc * (1.0 - k) + k);
        float geoExc = normDotExc / (normDotExc * (1.0 - k) + k);
        geometry = geoInc * geoExc;
    }
    else{
        distribution = 1.0;
        geometry = 1.0;
    }

    // Fresnel
    float f0 = u_perScene.mesh.fresnel;
    float fresnel = f0 + (1.0-f0)*pow(1.0-max(0.0f,dot(incidentVector,halfVec)),5.0);

    float denominator = 4.0 * normDotInc * normDotExc;

    return distribution * fresnel * geometry / denominator;
}

vec4 getLightColor(LightSource l, vec3 p){
    if(distance(p,l.position) >= u_perScene.mesh.maxDistLightCube*0.8 ){
        return vec4(0.0,0.0,0.0,1.0);
    }else{
        return vec4(l.color, 1.0);
    }
}

float ShadowCalculation(vec4 fragPosLightSpace)
{
    // perform perspective divide
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    // transform to [0,1] range
    projCoords = projCoords * 0.5 + 0.5;
    // get closest depth value from light's perspective (using [0,1] range fragPosLight as coords)
    float closestDepth = texture(shadowMap, projCoords.xy).r; 
    // get depth of current fragment from light's perspective
    float currentDepth = projCoords.z;
    // check whether current frag pos is in shadow
    float shadow = currentDepth > closestDepth  ? 1.0 : 0.0;

    return shadow;
}  

`;