DemoConfig = {
    light: {
        distanceFromDome: 1.0
    },
    
    axe: {
        triggerRadius: 0.5
    }
};

var audioLoader   = new THREE.AudioLoader();
var audioListener = new THREE.AudioListener();
var flashlight, axeHotspot;

function setupScene(scene) {
    // Add lights to the scene
    //var light = new THREE.AmbientLight( 0xffffff, 0.25 );
    //scene.add(light);
    //scene.background = new THREE.Color( 0x00ffff );
    
    var world = domeCentricReferenceFrame(scene);
    var axe;
    
    flashlight = new Flashlight(world);
    world.add(audioListener);
    
    loadDracoDecoder(function dracoReady() {
        // Create the scene objects once the Draco mesh decompressor has been initialized.
        new Mask(world, {
            url: "../models/MASCARA_veneciana_r_ml50k_cl10.drc",
            azimuth: 45,
            sound: "../sounds/238500__madamvicious__female-ghost-crying.wav"
        });
        new Mask(world, {
            url: "../models/African_Mask_ml10k_cl10.drc",
            azimuth: 90,
            sound: "../sounds/379503__juliusmabe__creature-pant-fast.wav"
        });
        new Mask(world, {
            url: "../models/lynxfinal_2.drc",
            azimuth: -10,
            sound: "../sounds/85163__cmusounddesign__jf-cat-purring.wav"
        });
        new Mask(world, {
            url: "../models/Skull_ml50k_cl10.drc",
            azimuth: -75,
            sound: "../sounds/146143__cycro__demon-chant-latin.mp3"
        });
        
        axeHotspot = new Mask(world, {
            azimuth:  -45,
            elevation: 60,
            sound: "../sounds/160047__jorickhoofd__metal-rattle.wav"
        });
        
        axe = new Axe(world, {azimuth:  -45});
    });

    // Advertise the remote control url
    function displayInteractionUrl(url) {
        var text = getTextElement("Go to \u201C" + url + "\u201D on\nyour Android phone to participate.", 0.8);
        text.position.z = -4;
        text.position.y = .65;
        scene.add(text);
    }
    
    // Manage participants
    function stateChanged(state) {
        if(state == 'open') {
            //displayInteractionUrl("dome.marciot.com/interact" + interact.getUrlSuffix());
        }
    }
    var interact = new DomeInteraction(id => new MyParticipant(world), stateChanged);
    
    // Animate the participants
    RendererConfig.animationCallback = function(t, dt) {
        interact.animate(t, dt);
        if(axe) {
            axe.animate(t, dt);
        }
    }
}

var flashlightHolder = null;

class MyParticipant extends DomeParticipant {
    constructor(world) {
        super();
        this.world = world;
    }
    
    disconnected() {
        flashlight.turnOff();
    }
    
    buttonDown(e) {
        flashlightHolder = this;
        flashlight.turnOn();
    }
    
    buttonUp(e) {
        if(this === flashlightHolder) {
            flashlight.turnOff();
        }
    }
    
    pointerMoved(e) {
        if(this === flashlightHolder) {
            flashlight.pointTo(e.pointing);
        }
    }
    
    animate(t, dt) {
    }
}

class Flashlight {
    constructor(scene) {
        const lightDistance = 2.5;
        this.light = new THREE.PointLight(0xffffff, 1, lightDistance, 1);
        this.light.visible = false;
        scene.add(this.light);
        this.scene = scene;
    }
    
    pointTo(directionVector) {
        const d = RendererConfig.dome.radius - DemoConfig.light.distanceFromDome;
        this.light.position.copy(directionVector).multiplyScalar(d);
        if(this.isIlluminated) {
            audioListener.position.copy(this.light.position);
        }
    }
    
    get isIlluminated() {
        return this.light.visible;
    }
    
    turnOn() {
        this.light.visible = true;
    }
    
    turnOff() {
        this.light.visible = false;
    }
    
    getWorldPosition(v) {
        return this.light.getWorldPosition(v);
    }
}

