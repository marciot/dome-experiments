/* Decode the query variable */
function parseQuery(url) {
    var vars = (url || window.location.search).substring(1).split("&");
    var query = {};
    for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        query[pair[0]] = pair[1];
    }
    return query;
}

/* Dynamically load a css or js object
 *
 * Examples:
 *    loadResource("myscript.js")
 *    loadResource("mystyle.css")
 *
 *  Reference:
 *    http://www.javascriptkit.com/javatutors/loadjavascriptcss.shtml
 */
function loadResource(filename, async, onLoadFunc){
    if (endsWith(filename, ".js") || endsWith(filename, ".js.gz")){
        //if filename is a external JavaScript file
        var fileref = document.createElement('script')
        fileref.setAttribute("type","text/javascript")
        fileref.setAttribute("src", filename)
        if(async == "defer") {
            fileref.setAttribute("defer", "defer");
        } else if(async) {
            fileref.setAttribute("async", "async");
        }
    } else if (endsWith(filename, ".css") || endsWith(filename, ".css.gz")) {
        //if filename is an external CSS file
        var fileref = document.createElement("link")
        fileref.setAttribute("rel", "stylesheet")
        fileref.setAttribute("type", "text/css")
        fileref.setAttribute("href", filename)
    } else if (endsWith(filename, ".html") || endsWith(filename, ".html.gz")) {
        //if filename is an external HTML file
        var fileref = document.createElement("link")
        fileref.setAttribute("rel", "import")
        fileref.setAttribute("href", filename)
    }
    if (typeof fileref != "undefined") {
        if (onLoadFunc !== null) {
            fileref.onload = onLoadFunc;
        }
        document.getElementsByTagName("head")[0].appendChild(fileref)
    }
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function loadUrl(url, successCallback, errorCallback, responseType) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    if(responseType) {
        request.responseType = responseType;
    }
    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            successCallback(responseType ? request.response : request.responseText);
        } else {
            if(errorCallback) {
                errorCallback(request.status, request.statusText, request);
            }
        }
    }
    request.onerror = function() {
        if(errorCallback) {
            errorCallback(request.status, request.statusText, request);
        }
    }
    request.send();
}

/* THREE.js Utility Functions */

function getTextElement(text, scaleY, color) {
    const fontSizePx = 40;
    const lineSizePx = 50;
    const font       = "Bold " + fontSizePx + "px Arial";

    var canvas    = document.createElement('canvas');
    var ctx       = canvas.getContext('2d');
    var material = new THREE.MeshBasicMaterial( {
        map:         new THREE.Texture(canvas),
        transparent: true
    });

    function setText(text, color) {
        if(!text) {
            material.visible = false;
            return;
        }
        const lines = text.split('\n');
        const fillStyle  = color || "white";

        var ctx = canvas.getContext('2d');
        ctx.font         = font;
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
        material.map.needsUpdate = true;
        material.visible = true;
    }

    setText(text, color);

    var geometry = new THREE.PlaneBufferGeometry(scaleY * canvas.width/canvas.height, scaleY);
    var mesh = new THREE.Mesh(geometry, material);
    Object.defineProperty(mesh, 'text', {set: setText});
    return mesh;
}

// Returns a reference frame which is centered and aligned with
// the dome.
function domeCentricReferenceFrame(scene) {
    var frame = new THREE.Object3D();
    frame.rotation.x = -RendererConfig.dome.inclination;
    frame.position.y = RendererConfig.camera.startingPosition.y;
    scene.add(frame);
    return frame;
}

// Returns a reference frame which is appropriate for an outside-in
// viewed spherical display
function sphericalDisplayReferenceFrame(scene) {
    var frame = new THREE.Object3D();
    frame.rotation.x = -RendererConfig.dome.inclination + Math.PI/2;
    frame.position.y = RendererConfig.camera.startingPosition.y;
    scene.add(frame);
    return frame;
}

// Returns a quaternion that can be used to rotate a object in
// the sphericalDisplayReferenceFrame so it moves correctly
function getSphericalDisplayQuaternion(scene, e) {
    if(!this.adjustment) {
        this.adjustment = new THREE.Quaternion();
        this.adjustment.setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), Math.PI / 2 );
    }
    e.quaternion.multiply(this.adjustment);
    e.quaternion.y *= -1;
    e.quaternion.z *= -1;
    e.quaternion.multiply(scene.quaternion);
    return e.quaternion;
}

function positionOnDome(object, azimuth, elevation, distanceAwayFromDome) {
    /* Adjust the values to make a coordinate system which makes sense for a
     * dome theater:
     *
     *    azimuth =   0  Straight ahead
     *    azimuth =  90  Right of ahead
     *    azimuth = -90  Left of ahead
     */
    var inclination = 90 - elevation;
    azimuth = -azimuth + 180;

    var distance = RendererConfig.dome.radius + distanceAwayFromDome;

    // Convert to radians from degrees
    inclination *= Math.PI / 180;
    azimuth     *= Math.PI / 180;

    /* The equations are from wikipedia but were adjusted to match the
     * THREE.js coordinate system which puts positive Z away from the
     * screen towards the user.
     *
     *    https://en.wikipedia.org/wiki/Spherical_coordinate_system
     */
    object.position.z = distance * Math.sin(inclination) * Math.cos(azimuth);
    object.position.x = distance * Math.sin(inclination) * Math.sin(azimuth);
    object.position.y = distance * Math.cos(inclination);

    // Make sure the sprite always faces the camera.
    object.lookAt(RendererConfig.camera.rig.position);
}

/* Functions for working with the Draco mesh decompressor */

// Global Draco decoder type.
let dracoDecoderType = {};
let dracoLoader;

function loadWebAssemblyDecoder(readyCallback) {
    dracoDecoderType['wasmBinaryFile'] = '../libs/draco/draco_decoder.wasm';
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '../libs/draco/draco_decoder.wasm', true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
        // draco_wasm_wrapper.js must be loaded before DracoModule is
        // created. The object passed into DracoModule() must contain a
        // property with the name of wasmBinary and the value must be an
        // ArrayBuffer containing the contents of the .wasm file.
        dracoDecoderType['wasmBinary'] = xhr.response;
        createDracoDecoder(readyCallback);
    };
    xhr.send(null)
}

function createDracoDecoder(readyCallback) {
    dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDracoDecoderType(dracoDecoderType);
    if(readyCallback) {
        readyCallback();
    }
}

// This function will test if the browser has support for WebAssembly. If
// it does it will download the WebAssembly Draco decoder, if not it will
// download the asmjs Draco decoder.
// TODO: Investigate moving the Draco decoder loading code
// over to DRACOLoader.js.
function loadDracoDecoder(readyCallback) {
    if (typeof WebAssembly !== 'object') {
        // No WebAssembly support
        loadResource('../libs/draco/draco_decoder.js', true, createDracoDecoder.bind(null,readyCallback));
    } else {
        loadResource('../libs/draco/draco_wasm_wrapper.js', true, loadWebAssemblyDecoder.bind(null,readyCallback));
    }
}

function loadDracoModel(url, successCallback, errorCallback) {
    loadUrl(url, function(data) {dracoLoader.decodeDracoFile(data, successCallback);}, errorCallback, "arraybuffer");
}

/* Trick for inline strings for GLSL code:
     http://stackoverflow.com/questions/805107/creating-multiline-strings-in-javascript
 */
Function.prototype.getComment = function() {
    var startComment = "/*!";
    var endComment = "*/";
    var str = this.toString();

    var start = str.indexOf(startComment);
    var end = str.lastIndexOf(endComment);

    return str.slice(start + startComment.length, -(str.length - end));
};