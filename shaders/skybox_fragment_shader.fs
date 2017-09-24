var skybox_fragment_shader = `
#version 300 es
precision highp float;

out vec4 FragColor;
in vec3 localPos;
  
uniform samplerCube environmentMap;
uniform float gamma;
uniform float exposure;
  
void main()
{
    vec3 envColor = textureLod(environmentMap, localPos, 1.0).rgb; 
    envColor = vec3(1.0) - exp(-envColor * exposure);
    envColor = pow(envColor, vec3(1.0/gamma));
  
    FragColor = vec4(envColor, 1.0);
}
`;
