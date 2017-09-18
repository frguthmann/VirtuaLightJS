var skybox_fragment_shader = `
#version 300 es
precision highp float;

out vec4 FragColor;
in vec3 localPos;
  
uniform samplerCube environmentMap;
  
void main()
{
    vec3 envColor = textureLod(environmentMap, localPos, 1.0).rgb; 

    float exposure = 1.5; // => should be a uniform
    envColor = vec3(1.0) - exp(-envColor * exposure);
    envColor = pow(envColor, vec3(1.0/1.5));
  
    FragColor = vec4(envColor, 1.0);
}
`;
