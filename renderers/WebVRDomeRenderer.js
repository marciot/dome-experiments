/* The WebVRDomeRenderer code presented here is adapted from:
 *
 *   https://github.com/spite/THREE.CubemapToEquirectangular
 */

const inchesToMeters     = 0.0254;
const feetToMeters       = 0.3048;
const degreesToRadians   = Math.PI / 180;

RendererConfig = {
    perspectiveCamera: {
        /* The perspectiveCamera is used to render the viewpoint
         * from inside the virtual dome theater. */
        fov:                50
    },
    camera: {
        /* The cube camera takes in the 360 view of the scene. The
           starting position is at average eye height for a standing
           person. */
        startingPosition:   new THREE.Vector3(0, 5 * feetToMeters, 0),
        /* The cameraRig member carries the camera. Move this around to
        animate the viewpoint */
        rig:         null,
        near:        .1,
        far:         1000,
        cubeMapSize: 1024
    },
    dome: {
        radius:             35.0 * feetToMeters / 2,
        inclination:        20 * degreesToRadians,
        fullSphere:         false
    },
    seats: {
        visible:            true,
        teleportGazeTime:   3.0, // in seconds, -1 to disable
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
        separation:          1.0 * inchesToMeters,
        eyeLevel:           46.0 * inchesToMeters,
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
    seatArcMultiplier:    1.5,

    // When only rendering a half-sphere, the bottom
    // side of the dome will be painted in this color.
    backgroundColor:      0x555555
};

// Load defaults from session storage

var val = sessionStorage.getItem('defaultCubeMapResolution');
if(val) {
    console.log("cubeMapSize from session storage", val);
    RendererConfig.camera.cubeMapSize = parseInt(val);
}

/* Trick for inline strings for GLSL code:
     http://stackoverflow.com/questions/805107/creating-multiline-strings-in-javascript
 */
Function.prototype.getComment = function() {
    var startComment = "/*!";
    var endComment = "*/";
    var str = this.toString();

    var start = str.indexOf(startComment);
    var end = str.lastIndexOf(endComment);

    return str.slice(start + startComment.length, -(str.length - end));
};

WebVRDomeRenderer.vertexShader = function() {/*!
attribute vec3  position;
attribute vec2  uv;
uniform   mat4  projectionMatrix;
uniform   mat4  modelViewMatrix;
varying   float latitude;
varying   float longitude;

#define M_PI 3.1415926535897932384626433832795

void main() {
   latitude  = (1.0 - uv.y) * M_PI;
   longitude =  2.  * uv.x  * M_PI;
   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
*/}.getComment();

WebVRDomeRenderer.fragmentShader = function() {/*!
precision highp float;
uniform         samplerCube map;
varying         float latitude;
varying         float longitude;

void main()  {
    float sinOfLatitude = sin( latitude );
    vec3 dir = vec3(
        -cos( longitude ) * sinOfLatitude,
         cos( latitude ),
         sin( longitude ) * sinOfLatitude
    );
    gl_FragColor = textureCube( map, dir );
}
*/}.getComment();

function getDomeGeometry(radius, fullSphere) {
    var geometry = new THREE.SphereBufferGeometry(
        radius, 64, 64,
        0, Math.PI*2,
        0, fullSphere ? Math.PI : Math.PI/2
    );

    /* If rendering a half sphere, the UV texture coordinates
     * need to be halved in the y direction. */
    if(!fullSphere) {
        var uv = geometry.attributes.uv.array;
        for(var i = 1; i < uv.length; i += 2) {
            uv[i] = uv[i]/2 + 0.5;
        }
    }
    return geometry;
}

function WebVRDomeRenderer( renderer, vrDisplay ) {
    this.renderer = renderer;

    /* For doing the warpping, we use a scene that consists of
     * a quad that covers the entire canvas and paint it with a
     * fragment shader */
    this.material = new THREE.RawShaderMaterial( {
        uniforms: {
            map: { type: 't', value: null }
        },
        vertexShader:   WebVRDomeRenderer.vertexShader,
        fragmentShader: WebVRDomeRenderer.fragmentShader,
        side: THREE.DoubleSide
    } );

    this.theaterScene = new THREE.Scene();

    var theater = new THREE.Object3D();
    this.theaterScene.add(theater);

    var domeGeometry = getDomeGeometry(RendererConfig.dome.radius, RendererConfig.dome.fullSphere);
    this.dome = new THREE.Mesh(domeGeometry, this.material);
    this.dome.rotation.x = -RendererConfig.dome.inclination;
    theater.add(this.dome);

    // The seats and floor are shifted down by eyeLevel, so that
    // the user's eyes lie approximately at the center of the
    // dome.
    var seatsAndFloor = new THREE.Object3D();
    theater.add( seatsAndFloor );
    seatsAndFloor.position.y = -RendererConfig.seats.eyeLevel;

    // The floor (represented by a grid)
    var grid = new THREE.PolarGridHelper(RendererConfig.dome.radius);
    grid.rotation.x = -RendererConfig.dome.inclination;
    seatsAndFloor.add( grid );

    // The seats
    if(RendererConfig.seats.visible) {
        // The theater only needs lighting if the seats are visible.
        var light = new THREE.AmbientLight( 0xffffff, 0.1 );
        this.theaterScene.add(light);

        var light = new THREE.PointLight( 0xffffff, 0.2 );
        light.position.set( 0, 15, 0 );
        this.theaterScene.add(light);

        this.seatMaterial = new THREE.MeshLambertMaterial();
        this.seats = new THREE.Object3D();
        placeSeats(this.seats, this.seatMaterial);
        seatsAndFloor.add(this.seats);

        this.selectedMaterial = new THREE.MeshLambertMaterial({
            emissive:          0x88FF00,
            emissiveIntensity: 0.5
        });

        if(RendererConfig.seats.teleportGazeTime > 0) {
            this.enableTeleportation();
        }
    }

    /* The cube camera snaps a 360 picture of the scene onto a cube texture
     * for mapping onto the dome. The CubeCamera is independent of the user's
     * viewpoint and should not be confused with the PerspectiveCamera, which
     * renders from the user's view point insider the dome theater.
     */
    var gl = this.renderer.getContext();
    var maxSize = gl.getParameter( gl.MAX_CUBE_MAP_TEXTURE_SIZE );

    var cameraRig = new THREE.Object3D();
    this.cubeCamera = new THREE.CubeCamera(
        RendererConfig.camera.near,
        RendererConfig.camera.far,
        Math.min(maxSize, RendererConfig.camera.cubeMapSize)
    );
    cameraRig.add(this.cubeCamera);
    this.cubeCamera.rotation.x = -RendererConfig.dome.inclination;
    cameraRig.position.copy(RendererConfig.camera.startingPosition);
    RendererConfig.camera.rig = cameraRig;

    /* If we have a half-dome, obstructing the lower half of
     * the cube camera with a hemisphere improves performance on
     * complex scenes. */
    if(!RendererConfig.dome.fullSphere) {
        var shield = new THREE.Mesh(domeGeometry, new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.BackSide
        }));
        shield.rotation.x = Math.PI;
        shield.scale.set(0.10, 0.10, 0.10);
        this.cubeCamera.add(shield);
    }

    /* Track the mouse, unless presenting, in which case the gaze target is in the middle of the screen */
    var me    = this;
    this.mouse = new THREE.Vector2(0,0);
    renderer.domElement.addEventListener('mousemove', function(event) {
        if(!vrDisplay.isPresenting) {
            me.mouse.x =   ( event.clientX / window.innerWidth  ) * 2 - 1;
            me.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
        } else {
            me.mouse.x = 0;
            me.mouse.y = 0;
        }
    }, false);
}

