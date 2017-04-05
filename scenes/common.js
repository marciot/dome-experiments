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
function loadResource(filename, async){
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
        document.getElementsByTagName("head")[0].appendChild(fileref)
    }
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function loadUrl(url, successCallback, errorCallback) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            successCallback(request.responseText);
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
    const lines      = text.split('\n');
    const fontSizePx = 40;
    const lineSizePx = 50;
    const font       = "Bold " + fontSizePx + "px Arial";
    const fillStyle  = color || "white";
    
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
    var geometry = new THREE.PlaneBufferGeometry(scaleY * canvas.width/canvas.height, scaleY);
    var mesh = new THREE.Mesh(geometry, material);
    return mesh;
}