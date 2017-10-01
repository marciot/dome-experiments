/* Face tracking eyeball, based on original work by the Belin (thebelin.com) */

const webCamHorizontalFOV = 160;
const webCamVerticalFOV   = 120;

const webCamCaptureWidth  = 320;
const webCamCaptureHeight = 240;

const chillIrisColor1     = new THREE.Color(0.0, 0.3, 0.4);
const chillIrisColor2     = new THREE.Color(0.2, 0.5, 0.4);
const chillIrisDialate    = 0.1;

const angryIrisColor1     = new THREE.Color(0.1, 0.3, 0.4);
const angryIrisColor2     = new THREE.Color(0.3, 0.5, 0.4);
const angryIrisDialate    = 0;

const angerThreshold      = 10;

include("tracking.js");

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
 
    var lookAt          = new THREE.Quaternion();
    var lookAtEuler     = new THREE.Euler();
    var fadeIrisColor1  = chillIrisColor1;
    var fadeIrisColor2  = chillIrisColor2;
    var fadeDialate     = chillIrisDialate;
        
    RendererConfig.animationCallback = function(t, dt) {
        eyeMaterial.uniforms.iGlobalTime.value = performance.now() / 3000.0;
        eyeMaterial.uniforms.iIrisColor1.value.lerp(fadeIrisColor1, dt);
        eyeMaterial.uniforms.iIrisColor2.value.lerp(fadeIrisColor2, dt);
        eyeMaterial.uniforms.iDialate.value = eyeMaterial.uniforms.iDialate.value * (1 - dt) + fadeDialate * dt;
        eyeMaterial.uniforms.needsUpdate = true;
        eye.quaternion.slerp(lookAt, dt);
        
        // https://stackoverflow.com/questions/21513637/dot-product-of-two-quaternion-rotations
        var angularDistance = 2 * Math.acos(lookAt.dot(eye.quaternion));
        console.log(angularDistance, 10 * degreesToRadians);
        if(angularDistance > angerThreshold * degreesToRadians) {
            anger();
        } else {
            chill();
        }
    }
    
    function anger() {
        fadeIrisColor1 = angryIrisColor1;
        fadeIrisColor2 = angryIrisColor2;
        fadeDialate    = angryIrisDialate;
    }
    
    function chill() {
        fadeIrisColor1 = chillIrisColor1;
        fadeIrisColor2 = chillIrisColor2;
        fadeDialate    = chillIrisDialate;
    }
    
    // Add the video element
    var video = document.createElement('video');
    video.width            = webCamCaptureWidth;
    video.height           = webCamCaptureHeight;
    video.style.visibility = 'hidden';
    document.body.appendChild(video);
    
    // Begin tracking faces
    var tracker = new tracking.ObjectTracker('face');
    tracker.setInitialScale(4);
    tracker.setStepSize(2);
    tracker.setEdgesDensity(0.1);
    tracking.track(video, tracker, { camera: true });
    tracker.on('track', function(event) {
        var centerX, centerY;
        var maxArea = 0;
        
        // Find the largest face in the image
        event.data.forEach(function(rect) {
            var faceArea = rect.width * rect.height;
            if(faceArea > maxArea) {
                centerX = rect.x + rect.width  / 2;
                centerY = rect.y + rect.height / 2;
            }
            maxArea = faceArea;
        });
        
        if(maxArea) {
            // Convert into range -0.5 to 0.5
            centerX = centerX / webCamCaptureWidth  - 0.5;
            centerY = centerY / webCamCaptureHeight - 0.5;
            // Convert into rotation
            var rotX =  centerX * webCamHorizontalFOV * degreesToRadians;
            var rotY = -centerY * webCamVerticalFOV   * degreesToRadians;
            lookAtEuler.set(rotY, rotX, 0);
            lookAt.setFromEuler(lookAtEuler);
            anger();
        }
    });
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
uniform float iDialate;
uniform vec3  iIrisColor1;
uniform vec3  iIrisColor2;

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
    
    if(r < 0.82) {
        r = r / 0.82;
        r = clamp(r - iDialate, 0., 1.);
        r = r * (0.82 + iDialate);
    }

    if (r < 0.8) {
        // Outer iris, color variation
        col = iIrisColor1;

        float f = fbm(5.0*p);
        col = mix(col, iIrisColor2, f);

        // Central iris
        f = 1.0 - smoothstep(0.1, 0.5, r);
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
        f = smoothstep(0.1, 0.15, r);
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
            iGlobalTime: {value: 30.0, type: 'f' },
            iDialate:    {value: 0.0, type: 'f' },
            iIrisColor1: {value: new THREE.Color(0.0, 0.3, 0.4)},
            iIrisColor2: {value: new THREE.Color(0.2, 0.5, 0.4)},
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