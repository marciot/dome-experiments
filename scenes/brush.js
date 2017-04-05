const domeDiameterInMeters = 10.668;

function setupScene(scene) {
    // Add lights to the scene
    var light = new THREE.AmbientLight( 0x555555 );
    scene.add(light);
    
    var light = new THREE.PointLight( 0xffffff, 1 );
    light.position.set( 10, 15, 20 );
    scene.add(light);
        
    // Advertise the remote control url
    var text = getTextElement("Go to \u201Cdome.marciot.com/interact\u201D on\nyour Android phone to participate.", 0.8);
    text.position.z = -4;
    text.position.y = .65;
    scene.add(text);
    
    // Manage participants
    function createParticipant(e, peer) {
        var participant = new DomeParticipant();
        scene.add(participant.obj);
        return participant;
    }
    function removeParticipant(participant) {
        scene.remove(participant.obj);
    }
    var interact = new DomeInteraction(createParticipant, removeParticipant);
    
    // Animate the participants
    RendererConfig.animationCallback = function(t) {
        interact.animate(t);
    }
}

function DomeParticipant() {
    if(!DomeParticipant.staticData) {
        var loader = new THREE.TextureLoader();
        var stroke = loader.load('../textures/stroke.png');
        DomeParticipant.staticData = {
            geometry: new THREE.SphereBufferGeometry(0.1),
            stroke: stroke
        };
        stroke.wrapS = stroke.wrapT = THREE.RepeatWrapping;
    }
    
    var participantColor = new THREE.Color().setHSL(Math.random(), 1, 0.5);
    var holdingColor = new THREE.Color(0xffffff);
    var material = new THREE.MeshLambertMaterial({color: 0xffff00});
    var dot = new THREE.Mesh(DomeParticipant.staticData.geometry, material);    
    this.obj = new THREE.Object3D();
    this.obj.add(dot);
    
    var lastPos = new THREE.Vector3();
    var lastTouchState;
    this.interact = function(e) {
        dot.position.copy(e.pointing).multiplyScalar(domeDiameterInMeters/2);
        dot.material.color = (e.touchState == "holding") ? holdingColor : participantColor;
        
        if(e.touchState == "holding") {
            if(lastTouchState != "holding") {
                clearMeshLine();
                lastPos.set(0,0,0);
            }
            if(lastPos.distanceTo(dot.position) > 0.05) {
                addPointToMeshLine(dot.position);
                lastPos.copy(dot.position);
            } else {
                shortenVisibleLine(0.5);
            }
        } else {
            shortenVisibleLine(0.5);
        }
        lastTouchState = e.touchState;
    }
    
    this.animate = function(t) {
    }
    
    /* Create the MeshLine (based on code from https://github.com/spite/THREE.MeshLine/blob/master/demo/js/main-spinner.js) */
    var geo = new Float32Array( 200 * 3 );
    var g = new MeshLine();
    g.setGeometry( geo, function( p ) { return p; } );
    
    var lineMaterial = new MeshLineMaterial( {
        useMap: true,
        map: DomeParticipant.staticData.stroke,
        color: participantColor,
        opacity: 1,
        resolution: new THREE.Vector2(2048, 2048),
        sizeAttenuation: false,
        lineWidth: 100,
        near: RendererConfig.camera.near,
        far:  RendererConfig.camera.far,
        depthTest: false,
        blending: THREE.NormalBlending,
        transparent: true,
        repeat: new THREE.Vector2( 1,1 )
    });
    
    var mesh = new THREE.Mesh( g.geometry, lineMaterial );
    mesh.geo = geo;
    mesh.g = g;
    mesh.frustumCulled  = false;
    this.obj.add(mesh);
    
    function addPointToMeshLine(p) {
        g.advance(p);
        lengthenVisibleLine();
    }

    /* The visible length of the line is controlled by changing the
    /* uv offsets to the texture. This is faster than adding or
     * removing points from the MeshLine. */
    var meshLineVisiblePoints = 0;
    function clearMeshLine(p) {
        meshLineVisiblePoints = 0;
    }

    function lengthenVisibleLine() {
        meshLineVisiblePoints = Math.min(geo.length, meshLineVisiblePoints + 1);
        updateMeshLineTexture();
    }

    function shortenVisibleLine(howMuch) {
        meshLineVisiblePoints = Math.max(0, meshLineVisiblePoints - howMuch || 1);
        updateMeshLineTexture();
    }

    function updateMeshLineTexture() {
        if(meshLineVisiblePoints > 1) {
            var startU = (geo.length - meshLineVisiblePoints)/geo.length;
            var rangeU = 1 - startU;
            lineMaterial.uniforms.uvScale.value.set ( 1/rangeU,  1);
            lineMaterial.uniforms.uvOffset.value.set(  -startU,  0);
            lineMaterial.visible = true;
        } else {
            lineMaterial.visible = false;
        }
    }
}