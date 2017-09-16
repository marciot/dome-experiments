EarthConfig = {
    axisTilt:         23.5,
    sphericalDisplay: true    // Set to false for dome theater
}

function setupScene(scene) {
    alert("Blue Marble imagery courtesy http://visibleearth.nasa.gov");

    var texureLoader = new THREE.TextureLoader();
    var geometry = new THREE.SphereGeometry( 10, 40, 40 );
    geometry.rotateX(90 * degreesToRadians);
    
    var earth = new THREE.Object3D();
    scene.add(earth);
    
    /* Since the DomeRenderer puts us inside a dome, we render the Earth as a
       large sphere all around us, with us standing at the center viewing the
       Earth from within */
    var surface = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        map:    texureLoader.load('../textures/bluemarble/land_shallow_topo_2048.jpg')
    }));
    earth.add(surface);
    
    /* The cloud layer is rendered as a shell that is slightly smaller than the
       outer Earth layer, using an additive blend to overlay the clouds on land */
    var clouds = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        map:         texureLoader.load('../textures/bluemarble/cloud_combined_2048.jpg'),
        transparent: true,
        blending:    THREE.AdditiveBlending
    }));
    clouds.scale.set(0.9, 0.9, 0.9);
    surface.add(clouds);
    
    /* Because we are viewing from within, the continents appear reversed.
       An easy trick is to scale by -1 in the X axis. */
    surface.scale.x = -1;
    
    // Stand the globe up on end.
    earth.rotation.y = EarthConfig.axisTilt * degreesToRadians;

    RendererConfig.animationCallback = function(t) {
        surface.rotation.z =   0.1 * t;
        clouds.rotation.z  = -0.01 * t;
    }
    
    // Advertise the remote control url
    function displayInteractionUrl(url) {
        var text = getTextElement("Go to \u201C" + url + "\u201D on\nyour Android phone to interact.", 0.5);
        text.position.z = -4;
        text.position.y = .65;
        scene.add(text);
    }
    
    // Manage participants
    function stateChanged(state) {
        if(state == 'open') {
            displayInteractionUrl("dome.marciot.com/interact" + interact.getUrlSuffix());
        }
    }
    var interact = new DomeInteraction(id => new MyParticipant(earth, clouds), stateChanged);
}

var controllingParticipant = null;

class MyParticipant extends DomeParticipant {
    constructor(earth, clouds) {
        super();
        this.earth  = earth;
        this.clouds = clouds;
        controllingParticipant = this;
    }

    disconnected() {
    }

    buttonDown(e) {
        controllingParticipant = this;
        this.clouds.visibility = !this.clouds.visibility;
    }

    buttonUp(e) {
    }

    pointerMoved(e) {
        if(this !== controllingParticipant) {
            return;
        }
        // This is needed otherwise everything is topsy turvy...
        e.pointing.y *= -1;
        e.pointing.z *= -1;
        this.earth.lookAt(e.pointing)
    }

    animate(t, dt) {
    }
}