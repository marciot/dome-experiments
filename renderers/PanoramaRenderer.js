/* The PanoramaRenderer code presented here is adapted from:
 *
 *   https://github.com/spite/THREE.CubemapToEquirectangular
 */
 
const inchesToMeters     = 0.0254;
const feetToMeters       = 0.3048;
const degreesToRadians   = Math.PI / 180;

RendererConfig = {
    camera: {
        /* The cube camera takes in the 360 view of the scene. The
           starting position is at average eye height for a standing
           person. */
        startingPosition:   new THREE.Vector3(0, 5 * feetToMeters, 0),
        /* The cameraRig member carries the camera. Move this around to
        animate the viewpoint */
        rig:        null,
        near:       .1,
        far:        1000,
        cubeMapSize: 1024
    },
    dome: {
        radius:             35.0 * feetToMeters / 2,
        inclination:        20 * degreesToRadians,
        fullSphere:         false
    },
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

PanoramaRenderer.vertexShader = function() {/*!
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

PanoramaRenderer.fragmentShader = function() {/*!
precision highp       float;
uniform   samplerCube map;
varying   float longitude;
varying   float latitude;

void main()  {
    float sinOfLatitude = -sin( latitude );
    vec3 dir = vec3(
        sin( longitude ) * sinOfLatitude,
        cos( latitude ),
        cos( longitude ) * sinOfLatitude
    );
    gl_FragColor = textureCube( map, dir );
}
*/}.getComment();

function PanoramaRenderer( renderer ) {
    this.renderer = renderer;

    /* For doing the warpping, we use a scene that consists of
     * a quad that covers the entire canvas and paint it with a
     * fragment shader */
    this.material = new THREE.RawShaderMaterial( {
        uniforms: {
            map: { type: 't', value: null }
        },
        vertexShader:   PanoramaRenderer.vertexShader,
        fragmentShader: PanoramaRenderer.fragmentShader,
        side: THREE.DoubleSide
    } );
    
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(1, 1),
        this.material
    );
    this.scene.add(this.quad);
    this.camera = new THREE.OrthographicCamera(
        1 / -2, // Camera frustum left  plane
        1 /  2, // Camera frustum right plane
        1 /  2, // Camera frustum top plane
        1 / -2, // Camera frustum bottom plane
        -10000, // Camera frustum near plane
         10000  // Camera frustum far plane
    );

    /* The cube camera snaps a 360 picture of the user's scene into a cube texture */
	var gl = this.renderer.getContext();
	var maxSize = gl.getParameter( gl.MAX_CUBE_MAP_TEXTURE_SIZE );

    var cameraRig = new THREE.Object3D();
    this.cubeCamera = new THREE.CubeCamera(
        RendererConfig.camera.near,
        RendererConfig.camera.far,
        Math.min(maxSize, RendererConfig.camera.cubeMapSize)
    );
    cameraRig.add(this.cubeCamera);
    cameraRig.position.copy(RendererConfig.camera.startingPosition);
    RendererConfig.camera.rig = cameraRig;
}

PanoramaRenderer.prototype.setSize = function( width, height ) {
	this.width = width;
	this.height = height;

	this.quad.scale.set( this.width, this.height, 1 );

	this.camera.left   = this.width / - 2;
	this.camera.right  = this.width / 2;
	this.camera.top    = this.height / 2;
	this.camera.bottom = this.height / - 2;

	this.camera.updateProjectionMatrix();
}

PanoramaRenderer.prototype.render = function( scene ) {
    /* Step 1: Render the user's scene to the CubeCamera's texture */
	var autoClear = this.renderer.autoClear;
	this.renderer.autoClear = true;
	this.cubeCamera.updateCubeMap( this.renderer, scene );
	this.renderer.autoClear = autoClear;
    
    /* Step 2: Assign the CubeCamera's texture to the quad's fragment shader */
    this.quad.material.uniforms.map.value = this.cubeCamera.renderTarget.texture;

    /* Step 3: Paints the quad to the screen using the fragment shader to
     * perform the equirectangular distortion. */
    this.renderer.render(this.scene, this.camera);
}

/* Main function that kickstarts the animation loop */
function startAnimation() {
    var clock  = new THREE.Clock();
    
    var renderer = new THREE.WebGLRenderer();
    var canvas = renderer.domElement;
    document.body.appendChild(canvas);
    
    panoRender = new PanoramaRenderer(renderer, true);
    
    // Call the user routine to setup the scene
    var scene  = new THREE.Scene();
    setupScene(scene);
    scene.add(RendererConfig.camera.rig);
    
    // The animation routine
    function animate() {
        var dt = clock.getDelta();
        var t  = clock.getElapsedTime();
        if(RendererConfig.animationCallback) {
            RendererConfig.animationCallback(t, dt);
        }
        panoRender.render(scene);
        requestAnimationFrame( animate );
    }
    
    // The resize handler
    function onWindowResize() {
        var width  = canvas.clientWidth;
        var height = canvas.clientHeight;
        canvas.width  = width;
        canvas.height = height;
        panoRender.setSize(width, height);
        renderer.setViewport(0, 0, canvas.clientWidth, canvas.clientHeight);

        // Show canvas size while resizing
        const resizeInfoTime = 3000;
        if(!this.resizeInfo) {
            this.resizeInfo = document.createElement("div");
            this.resizeInfo.style.position = "absolute";
            this.resizeInfo.style.top      = "0px";
            this.resizeInfo.style.left     = "0px";
            this.resizeInfo.style.color    = "white";
            this.resizeInfo.innerText      = width + "x" + height;
            document.body.appendChild(this.resizeInfo);
        }
        function checkStillResizing() {
            if(this.stillResizing) {
                this.stillResizing = false;
                window.setTimeout(checkStillResizing, resizeInfoTime);
            } else {
                this.resizeInfo.style.display = "none";
            }
        }
        if(!this.stillResizing) {
            window.setTimeout(checkStillResizing, resizeInfoTime);
            this.resizeInfo.style.display = "block";
        }
        this.stillResizing            = true;
        this.resizeInfo.innerText     = width + " x " + height;
    }
    window.addEventListener( 'resize', onWindowResize, false );
    
    // Begin the animation
    animate();
    onWindowResize();
}

if(window.onRendererReady) {
    window.onRendererReady();
}