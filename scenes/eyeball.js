include("DomeInteraction");

function setupScene(scene) {
    alert("Eye shader by iq (CC-BY-NC-SA 3.0)");

    var scene = sphericalDisplayReferenceFrame(scene);
    
    var light = new THREE.AmbientLight( 0xffffff, 1 );
    scene.add(light);
  
    var geometry = new THREE.SphereGeometry(10, 64, 64);
    geometry.rotateX(90 * degreesToRadians);
    
    eyeMaterial = WebGLShaders.eyeMaterial;
    eyeMaterial.side = THREE.BackSide;
  
    eye = new THREE.Mesh(geometry, eyeMaterial);
    scene.add(eye);
 
    RendererConfig.animationCallback = function(t) {
        eyeMaterial.uniforms.iGlobalTime.value = performance.now() / 3000.0;
        eyeMaterial.uniforms.needsUpdate = true;
    }
    
    // Advertise the remote control url
    function displayInteractionUrl(url) {
        var text = getTextElement("Go to \u201C" + url + "\u201D on\nyour Android phone to interact.", 0.5, 'black');
        text.position.z = -0.65;
        text.position.y = -4;
        text.lookAt(scene.position);
        scene.add(text);
    }
    
    // Manage participants
    function stateChanged(state) {
        if(state == 'open') {
            displayInteractionUrl("dome.marciot.com/interact" + interact.getUrlSuffix());
        }
    }
    var interact = new DomeInteraction(id => new MyParticipant(scene, eye), stateChanged);
}

var controllingParticipant = null;

class MyParticipant extends DomeParticipant {
    constructor(scene, eye) {
        super();
        this.scene = scene;
        this.eye   = eye;
        controllingParticipant = this;
    }

    disconnected() {
    }

    buttonDown(e) {
        controllingParticipant = this;
    }

    buttonUp(e) {
    }

    pointerMoved(e) {
        if(this !== controllingParticipant) {
            return;
        }
        this.eye.quaternion.copy(getSphericalDisplayQuaternion(this.scene, e));
    }

    animate(t, dt) {
    }
}

/* https://github.com/mrdoob/three.js/issues/4271 */

getShader = function( shaderStr, customChunks ) {
    return shaderStr.replace( /#include\s+<(\S+)>/gi, function( match, p1 ){
        var chunk = customChunks[ p1 ] || THREE.ShaderChunk[ p1 ];
        return chunk ? chunk : "";
    });
};

const customMapFragment =
`
#ifdef USE_MAP
diffuseColor *= getProceduralMap(vUv);
#endif
`

/* Reference:
     https://www.shadertoy.com/view/XdyGz3
     https://www.youtube.com/watch?v=emjuqqyq_qc
 */
     
const eyeMapShader =
`
uniform float iGlobalTime;

//alternative noise implementation
float hash( float n ) {
    return fract(sin(n)*43758.5453123);
}

float noise( in vec2 x ) {
    vec2 p = floor(x);
    vec2 f = fract(x);

    f = f*f*(3.0-2.0*f);

    float n = p.x + p.y*57.0;

    return mix(mix( hash(n+  0.0), hash(n+  1.0),f.x), mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y);
}

mat2 m = mat2(0.8, 0.6, -0.6, 0.8);

float fbm(in vec2 p)
{
    float f = 0.0;
    f += 0.5000*noise(p); p*=m*2.02;
    f += 0.2500*noise(p); p*=m*2.03;
    f += 0.1250*noise(p); p*=m*2.01;
    f += 0.0625*noise(p); p*=m*2.04;
    f /= 0.9375;
    return f;
}

vec4 getProceduralMap( in vec2 uv )
{
    float pi            = 3.1415;
    float irisCoverage  = 0.15;
    
    float r = uv.y*1.0/irisCoverage;
    float a = uv.x * pi * 2.0;
    vec2 p = vec2(r*cos(a), r*sin(a));

    //change this to whatever you want the background
    //color to be
    vec3 bg_col = vec3(1.0);

    vec3 col = bg_col;

    float ss = 0.5 + 0.5*sin(iGlobalTime);
    float anim = 1.0 + 0.5*ss*clamp(1.0-r, 0.0, 1.0);
    r *= anim;

    if (r < 0.8) {
        // Outer iris, color variation
        col = vec3(0.0, 0.3, 0.4);

        float f = fbm(5.0*p);
        col = mix(col, vec3(0.2, 0.5, 0.4), f);

        // Central iris
        f = 1.0 - smoothstep(0.2, 0.5, r);
        col = mix(col, vec3(0.9, 0.6, 0.2), f);

        a += 0.05*fbm(20.0*p);

        // Iris, white striations
        f = smoothstep(0.3, 1.0, fbm(vec2((6.0+ss*0.25)*r, 20.0*a)));
        col = mix(col, vec3(1.0), f);

        // Iris, black striations
        f = smoothstep(0.4, 0.9, fbm(vec2(10.0*r, 15.0*a)));
        col *= 1.0 - 0.5*f;

        // Iris, outer shadow
        f = smoothstep(0.6, 0.8, r);
        col *= 1.0 - 0.5*f;

        // Pupil
        f = smoothstep(0.2, 0.25, r);
        col *= f;

        // Blend iris into sclera
        f = smoothstep(0.75, 0.8, r);
        col = mix(col, bg_col, f);
    } else {
        // Veins
        a += 0.15*fbm(10.0*p);
        
        float f = smoothstep(0.65, 1.0, fbm(vec2(0.5*r, 30.0*a)));
        col -= vec3(0.0,1.0,1.0) * (1.0 - uv.y) * f;
    }

    return vec4(col, 1.0);
}
`;

class WebGLShaders {
    static get eyeMaterial() {
        const baseShader = "phong";
        
        const customChunks = {
            map_fragment: customMapFragment
        };
        const customUniforms = {
            iGlobalTime: { value: 30.0, type: 'f' }
        };
        const customFragment = eyeMapShader;
        
        const material = new THREE.ShaderMaterial( {
            uniforms: THREE.UniformsUtils.merge([
                THREE.ShaderLib[baseShader].uniforms,
                customUniforms
            ]),
            vertexShader:
                getShader(THREE.ShaderLib[baseShader].vertexShader,   customChunks),
            fragmentShader:
                customFragment +
                getShader(THREE.ShaderLib[baseShader].fragmentShader, customChunks),
            lights: true,
            defines: {
                USE_MAP: true
            }
        });
        material.uniforms.shininess.value = 100;
        
        return material;
    }
}