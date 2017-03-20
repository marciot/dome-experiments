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
    var mesh = new THREE.Mesh(geometry, material);
    return mesh;
}