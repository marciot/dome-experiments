/* This is my attempt to recreate Purp Cycle in real-time THREE.js
 * and GLSL
 *
 * Based on:
 *
 *  Daniel Arnett's, "Spherible - Purp Cycle" (https://vimeo.com/97887646)
 *  Beeple's "purpcycle (loop)"               (https://vimeo.com/85265188)
 */
TronWorld = {
    bounds: {
        x:        100,
        z:        500
    },
    animateWithin: {
        zMax:     150,
        xMax:     100
    },
    separation: {
        rings:    101,
        pillars:    7,
        orbs:      13,
    },
    maxDiameter: {
        ring:       5,
        pillar:    15,
        orb:       25
    },
    corridorWidth: 5.5,
    motionSpeed:   20,
    darkColor:     0x002040,
    pillarRatio:  5
};

var texureLoader = new THREE.TextureLoader();

function setupScene(scene) {
    // The scene lighting.
    var light = new THREE.AmbientLight( 0x555555 );
    scene.add(light);
    
    var light = new THREE.PointLight( 0xffffff, 1 );
    light.position.set( 10, 15, 20 );
    scene.add(light);
    
    scene.fog = new THREE.FogExp2(0x000000, 0.002);

    var animatedObjects = [];
    var tronLayout = new TronLayout(animatedObjects);

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
        tronLayout.chooseUnoccupiedLocationAndSize(pillar.obj, TronWorld.maxDiameter.pillar);
        scene.add(pillar.obj);
        animatedObjects.push(pillar);
    }

    /* The land orbs */
    var orb;
    for(var z = -TronWorld.bounds.z; z < TronWorld.bounds.z; z += TronWorld.separation.orbs) {
        orb = new LandOrb(0, 0, z);
        tronLayout.chooseUnoccupiedLocationAndSize(orb.obj, TronWorld.maxDiameter.orb);
        scene.add(orb.obj);
        animatedObjects.push(orb);
    }

    var credit = getTextElement("\u201CPurp Cycle\u201D Remade\nReal-time animation in THREE.js", 2);
    credit.position.z = -3;
    credit.position.y = -0.75;
    RendererConfig.camera.rig.add(credit);

    RendererConfig.animationCallback = function(t) {
        var cameraZ = -t * TronWorld.motionSpeed;
        RendererConfig.camera.rig.position.z = cameraZ;
        for(var i = 0; i < animatedObjects.length; i++) {
            animatedObjects[i].animate(t, cameraZ);
        }
        flare.animate(t);
    }
}

