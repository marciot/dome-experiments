/* This is my attempt to recreate Spherible - Purp Cycle in code.
 * The original video is here:
 *
 *    https://vimeo.com/97887646
 */

var animatedObjects = [];

TronWorld = {
    bounds: {
        x:        100,
        z:        500
    },
    animateWithin: {
        zMin:      50,
        zMax:     200,
        xMax:     100
    },
    separation: {
        rings:    100,
        pillars:   25,
        orbs:      35,
    },
    maxDiameter: {
        ring:       5,
        pillar:     3,
        orb:       15
    },
    corridorWidth: 5.5,
    motionSpeed:   20,
    darkColor:     0x002040
};

function setupScene(scene) {
    // The scene lighting.
    var light = new THREE.AmbientLight( 0x555555 );
    scene.add(light);
    
    var light = new THREE.PointLight( 0xffffff, 1 );
    light.position.set( 10, 15, 20 );
    scene.add(light);
    
    scene.fog = new THREE.FogExp2(0x000000, 0.002);

    /* The lens flare. We attach the flare to the camera rig,
     * so that the flare moves with the camera. */
    var flare = new LensFlare(0, 0, -2);
    RendererConfig.camera.rig.add( flare.obj );

    /* The floor. */
    var floor = new GridFloor(0, 0, 0);
    scene.add(floor.obj);
    animatedObjects.push(floor);
    
    /* The rings. I position the rings at eye level so the flare
     * (which is closer to the camera) lines up with the rings */
    for(var z = -TronWorld.bounds.z, i = 0; z < TronWorld.bounds.z; z += TronWorld.separation.rings, i++) {
        var ring = new TronRing(0, 0, z, i);
        scene.add(ring.obj);
        animatedObjects.push(ring);
    }

    /* The light pillars */
    var pillar;
    for(var z = -TronWorld.bounds.z; z < TronWorld.bounds.z; z += TronWorld.separation.pillars) {
        pillar = new LightPillar(20, 0, z);
        chooseUnoccupiedLocationAndSize(pillar.obj, TronWorld.maxDiameter.pillar);
        scene.add(pillar.obj);
        animatedObjects.push(pillar);
    }

    /* The land orbs */
    var orb;
    for(var z = -TronWorld.bounds.z; z < TronWorld.bounds.z; z += TronWorld.separation.orbs) {
        orb = new LandOrb(0, 0, z);
        chooseUnoccupiedLocationAndSize(orb.obj, TronWorld.maxDiameter.orb);
        scene.add(orb.obj);
        animatedObjects.push(orb);
    }

    RendererConfig.animationCallback = function(t) {
        var cameraZ = -t * TronWorld.motionSpeed;
        RendererConfig.camera.rig.position.z = cameraZ;
        animatedObjects.forEach(function(obj) {
            obj.animate(t, cameraZ);
        });
    }
}

var texureLoader = new THREE.TextureLoader();

function chooseUnoccupiedLocationAndSize(obj, maxDiameter) {
    do {
        const range = {min: TronWorld.corridorWidth/2 + 2, max: TronWorld.animateWithin.xMax};
        const sign  = Math.random() < 0.5 ? -1 : 1;

        const pos   = new THREE.Vector3(
            (range.min + Math.random() * (range.max - range.min)) * sign,
            0,
            obj.position.z
        );

        var dist = Infinity;
        var tmp  = new THREE.Vector3();

        // Compute distance from all other objects
        animatedObjects.forEach(function(other) {
            const p = other.obj.position;
            const s = other.obj.scale;
            const otherRadius = Math.sqrt(s.x*s.x + s.z*s.z);

            const distanceFromOther = tmp.copy(pos).sub(p).length();
            dist = Math.max(0, Math.min(distanceFromOther - otherRadius, dist));
        });

        // Compute distance from "corridor", which we want to leave open
        const distanceFromCorridor = Math.abs(pos.x) - TronWorld.corridorWidth;
        dist = Math.min(distanceFromCorridor, dist);

        // The distance tells us the maximum size the object can be
        // before it overlaps something else.
        var scale = Math.min(maxDiameter/2, dist);
        obj.position.copy(pos);
        obj.scale.set(scale, scale, scale);
    } while(scale == 0);
}

function loopBack(obj, cameraZ, r) {
    const range = r || TronWorld.bounds.z;
    if(obj.position.z - cameraZ > range) {
        obj.position.z = cameraZ - range;
        return true;
    }
}

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
            }),
        }
    }
    var mesh = new THREE.Mesh(GridFloor.staticData.geometry, GridFloor.staticData.material);
    mesh.rotation.x = -Math.PI/2;
    mesh.position.set(x, y, z);
    this.obj = mesh;
}

GridFloor.prototype.animate = function(t, cameraZ) {
    loopBack(this.obj, cameraZ, 100);
}

