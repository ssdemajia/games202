#ifdef GL_ES
precision mediump float;
#endif

// Phong related variables
uniform sampler2D uSampler;
uniform vec3 uKd;
uniform vec3 uKs;
uniform vec3 uLightPos;
uniform vec3 uCameraPos;
uniform vec3 uLightIntensity;

varying highp vec2 vTextureCoord;
varying highp vec3 vFragPos;
varying highp vec3 vNormal;

// Shadow map related variables
#define NUM_SAMPLES 20
#define BLOCKER_SEARCH_NUM_SAMPLES NUM_SAMPLES
#define PCF_NUM_SAMPLES NUM_SAMPLES
#define NUM_RINGS 10
#define W_LIGHT 4.0  // 灯的宽度
#define EPS 1e-3
#define PI 3.141592653589793
#define PI2 6.283185307179586

uniform sampler2D uShadowMap;

varying vec4 vPositionFromLight;

highp float rand_1to1(highp float x ) { 
  // -1 -1
  return fract(sin(x)*10000.0);
}

highp float rand_2to1(vec2 uv ) { 
  // 0 - 1
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract(sin(sn) * c);
}

float bias() {
  vec3 lDir = normalize(uLightPos - vFragPos);
  float doT = dot(lDir, normalize(vNormal));
  return 1.0/256.0/2.0 * (1.0-doT);
}

float unpack(vec4 rgbaDepth) {
    const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
    return dot(rgbaDepth, bitShift);
}

vec2 poissonDisk[NUM_SAMPLES];

void poissonDiskSamples( const in vec2 randomSeed ) {

  float ANGLE_STEP = PI2 * float( NUM_RINGS ) / float( NUM_SAMPLES );
  float INV_NUM_SAMPLES = 1.0 / float( NUM_SAMPLES );

  float angle = rand_2to1( randomSeed ) * PI2;
  float radius = INV_NUM_SAMPLES;
  float radiusStep = radius;

  for( int i = 0; i < NUM_SAMPLES; i ++ ) {
    poissonDisk[i] = vec2( cos( angle ), sin( angle ) ) * pow( radius, 0.75 );
    radius += radiusStep;
    angle += ANGLE_STEP;
  }
}

void uniformDiskSamples( const in vec2 randomSeed ) {

  float randNum = rand_2to1(randomSeed);
  float sampleX = rand_1to1( randNum ) ;
  float sampleY = rand_1to1( sampleX ) ;

  float angle = sampleX * PI2;
  float radius = sqrt(sampleY);

  for( int i = 0; i < NUM_SAMPLES; i ++ ) {
    poissonDisk[i] = vec2( radius * cos(angle) , radius * sin(angle)  );

    sampleX = rand_1to1( sampleY ) ;
    sampleY = rand_1to1( sampleX ) ;

    angle = sampleX * PI2;
    radius = sqrt(sampleY);
  }
}


float PCF(sampler2D shadowMap, vec3 coords) {
  uniformDiskSamples(coords.xy);
  float depth = 0.0;
  float filterSize = 1.0/256.0;

  for (int i = 0; i < NUM_SAMPLES; i++)
  {
    vec2 delta = poissonDisk[i] * filterSize + coords.xy;
    float curDepth = unpack(texture2D(shadowMap, delta));
    if (curDepth + 0.01> coords.z)
    {
      depth += 1.0;
    } else {
      depth += 0.0;
    }
  }
  return depth / float(NUM_SAMPLES);
}

float findBlocker( sampler2D shadowMap,  vec2 uv, float zReceiver ) {
  uniformDiskSamples(uv);
  float depth = 0.0;
  float filterSize = 1.0/256.0;
  int count = 0;
  for (int i = 0; i < NUM_SAMPLES; i++)
  {
    vec2 delta = poissonDisk[i] * filterSize + uv;
    float curDepth = unpack(texture2D(shadowMap, delta));
    if (curDepth < zReceiver+0.002)
    {
      depth += curDepth;
      count += 1;
    }
  }
	return depth / float(count);
}

float PCSS(sampler2D shadowMap, vec3 coords){
  // STEP 1: avgblocker depth
  float avgDepth = findBlocker(shadowMap, coords.xy, coords.z);
  // STEP 2: penumbra size
  float w_penumbra = W_LIGHT * (coords.z - avgDepth) / avgDepth;
  // STEP 3: filtering
  float depth = 0.0;
  float filterSize = 1.0/256.0 * w_penumbra;

  for (int i = 0; i < NUM_SAMPLES; i++)
  {
    vec2 delta = poissonDisk[i] * filterSize + coords.xy;
    float curDepth = unpack(texture2D(shadowMap, delta));
    if (curDepth + 0.01> coords.z)
    {
      depth += 1.0;
    } else {
      depth += 0.0;
    }
  }
  return depth / float(NUM_SAMPLES);
  return w_penumbra;
}


float useShadowMap(sampler2D shadowMap, vec3 shadowCoord){
  float depth = unpack(texture2D(shadowMap, shadowCoord.xy));  //从shadowmap获取的深度小于当前像素的深度
  if (depth <= shadowCoord.z)
    return 0.0;
  return 1.0;
}

vec3 blinnPhong() {
  vec3 color = texture2D(uSampler, vTextureCoord).rgb;
  color = pow(color, vec3(2.2));

  vec3 ambient = 0.05 * color;

  vec3 lightDir = normalize(uLightPos);
  vec3 normal = normalize(vNormal);
  float diff = max(dot(lightDir, normal), 0.0);
  vec3 light_atten_coff =
      uLightIntensity / pow(length(uLightPos - vFragPos), 2.0);
  vec3 diffuse = diff * light_atten_coff * color;

  vec3 viewDir = normalize(uCameraPos - vFragPos);
  vec3 halfDir = normalize((lightDir + viewDir));
  float spec = pow(max(dot(halfDir, normal), 0.0), 32.0);
  vec3 specular = uKs * light_atten_coff * spec;

  vec3 radiance = (ambient + diffuse + specular);
  vec3 phongColor = pow(radiance, vec3(1.0 / 2.2));
  return phongColor;
}

void main(void) {
  float visibility;
  vec3 projCoords = vPositionFromLight.xyz / vPositionFromLight.w;
  projCoords = (projCoords + 1.0) * 0.5;
  // visibility = useShadowMap(uShadowMap, projCoords);
  // visibility = PCF(uShadowMap, projCoords);
  visibility = PCSS(uShadowMap, projCoords);
  vec3 phongColor = blinnPhong();

  gl_FragColor = vec4(phongColor * visibility, 1.0);
  // gl_FragColor = vec4(visibility, 0.0, 0.0, 1.0);
}