/* The PanoramaRenderer code presented here is adapted from:
 *
 *   https://github.com/spite/THREE.CubemapToEquirectangular
 */
 
const inchesToMeters     = 0.0254;

PanoramaConfig = {
    eyeHeight:              46.0 * inchesToMeters
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

"   float longitude =  uv.x * 2. * M_PI - M_PI;\n" +
"   float latitude =   (1.0 - uv.y) * M_PI;\n" +

"   vec3 dir = vec3(\n" +
"       - sin( longitude ) * sin( latitude ),\n" +
"       cos( latitude ),\n" +
"       - cos( longitude ) * sin( latitude )\n" +
"   );\n" +
"   normalize( dir );\n" +

"   gl_FragColor = vec4( textureCube( map, dir ).rgb, 1. );\n" +

"}\n";

function PanoramaRenderer( renderer ) {
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
    this.cubeCamera.position.y = PanoramaConfig.eyeHeight;
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
    document.body.appendChild(renderer.domElement);
    
    panoRender = new PanoramaRenderer(renderer, true);
    
    // Call the user routine to setup the scene
    var scene  = new THREE.Scene();
    setupScene(scene);
    
    // The animation routine
    function animate() {
        animateScene(clock.getDelta(), scene);
        panoRender.render(scene);
        requestAnimationFrame( animate );
    }
    
    // The resize handler
    function onWindowResize() {
        var width  = window.innerWidth;
        var height = window.innerHeight;
        panoRender.setSize(width, height);
        renderer.setSize(width, height);
    }
    window.addEventListener( 'resize', onWindowResize, false );
    
    // Begin the animation
    animate();
    onWindowResize();
}