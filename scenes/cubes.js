function setupScene(scene) {
    var boxes = [];

    const domeDiameter = 35 * feetToMeters;
    const eyeHeight    = 10 * feetToMeters;

    // Add lights to the scene
    var light = new THREE.AmbientLight( 0xffffff, 0.3 );
    scene.add(light);
    
    var light = new THREE.PointLight( 0xffffff, 1 );
    light.position.set( 10, 15, 20 );
    scene.add(light);
    
    // Use the same geometry for all subsequent cubes
    var geometry = new THREE.BoxGeometry( 1, 1, 1 );
    
    // Red cube ahead
    var box = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: 0xff0000}));
    box.position.z = -domeDiameter/2;
    box.position.y = eyeHeight;
    scene.add(box);
    boxes.push(box);
    
    // Green cube to the right
    var box = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: 0x00ff00}));
    box.position.x = domeDiameter/2;
    box.position.y = eyeHeight;
    scene.add(box);
    boxes.push(box);
    
    // Yellow cube to the left
    var box = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: 0x0ffff00}));
    box.position.x = -domeDiameter/2;
    box.position.y = eyeHeight;
    scene.add(box);
    boxes.push(box);
    
    // Blue cube directly above
    var box = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: 0x0000ff}));
    box.position.y = domeDiameter/2;
    scene.add(box);
    boxes.push(box);

    // Hello, World!
    var text = getTextElement("Hello, Dome!", 6);
    text.position.z = -8;
    text.position.y = 0;
    scene.add(text);

    RendererConfig.animationCallback = function(t) {
        boxes.forEach(
            function(box) {
                box.rotation.x = 4.0 * t;
                box.rotation.y = 2.5 * t;
            }
        );
    }
}