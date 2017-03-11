var boxes = [];

function sphericalCoordinatesToPosition(position, azimuth, elevation, distance) {
    // TODO: check if this is correct, or whether the rendering is upside-down
    var inclination = -elevation - 90;
    
    // Convert to radians from degrees
    inclination *= Math.PI / 180;
    azimuth     *= Math.PI / 180;
    
    // https://en.wikipedia.org/wiki/Spherical_coordinate_system
    position.x = distance * Math.sin(inclination) * Math.cos(azimuth);
    position.z = distance * Math.sin(inclination) * Math.sin(azimuth);
    position.y = distance * Math.cos(inclination);
}

function setupScene(scene) {
    var light = new THREE.AmbientLight( 0x555555 );
    scene.add(light);
    
    var light = new THREE.PointLight( 0xffffff, 1 );
    light.position.set( 10, 15, 20 );
    scene.add(light);
  
    var geometry = new THREE.BoxGeometry( 10, 10, 10 );
    var material = new THREE.MeshLambertMaterial( {color: 0x00ff00} );

    for(var el = 0; el < 80; el += 20) {
        for(var az = 0; az < 360; az += 30) {
            var box = new THREE.Mesh(geometry, material);
            sphericalCoordinatesToPosition(box.position, az, el, 100);
            scene.add(box);
            boxes.push(box);
        }
    }
}

function animateScene(scene) {
    for(var i = 0; i < boxes.length; i++) {
        var box = boxes[i];
        box.rotation.x += .040;
        box.rotation.y += .025;
    }
}