WebVRDomeRenderer.prototype.setProjectedScene = function(scene) {
    this.projectedScene = scene;
}

WebVRDomeRenderer.prototype.update = function(dt) {
    /* Step 1: Render the projected scene to the CubeCamera's texture */
    var autoClear = this.renderer.autoClear;
    this.renderer.autoClear = true;
    this.cubeCamera.updateCubeMap( this.renderer, this.projectedScene );
    this.renderer.autoClear = autoClear;

    /* Step 2: Assign the CubeCamera's texture to the dome's fragment shader */
    this.dome.material.uniforms.map.value = this.cubeCamera.renderTarget.texture;

    /* Step 3: Track the user's gaze to allow them to choose a new seat */
    if(this.raycastingFunction) {
        this.raycastingFunction(dt);
    }
    if(this.interactionFunction) {
        this.interactionFunction(dt);
    }
}

WebVRDomeRenderer.prototype.enableTeleportation = function(viewer, camera) {
    var raycaster     = new THREE.Raycaster();
    var lastSelected  = null;
    var gazeStartTime = 0;
    var me = this;
    this.raycastingFunction = function(t) {
        raycaster.setFromCamera( this.mouse, camera );
        var intersects = raycaster.intersectObject(me.seats, true);
        var nowSelected = null;
        if (intersects.length) {
            nowSelected = intersects[0].object;
            nowSelected.material = me.selectedMaterial;
        }
        if(nowSelected !== lastSelected) {
            if(lastSelected) {
                lastSelected.material = me.seatMaterial;
            }
            gazeStartTime = t;
        }
        if(nowSelected) {
            var gazeTime = t - gazeStartTime;
            if(gazeTime > RendererConfig.seats.teleportGazeTime) {
                viewer.position.copy(nowSelected.getWorldPosition());
            }
        }
        lastSelected = nowSelected;
        this.selectedMaterial.emissiveIntensity = gazeTime/RendererConfig.seats.teleportGazeTime;
    }
}

