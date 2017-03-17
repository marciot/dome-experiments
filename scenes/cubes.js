function sphericalCoordinatesToPosition(position, azimuth, elevation, distance) {
    /* Adjust the values to make a coordinate system which makes sense for a
     * dome theater:
     *
     *    azimuth =   0  Straight ahead
     *    azimuth =  90  Right of ahead
     *    azimuth = -90  Left of ahead
     */
    var inclination = 90 - elevation;
    azimuth = -azimuth + 180;
    
    // Convert to radians from degrees
    inclination *= Math.PI / 180;
    azimuth     *= Math.PI / 180;
    
    /* The equations are from wikipedia but were adjusted to match the
     * THREE.js coordinate system which puts positive Z away from the
     * screen towards the user.
     *
     *    https://en.wikipedia.org/wiki/Spherical_coordinate_system
     */
    position.z = distance * Math.sin(inclination) * Math.cos(azimuth);
    position.x = distance * Math.sin(inclination) * Math.sin(azimuth);
    position.y = distance * Math.cos(inclination) + RendererConfig.camera.startingPosition.y;
}

function setupScene(scene) {
    var boxes = [];

    const domeDiameterInMeters = 10.668;

    // Add lights to the scene
    
    var light = new THREE.AmbientLight( 0x555555 );
    scene.add(light);
    
    var light = new THREE.PointLight( 0xffffff, 1 );
    light.position.set( 10, 15, 20 );
    scene.add(light);
    
    var geometry = new THREE.BoxGeometry( 1, 1, 1 );
    
    var elevation = 0;
    
    // Red cube ahead
    var box = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: 0xff0000}));
    sphericalCoordinatesToPosition(box.position, 0, elevation, domeDiameterInMeters/2);
    scene.add(box);
    boxes.push(box);
    
    // Green cube to the right
    var box = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: 0x00ff00}));
    sphericalCoordinatesToPosition(box.position, 90, elevation, domeDiameterInMeters/2);
    scene.add(box);
    boxes.push(box);
    
    // Yellow cube to the left
    var box = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: 0x0ffff00}));
    sphericalCoordinatesToPosition(box.position, -90, elevation, domeDiameterInMeters/2);
    scene.add(box);
    boxes.push(box);
    
    // Blue cube directly above
    var box = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: 0x0000ff}));
    sphericalCoordinatesToPosition(box.position, 0, 90, domeDiameterInMeters/2);
    scene.add(box);
    boxes.push(box);

    RendererConfig.animationCallback = function(t) {
        boxes.forEach(
            function(box) {
                box.rotation.x = 4.0 * t;
                box.rotation.y = 2.5 * t;
            }
        );
    }
}