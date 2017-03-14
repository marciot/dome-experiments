/* The FullDomeRenderer code presented here is adapted from:
 *
 *   https://github.com/spite/THREE.CubemapToEquirectangular
 */

const inchesToMeters     = 0.0254;

RendererConfig = {
    eyeHeight:              46.0 * inchesToMeters
};

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

var vertexShader = function() {/*!
attribute vec3 position;
attribute vec2 uv;
uniform   mat4 projectionMatrix;
uniform   mat4 modelViewMatrix;
varying   vec2 vUv;
void main() {
    vUv         = vec2( 1.- uv.x, uv.y );
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
*/}.getComment();

var fragmentShader = function() {/*!
precision mediump     float;
uniform   samplerCube map;
varying   vec2        vUv;

#define M_PI 3.1415926535897932384626433832795

void main()  {
    vec2 uv         = vUv - vec2(0.5, 0.5);
    float longitude = atan(uv.x,uv.y);
    float latitude  = length(uv) * M_PI;

    vec3 dir = vec3(
        -sin( longitude ) * sin( latitude ),
         cos( latitude ),
        -cos( longitude ) * sin( latitude )
    );
    normalize( dir );

    gl_FragColor = vec4( textureCube( map, dir ).rgb, 1. );
}
*/}.getComment();

function FullDomeRenderer( renderer ) {
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

    this.cubeCamera = new THREE.CubeCamera(
        .1,     // Near clipping distance
        1000,   // Far clipping distance
        Math.min(maxSize, desiredCubeMapSize)
    );
    this.cubeCamera.position.y = RendererConfig.eyeHeight;
    RendererConfig.camera = this.cubeCamera;
}

FullDomeRenderer.prototype.setSize = function( width, height ) {
	this.width = width;
	this.height = height;

	this.quad.scale.set( this.width, this.height, 1 );

	this.camera.left   = this.width / - 2;
	this.camera.right  = this.width / 2;
	this.camera.top    = this.height / 2;
	this.camera.bottom = this.height / - 2;

	this.camera.updateProjectionMatrix();
}

FullDomeRenderer.prototype.render = function( scene ) {
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
    document.body.appendChild(renderer.domElement);
    
    panoRender = new FullDomeRenderer(renderer, true);
    
    // Call the user routine to setup the scene
    var scene  = new THREE.Scene();
    setupScene(scene);
    
    // The animation routine
    function animate() {
        var t = clock.getElapsedTime();
        if(RendererConfig.animationCallback) {
            RendererConfig.animationCallback(t);
        }
        panoRender.render(scene);
        requestAnimationFrame( animate );
    }
    
    // The resize handler
    function onWindowResize() {
        var width  = window.innerWidth;
        var height = window.innerHeight;
        panoRender.setSize(width, height);
        renderer.setSize(width, height);

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