function TronRing(x, y, z, i) {
    if(!TronRing.staticData) {
        TronRing.staticData = {
            geometry: new THREE.TorusBufferGeometry(1, 1/5, 8, 40),
            material: getTronMaterial('../textures/tron1.png')
        }
    }

    var ring = new THREE.Mesh(TronRing.staticData.geometry, TronRing.staticData.material);
    this.obj = new THREE.Object3D();
    this.obj.position.set(x, y, z);
    this.obj.add(ring);
    this.obj.scale.set(TronWorld.maxDiameter.ring, TronWorld.maxDiameter.ring, TronWorld.maxDiameter.ring);
    this.direction = ((i % 2) ? 1 : -1);
}

TronRing.prototype.animate = function(t, cameraZ) {
    this.obj.rotation.z = t * this.direction;
    loopBack(this.obj, cameraZ);
}

LightPillar.baseHeight = 20;

function LightPillar(x, y, z) {
    if(!LightPillar.staticData) {
        LightPillar.staticData = {
            geometry: new THREE.CylinderBufferGeometry(3, 3, LightPillar.baseHeight, 32, 1, true),
            beamMaterial: new THREE.MeshBasicMaterial({color: 0xFFFF00, fog: true}),
            baseMaterial: new THREE.MeshLambertMaterial({color: TronWorld.darkColor})
        }
    }

    /* Each pillar must have a separate material because the different
     * pillars have a different time constant */
    var ringMaterial = new THREE.ShaderMaterial( {
        vertexShader:   LightPillar.vertexShader,
        fragmentShader: LightPillar.fragmentShader,
        uniforms: {
            time:     {value: 1.0 },
            texture1: {value: texureLoader.load('../textures/tron2.png')}
        },
        transparent: true,
        side: THREE.DoubleSide
    } );

    this.ring = new THREE.Mesh(LightPillar.staticData.geometry, ringMaterial);
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
    this.animationZ = TronWorld.animateWithin.zMin + Math.random() * (TronWorld.animateWithin.zMax - TronWorld.animateWithin.zMin);
}

function linstep(t, min, max) {
    return Math.max(0.0, Math.min(1.0, (t - min) / (max - min)));
}

LightPillar.prototype.animate = function(t, cameraZ) {
    if(loopBack(this.obj, cameraZ)) {
        chooseUnoccupiedLocationAndSize(this.obj, TronWorld.maxDiameter.pillar);
    }

    const speed = 0.05;
    const f = (this.obj.position.z - cameraZ + this.animationZ) * speed;

    this.ring.material.uniforms.time.value = linstep(f, 0, 6);

    var s = linstep(f, 1, 3);
    this.base.scale.y    = s + 0.000001;
    this.base.position.y = s * LightPillar.baseHeight/2;

    var s = linstep(f, 6, 7);
    this.beam.scale.y    = s * 50. + 0.000001;
    this.beam.position.y = s * LightPillar.baseHeight/2 * 50;
}

function LandOrb(x, y, z) {
    if(!LandOrb.staticData) {
        LandOrb.staticData = {
            geometry: new THREE.SphereBufferGeometry(1, 32, 6, 0, Math.PI*2, 0, Math.PI/2),
            bodyMaterial: new THREE.MeshLambertMaterial({color: TronWorld.darkColor})
        }
    }

    /* Each orb must have a separate material because the different
     * orbs have a different time constant */
    var ringMaterial = new THREE.ShaderMaterial( {
        vertexShader:   LandOrb.vertexShader,
        fragmentShader: LandOrb.fragmentShader,
        uniforms: {
            time:     {value: 1.0 },
            texture1: {value: texureLoader.load('../textures/tron3.png')}
        },
        transparent: true,
        side: THREE.DoubleSide
    } );

    this.body = new THREE.Mesh(LandOrb.staticData.geometry, LandOrb.staticData.bodyMaterial);
    this.ring = new THREE.Mesh(LandOrb.staticData.geometry, ringMaterial);
    this.body.scale.set(0.9, 0.9, 0.9);

    this.obj = new THREE.Object3D();
    this.obj.position.set(x, y, z);
    this.obj.add(this.body);
    this.obj.add(this.ring);
    this.animationZ = TronWorld.animateWithin.zMin + Math.random() * (TronWorld.animateWithin.zMax - TronWorld.animateWithin.zMin);
}

LandOrb.prototype.animate = function(t, cameraZ) {
    if(loopBack(this.obj, cameraZ)) {
        chooseUnoccupiedLocationAndSize(this.obj, TronWorld.maxDiameter.orb);
    }

    const speed = 0.1;
    const f = (this.obj.position.z - cameraZ + this.animationZ) * speed;
    var s = linstep(f, 2, 6);
    this.body.position.y = -1 + s;
    this.ring.material.uniforms.time.value = linstep(f, 0, 6);
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
        color:       TronWorld.darkColor,
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

LandOrb.vertexShader = function() {/*!
varying vec2 vUv;

void main() {
   vUv         = uv;
   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
*/}.getComment();

LandOrb.fragmentShader = function() {/*!
precision mediump   float;
varying   vec2      vUv;
uniform   float     time;
uniform   sampler2D texture1;

void main()  {
   vec2 uv      = vUv;
   gl_FragColor = texture2D(texture1, vec2(uv.x * 0.25 + clamp(time, 0., 1.) * 0.75, uv.y));
}
*/}.getComment();