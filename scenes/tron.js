/* This is my attempt to recreate Spherible - Purp Cycle in code.
 * The original video is here:
 *
 *    https://vimeo.com/97887646
 */
const separation = 100;
var   world, texLoader;
var   t = 0;
var   tori = [];

function setupScene(scene) {

    const eyeHeight = (
        window.WebVRDomeConfig ||
        window.PanoramaConfig ||
        window.FullDomeConfig ||
        window.WebVRConfig).eyeHeight;
    
    var light = new THREE.AmbientLight( 0x555555 );
    scene.add(light);
    
    var light = new THREE.PointLight( 0xffffff, 1 );
    light.position.set( 10, 15, 20 );
    scene.add(light);
    
    // The lens flare.
    var material = new THREE.ShaderMaterial( {
        vertexShader:   flareVertexShader,
        fragmentShader: flareFragmentShader,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        transparent: true
    } );
    var geometry = new THREE.CircleBufferGeometry( 0.6, 25 );
    var flare = new THREE.Mesh( geometry, material );
    flare.position.z = -2;
    flare.position.y = eyeHeight;
    scene.add( flare );
    
    world     = new THREE.Object3D();
    texLoader = new THREE.TextureLoader();

    // The floor.
    var material = new THREE.ShaderMaterial( {
        vertexShader:   gridVertexShader,
        fragmentShader: gridFragmentShader
    } );
    var geometry = new THREE.PlaneBufferGeometry(500, 500);
    //var texture = getTronMaterial('../textures/tron0.png', 50);
    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI/2;
    mesh.position.y = 0;
    world.add(mesh);
    
    // The tori.
    
    var geometry = new THREE.TorusBufferGeometry(5, 1, 8, 40);
    for(var i = -5; i < 5; i++) {
        mesh = new THREE.Mesh( geometry, getTronMaterial('../textures/tron1.png') );
        mesh.position.z = -i * separation;
        mesh.position.y = eyeHeight;
        world.add(mesh);
        tori.push(mesh);
    }
    scene.add(world);
}

function getTronMaterial(url, repeat) {
    var texture  = texLoader.load(url);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    if(repeat) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set( repeat, repeat );
    }
    return new THREE.MeshLambertMaterial({
        color:       0x001020,
        emissiveMap: texture,
        emissive:    0xFFFFFF
    });
}

function animateScene(dt, scene) {
    const speed = 0.2;
    
    t += dt;
    world.position.z = ((t * speed) % 2) * separation;
    
    for(var i = 0; i < tori.length; i++) {
        tori[i].rotation.z += dt * ((i % 2) ? 1 : -1);
    }
}

var flareVertexShader = 
"varying vec2 vUv;\n" +
"void main() {\n" +
"   vUv = vec2( 1.- uv.x, uv.y );\n" +
"   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n" +
"}\n";

var flareFragmentShader =
"precision mediump float;\n" +

"varying vec2 vUv;\n" +

"#define M_PI 3.1415926535897932384626433832795\n" +

"float noise(float a) {\n" +
"   return \n" +
"     + sin(a *  16.) * 0.12\n" +
"     - sin(a *   8.) * 0.3\n" +
"     - sin(a *   4.) * 0.3\n" +
"     - sin(a *   2.) * 0.3\n" +
"     - sin(a *   1.) * 0.3\n" +
";}\n" +

"void main()  {\n" +

"   vec2 uv = (vUv - vec2(0.5, 0.5)) * 2.;\n" +

"   float a         = atan(uv.x,uv.y);\n" +
"   float r         = 1. - length(uv);\n" +
"   float white     = pow(0.05 + 1.0 * r, 2.);\n" +
"   float purple    = pow(0.75 * noise(a), 3.) * r;\n" +
"   gl_FragColor    = (vec4(1., 1., 1., 1.) * white + vec4(1., 0., 1., 1.) * purple) * pow(r, 3.);\n" +

"}\n";

var gridVertexShader = 
"varying vec2 vUv;\n" +
"void main() {\n" +
"   vUv = uv;\n" +
"   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n" +
"}\n";

var gridFragmentShader =
"precision mediump float;\n" +

"varying vec2 vUv;\n" +

"void main()  {\n" +
"   vec2 uv = mod(vUv * 25., 1.);" +
"   float thickness = 0.02;" +
"   float taper     = 0.01;" +
"   float gX = smoothstep(0.5 - thickness - taper, 0.5 - thickness, uv.x) - smoothstep(0.5 + thickness, 0.5 + thickness + taper, uv.x);" +
"   float gY = smoothstep(0.5 - thickness - taper, 0.5 - thickness, uv.y) - smoothstep(0.5 + thickness, 0.5 + thickness + taper, uv.y);" +
"   gl_FragColor = vec4(0., 1., 1., 1.) * (gX + gY);\n" +
"}\n";