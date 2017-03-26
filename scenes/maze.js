/* The shader code is a slightly modified version of Flyguy's "Infinite Maze"
 * shader, CC-NC-SA-3.0:
 *
 *   https://www.shadertoy.com/view/Mdd3R8
 */
RendererConfig.dome.fullSphere    = false;

var texureLoader = new THREE.TextureLoader();

function setupScene(scene) {
    
    var geometry = new THREE.SphereBufferGeometry(RendererConfig.dome.radius, 60, 40);
    geometry.scale( -1, 1, 1 );
    
    var texture0 = texureLoader.load('../textures/shadertoy/stone.jpg');
    texture0.wrapS = THREE.RepeatWrapping;
    texture0.wrapT = THREE.RepeatWrapping;
    
    var texture1 = texureLoader.load('../textures/shadertoy/color_noise256.png');
    texture1.wrapS = THREE.RepeatWrapping;
    texture1.wrapT = THREE.RepeatWrapping;

    var material = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        side: THREE.BackSide,
    });
    
    var material   = new THREE.RawShaderMaterial( {
        vertexShader:   PanoramaShader.vertexShader,
        fragmentShader: PanoramaShader.fragmentShader + iqElevated.fragmentShader,
        uniforms: {
            iGlobalTime: {value: 1.0 },
            iChannel0:   {value: texture0 },
            iChannel1:   {value: texture1 },
            iResolution: {value: new THREE.Vector2(1024, 1024)},
            iMouse:      {value: new THREE.Vector2(0, 0)},
        }
    } );
    mesh = new THREE.Mesh( geometry, material );
    mesh.rotation.y = Math.PI/2;
    scene.add( mesh );
    
    var credit = getTextElement("\u201CInfinite Maze\u201D Shadertoy\nby Flyguy CC-BY-NC-3.0", 5);
    credit.position.z = -4;
    credit.position.y = 0.6;
    scene.add(credit);
    
    RendererConfig.animationCallback = function(t) {
        material.uniforms.iGlobalTime.value = t;
    }
}

PanoramaShader = {};

PanoramaShader.vertexShader = function() {/*!
attribute vec3 position;
attribute vec2 uv;
uniform   mat4 projectionMatrix;
uniform   mat4 modelViewMatrix;
varying   float longitude;
varying   float latitude;

#define M_PI 3.1415926535897932384626433832795

void main() {
    longitude = -2. * M_PI * (uv.x - 0.5);
    latitude  = -1. * M_PI * (uv.y - 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
*/}.getComment();

PanoramaShader.fragmentShader = function() {/*!
#define texture    texture2D
#define textureLod texture2D

precision highp float;
varying   float longitude;
varying   float latitude;

uniform float     iGlobalTime;
uniform vec2      iResolution;
uniform vec2      iMouse;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

void mainVR( out vec4 fragColor, in vec2 fragCoord, in vec3 ro, in vec3 rd );

void main()  {
    float sinOfLatitude = -sin( latitude );
    vec3 rd = vec3(
        sin( longitude ) * sinOfLatitude,
        cos( latitude ),
        cos( longitude ) * sinOfLatitude
    );
    
    vec4 fragColor;
    vec2 fragCoord;
    vec3 ro = vec3(0.);
    mainVR( fragColor, fragCoord, ro, rd );
    gl_FragColor = fragColor;
}
*/}.getComment();

iqElevated = {};

