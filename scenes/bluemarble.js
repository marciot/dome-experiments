var texureLoader = new THREE.TextureLoader();

function setupScene(scene) {
    alert("Blue Marble imagery courtesy http://visibleearth.nasa.gov");
    
    var geometry = new THREE.SphereGeometry( 10, 40, 40 );
    
    var globe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        map: texureLoader.load('../textures/bluemarble/land_shallow_topo_2048.jpg'),
        side: THREE.BackSide
    }));
    scene.add(globe);
    
    var clouds = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        map: texureLoader.load('../textures/bluemarble/cloud_combined_2048.jpg'),
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending
    }));
    clouds.scale.set(0.9, 0.9, 0.9);
    globe.add(clouds);
    
    // Stand the globe up on end.
    globe.rotation.x = Math.PI/2;

    RendererConfig.animationCallback = function(t) {
        globe.rotation.y  = 0.1  * t;
        clouds.rotation.y = 0.01 * t;
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
    var interact = new DomeInteraction(id => new MyParticipant(globe, clouds), stateChanged);
}

class MyParticipant extends DomeParticipant {
    constructor(globe, clouds) {
        super();
        this.globe  = globe;
        this.clouds = clouds; 
    }

    disconnected() {
    }

    buttonDown(e) {
        this.clouds.visibility = !this.clouds.visibility;
    }

    buttonUp(e) {
    }

    pointerMoved(e) {
        this.globe.lookAt(e.pointing)
    }

    animate(t, dt) {
    }
}