class Model {
    constructor(scene, url, sound) {
        if(url) {
            loadDracoModel(url, this.modelLoaded.bind(this));
        }
        this.representation = new THREE.Object3D();
        scene.add(this.representation);
        if(sound) {
            this.loadSound(sound);
        }
        this.scene = scene;
        this.tmpVector = new THREE.Vector3();
    }
    
    loadSound(url) {
        var sound = new THREE.PositionalAudio(audioListener);
        sound.setMaxDistance( RendererConfig.dome.radius );
        sound.setRolloffFactor(30);
        sound.setRefDistance(2);
        audioLoader.load(url, buffer => {
            sound.setBuffer(buffer);
            sound.setLoop(true);
            sound.play();
        });
        this.sound = sound;
        this.representation.add(sound);
    }

    modelLoaded(bufferGeometry) {
        // Compute the bounding sphere and scale to unit size.
        bufferGeometry.center();
        bufferGeometry.computeBoundingSphere();
        var r = bufferGeometry.boundingSphere.radius;
        bufferGeometry.scale(1/r, 1/r, 1/r);
        
        this.geometry = bufferGeometry;
        this.mesh = new THREE.Mesh(bufferGeometry, new THREE.MeshLambertMaterial({color: 0xff8800}));
        this.representation.add(this.mesh);
    }
    
    get boundingBox() {
        if(!this._boundingBox) {
            // TODO: computeBoundingBox does not work on MeshBufferGeometry, this probably needs
            // to be reported as a bug.
            //bufferGeometry.computeBoundingBox();
            this._boundingBox = new THREE.Box3();
            this._boundingBox.setFromBufferAttribute( this.geometry.attributes.position );
        }
        return this._boundingBox;
    }
        
    get illuminated() {
        // Convert the flashlight coordinates to the local reference frame
        flashlight.getWorldPosition(this.tmpVector);
        this.sound.worldToLocal(this.tmpVector);
        
        var d = this.tmpVector.length();
        var r = Math.sqrt(d*d - DemoConfig.light.distanceFromDome*DemoConfig.light.distanceFromDome);
        return r < DemoConfig.axe.triggerRadius;
    }
    
    startSound() {
        if(!this.sound.isPlaying) {
            this.sound.play();
        }
    }
    
    stopSound() {
        if(this.sound.isPlaying) {
            this.sound.stop();
        }
    }
}

class Mask extends Model {
    constructor(scene, attr) {
        super(scene, attr.url, attr.sound);
        this.azimuth   = attr.azimuth   || 0;
        this.elevation = attr.elevation || 0;
        
        positionOnDome(this.representation, this.azimuth, this.elevation, 0);
    }
        
    modelLoaded(bufferGeometry) {
        super.modelLoaded(bufferGeometry);
        
        const scale = 2;
        this.mesh.scale.set(scale, scale, scale);
        
        // Use the small angle approximation to extimate how much to add
        // to the elevation so that the mask sits on the rim of the dome.
        const height = (this.boundingBox.max.y - this.boundingBox.min.y)*scale;
        const hToElevation = height / RendererConfig.dome.radius / 2;
        
        positionOnDome(this.representation, this.azimuth, this.elevation + hToElevation / Math.PI * 180, 0);
    }
}

class Axe extends Model {
    constructor(scene, attr) {
        super(scene, "../models/zheng3_battleaxe_hairstick.drc");
        
        this.representation.rotation.y = Math.PI/180 * attr.azimuth;
        
        // Axe gets it's own light source near the center of the scene
        var light = new THREE.PointLight( 0xffffff, 1, 0.4, 1);
        this.representation.add(light);
        
        this.t = 0;
    }
    
    modelLoaded(bufferGeometry) {
        super.modelLoaded(bufferGeometry);
        this.mesh.position.set(0, 1, -0.2);
    }
    
    animate(t, dt) {
        if(this.mesh) {
            const cosine   = Math.cos(this.t);
            const midswing = cosine < 0.5;
            if(midswing || axeHotspot.illuminated) {
                this.t += dt;
                axeHotspot.startSound();
            } else {
                this.t = 0;
                axeHotspot.stopSound();
            }
            
            // This formula swings the axe back and forth.
            this.mesh.rotation.z = Math.PI/2 * (1 - cosine);
        }
    }
}