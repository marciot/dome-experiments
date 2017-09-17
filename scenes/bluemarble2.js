/* This demonstration depicts a cloudy Earth during the day and night.
 *
 * The effect is acheived by using a custom THREE.js shader to combine
 * three NASA Blue Marble photos into an animated composite.
 */
EarthConfig = {
    axisTilt:  23.5,
    sunRPM:    0.2,
    earthRPM:  1.0,
    cloudsRPM: 0.3    // Relative to the Earth
}

function setupScene(scene) {
    alert("Blue Marble imagery courtesy http://visibleearth.nasa.gov");

    var scene = sphericalDisplayReferenceFrame(scene);
    var texureLoader = new THREE.TextureLoader();
    var geometry = new THREE.SphereGeometry( 10, 40, 40 );
    
    var earth = new THREE.Object3D();
    scene.add(earth);
    
    dayTexture   = texureLoader.load('../textures/bluemarble/land_shallow_topo_2048.jpg');
    nightTexture = texureLoader.load('../textures/bluemarble/land_ocean_ice_lights_2048.jpg');
    cloudTexture = texureLoader.load('../textures/bluemarble/cloud_combined_2048.jpg');
    cloudTexture.wrapS = THREE.RepeatWrapping;
    
    earthMaterial = new THREE.ShaderMaterial( {
        vertexShader:   earthVertexShader,
        fragmentShader: earthFragmentShader,
        uniforms: {
            iTime:          {value: 1.0 },
            dayTexture:     {value: dayTexture},
            nightTexture:   {value: nightTexture},
            cloudTexture:   {value: cloudTexture},
            sunPosition:    {value: new THREE.Vector3(-100000,10000,0)}
        }
    } );

    /* Since the DomeRenderer puts us inside a dome, we render the Earth as a
       large sphere all around us, with us standing at the center viewing the
       Earth from within */
    var surface = new THREE.Mesh(geometry, earthMaterial);
    earth.add(surface);

    /* Because we are viewing from within, the continents appear reversed.
       An easy trick is to scale by -1 in the X axis. */
    surface.scale.x = -1;
    
    // Stand the globe up on end.
    earth.rotation.z = -EarthConfig.axisTilt * degreesToRadians;

    var sunRadiansPerSecond   = Math.PI * 2 * EarthConfig.sunRPM/60;
    var earthRadiansPerSecond = Math.PI * 2 * EarthConfig.earthRPM/60;
    var cloudsRotationsPerSecond = EarthConfig.cloudsRPM/60;
    
    RendererConfig.animationCallback = function(t) {
        surface.rotation.y = earthRadiansPerSecond * t;
        earthMaterial.uniforms.iTime.value = t * cloudsRotationsPerSecond;
        earthMaterial.uniforms.sunPosition.value.set(
            Math.cos(t * sunRadiansPerSecond) * 1e7,
            Math.sin(t * sunRadiansPerSecond) * 1e7,
            0
        );
    }
    
    // Advertise the remote control url
    function displayInteractionUrl(url) {
        var text = getTextElement("Go to \u201C" + url + "\u201D on\nyour Android phone to interact.", 0.5, 'white');
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
    var interact = new DomeInteraction(id => new MyParticipant(scene, earth), stateChanged);
}

var controllingParticipant = null;

class MyParticipant extends DomeParticipant {
    constructor(scene, earth) {
        super();
        this.scene  = scene;
        this.earth  = earth;
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
        this.earth.quaternion.copy(getSphericalDisplayQuaternion(this.scene, e));
    }

    animate(t, dt) {
    }
}

var earthVertexShader = function() {/*!
varying vec2 vUV;
varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vSunPosition;

uniform vec3 sunPosition;

void main() {
  vUV          = uv;
  vSunPosition = (viewMatrix      * vec4(sunPosition, 1.0)).xyz;
  vPos         = (modelViewMatrix * vec4(position,    1.0)).xyz;
  vNormal      = normalMatrix * normal;
  gl_Position  = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
*/}.getComment();

/* https://stackoverflow.com/questions/37342114/three-js-shadermaterial-lighting-not-working */

var earthFragmentShader = function() {/*!
varying vec2      vUV;
varying vec3      vPos;
varying vec3      vNormal;
varying vec3      vSunPosition;

uniform float     iTime;
uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform sampler2D cloudTexture;

void main() {
    vec3 lightDirection = normalize(vPos - vSunPosition);
    float Idiff = dot(-lightDirection, vNormal);
    Idiff = clamp(Idiff, 0.0, 1.0);

    vec4 cloudCover = vec4(vec3(texture2D(cloudTexture, vUV + vec2(iTime,0.)).x),1.0);
    vec4 dayColor   = texture2D(dayTexture,   vUV);
    vec4 nightColor = texture2D(nightTexture, vUV);
    
    vec4 cloudyDay   = mix(dayColor,   vec4(1.0), cloudCover);
    vec4 cloudyNight = mix(nightColor, vec4(0.0), cloudCover);
    
    gl_FragColor = mix(cloudyNight, cloudyDay, Idiff);
}
*/}.getComment();