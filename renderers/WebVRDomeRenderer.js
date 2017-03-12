/* The WebVRDomeRenderer code presented here is adapted from:
 *
 *   https://github.com/spite/THREE.CubemapToEquirectangular
 */

const inchesToMeters     = 0.0254;
const feetToMeters       = 0.3048;
const degreesToRadians   = Math.PI / 180;

WebVRDomeConfig = {
    domeRadius:             35.0 * feetToMeters / 2,
    eyeHeight:              46.0 * inchesToMeters,
    seats: {
        visible:            true,
        cushion: {
            width:          17.0 * inchesToMeters,
            depth:          17.0 * inchesToMeters,
            height:          2.0 * inchesToMeters,
            aboveFloor:     17.5 * inchesToMeters
        },
        back: {
            width:          17.0 * inchesToMeters,
            depth:           2.0 * inchesToMeters,
            height:         19.0 * inchesToMeters,
            angle:          10.0 * degreesToRadians,
        },
        legRoom:            20.0 * inchesToMeters,
        separation:          1.0 * inchesToMeters
    },

    // These values control the placement of
    // seats within the virtual dome theater.
    // Seats are placed within the theater
    // in arcs whose center is specified as
    // a multiple of domeDiameter. Seats will
    // cover the entire area of the theater,
    // except for the a walkway along the
    // perimeter of the dome.
    //
    // seatArcMultiplier controls the curvature
    // of the rows of seats. If it is zero, the
    // seats are placed circularly facing the
    // center of theater; as it approaches
    // infinity, the seats will become straight
    // parallel rows facing forward.
    outsideWalkwayWidth:  4.0 * feetToMeters,
    seatArcMultiplier:    1.5
};

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

    var grid = new THREE.PolarGridHelper(WebVRDomeConfig.domeRadius);
    this.scene.add( grid );

    this.dome = new THREE.Mesh(
        new THREE.SphereBufferGeometry(WebVRDomeConfig.domeRadius, 32, 32 ),
        this.material
    );
    this.dome.position.y = WebVRDomeConfig.eyeHeight;
    this.scene.add(this.dome);

    if(WebVRDomeConfig.seats.visible) {
        var light = new THREE.AmbientLight( 0xffffff, 0.1 );
        this.scene.add(light);

        var light = new THREE.PointLight( 0xffffff, 0.2 );
        light.position.set( 0, 15, 0 );
        this.scene.add(light);

        var seatMaterial = new THREE.MeshLambertMaterial();
        placeSeats(this.scene, seatMaterial);
    }

    /* The cube camera snaps a 360 picture of the user's scene into a cube texture */
    var gl = this.renderer.getContext();
    var maxSize = gl.getParameter( gl.MAX_CUBE_MAP_TEXTURE_SIZE );

    this.cubeCamera = new THREE.CubeCamera(
        .1,     // Near clipping distance
        1000,   // Far clipping distance
        Math.min(maxSize, desiredCubeMapSize)
    );
    this.cubeCamera.position.y = WebVRDomeConfig.eyeHeight;
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

/* Function that generates geometry for the seats */
function getSeatGeometry() {
    const s       = WebVRDomeConfig.seats;
    const c       = WebVRDomeConfig.seats.cushion;
    const b       = WebVRDomeConfig.seats.back;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(c.width, c.height, c.depth));
    const back = new THREE.Mesh(new THREE.BoxGeometry(b.width, b.height, b.depth));
    const base = new THREE.Mesh(new THREE.BoxGeometry(c.width*.9, c.aboveFloor, c.depth*.9));

    seat.position.y = c.aboveFloor - c.height/2;
    base.position.y = c.aboveFloor/2;
    back.position.y = c.aboveFloor + b.height/2 * Math.cos(b.angle);
    back.position.z = -c.depth/2   - b.height/2 * Math.sin(b.angle);
    back.rotation.x = -b.angle;

    // Merge the various components into one geometry
    var geometry = new THREE.Geometry();
    geometry.mergeMesh(seat);
    geometry.mergeMesh(base);
    geometry.mergeMesh(back);
    return geometry;
}

function placeSeats(scene, seatMaterial) {
    const d                 = WebVRDomeConfig;
    const s                 = WebVRDomeConfig.seats;
    const c                 = WebVRDomeConfig.seats.cushion;
    const minSeatsInArc     = 30;
    const minSeatArcRadius  = c.width * minSeatsInArc / Math.PI / 2;
    const seatRowSpacing    = c.depth + s.legRoom;
    const posInTheater      = (x,z) => Math.sqrt(x*x + z*z) < (d.domeRadius - d.outsideWalkwayWidth);
    const seatGeometry      = getSeatGeometry();
    var   arcCenter         = new THREE.Vector3();
    for(var x, z, r = minSeatArcRadius; r < (1 + d.seatArcMultiplier) * d.domeRadius; r += seatRowSpacing) {
        const seatAngularSpacing = Math.atan2(c.width + s.separation, r - c.depth/2);
        arcCenter.x = 0;
        arcCenter.z = -d.seatArcMultiplier * d.domeRadius;
        for(var a = 0; a < Math.PI; a += seatAngularSpacing) {
            x = r * Math.cos(a);
            z = r * Math.sin(a) - d.seatArcMultiplier * d.domeRadius;
            if(posInTheater(x,z)) {
                var mesh = new THREE.Mesh(seatGeometry, seatMaterial);
                mesh.position.x = x;
                mesh.position.z = z;
                mesh.lookAt(arcCenter);
                scene.add(mesh);
            }
        }
    }
}

/* Main function that kickstarts the animation loop */
function startAnimation() {
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
            camera.position.y = WebVRDomeConfig.eyeHeight;
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