iqElevated.fragmentShader = function() {/*!
//Raymarch settings

#define MIN_DIST 0.001
#define MAX_DIST 24.0
#define MAX_STEPS 96
#define STEP_MULT 1.0
#define NORMAL_OFFS 0.01

//Scene settings

//#define SHOW_RAY_COST
//#define SHOW_TILES
#define FLY_MODE
#define SKY_COLOR vec3(0.00, 0.00, 0.00)
#define HAZE_COLOR vec3(0.50, 0.9, 0.00)
#define WALL_HEIGHT 0.5
#define WALL_WIDTH 0.125
#define MAZE_SCALE 1.5

//Object IDs
#define SKYDOME 0.
#define FLOOR 1.
#define WALLS 2.

float pi = atan(1.0) * 4.0;
float tau = atan(1.0) * 8.0;

vec2 tile = vec2(0);

struct MarchResult
{
    vec3 position;
    vec3 normal;
    float dist;
    float steps;
    float id;
};

//Returns a rotation matrix for the given angles around the X,Y,Z axes.
mat3 Rotate(vec3 angles)
{
    vec3 c = cos(angles);
    vec3 s = sin(angles);
    
    mat3 rotX = mat3( 1.0, 0.0, 0.0, 0.0,c.x,s.x, 0.0,-s.x, c.x);
    mat3 rotY = mat3( c.y, 0.0,-s.y, 0.0,1.0,0.0, s.y, 0.0, c.y);
    mat3 rotZ = mat3( c.z, s.z, 0.0,-s.z,c.z,0.0, 0.0, 0.0, 1.0);

    return rotX * rotY * rotZ;
}

float noise(vec2 pos) 
{
	return abs(fract(sin(dot(pos ,vec2(19.9*pos.x,28.633*pos.y))) * 1341.9453*pos.x));
}

vec4 texture3Plane(sampler2D tex,vec3 norm, vec3 pos, float mip)
{
    vec4 texel = vec4(0);
    
    texel = mix(texel, texture(tex, pos.yz, mip), abs(norm.x));
    texel = mix(texel, texture(tex, pos.xz, mip), abs(norm.y));
    texel = mix(texel, texture(tex, pos.xy, mip), abs(norm.z));
    
    return texel;
}

//==== Distance field operators/functions by iq. ====
vec2 opU(vec2 d1, vec2 d2)
{
    return (d1.x < d2.x) ? d1 : d2;
}

vec2 opS(vec2 d1, vec2 d2)
{
    return (-d1.x > d2.x) ? d1*vec2(-1,1) : d2;
}

vec2 sdSphere(vec3 p, float s, float id)
{
  return vec2(length(p) - s, id);
}

vec2 sdPlane(vec3 p, vec4 n, float id)
{
  // n must be normalized
  return vec2(dot(p,n.xyz) + n.w, id);
}
//===================================================
vec2 sdMaze(vec3 p, float id)
{
    vec2 t = floor(p.xy * MAZE_SCALE);
    
	p.xy = fract(p.xy * MAZE_SCALE) - 0.5;    
	p.x *= 2.0*floor(fract(noise(t) * 4.3) * 1.8) - 1.0; 
    
	float d = abs(1.0 - 2.0*abs(dot(p.xy, vec2(1.0)))) / (2.0 * sqrt(2.0));
    
    #ifdef SHOW_TILES
    	tile = t;
    #endif
    
    return vec2(max((d / MAZE_SCALE) - WALL_WIDTH / 2.0, -p.z - WALL_HEIGHT), id);
}

//Distance to the scene
vec2 Scene(vec3 p)
{
    vec2 d = vec2(MAX_DIST, SKYDOME);
    
    d = opU(d, sdPlane(p, vec4(0, 0,-1, 0), FLOOR));
    
    d = opU(d, sdMaze(p, WALLS));
    
	return d;
}

//Surface normal at the current position
vec3 Normal(vec3 p)
{
    vec3 off = vec3(NORMAL_OFFS, 0, 0);
    return normalize
    ( 
        vec3
        (
            Scene(p + off.xyz).x - Scene(p - off.xyz).x,
            Scene(p + off.zxy).x - Scene(p - off.zxy).x,
            Scene(p + off.yzx).x - Scene(p - off.yzx).x
        )
    );
}

//Raymarch the scene with the given ray
MarchResult MarchRay(vec3 orig,vec3 dir)
{
    float steps = 0.0;
    float dist = 0.0;
    float id = 0.0;
    
    for(int i = 0;i < MAX_STEPS;i++)
    {
        vec2 object = Scene(orig + dir * dist);
        //Add the sky dome and have it follow the camera.
        object = opU(object, -sdSphere(dir * dist, MAX_DIST, SKYDOME));
        
        dist += abs(object.x) * STEP_MULT;
        
        id = object.y;
        
        steps++;
        
        if(abs(object.x) < MIN_DIST * dist)
        {
            break;
        }
    }
    
    MarchResult result;
    
    result.position = orig + dir * dist;
    result.normal = Normal(result.position);
    result.dist = dist;
    result.steps = steps;
    result.id = id;
    
    return result;
}

//Scene texturing/shading
vec3 Shade(MarchResult hit, vec3 direction, vec3 camera)
{
    vec3 color = vec3(0.0);

    if(hit.id == FLOOR)
    {
        float d = sdMaze(hit.position, 0.0).x;
        float a = smoothstep(0.05, 0.04, d);
        
        color = mix(vec3(0.3), vec3(1,0.1,1), a);
    }
    if(hit.id == WALLS)
    {
        float a = smoothstep(0.05, 0.04, min(-hit.position.z, hit.position.z + WALL_HEIGHT));
        color = mix(vec3(0.3), vec3(1, 0.1, 1), a);
    }
    color *= texture3Plane(iChannel0,hit.normal, hit.position * 4.0, -1.0).r * 0.5 + 0.5;
    
    //Lighting
    float ambient = 0.1;
    float diffuse = 0.5 * -dot(hit.normal, direction);
    float specular = 1.1 * max(0.0, -dot(direction, reflect(direction, hit.normal)));
    
    color *= vec3(ambient + diffuse + pow(specular, 5.0));
    color *= (1.0-(hit.steps / float(MAX_STEPS)));
	
    //Fog / haze
    float sky = smoothstep(MAX_DIST - 1.0, 0.0, hit.dist);
    float haze = clamp(0.5/(hit.dist/MAX_DIST),0.0,1.0);
    
    vec3 skycol = mix(HAZE_COLOR, SKY_COLOR, clamp(-hit.position.z * 0.2, 0.0, 1.0));
    
    color = mix(skycol, color, sky * haze);
    
    #ifdef SHOW_TILES
    color = texture(iChannel1, tile/iChannelResolution[1].xy+0.5, -99.0).rgb * (1.0-(hit.steps / float(MAX_STEPS)));
    #endif
    
    return color;
}

void mainVR( out vec4 fragColor, in vec2 fragCoord, in vec3 ro, in vec3 rd )
{
    //Camera stuff   
    vec3 angles = vec3(0);
    angles.y = tau * (1.2 / 8.0);
    angles.x = iGlobalTime * 0.2;
    
    angles.y = clamp(angles.y, 0.0, 13.0 * tau / 64.0);
    
    mat3 rotate = Rotate(angles.yzx);
    
    vec3 orig = vec3(0, 0,-2) * rotate;
    
    #ifdef FLY_MODE
    orig -= vec3(0, iGlobalTime, 0);
    #else
    orig -= vec3(0, 0, 0);
    #endif
    
    vec3 dir = rd * rotate;
    
    //Ray marching
    MarchResult hit = MarchRay(orig, dir);
    
    //Shading
    vec3 color = Shade(hit, dir, orig);
    
    #ifdef SHOW_RAY_COST
    color = mix(vec3(0,1,0), vec3(1,0,0), hit.steps / float(MAX_STEPS));
    #endif
    
	fragColor = vec4(color, 1.0);
}
*/}.getComment();