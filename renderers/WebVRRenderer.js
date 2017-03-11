/* Main function that kickstarts the animation loop */
function startAnimation() {
    const eyeHeightInMeters  = 1.7;
    var clock  = new THREE.Clock();
    
    var renderer = new THREE.WebGLRenderer();
    document.body.appendChild(renderer.domElement);
    
    var effect = new THREE.VREffect(renderer);
    
    var camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.001, 700 );
    
    // Inititalize WebVR
    
    var vrDisplay = null;
    
    function setupVR(sceneCallback) {
        if(!navigator.getVRDisplays) {
            alert("WebVR is not supported");
            return;
        }

        // Get the VRDisplay and save it for later.
        navigator.getVRDisplays().then(
            function(displays) {
                for(var i = 0; i < displays.length; i++) {
                    if(displays[i].capabilities.hasOrientation) {
                        vrDisplay = displays[0];
                        effect.setVRDisplay(vrDisplay);
                        sceneCallback();
                        return;
                    }
                }
                alert("WebVR is supported, but no VR displays found");
            }
        );
    }

    // Call the user routine to setup the scene
    var scene  = new THREE.Scene();
    setupScene(scene);

    var headsetPose          = new THREE.Vector3();
    var headsetOrientation   = new THREE.Quaternion();
    function updatePoseAndOrientation() {
        // Get the headset position and orientation.
        var pose = vrDisplay.getPose();
        if (pose.position !== null) {
            camera.position.fromArray(pose.position);
        } else {
            camera.position.y = eyeHeightInMeters;
        }
        if (pose.orientation !== null) {
            camera.quaternion.fromArray(pose.orientation);
        }
    }
    
    // The animation routine
    function animate() {
        updatePoseAndOrientation();
        animateScene(clock.getDelta(), scene);
        effect.render(scene, camera);
        vrDisplay.requestAnimationFrame(animate);
    }
    
    // The resize handler
    function onWindowResize() {
        var width  = window.innerWidth;
        var height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        effect.setSize(width, height);
    }
    window.addEventListener( 'resize', onWindowResize, false );
    
    // Presentation button for WebVR capable devices.
    function createButton() {
        var btn = document.createElement("button");
        btn.innerText      = "Enter VR";
        btn.style.position = "absolute";
        btn.style.top      = "5px";
        btn.style.right    = "5px";
        document.body.appendChild(btn);
        
        btn.addEventListener("click", function() {effect.requestPresent()});
        
        function vrPresentationChange() {
            btn.style.display = vrDisplay.isPresenting ? "none" : "block";
        };
        window.addEventListener('vrdisplaypresentchange', vrPresentationChange);
    }
    
    // Setup WebVR and begin the animation
    setupVR(function() {
        vrDisplay.requestAnimationFrame(animate);
        if(vrDisplay.capabilities.canPresent) {
            createButton();
        }
    });
    
    onWindowResize();
}

WebVRConfig.ALWAYS_APPEND_POLYFILL_DISPLAY = true;