WebVRDomeRenderer.prototype.enableLocalInteraction = function(element, camera) {
    var raycaster     = new THREE.Raycaster();
    var touching      = false;

    this.interactionFunction = function(t) {
        if(!RendererConfig.interaction) {
            return;
        }
        raycaster.setFromCamera(this.mouse, camera);
        var intersects = raycaster.intersectObject(this.dome, true);
        for(var i = 0; i < intersects.length; i++) {
            azimuth   = ((1 - intersects[i].uv.x) * 360 + 270) % 360;
            elevation = intersects[i].uv.y        * 180 - 90;
            RendererConfig.interaction.dispatchEventFromPolarCoordinates(azimuth, elevation, touching);
        }
    }

    // Add local interaction
    element.addEventListener('contextmenu', function(ev) {
        ev.preventDefault();
        return false;
    }, false);

    element.addEventListener('mousedown', function(ev) {
        if(ev.button == 0) {
            touching = true;
            ev.preventDefault();
            return false;
        }
    }, true);

    element.addEventListener('mouseup', function(ev) {
        touching = false;
    }, false);
}

WebVRDomeRenderer.prototype.startPresenting = function() {
    this.mouse.x = 0;
    this.mouse.y = 0;
}

/* Function that generates geometry for the seats */
function getSeatGeometry() {
    const s       = RendererConfig.seats;
    const c       = RendererConfig.seats.cushion;
    const b       = RendererConfig.seats.back;

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

function placeSeats(obj, seatMaterial) {
    const d                 = RendererConfig;
    const s                 = RendererConfig.seats;
    const c                 = RendererConfig.seats.cushion;
    const minSeatsInArc     = 30;
    const minSeatArcRadius  = c.width * minSeatsInArc / Math.PI / 2;
    const seatRowSpacing    = c.depth + s.legRoom;
    const posInTheater      = function(x,z) {return Math.sqrt(x*x + z*z) < (d.dome.radius - d.outsideWalkwayWidth);}
    const seatGeometry      = getSeatGeometry();
    var   arcCenter         = new THREE.Vector3();
    for(var x, z, r = minSeatArcRadius; r < (1 + d.seatArcMultiplier) * d.dome.radius; r += seatRowSpacing) {
        const seatAngularSpacing = Math.atan2(c.width + s.separation, r - c.depth/2);
        arcCenter.x = 0;
        arcCenter.z = -d.seatArcMultiplier * d.dome.radius;
        const rowY = (r + arcCenter.z) * Math.tan(RendererConfig.dome.inclination);
        for(var a = 0; a < Math.PI; a += seatAngularSpacing) {
            x = r * Math.cos(a);
            z = r * Math.sin(a) + arcCenter.z;
            if(posInTheater(x,z)) {
                var mesh = new THREE.Mesh(seatGeometry, seatMaterial);
                mesh.position.x = x;
                mesh.position.y = rowY;
                mesh.position.z = z;
                mesh.lookAt(arcCenter);
                obj.add(mesh);
            }
        }
    }
}

/* Main function that kickstarts the animation loop */
function setupDomeScene(vrDisplay) {
    var clock  = new THREE.Clock();
    
    var renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(Math.floor(window.devicePixelRatio));
    document.body.appendChild(renderer.domElement);

    var effect = new THREE.VREffect(renderer);
    effect.setSize(window.innerWidth, window.innerHeight);
    
    var domeRenderer = new WebVRDomeRenderer(renderer, vrDisplay);
    
    var viewerBody = new THREE.Object3D();
    var camera = new THREE.PerspectiveCamera( RendererConfig.perspectiveCamera.fov, window.innerWidth / window.innerHeight, 0.1, 700 );
    viewerBody.add(camera);
    domeRenderer.theaterScene.add(viewerBody);

    // Set up the scene that is rendered and projected
    // on the dome. This is NOT the same scene that
    // contains the theater itself and chairs.
    var projectedScene  = new THREE.Scene();
    setupScene(projectedScene);
    projectedScene.add(RendererConfig.camera.rig);
    domeRenderer.setProjectedScene(projectedScene);

    createVRButton(vrDisplay, function() {effect.requestPresent(); domeRenderer.startPresenting();});

    domeRenderer.enableTeleportation(viewerBody, camera);
    domeRenderer.enableLocalInteraction(renderer.domElement, camera);

    var vrFrameData          = new VRFrameData();
    var headsetPose          = new THREE.Vector3();
    var headsetOrientation   = new THREE.Quaternion();
    var standingTransform    = new THREE.Matrix4();
    function updatePoseAndOrientation() {
        // Get the headset position and orientation.
        vrDisplay.getFrameData(vrFrameData);
        if (vrFrameData.pose && vrFrameData.pose.position) {
            camera.position.fromArray(vrFrameData.pose.position);
            camera.position.applyMatrix4(standingTransform);
        } else {
            camera.position.y = RendererConfig.seats.eyeLevel;
        }
        if (vrFrameData.pose && vrFrameData.pose.orientation) {
            camera.quaternion.fromArray(vrFrameData.pose.orientation);
        }
    }
    function updateStandingTransform() {
        if(vrDisplay.stageParameters && vrDisplay.stageParameters.sittingToStandingTransform) {
            standingTransform.fromArray(vrDisplay.stageParameters.sittingToStandingTransform);
        }
    }
    updateStandingTransform();
    
    // The resize handler
    function onWindowResize() {
        if(!this.resizeDelay) {
            this.resizeDelay = setTimeout(() => {
                this.resizeDelay = null;
                var width  = window.innerWidth;
                var height = window.innerHeight;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            }, 250);
        }
    }
    window.addEventListener( 'resize', onWindowResize, false );
    
    // The animation routine
    function animate() {
        updatePoseAndOrientation();

        var dt = clock.getDelta();
        var t  = clock.getElapsedTime();
        if(RendererConfig.animationCallback) {
            RendererConfig.animationCallback(t, dt);
        }
        domeRenderer.update(t);

        effect.render(domeRenderer.theaterScene, camera);
        vrDisplay.requestAnimationFrame(animate);
    }
    vrDisplay.requestAnimationFrame(animate);
}

// Presentation button for WebVR capable devices.
function createVRButton(vrDisplay, callback) {
    if(vrDisplay.capabilities.canPresent) {
        var btn = document.createElement("button");
        btn.innerText      = "Enter VR";
        btn.style.position = "absolute";
        btn.style.top      = "5px";
        btn.style.right    = "5px";
        document.body.appendChild(btn);
        
        btn.addEventListener("click", callback);
        
        function vrPresentationChange() {
            btn.style.display = vrDisplay.isPresenting ? "none" : "block";
        };
        window.addEventListener('vrdisplaypresentchange', vrPresentationChange);
    }
}

function startAnimation() {
    // Setup WebVR and begin the animation
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
                        sceneCallback(vrDisplay);
                        return;
                    }
                }
                alert("WebVR is supported, but no VR displays found");
            }
        );
    }
    setupVR(setupDomeScene);
}

WebVRConfig.ALWAYS_APPEND_POLYFILL_DISPLAY = true;

if(window.onRendererReady) {
    window.onRendererReady();
}