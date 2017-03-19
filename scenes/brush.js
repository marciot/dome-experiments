const domeDiameterInMeters = 10.668;

function setupScene(scene) {
    // Add lights to the scene
    var light = new THREE.AmbientLight( 0x555555 );
    scene.add(light);
    
    var light = new THREE.PointLight( 0xffffff, 1 );
    light.position.set( 10, 15, 20 );
    scene.add(light);
        
    // Advertise the remote control url
    var text = getTextElement("Go to dome.marciot.com/interact on\nyour Android phone to participate.", 12);
    text.position.z = -8;
    text.position.y = 0;
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
    
    this.interact = function(e) {
        dot.position.copy(e.pointing).multiplyScalar(domeDiameterInMeters/2);
        dot.material.color = (e.touchState == "holding") ? holdingColor : participantColor;
        
        if(e.touchState == "holding") {
            addPointToMeshLine(dot.position);
        }
    }
    
    this.animate = function(t) {
    }
    
    /* Create the MeshLine (based on code from https://github.com/spite/THREE.MeshLine/blob/master/demo/js/main-spinner.js) */
    var geo = new Float32Array( 200 * 3 );
    for( var j = 0; j < geo.length; j += 3 ) {
        geo[ j ] = geo[ j + 1 ] = geo[ j + 2 ] = 0;
    }

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
        for( var j = 0; j < geo.length; j+= 3 ) {
            geo[ j ]     = geo[ j + 3 ];
            geo[ j + 1 ] = geo[ j + 4 ];
            geo[ j + 2 ] = geo[ j + 5 ];
        }

        geo[ geo.length - 3 ] = p.x;
        geo[ geo.length - 2 ] = p.y;
        geo[ geo.length - 1 ] = p.z;
        g.setGeometry( geo );
    }
}

function getTextElement(text, scale) {
    const lines      = text.split('\n');
    const fontSizePx = 40;
    const lineSizePx = 50;
    const font       = "Bold " + fontSizePx + "px Arial";
    const fillStyle  = "white";
    
    var canvas    = document.createElement('canvas');
    var ctx       = canvas.getContext('2d');
    ctx.font      = font;
    ctx.fillStyle = fillStyle;
    
    var maxWidth = 0;
    for(var i = 0; i < lines.length; i++) {
        const width = ctx.measureText(lines[i]).width;
        maxWidth = Math.max(width, maxWidth);
    }

    canvas.width  = maxWidth;
    canvas.height = lineSizePx * lines.length;
    ctx.font      = font;
    ctx.fillStyle = fillStyle;
    for(var i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], 0, i * lineSizePx + fontSizePx);
    }
    
    var material = new THREE.MeshBasicMaterial( {
        map:         new THREE.Texture(canvas),
        transparent: true
    });
    material.map.needsUpdate = true;
    var geometry = new THREE.PlaneBufferGeometry(scale, scale * canvas.height/canvas.width);
    var mesh = new THREE.Mesh(geometry, material );
    return mesh;
}