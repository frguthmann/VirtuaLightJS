var fragment_shader = `
#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DShadow;

#define M_PI 3.1415926535897932384626433832795
#define MAX_LIGHTS 5
#define MAX_DIST 0.35

const vec2 invAtan = vec2(1.0 / (2.0 * M_PI), 1.0 / M_PI);

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

uniform PerPass
{
    LightSource lights[MAX_LIGHTS];
    float nbLights;
} u_perPass;

uniform sampler2DShadow shadowMap; 
uniform sampler2D       albedoMap;
uniform sampler2D       normalMap;
uniform sampler2D       roughnessMap;
uniform sampler2D       aoMap;
uniform sampler2D       fresnelMap;
uniform samplerCube     environmentMap;
uniform samplerCube     prefilterMap;
uniform sampler2D       brdfLUT;

uniform vec3 camPos;

in highp vec4 worldPos ;
in highp vec3 vNormal;
in highp vec4 vFragPosLightSpace;
in highp vec2 vTexCoords;

out vec4 color;

// Custom functions
vec3 getIntensityFromPosition(LightSource l, vec3 pos);
vec3 microFacetSpecular(vec3 incidentVector, vec3 excidentVector, vec3 normal, vec3 fresnel, float roughness, int distriNbr);
vec3 fresnelSchlick(vec3 incidentVector, vec3 excidentVector, vec3 f0);
// https://seblagarde.wordpress.com/2011/08/17/hello-world/
vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness);
vec4 getLightColor(LightSource l, vec3 pos);
float ShadowCalculation(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir);
vec3 tex2DBlaiseGuthmann(sampler2D texture, vec2 off);
vec2 SampleSphericalMap(vec3 v);
void testIBL(int face);

// Normal Mapping Without Precomputed Tangents by Christian Schüler
mat3 cotangent_frame(vec3 normal, vec3 pos, vec2 uv);
vec3 perturb_normal( vec3 normal, vec3 V, vec2 texcoord);

// Number rendering code below by P_Malin
float DigitBin( const int x );
float PrintValue( const vec2 vStringCoords, const float fValue, const float fMaxDigits, const float fDecimalPlaces );

// Texture Filtering: https://www.codeproject.com/Articles/236394/Bi-Cubic-and-Bi-Linear-Interpolation-with-GLSL
vec4 tex2DBiLinear( sampler2D textureSampler_i, vec2 texCoord_i );
vec4 BiCubic( sampler2D textureSampler, vec2 TexCoord );
float CatMullRom( float f );

void main(void) {

    vec3 LO = vec3(0.0);
    
    vec3 pos = worldPos.xyz;
    vec3 vNorm = normalize(vNormal);
    vec3 excidentVector = normalize(camPos-pos);

    /*testIBL(1);
    return;*/
    
    int nbLights = int(u_perPass.nbLights);

    vec3 albedo = pow(tex2DBiLinear(albedoMap, vTexCoords).rgb, vec3(2.2));
    float roughness = tex2DBiLinear(roughnessMap, vTexCoords).r;
    float ao = tex2DBiLinear(aoMap, vTexCoords).r;
    float fresnel = tex2DBiLinear(fresnelMap, vTexCoords).r;
    vec3 normal = textureSize(normalMap, 0).x > 1 ? perturb_normal( vNorm, excidentVector, vTexCoords ) : vNorm;

    // Fresnel f0 term
    vec3 f0 = vec3(0.04); 
    f0 = mix(f0, albedo, fresnel);

    for (int i=0 ; i<nbLights; i++){

        if(distance(pos,u_perPass.lights[i].position) <= MAX_DIST ){
            color = getLightColor(u_perPass.lights[i], pos);
            return;
        }

        vec3 incidentVector = normalize(u_perPass.lights[i].position-pos);
        float directionnalAttenuation = max(dot(normal, incidentVector), 0.0);

        vec3 kS = fresnelSchlick(incidentVector, excidentVector, f0);
        vec3 kD = vec3(1.0) - kS;
        kD *= 1.0 - fresnel;

        vec3 specular = microFacetSpecular(incidentVector,excidentVector,normal,kS,roughness, 2);
        vec3 radiance = vec3(u_perPass.lights[i].color) * getIntensityFromPosition(u_perPass.lights[i],pos);

        LO += (kD * albedo / M_PI + specular) * radiance * directionnalAttenuation;

    }

    vec3 kS = fresnelSchlickRoughness(max(dot(normal, excidentVector), 0.0), f0, roughness); 
    vec3 kD = 1.0 - kS;
    kD *= 1.0 - fresnel;

    // No normal mapping for ambient light, it's weird otherwise
    vec3 irradiance = texture(environmentMap, normal).rgb;
    vec3 ambiantDiffuse = kD * irradiance * albedo;

    const float MAX_REFLECTION_LOD = 4.0;
    vec3 reflectionVector = reflect(-excidentVector, normal);
    vec3 prefilteredColor = textureLod(prefilterMap, reflectionVector,  roughness * MAX_REFLECTION_LOD).rgb;    
    vec2 brdf  = texture(brdfLUT, vec2(max(dot(normal, excidentVector), 0.0), roughness)).rg;
    vec3 ambiantSpecular = prefilteredColor * (kS * brdf.x + brdf.y);
    
    float ambientIntensity = 1.0;
    vec3 ambient = (ambiantDiffuse + ambiantSpecular) * ao * ambientIntensity;

    // Shadow computation
    vec3 lightDir = normalize(u_perPass.lights[nbLights-1].position-pos);
    float shadowFactor = ShadowCalculation(vFragPosLightSpace, vNorm, lightDir);

    vec3 resultingColor = (ambient + LO) * shadowFactor; 

    // Debug: print numbers
    /*vec2 vFontSize = vec2(8.0, 15.0);
    resultingColor = mix( resultingColor, vec3(1.0, 1.0, 1.0), PrintValue( (gl_FragCoord.xy - vec2(0.0, 5.0)) / vFontSize, 
        camPos.x, 4.0, 10.0));*/

    // Tone mapping by reinhart operator
    //resultingColor = resultingColor / (resultingColor + vec3(1.0));
    // Exposure tone mapping
    float exposure = 1.0; // => should be a uniform
    resultingColor = vec3(1.0) - exp(-resultingColor * exposure);
    // Gamma correction
    resultingColor = pow(resultingColor, vec3(1.0/2.2));
    
    color = vec4(resultingColor,1.0);

}

// Light intensity attenuation
vec3 getIntensityFromPosition(LightSource l, vec3 pos){
    float d = distance(l.position,pos);
    float intFromDist = l.intensity / (l.aconst + l.alin*d + l.aquad*d*d);
    //float intFromDist = 1.0 / (d*d);
    return l.color * intFromDist;
}

// Microfacet BRDF, distribution number stands for: 1 = Beckmann, 2 = GGX
vec3 microFacetSpecular(vec3 incidentVector, vec3 excidentVector, vec3 normal, vec3 fresnel, float roughness, int distriNbr){
    // HalfVec
    vec3 halfVec = (incidentVector + excidentVector) / length(incidentVector + excidentVector);

    // Pre compute values:
    float excDotHalf = max(0.0001f,dot(excidentVector,halfVec));
    float normDotExc = max(0.0001f,dot(normal,excidentVector));
    float normDotInc = max(0.0001f,dot(normal,incidentVector));
    float normDotHalf = max(0.0001f,dot(normal,halfVec));
    float normDotHalfSquared = normDotHalf*normDotHalf;
    float roughnessSquared = roughness*roughness;

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
        // GGX => roughness power 4? I thought it was 2
        float denominator = M_PI * pow(1.0+(roughnessSquared*roughnessSquared-1.0)*normDotHalfSquared,2.0);
        distribution = roughnessSquared / denominator;

        // Boubekeur
        float r = roughness + 1.0;
        float k = r * r / 8.0;
        float geoInc = normDotInc / (normDotInc * (1.0 - k) + k);
        float geoExc = normDotExc / (normDotExc * (1.0 - k) + k);
        geometry = geoInc * geoExc;
    }
    else{
        distribution = 1.0;
        geometry = 1.0;
    }

    float denominator = 4.0 * normDotInc * normDotExc + 0.001;
    vec3 numerator = distribution * fresnel * geometry;

    return numerator / denominator;
}

vec3 fresnelSchlick(vec3 incidentVector, vec3 excidentVector, vec3 f0)
{
    vec3 halfVec = (incidentVector + excidentVector) / length(incidentVector + excidentVector);
    vec3 schlick = f0 + (1.0-f0)*pow(1.0-max(0.0f,dot(incidentVector,halfVec)),5.0);
    return schlick;
}

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness)
{
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}  

vec4 getLightColor(LightSource l, vec3 pos){
    if(distance(pos,l.position) >= MAX_DIST*0.8 ){
        return vec4(0.0,0.0,0.0,1.0);
    }else{
        // Gamma correction to properly display light intensity influence lmao
        float fact = pow(l.intensity / 150.0, 1.0/2.2);
        return vec4(l.color * fact, 1.0);
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
            shadow += texture(shadowMap, UVC) == 0.0 ? 0.1 : 1.0;        
        }    
    }

    shadow /= 25.0;

    float dotNL = dot(normal, lightDir);
    if(dotNL < 0.0) {
        shadow = 1.0;
    }

    return shadow;
}

// https://learnopengl.com/#!PBR/IBL/Diffuse-irradiance
vec2 SampleSphericalMap(vec3 v)
{
    vec2 uv = vec2(atan(v.z, v.x), asin(v.y));
    uv *= invAtan;
    uv += 0.5;
    return uv;
}

void testIBL(int face){

    float a,b,c,d;
    a = (gl_FragCoord.x / 640.0) - 0.5;
    b = (gl_FragCoord.y / 480.0) - 0.5;
    c = (1.0 - gl_FragCoord.x / 640.0) - 0.5;
    d = (1.0 - gl_FragCoord.y / 480.0) - 0.5;
    
    vec3 uvw;
    if(face == 0){
        uvw = vec3(a,b,0.5);
    }
    else if(face == 1){
        uvw = vec3(c,b,-0.5);
    }
    else if(face == 2){
        uvw = vec3(a,0.5,d);
    }
    else if(face == 3){
        uvw = vec3(a,-0.5,b);
    }
    else if(face == 4){
        uvw = vec3(0.5,b,c);
    }
    else if(face == 5){
        uvw = vec3(-0.5,b,a);
    }

    vec3 envColor = texture(environmentMap, uvw).rgb; 
    envColor = envColor / (envColor + vec3(1.0));
    envColor = pow(envColor, vec3(1.0/2.2));
    color = vec4(envColor, 1.0);
}

// Blaise-Guthmann texture filtering
vec3 tex2DBlaiseGuthmann(sampler2D textureMap, vec2 off){
    //vec2 off = 2.999 * texelSize / 2.0;
    //vec2 off = vTexCoords;
    vec2 texelSize = 1.0 / vec2(textureSize(textureMap, 0));
    vec2 texelNumber = floor(off / texelSize);
    vec2 xy = 2.0 * (off - texelNumber*texelSize) / texelSize;

    vec3 ta,tx,ty,tc;
    float xoff = xy.x > 1.0 ? 1.0 : -1.0;
    float yoff = xy.y > 1.0 ? 1.0 : -1.0;

    ta = texture(textureMap, off).rgb;

    if(xy.x>=1.0){
        xy.x-=1.0;
        tx = texture(textureMap, off + vec2(texelSize.x,0.0)).rgb;
    }else{
        xy.x = 1.0 - xy.x;
        tx = texture(textureMap, off - vec2(texelSize.x,0.0)).rgb;
    }

    if(xy.y>=1.0){
        xy.y-=1.0;
        ty = texture(textureMap, off + vec2(0.0,texelSize.y)).rgb;
    }else{
        xy.y = 1.0 - xy.y;
        ty = texture(textureMap, off - vec2(0.0,texelSize.y)).rgb;
    }

    tc = texture(textureMap, off + texelSize * vec2(xoff, yoff)).rgb;

    float d1 = sqrt(xy.x * xy.x + xy.y * xy.y);
    float d = d1 > 1.0 ? (d1 - 1.0) / (sqrt(2.0) - 1.0) : 0.0;

    return (xy.x * tx + (1.0-xy.x) * ta + xy.y * ty + (1.0-xy.y) * ta + d * tc + (1.0-d) * ta ) / 3.0;
}


//---------------------------------------------------------------
// Normal Mapping Without Precomputed Tangents by Christian Schüler
//
// http://www.thetenthplanet.de/archives/1180
//---------------------------------------------------------------

mat3 cotangent_frame(vec3 normal, vec3 pos, vec2 uv)
{
    // get edge vectors of the pixel triangle
    vec3 dp1 = dFdx( pos );
    vec3 dp2 = dFdy( pos );
    vec2 duv1 = dFdx( uv );
    vec2 duv2 = dFdy( uv );
 
    // solve the linear system
    vec3 dp2perp = cross( dp2, normal );
    vec3 dp1perp = cross( normal, dp1 );
    vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
 
    // construct a scale-invariant frame 
    float invmax = inversesqrt( max( dot(T,T), dot(B,B) ) );
    return mat3( T * invmax, B * invmax, normal );
}

vec3 perturb_normal( vec3 normal, vec3 V, vec2 texcoord)
{
    // assume normal, the interpolated vertex normal and 
    // V, the view vector (vertex to eye)
    vec3 map = tex2DBiLinear(normalMap, texcoord).xyz;
    map = map * 255./127. - 128./127.;
    map.y = - map.y;
    mat3 TBN = cotangent_frame(normal, -V, texcoord);
    return normalize(TBN * map);
}


//---------------------------------------------------------------
// Number rendering code below by P_Malin
//
// https://www.shadertoy.com/view/4sBSWW
//---------------------------------------------------------------

float DigitBin( const int x )
{
    return x==0?480599.0:x==1?139810.0:x==2?476951.0:x==3?476999.0:x==4?350020.0:x==5?464711.0:x==6?464727.0:x==7?476228.0:x==8?481111.0:x==9?481095.0:0.0;
}

float PrintValue( const vec2 vStringCoords, const float fValue, const float fMaxDigits, const float fDecimalPlaces )
{
    if ((vStringCoords.y < 0.0) || (vStringCoords.y >= 1.0)) return 0.0;
    float fLog10Value = log2(abs(fValue)) / log2(10.0);
    float fBiggestIndex = max(floor(fLog10Value), 0.0);
    float fDigitIndex = fMaxDigits - floor(vStringCoords.x);
    float fCharBin = 0.0;
    if(fDigitIndex > (-fDecimalPlaces - 1.01)) {
        if(fDigitIndex > fBiggestIndex) {
            if((fValue < 0.0) && (fDigitIndex < (fBiggestIndex+1.5))) fCharBin = 1792.0;
        } else {        
            if(fDigitIndex == -1.0) {
                if(fDecimalPlaces > 0.0) fCharBin = 2.0;
            } else {
                float fReducedRangeValue = fValue;
                if(fDigitIndex < 0.0) { fReducedRangeValue = fract( fValue ); fDigitIndex += 1.0; }
                float fDigitValue = (abs(fReducedRangeValue / (pow(10.0, fDigitIndex))));
                fCharBin = DigitBin(int(floor(mod(fDigitValue, 10.0))));
            }
        }
    }
    return floor(mod((fCharBin / pow(2.0, floor(fract(vStringCoords.x) * 4.0) + (floor(vStringCoords.y * 5.0) * 4.0))), 2.0));
}


//---------------------------------------------------------------
// Bilinear / Bicubic texture filtering with Catmull-Rom interpolation by Santhosh G_
//
// https://www.codeproject.com/Articles/236394/Bi-Cubic-and-Bi-Linear-Interpolation-with-GLSL
//---------------------------------------------------------------

// Function to get interpolated texel data from a texture with GL_NEAREST property.
// Bi-Linear interpolation is implemented in this function with the 
// help of nearest four data.
vec4 tex2DBiLinear( sampler2D textureSampler_i, vec2 texCoord_i )
{
    vec2 fsize = vec2(textureSize(textureSampler_i, 0));
    vec2 texelSize = 1.0 / fsize;

    vec4 p0q0 = texture(textureSampler_i, texCoord_i);
    vec4 p1q0 = texture(textureSampler_i, texCoord_i + vec2(texelSize.x, 0));

    vec4 p0q1 = texture(textureSampler_i, texCoord_i + vec2(0, texelSize.y));
    vec4 p1q1 = texture(textureSampler_i, texCoord_i + vec2(texelSize.x , texelSize.y));

    float a = fract( texCoord_i.x * fsize.x ); // Get Interpolation factor for X direction.

    vec4 pInterp_q0 = mix( p0q0, p1q0, a );     // Interpolates top row in X direction.
    vec4 pInterp_q1 = mix( p0q1, p1q1, a );     // Interpolates bottom row in X direction.

    float b = fract( texCoord_i.y * fsize.y );  // Get Interpolation factor for Y direction.
    return mix( pInterp_q0, pInterp_q1, b );    // Interpolate in Y direction.
}

vec4 BiCubic( sampler2D textureSampler, vec2 TexCoord )
{
    vec2 fsize = vec2(textureSize(textureSampler, 0));
    vec2 texelSize = 1.0 / fsize;
    vec4 nSum = vec4( 0.0, 0.0, 0.0, 0.0 );
    vec4 nDenom = vec4( 0.0, 0.0, 0.0, 0.0 );
    float a = fract( TexCoord.x * fsize.x ); // get the decimal part
    float b = fract( TexCoord.y * fsize.y ); // get the decimal part
    for( int m = -1; m <=2; m++ )
    {
        for( int n =-1; n<= 2; n++)
        {
            vec4 vecData = texture(textureSampler, 
                               TexCoord + vec2(texelSize.x * float( m ), 
                    texelSize.y * float( n )));
            float f  = CatMullRom( float( m ) - a );
            vec4 vecCooef1 = vec4( f,f,f,f );
            float f1 = CatMullRom ( -( float( n ) - b ) );
            vec4 vecCoeef2 = vec4( f1, f1, f1, f1 );
            nSum = nSum + ( vecData * vecCoeef2 * vecCooef1  );
            nDenom = nDenom + (( vecCoeef2 * vecCooef1 ));
        }
    }
    return nSum / nDenom;
}

float CatMullRom( float f )
{
    const float B = 0.0;
    const float C = 0.5;
    if( f < 0.0 )
    {
        f = -f;
    }
    if( f < 1.0 )
    {
        return ( ( 12. - 9. * B - 6. * C ) * ( f * f * f ) +
            ( -18. + 12. * B + 6. *C ) * ( f * f ) +
            ( 6. - 2. * B ) ) / 6.0;
    }
    else if( f >= 1.0 && f < 2.0 )
    {
        return ( ( -B - 6. * C ) * ( f * f * f )
            + ( 6. * B + 30. * C ) * ( f *f ) +
            ( - ( 12. * B ) - 48. * C  ) * f +
            8. * B + 24. * C)/ 6.0;
    }
    else
    {
        return 0.0;
    }
}

`;
