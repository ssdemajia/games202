attribute vec3 aVertexPosition;
attribute vec3 aNormalPosition;
// attribute vec2 aTextureCoord;
attribute mat3 aPrecomputeLT;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uPrecomputeL0;
uniform mat3 uPrecomputeL1;
uniform mat3 uPrecomputeL2;

// varying highp vec2 vTextureCoord;
varying highp vec3 vFragPos;
varying highp vec3 vNormal;
varying highp vec3 vColor;

float LdotT(mat3 light, mat3 trans)
{
  return dot(light[0], trans[0]) + dot(light[1], trans[1]) + dot(light[2], trans[2]);
}
void main(void) {

  vFragPos = (uModelMatrix * vec4(aVertexPosition, 1.0)).xyz;
  vNormal = (uModelMatrix * vec4(aNormalPosition, 0.0)).xyz;

  gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix *
                vec4(aVertexPosition, 1.0);

  // vTextureCoord = aTextureCoord;

  vColor = vec3(LdotT(uPrecomputeL0, aPrecomputeLT), LdotT(uPrecomputeL1, aPrecomputeLT), LdotT(uPrecomputeL2, aPrecomputeLT));
}