#ifdef GL_ES
precision mediump float;
#endif


// varying highp vec2 vTextureCoord;
varying highp vec3 vFragPos;
varying highp vec3 vNormal;
varying highp vec3 vColor;

vec3 toneMapping(vec3 color){
    vec3 result;
    for (int i=0; i<3; ++i) {
        result[i] = pow(color[i], 0.45);
    }
    return result;
}

void main(void) {

  gl_FragColor = vec4(toneMapping(vColor), 1.0);
}
