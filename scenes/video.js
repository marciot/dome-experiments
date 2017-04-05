/* This demonstration is adapted from:
 *   https://threejs.org/examples/webgl_video_panorama_equirectangular.html
 */

function setupScene(scene) {
    var geometry = new THREE.SphereBufferGeometry( RendererConfig.dome.radius, 60, 40 );
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
    
    var credit = getTextElement("Spherible - Purp Cycle\nBy Daniel Arnett", 1);
    credit.position.z = -4;
    credit.position.y = 0.65;
    scene.add(credit);
}