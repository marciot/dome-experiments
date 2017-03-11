var knots = [];

function sphericalCoordinatesToPosition(position, azimuth, elevation, distance) {
    const eyeHeightInMeters    = 1.7;
    
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
    position.y = distance * Math.cos(inclination) + eyeHeightInMeters;
}

function circumferenceAtElevation(elevation, distance) {
    return distance * Math.cos(elevation) * Math.PI * 2;
}

function setupScene(scene) {
    const domeDiameterInMeters = 10.668;

    var light = new THREE.AmbientLight( 0x555555 );
    scene.add(light);
    
    var light = new THREE.PointLight( 0xffffff, 1 );
    light.position.set( 10, 15, 20 );
    scene.add(light);
    
    // Draw a radial grid to represent the floor
    var grid = new THREE.PolarGridHelper( domeDiameterInMeters/2);
    scene.add( grid );

    const knotRadius   = 0.25;
    const maxElevation = 85;
    const nKnots       = 25;
    
    var geometry = new THREE.TorusKnotBufferGeometry( knotRadius, knotRadius/3, 32, 8 );
    
    for(var i = 0; i < nKnots; i++) {
        var el = Math.random() * maxElevation;
        var az = Math.random() * 360;
        var color    = new THREE.Color().setHSL(az/360, 1.0, 0.1 + el/maxElevation * .9);
        var material = new THREE.MeshLambertMaterial( {color: color} );
        var knot = new THREE.Mesh(geometry, material);
        sphericalCoordinatesToPosition(knot.position, az, el, domeDiameterInMeters/2);
        
        var obj = new THREE.Object3D();
        obj.add(knot);
        knots.push(obj);
        scene.add(obj);
    }
}

function animateScene(dt, scene) {
    for(var i = 0; i < knots.length; i++) {
        var knot = knots[i];
        var f    = (i+1)/knots.length - 0.5;
        
        // Tumble the knot itself
        knot.children[0].rotation.x += .40 * dt * f;
        knot.children[0].rotation.y += .25 * dt * f;
        
        // Orbit the knot around dome
        knot.rotation.y += .25 * f * dt;
    }
}