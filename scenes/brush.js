DemoConfig = {
    stroke: {
        nPoints:    200,
        creepSpeed: 0.1
    },
};

include("../libs/meshline/THREE.MeshLine.js");
include("DomeInteraction");

var textureLoader = new THREE.TextureLoader();

function setupScene(scene) {
    // Add lights to the scene
    var light = new THREE.AmbientLight( 0x555555 );
    scene.add(light);
    
    var light = new THREE.PointLight( 0xffffff, 1 );
    light.position.set( 10, 15, 20 );
    scene.add(light);

    var world = domeCentricReferenceFrame(scene);
        
    // Advertise the remote control url
    function displayInteractionUrl(url) {
        var text = getTextElement("Go to \u201C" + url + "\u201D on\nyour smartphone to participate.", 0.8);
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
    var interact = new DomeInteraction(id => new MyParticipant(world), stateChanged);
    
    // Animate the participants
    RendererConfig.animationCallback = function(t) {
        interact.animate(t);
    }
}

class Cursor {
    constructor(scene, color, callback) {
        if(!Cursor.geometry) {
            Cursor.geometry = new THREE.SphereBufferGeometry(0.1);
        }

        var material = new THREE.MeshLambertMaterial({color: color});
        this.dot = new THREE.Mesh(MyParticipant.staticData.geometry, material);
        scene.add(this.dot);

        this.lastPos = new THREE.Vector3();
        this.lastTouchState = null;
    }
    
    update(e) {
        this.dot.position.copy(e.pointing).multiplyScalar(RendererConfig.dome.radius);
        this.dot.material.color = (e.touchState == "holding") ? this.holdingColor : this.participantColor;
        
        if(e.touchState == "holding") {
            if(this.lastTouchState != "holding") {
                this.clearMeshLine();
                this.lastPos.set(0,0,0);
            }
            if(this.lastPos.distanceTo(this.dot.position) > 0.1) {
                this.addPointToMeshLine(this.dot.position);
                this.lastPos.copy(this.dot.position);
            } else {
                this.shortenVisibleLine(DemoConfig.stroke.creepSpeed);
            }
        } else {
            this.shortenVisibleLine(DemoConfig.stroke.creepSpeed);
        }
        this.lastTouchState = e.touchState;
    }
}

class MyParticipant extends DomeParticipant {
    constructor(scene) {
        super();

        this.scene = scene;
        this.obj = new THREE.Object3D();
        scene.add(this.obj);

        if(!MyParticipant.staticData) {
            var stroke = textureLoader.load('../textures/stroke.png');
            MyParticipant.staticData = {
                geometry: new THREE.SphereBufferGeometry(0.1),
                stroke: stroke
            };
            stroke.wrapS = stroke.wrapT = THREE.RepeatWrapping;
        }

        this.participantColor = new THREE.Color().setHSL(Math.random(), 1, 0.5);
        this.holdingColor     = new THREE.Color(0xffffff);

        var material = new THREE.MeshLambertMaterial({color: this.participantColor});
        this.dot = new THREE.Mesh(MyParticipant.staticData.geometry, material);
        this.obj.add(this.dot);

        this.lastPos = new THREE.Vector3();
        this.lastTouchState = null;

        /* Create the MeshLine (based on code from https://github.com/spite/THREE.MeshLine/blob/master/demo/js/main-spinner.js) */
        var geo = new Float32Array( DemoConfig.stroke.nPoints * 3 );
        this.ml = new MeshLine();
        this.ml.setGeometry( geo );
        this.mlVisiblePoints = 0;

        this.lineMaterial = new MeshLineMaterial( {
            useMap:          true,
            map:             MyParticipant.staticData.stroke,
            color:           this.participantColor,
            opacity:         1,
            resolution:      new THREE.Vector2(2048, 2048),
            sizeAttenuation: false,
            lineWidth:       100,
            near:            RendererConfig.camera.near,
            far:             RendererConfig.camera.far,
            depthTest:       false,
            blending:        THREE.NormalBlending,
            transparent:     true,
            repeat:          new THREE.Vector2( 1,1 )
        });

        var mesh = new THREE.Mesh( this.ml.geometry, this.lineMaterial );
        mesh.frustumCulled  = false;
        this.obj.add(mesh);
    }

    disconnected() {
        this.scene.remove(this.obj);
    }

    buttonDown(e) {
        this.dot.material.color = this.holdingColor;
        this.clearMeshLine();
        this.lastPos.set(0,0,0);
    }

    buttonUp(e) {
        this.dot.material.color = this.participantColor;
    }

    pointerMoved(e) {
        this.dot.position.copy(e.pointing).multiplyScalar(RendererConfig.dome.radius);
        if(e.touching && this.lastPos.distanceTo(this.dot.position) > 0.1) {
            this.addPointToMeshLine(this.dot.position);
            this.lastPos.copy(this.dot.position);
        } else {
            this.shortenVisibleLine(DemoConfig.stroke.creepSpeed);
        }
    }

    animate(t, dt) {
    }

    addPointToMeshLine(p) {
        this.ml.advance(p);
        this.lengthenVisibleLine();
    }

    /* The visible length of the line is controlled by changing the
    /* uv offsets to the texture. This is faster than adding or
     * removing points from the MeshLine. */
    clearMeshLine(p) {
        this.mlVisiblePoints = 0;
    }

    lengthenVisibleLine() {
        this.mlVisiblePoints = Math.min(DemoConfig.stroke.nPoints, this.mlVisiblePoints + 1);
        this.updateMeshLineTexture();
    }

    shortenVisibleLine(howMuch) {
        this.mlVisiblePoints = Math.max(0, this.mlVisiblePoints - (howMuch || 1));
        this.updateMeshLineTexture();
    }

    updateMeshLineTexture() {
        if(this.mlVisiblePoints > 1) {
            var startU = (DemoConfig.stroke.nPoints - this.mlVisiblePoints)/DemoConfig.stroke.nPoints;
            var rangeU = 1 - startU;
            this.lineMaterial.uniforms.uvScale.value.set ( 1/rangeU,  1);
            this.lineMaterial.uniforms.uvOffset.value.set(  -startU,  0);
            this.lineMaterial.visible = true;
        } else {
            this.lineMaterial.visible = false;
        }
    }
}