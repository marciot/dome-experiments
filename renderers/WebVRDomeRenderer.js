/* The WebVRDomeRenderer code presented here is adapted from:
 *
 *   https://github.com/spite/THREE.CubemapToEquirectangular
 */

var vertexShader = 
"attribute vec3 position;\n" +
"attribute vec2 uv;\n" +
"uniform mat4 projectionMatrix;\n" +
"uniform mat4 modelViewMatrix;\n" +
"varying vec2 vUv;\n" +
"void main() {\n" +
"   vUv = vec2( 1.- uv.x, uv.y );\n" +
"   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n" +
"}\n";

var fragmentShader =
"precision mediump float;\n" +
"uniform samplerCube map;\n" +

"varying vec2 vUv;\n" +

"#define M_PI 3.1415926535897932384626433832795\n" +

"void main()  {\n" +

"   vec2 uv = vUv;\n" +

"   float longitude =  (1.0 - uv.x) * 2. * M_PI + M_PI/2.;\n" +
"   float latitude =   (1.0 - uv.y) * M_PI;\n" +

"   vec3 dir = vec3(\n" +
"       - sin( longitude ) * sin( latitude ),\n" +
"       cos( latitude ),\n" +
"       - cos( longitude ) * sin( latitude )\n" +
"   );\n" +
"   normalize( dir );\n" +

"   gl_FragColor = vec4( textureCube( map, dir ).rgb, 1. );\n" +

"}\n";

function WebVRDomeRenderer( renderer ) {
    const desiredCubeMapSize = 2048;

    this.renderer = renderer;

    /* For doing the warpping, we use a scene that consists of
     * a quad that covers the entire canvas and paint it with a
     * fragment shader */
    this.material = new THREE.RawShaderMaterial( {
        uniforms: {
            map: { type: 't', value: null }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.DoubleSide
    } );
    
    this.scene = new THREE.Scene();
    
    const domeDiameterInMeters = 10.668;
    const eyeHeightInMeters    = 1.7;
    
    var grid = new THREE.PolarGridHelper(domeDiameterInMeters/2);
    this.scene.add( grid );
    
    this.dome = new THREE.Mesh(
        new THREE.SphereBufferGeometry(domeDiameterInMeters/2, 32, 32 ),
        this.material
    );
    this.dome.position.y = eyeHeightInMeters;
    this.scene.add(this.dome);

    /* The cube camera snaps a 360 picture of the user's scene into a cube texture */
	var gl = this.renderer.getContext();
	var maxSize = gl.getParameter( gl.MAX_CUBE_MAP_TEXTURE_SIZE );

    this.cubeCamera = new THREE.CubeCamera(
        .1,     // Near clipping distance
        1000,   // Far clipping distance
        Math.min(maxSize, desiredCubeMapSize)
    );
    this.cubeCamera.position.y = eyeHeightInMeters;
}

WebVRDomeRenderer.prototype.update = function( scene ) {
    /* Step 1: Render the user's scene to the CubeCamera's texture */
	var autoClear = this.renderer.autoClear;
	this.renderer.autoClear = true;
	this.cubeCamera.updateCubeMap( this.renderer, scene );
	this.renderer.autoClear = autoClear;
    
    /* Step 2: Assign the CubeCamera's texture to the dome's fragment shader */
    this.dome.material.uniforms.map.value = this.cubeCamera.renderTarget.texture;
}

/* Main function that kickstarts the animation loop */
function startAnimation() {
    const eyeHeightInMeters  = 1.7;
    var clock  = new THREE.Clock();
    
    var renderer = new THREE.WebGLRenderer();
    document.body.appendChild(renderer.domElement);
    
    var effect = new THREE.VREffect(renderer);
    
    var effect = new THREE.VREffect(renderer);
    effect.setVRDisplay(vrDisplay);
    
    var domeRenderer = new WebVRDomeRenderer(renderer);
    
    var camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.001, 700 );
    
    // Inititalize WebVR
    
    var vrDisplay = null;
    
    function setupVR(sceneCallback) {
        if(!navigator.getVRDisplays) {
            alert("WebVR is not supported");
            return;
        }

        // Get the VRDisplay and save it for later.
        navigator.getVRDisplays().then(
            function(displays) {
                for(var i = 0; i < displays.length; i++) {
                    if(displays[i].capabilities.hasOrientation) {
                        vrDisplay = displays[0];
                        effect.setVRDisplay(vrDisplay);
                        sceneCallback();
                        return;
                    }
                }
                alert("WebVR is supported, but no VR displays found");
            }
        );
    }

    // Call the user routine to setup the scene
    var scene  = new THREE.Scene();
    setupScene(scene);

    var headsetPose          = new THREE.Vector3();
    var headsetOrientation   = new THREE.Quaternion();
    function updatePoseAndOrientation() {
        // Get the headset position and orientation.
        var pose = vrDisplay.getPose();
        if (pose.position !== null) {
            camera.position.fromArray(pose.position);
        } else {
            camera.position.y = eyeHeightInMeters;
        }
        if (pose.orientation !== null) {
            camera.quaternion.fromArray(pose.orientation);
        }
    }
    
    // The animation routine
    function animate() {
        updatePoseAndOrientation();
        
        animateScene(clock.getDelta(), scene);
        domeRenderer.update(scene);
        
        effect.render(domeRenderer.scene, camera);
        vrDisplay.requestAnimationFrame(animate);
    }
    
    // The resize handler
    function onWindowResize() {
        var width  = window.innerWidth;
        var height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
    window.addEventListener( 'resize', onWindowResize, false );
    
    // Presentation button for WebVR capable devices.
    function createButton() {
        var btn = document.createElement("button");
        btn.innerText      = "Enter VR";
        btn.style.position = "absolute";
        btn.style.top      = "5px";
        btn.style.right    = "5px";
        document.body.appendChild(btn);
        
        btn.addEventListener("click", function() {effect.requestPresent()});
        
        function vrPresentationChange() {
            btn.style.display = vrDisplay.isPresenting ? "none" : "block";
        };
        window.addEventListener('vrdisplaypresentchange', vrPresentationChange);
    }
    
    // Setup WebVR and begin the animation
    setupVR(function() {
        vrDisplay.requestAnimationFrame(animate);
        if(vrDisplay.capabilities.canPresent) {
            createButton();
        }
    });
    
    onWindowResize();
}

WebVRConfig.ALWAYS_APPEND_POLYFILL_DISPLAY = true;