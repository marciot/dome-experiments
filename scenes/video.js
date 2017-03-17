/* This demonstration is adapted from:
 *   https://threejs.org/examples/webgl_video_panorama_equirectangular.html
 */

function setupScene(scene) {
    var geometry = new THREE.SphereBufferGeometry( 500, 60, 40 );
    geometry.scale( -1, 1, 1 );
    
    /* Video from https://vimeo.com/97887646 */
    
    var video = document.createElement( 'video' );
    video.width  = 1024;
    video.height =  640;
    video.loop   = true;
    video.muted  = true;
    video.src = "../textures/Spherible- Purp Cycle.mp4";
    video.setAttribute( 'webkit-playsinline', 'webkit-playsinline' );
    video.setAttribute( 'playsinline', 'playsinline' );
    video.play();
    
    // iOS require the video to start muted in order for it to autoplay, so we use a click
    // to enable the sound.
    document.getElementsByTagName("canvas")[0].addEventListener("click",
        function() {video.muted = false;}
    );

    var texture = new THREE.VideoTexture( video );
    texture.minFilter = THREE.LinearFilter;
    texture.format = THREE.RGBFormat;

    var material   = new THREE.MeshBasicMaterial( { map : texture } );
    mesh = new THREE.Mesh( geometry, material );
    mesh.rotation.y = -Math.PI/2;
    scene.add( mesh );
    
    var credit = getTextElement("Spherible - Purp Cycle - By Daniel Arnett", 6);
    credit.position.z = -8;
    credit.position.y = 0;
    scene.add(credit);
}

function getTextElement(text, scale) {
    const font       = "Bold 40px Arial";
    const fillStyle  = "white";
    const height     = 50;
    
    var canvas    = document.createElement('canvas');
    var ctx       = canvas.getContext('2d');
    ctx.font      = font;
    ctx.fillStyle = fillStyle;
    
    var textWidth = ctx.measureText(text).width;
    canvas.width  = textWidth;
    canvas.height = height;
    ctx.font      = font;
    ctx.fillStyle = fillStyle;
    ctx.fillText(text, 0, 40);
    
    var textMaterial = new THREE.MeshBasicMaterial( {
        map:         new THREE.Texture(canvas),
        transparent: true
    });
    textMaterial.map.needsUpdate = true;
    var textMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry(scale, scale * height/textWidth), textMaterial );
    return textMesh;
}