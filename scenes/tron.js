/* This is my attempt to recreate Spherible - Purp Cycle in code.
 * The original video is here:
 *
 *    https://vimeo.com/97887646
 */
function setupScene(scene) {
    
    const ringSeparation = 100;
    const animationSpeed = 0.2;

    // The scene lighting.
    var light = new THREE.AmbientLight( 0x555555 );
    scene.add(light);
    
    var light = new THREE.PointLight( 0xffffff, 1 );
    light.position.set( 10, 15, 20 );
    scene.add(light);
    
    /* The lens flare. We attach the flare to the camera,
     * the camera to the scene, so that the flare moves
     * with the camera. */
    var flare = new LensFlare(0, 0, -2);
    RendererConfig.camera.add( flare.obj );
    scene.add(RendererConfig.camera);

    /* The floor. */
    var floor = new GridFloor(0, 0, 0);
    scene.add(floor.obj);
    
    /* The rings. I position the rings at eye level so the flare
     * (which is closer to the camera) lines up with the rings */
    for(var i = -5; i < 5; i++) {
        var ring = new TronRing(0, RendererConfig.eyeHeight, i * ringSeparation);
        scene.add(ring.obj);
    }

    /* The light pillars */
    var pillar;
    for(var i = -5; i < 5; i++) {
        pillar = new LightPillar(20, 0, (-i + 0.5) * ringSeparation);
        scene.add(pillar.obj);
    }

    RendererConfig.animationCallback = function(t) {
        RendererConfig.camera.position.z = -((t * animationSpeed) % 2) * ringSeparation;
        TronRing.animate(t);
        LightPillar.animate(t);
    }
}

var texureLoader = new THREE.TextureLoader();

function LensFlare(x, y, z) {
    if(!LensFlare.staticData) {
        LensFlare.staticData = {
            geometry: new THREE.CircleBufferGeometry( 0.6, 25 ),
            material: new THREE.ShaderMaterial( {
                vertexShader:   LensFlare.vertexShader,
                fragmentShader: LensFlare.fragmentShader,
                depthTest: false,
                blending: THREE.AdditiveBlending,
                transparent: true
            } )
        }
    }

    var flare = new THREE.Mesh(LensFlare.staticData.geometry, LensFlare.staticData.material);
    flare.position.set(x, y, z);
    this.obj = flare;
}

function GridFloor(x, y, z) {
    if(!GridFloor.staticData) {
        GridFloor.staticData = {
            geometry: new THREE.PlaneBufferGeometry(500, 500),
            material: new THREE.ShaderMaterial( {
                vertexShader:   GridFloor.vertexShader,
                fragmentShader: GridFloor.fragmentShader
            } )
        }
    }
    var mesh = new THREE.Mesh(GridFloor.staticData.geometry, GridFloor.staticData.material);
    mesh.rotation.x = -Math.PI/2;
    mesh.position.set(x, y, z);
    this.obj = mesh;
}

function TronRing(x, y, z) {
    if(!TronRing.staticData) {
        TronRing.staticData = {
            geometry: new THREE.TorusBufferGeometry(5, 1, 8, 40),
            material: getTronMaterial('../textures/tron1.png'),
            rings: []
        }
    }

    var ring = new THREE.Mesh(TronRing.staticData.geometry, TronRing.staticData.material);
    this.obj = new THREE.Object3D();
    this.obj.position.set(x, y, z);
    this.obj.add(ring);

    TronRing.staticData.rings.push(this.obj);
}

TronRing.animate = function(t) {
    TronRing.staticData.rings.forEach(function(r,i) {r.rotation.z = t * ((i % 2) ? 1 : -1)});
}

LightPillar.baseHeight = 20;