// This arranges objects horizontally so it does not overlap with other objects.
function TronLayout(animatedObjects) {
    var range = {min: TronWorld.corridorWidth/2 + 2, max: TronWorld.animateWithin.xMax};
    var pos = new THREE.Vector3();
    var tmp = new THREE.Vector3();

    this.chooseUnoccupiedLocationAndSize = function(obj, maxDiameter) {
        do {
            const sign  = Math.random() < 0.5 ? -1 : 1;
            pos.set(
                (range.min + Math.random() * (range.max - range.min)) * sign,
                0,
                obj.position.z
            );

            // Compute distance from all other objects
            var dist = Infinity;
            for(var i = 0; i < animatedObjects.length; i++) {
                const other = animatedObjects[i];
                const p = other.obj.position;
                const s = other.obj.scale;
                const otherRadius = Math.sqrt(s.x*s.x + s.z*s.z);
                const distanceFromOther = tmp.copy(pos).sub(p).length();
                dist = Math.max(0, Math.min(distanceFromOther - otherRadius, dist));
            }

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
}

/* Returns a time value which is zero when the object becomes
/* visible in the perhiphery. This ensures that interesting
/* animations happen when they can be seen. */
function animationTime(obj, cameraZ) {
    return -(cameraZ - obj.position.z - Math.abs(obj.position.x));
}

/* Checks to see if an object needs to be brought forward
 * once it reaches the end of the world. */
function loopBack(obj, cameraZ, r) {
    const range = r || TronWorld.bounds.z;
    if(obj.position.z - cameraZ > range) {
        obj.position.z -= range * 2;
    }
}

function LensFlare(x, y, z) {
    if(!LensFlare.staticData) {
        LensFlare.staticData = {
            geometry: new THREE.PlaneBufferGeometry(1, 1),
            material: new THREE.ShaderMaterial( {
                vertexShader:   LensFlare.vertexShader,
                fragmentShader: LensFlare.fragmentShader,
                depthTest: false,
                blending: THREE.AdditiveBlending,
                transparent: true,
                uniforms: {
                    time: {value: 1.0 }
                },
            } )
        }
    }
    var flare = new THREE.Mesh(
        LensFlare.staticData.geometry,
        LensFlare.staticData.material
    );
    flare.position.set(x, y, z);
    this.obj = flare;
}

LensFlare.prototype.animate = function(t) {
    this.obj.material.uniforms.time.value = t;
}

function GridFloor(x, y, z) {
    if(!GridFloor.staticData) {
        GridFloor.staticData = {
            geometry: new THREE.PlaneBufferGeometry(500, 500),
            material: new THREE.ShaderMaterial( {
                vertexShader:   GridFloor.vertexShader,
                fragmentShader: GridFloor.fragmentShader,
                uniforms: {
                    // This causes the grid floor to fade in the
                    // distance to avoid specking.
                    far:     {value: 100},
                    color:   {value: new THREE.Color(TronWorld.darkColor)}
                }
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
    const tubeDia = 1/5;
    const shoeDia = 1/25;
    const bothDia = tubeDia + shoeDia;
    if(!TronRing.staticData) {
        TronRing.staticData = {
            glowGeometry: new THREE.TorusBufferGeometry(1,       tubeDia       , 32, 40),
            bodyGeometry: new THREE.TorusBufferGeometry(1,       tubeDia * 0.95,  8, 40),
        }
        // Make combined geometry for left and right "shoe"
        var combinedGeometry = new THREE.Geometry();
        var geo  = new THREE.TorusGeometry(bothDia, shoeDia, 32, 40);
        var shoe = new THREE.Mesh(geo);
        shoe.position.x = -1;
        shoe.position.y = shoeDia;
        shoe.rotation.x = Math.PI/2;
        combinedGeometry.mergeMesh(shoe);
        shoe.position.x = 1;
        combinedGeometry.mergeMesh(shoe);
        TronRing.staticData.shoeGeometry = new THREE.BufferGeometry().fromGeometry(combinedGeometry);
    }
    this.body = new THREE.Mesh(TronRing.staticData.bodyGeometry, getBodyMaterial(4));
    this.ring = new THREE.Mesh(TronRing.staticData.glowGeometry, getGlowDecal());
    this.ring.add(this.body);
    this.obj = new THREE.Mesh(TronRing.staticData.shoeGeometry, getGlowMaterial());
    this.obj.add(this.ring);
    this.obj.position.set(x, y, z);
    this.obj.scale.set(TronWorld.maxDiameter.ring, TronWorld.maxDiameter.ring, TronWorld.maxDiameter.ring);
    this.turnDirection = ((i % 2) ? 1 : -1);
}

TronRing.prototype.animate = function(t, cameraZ) {
    this.ring.rotation.z = t * this.turnDirection;
    loopBack(this.obj, cameraZ);
}

function LightPillar(x, y, z) {
    if(!LightPillar.staticData) {
        LightPillar.staticData = {
            geometry: new THREE.CylinderBufferGeometry(1, 1, TronWorld.pillarRatio, 32, 1, true),
            texture: texureLoader.load('../textures/tron2.png')
        }
    }

    this.beam = new THREE.Mesh(LightPillar.staticData.geometry, getBeamMaterial());
    this.obj = new THREE.Object3D();
    this.obj.add(this.beam);
    this.obj.position.set(x, y, z);

    this.style = Math.ceil(Math.random() * 2);
    if(this.style === 1) {
        /* Each pillar must have a separate material because the different
         * pillars have a different time constant */
        var ringsMaterial = new THREE.ShaderMaterial( {
            vertexShader:   LightPillar.vertexShader,
            fragmentShader: LightPillar.fragmentShader,
            uniforms: {
                time:     {value: 1.0 },
                texture1: {value: LightPillar.staticData.texture}
            },
            transparent: true,
            side: THREE.DoubleSide
        } );
        this.base = new THREE.Mesh(LightPillar.staticData.geometry, getPillarMaterial());
        this.ring  = new THREE.Mesh(LightPillar.staticData.geometry, ringsMaterial);
        this.obj.add(this.base);
        this.obj.add(this.ring);
        this.base.scale.set(0.8, 1., 0.8);
        this.beam.scale.set(0.6, 1., 0.6);
        this.setHeight(this.beam, 1);
        this.setHeight(this.ring, 1.1);
        this.setHeight(this.base, 1);
        this.animationOffset = Math.random() * TronWorld.animateWithin.zMax;
    } else {
        this.disc = new GroundDisc(this.obj, 1.5);
        this.beam.scale.set(0.25, 1., 0.25);
        this.setHeight(this.beam, 50);
        this.animationOffset = Math.random() * 25;
    }
}

function linstep(t, min, max) {
    return Math.max(0.0, Math.min(1.0, (t - min) / (max - min)));
}

LightPillar.prototype.setHeight = function(obj, h) {
    obj.scale.y    = h + 0.0001;
    obj.position.y = h * TronWorld.pillarRatio/2;
}

LightPillar.prototype.setBeamThickness = function(t) {
    this.beam.scale.x = this.beam.scale.z = t * 0.25 + 0.0001;
    this.setHeight(this.beam, t > 0.01 ? 50 : 0.001);
}

LightPillar.prototype.animate = function(t, cameraZ) {
    loopBack(this.obj, cameraZ);
    const speed = 0.05;
    const f = animationTime(this.obj, cameraZ - this.animationOffset) * speed;
    if(this.style === 1) {
        this.ring.material.uniforms.time.value = linstep(f, -5, 0);
        this.setHeight(this.base, linstep(f, -2, 0));
        this.setHeight(this.beam, linstep(f,  0, 4) * 50);
    } else {
        this.disc.animate(linstep(f, -5, 2));
        this.setBeamThickness(linstep(f, -0.5, 4));
    }
}

function LandOrb(x, y, z) {
    if(!LandOrb.staticData) {
        LandOrb.staticData = {
            geometry: new THREE.SphereBufferGeometry(1, 32, 6, 0, Math.PI*2, 0, Math.PI/2),
            texture:  texureLoader.load('../textures/tron3.png')
        }
    }

    /* Each orb must have a separate material because the different
     * orbs have a different time constant */
    var ringsMaterial = new THREE.ShaderMaterial( {
        vertexShader:   LandOrb.vertexShader,
        fragmentShader: LandOrb.fragmentShader,
        uniforms: {
            time:     {value: 1.0 },
            texture1: {value: LandOrb.staticData.texture}
        },
        transparent: true,
        side: THREE.DoubleSide
    } );

    this.obj  = new THREE.Mesh(LandOrb.staticData.geometry, ringsMaterial);
    this.body = new THREE.Mesh(LandOrb.staticData.geometry, getBodyMaterial());
    this.body.scale.set(0.9, 0.9, 0.9);
    this.obj.add(this.body);
    this.obj.position.set(x, y, z);
    this.animationOffset = Math.random() * TronWorld.animateWithin.zMax;
}

LandOrb.prototype.animate = function(t, cameraZ) {
    loopBack(this.obj, cameraZ);
    const speed = 0.1;
    const f = animationTime(this.obj, cameraZ - this.animationOffset) * speed;
    this.body.position.y                  = linstep(f, 0, 4) - 1;
    this.obj.material.uniforms.time.value = linstep(f, -2, 4);
}

function GroundDisc(obj, scale) {
    if(!GroundDisc.staticData) {
        GroundDisc.staticData = {
            geometry: new THREE.PlaneBufferGeometry( 2, 2 ),
            texture:  texureLoader.load('../textures/tron5.png')
        }
    }

    /* Each disc must have a separate material because the different
     * disc have a different time constant */
    var discMaterial = new THREE.ShaderMaterial( {
        vertexShader:   GroundDisc.vertexShader,
        fragmentShader: GroundDisc.fragmentShader,
        uniforms: {
            time:     {value: 1.0 },
            texture1: {value: GroundDisc.staticData.texture}
        },
        transparent: true
    } );

    this.obj = new THREE.Mesh(GroundDisc.staticData.geometry, discMaterial);
    this.obj.rotation.x = -Math.PI/2;
    this.obj.position.y = 0.01;
    this.obj.scale.set(scale, scale, 1.);
    obj.add(this.obj);
}

GroundDisc.prototype.animate = function(t) {
    this.obj.material.uniforms.time.value = t;
}

function getGlowDecal() {
    if(!this.glowDecal) {
        var emissiveMap  = texureLoader.load('../textures/tron1.png');
        this.glowDecal = new THREE.MeshLambertMaterial({
            map:         emissiveMap,
            emissiveMap: emissiveMap,
            emissive:    0xFFFFFF,
            transparent: true,
        });
    }
    return this.glowDecal;
}

function getPillarMaterial() {
    if(!this.pillarMaterial) {
        this.pillarMaterial = new THREE.MeshPhongMaterial({
            color:       TronWorld.darkColor,
            normalMap:   getNormalMap(),
            emissiveMap: texureLoader.load('../textures/tron7.png'),
            emissive:    0xFFFFFF
        });
    }
    return this.pillarMaterial;
}

function getBodyMaterial(repeatU) {
    if(!this.bodyMaterial) {
        this.bodyMaterial = new THREE.MeshPhongMaterial({
            color:       TronWorld.darkColor,
            normalMap:   getNormalMap(repeatU),
            emissiveMap: getEmmisiveMap(),
            emissive: 0xFFFFFF
        });
    }
    return this.bodyMaterial;
}

function getGlowMaterial() {
    if(!this.glowMaterial) {
        this.glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF
        });
    }
    return this.glowMaterial;
}

function getBeamMaterial() {
    if(!this.beamMaterial) {
        this.beamMaterial = new THREE.MeshBasicMaterial({color: 0xFFFF00, fog: true});
    }
    return this.beamMaterial;
}

function getNormalMap(repeatU) {
    if(!this.normalMap) {
        var normalMap = texureLoader.load('../textures/tron4.png');
        normalMap.wrapS = THREE.RepeatWrapping;
        normalMap.wrapT = THREE.RepeatWrapping;
        normalMap.repeat.set(repeatU || 1.5, 1.5);
        this.normalMap = normalMap;
    }
    return this.normalMap;
}

function getEmmisiveMap(repeat) {
    if(!this.emissiveMap) {
        this.emissiveMap = texureLoader.load('../textures/tron6.png');
        this.emissiveMap.wrapS = THREE.RepeatWrapping;
        this.emissiveMap.wrapT = THREE.RepeatWrapping;
    }
    return this.emissiveMap;
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
precision lowp    float;
varying   vec2    vUv;
uniform   float   time;

float noise(float a) {
   return
     + sin(a *  16. + time) * 0.12
     - sin(a *   8. + time) * 0.3
     - sin(a *   4. + time) * 0.3
     - sin(a *   2.       ) * 0.3
     - sin(a *   1.       ) * 0.3
;}

void main()  {
    vec2 uv      = (vUv - vec2(0.5, 0.5)) * 2.;
    float a      = atan(uv.x,uv.y);
    float white  = 1. - length(uv);
    float purple = white * pow(noise(a), 3.);
    gl_FragColor = vec4(1., 1., 1., 1.) * white +
                   vec4(1., 0., 1., 1.) * purple;
}
*/}.getComment();

GridFloor.vertexShader = function() {/*!
uniform   float   far;
varying   float   depth;
varying   vec2    vUv;

void main() {
   vUv         = uv;
   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

   // http://stackoverflow.com/questions/6408851/draw-the-depth-value-in-opengl-using-shaders
   depth = 1. - gl_Position.z / far;
}
*/}.getComment();

GridFloor.fragmentShader = function() {/*!
precision highp   float;
varying   vec2    vUv;
varying   float   depth;
uniform   vec3    color;

void main()  {
   vec2 uv        = mod(vUv * 25., 1.) - vec2(0.5,0.5);
   vec2 thickness = vec2(0.01);
   vec2 blur      = vec2(0.005);
   vec2 g =   smoothstep(- thickness - blur, - thickness,        uv)
            - smoothstep(+ thickness,        + thickness + blur, uv);
   gl_FragColor = vec4(mix(color, vec3(0., 1., 1.), (g.x + g.y)) * depth, 1.);
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
precision lowp      float;
varying   vec2      vUv;
uniform   float     time;
uniform   sampler2D texture1;

void main()  {
   gl_FragColor = texture2D(texture1, vec2(time, vUv.y));
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
precision lowp      float;
varying   vec2      vUv;
uniform   float     time;
uniform   sampler2D texture1;

void main()  {
   gl_FragColor = texture2D(texture1, vec2(vUv.x * 0.25 + time * 0.75, vUv.y));
}
*/}.getComment();

GroundDisc.vertexShader = function() {/*!
varying vec2 vUv;

void main() {
   vUv         = uv;
   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
*/}.getComment();

GroundDisc.fragmentShader = function() {/*!
precision lowp      float;
varying   vec2      vUv;
uniform   float     time;
uniform   sampler2D texture1;

void main()  {
   vec2 uv      = (vUv - vec2(0.5, 0.5)) * 2.;
   gl_FragColor = texture2D(texture1, vec2(time, length(uv)));
}
*/}.getComment();