function LightPillar(x, y, z) {

    if(!LightPillar.staticData) {
        LightPillar.staticData = {
            geometry: new THREE.CylinderBufferGeometry(3, 3, LightPillar.baseHeight, 32),
            ringMaterial: new THREE.ShaderMaterial( {
                vertexShader:   LightPillar.vertexShader,
                fragmentShader: LightPillar.fragmentShader,
                uniforms: {
                    time:     {value: 1.0 },
                    texture1: {value: texureLoader.load('../textures/tron2.png')}
                },
                transparent: true,
                side: THREE.DoubleSide
            } ),
            beamMaterial: new THREE.MeshBasicMaterial({color: 0xFFFF00}),
            baseMaterial: new THREE.MeshBasicMaterial({color: 0x001020}),
            pillars: []
        }
    }

    this.ring = new THREE.Mesh(LightPillar.staticData.geometry, LightPillar.staticData.ringMaterial);
    this.base = new THREE.Mesh(LightPillar.staticData.geometry, LightPillar.staticData.baseMaterial);
    this.beam = new THREE.Mesh(LightPillar.staticData.geometry, LightPillar.staticData.beamMaterial);
    this.base.scale.set(0.8, 1., 0.8);
    this.beam.scale.set(0.6, 1., 0.6);
    this.base.position.y = LightPillar.baseHeight/2;
    this.beam.position.y = LightPillar.baseHeight/2;
    this.ring.position.y = LightPillar.baseHeight/2 + 2;

    this.obj = new THREE.Object3D();
    this.obj.position.set(x, y, z);
    this.obj.add(this.base);
    this.obj.add(this.beam);
    this.obj.add(this.ring);

    LightPillar.staticData.pillars.push(this);
}

function linstep(t, min, max) {
    return Math.max(0.0, Math.min(1.0, (t - min) / (max - min)));
}

LightPillar.animate = function(t) {
    const speed = 0.5;
    LightPillar.staticData.pillars.forEach(function(p,i) {
        const f = (t * speed * i) % 10;
        p.ring.material.uniforms.time.value = linstep(f, 0, 6);

        var s = linstep(f, 1, 3);
        p.base.scale.y    = s + 0.000001;
        p.base.position.y = s * LightPillar.baseHeight/2;

        var s = linstep(f, 6, 7);
        p.beam.scale.y    = s * 30. + 0.000001;
        p.beam.position.y = s * LightPillar.baseHeight/2 * 30;
    });
}

function getTronMaterial(url, repeat) {
    var texture  = texureLoader.load(url);
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

/* I am using a multi-line functional comment trick for embedding GLSL code legibly.
 *
 *   http://stackoverflow.com/questions/805107/creating-multiline-strings-in-javascript
 */

LensFlare.vertexShader = function() {/*!
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
*/}.getComment();

LensFlare.fragmentShader = function() {/*!
precision mediump float;
varying   vec2    vUv;

float noise(float a) {
   return
     + sin(a *  16.) * 0.12
     - sin(a *   8.) * 0.3
     - sin(a *   4.) * 0.3
     - sin(a *   2.) * 0.3
     - sin(a *   1.) * 0.3
;}

void main()  {
    vec2 uv = (vUv - vec2(0.5, 0.5)) * 2.;

    float a      = atan(uv.x,uv.y);
    float r      = 1. - length(uv);
    float white  = pow(0.05 + 1.0 * r, 2.);
    float purple = pow(0.75 * noise(a), 3.) * r;
    gl_FragColor = pow(r, 3.) * (vec4(1., 1., 1., 1.) * white +
                                 vec4(1., 0., 1., 1.) * purple);
}
*/}.getComment();

GridFloor.vertexShader = function() {/*!
varying vec2 vUv;

void main() {
   vUv         = uv;
   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
*/}.getComment();

GridFloor.fragmentShader = function() {/*!
precision mediump float;
varying   vec2    vUv;

void main()  {
   vec2 uv        = mod(vUv * 25., 1.);
   vec2 thickness = vec2(0.02);
   vec2 blur      = vec2(0.01);
   vec2 g =   smoothstep(0.5 - thickness - blur, 0.5 - thickness,         uv)
            - smoothstep(0.5 + thickness,        0.5 + thickness + blur, uv);
   gl_FragColor = vec4(0., 1., 1., 1.) * (g.x + g.y);
}
*/}.getComment();

LightPillar.vertexShader = function() {/*!
varying vec2 vUv;

void main() {
   vUv         = uv;
   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
*/}.getComment();

LightPillar.fragmentShader = function() {/*!
precision mediump   float;
varying   vec2      vUv;
uniform   float     time;
uniform   sampler2D texture1;

void main()  {
   vec2 uv      = vUv;
   gl_FragColor = texture2D(texture1, vec2(clamp(time, 0., 1.), uv.y));
}
*/}.getComment();