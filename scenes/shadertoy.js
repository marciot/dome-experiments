/* The shader code is a slightly modified version of Shane's "Abstract Corridor"
 * shader, CC-NC-SA-3.0:
 *
 *   https://www.shadertoy.com/view/MlXSWX
 */
RendererConfig.dome.fullSphere    = false;

var textureLoader = new THREE.TextureLoader();

function setupScene(scene) {
    const apiKey = "BdHtW4";
    
    alert("ShaderToys are generally licensed for non-commercial use (CC-BY-NC-SA 3.0).\nFor non-free exhibition, contact the author via the ShaderToy link.");
    
    var mesh;
    
    function processShader(data) {
        var shader = JSON.parse(data).Shader;

        console.log(shader.info.name, "by", shader.info.username, shader);

        if(shader.renderpass.length > 1) {
            console.log("Warning: Multiple render passes not currently supported");
        }

        var fragmentShader = shader.renderpass[0].code;
        var shaderInputs   = shader.renderpass[0].inputs;
        var textures       = [];
        for(var i = 0; i < shaderInputs.length; i++) {
            if(shaderInputs[i].ctype == "texture") {
                var texture = textureLoader.load("../textures/shadertoy" + shaderInputs[i].src);
                if(shaderInputs[i].sampler.wrap == "repeat") {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                }
                textures[shaderInputs[i].channel] = texture;
                console.log("Sampler:", shaderInputs[i].sampler);
            }
        }

        var material = new THREE.RawShaderMaterial( {
            vertexShader:   vertexShader,
            fragmentShader: fragmentShaderPreamble + fragmentShader,
            uniforms: {
                iGlobalTime: {value: 1.0 },
                iChannel0:   {value: textures[0] },
                iChannel1:   {value: textures[1] },
                iResolution: {value: new THREE.Vector2(1024, 1024)},
                iMouse:      {value: new THREE.Vector4(0, 0, 0, 0)},
            }
        } );

        mesh.material = material;

        // Use username, unless there is a "Original Author:" in the comments.
        var fields = fragmentShader.match(/Original Author: (.*)/);
        if(fields) {
            shader.info.username = fields[1];
        }

        var credit = getTextElement(shader.info.name + "\nShadertoy by " + shader.info.username, 4);
        credit.position.z = -4;
        credit.position.y = 0.55;
        scene.add(credit);
    }

    var query = parseQuery();
    if(query.shader !== null) {
        loadUrl("https://www.shadertoy.com/api/v1/shaders/" + query.shader + "?key=" + apiKey, processShader);
    }

    var geometry = new THREE.SphereBufferGeometry(RendererConfig.dome.radius, 60, 40);
    geometry.scale( -1, 1, 1 );

    mesh = new THREE.Mesh( geometry );
    mesh.rotation.y = -Math.PI/2;
    mesh.rotation.x = RendererConfig.dome.inclination;
    scene.add( mesh );

    RendererConfig.animationCallback = function(t) {
        if(mesh.material.uniforms) {
            mesh.material.uniforms.iGlobalTime.value = t;
        }
    }
}

var fragmentShaderPreamble = function() {/*!
#define texture    texture2D
#define textureLod texture2D

precision highp float;
varying   float longitude;
varying   float latitude;
varying   vec2  vUV;

uniform float     iGlobalTime;
uniform vec2      iResolution;
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

void mainVR( out vec4 fragColor, in vec2 fragCoord, in vec3 ro, in vec3 rd );

void main()  {
    float sinOfLatitude = -sin( latitude );
    vec3 rd = vec3(
        sin( longitude ) * sinOfLatitude,
        cos( latitude ),
        cos( longitude ) * sinOfLatitude
    );
    //normalize(rd);

    vec3 ro = vec3(0., 0., 0.);
    mainVR( gl_FragColor, vUV * vec2(1024), ro, rd );
}
*/}.getComment();

var vertexShader = function() {/*!
attribute vec3 position;
attribute vec2 uv;
uniform   mat4 projectionMatrix;
uniform   mat4 modelViewMatrix;
varying   float longitude;
varying   float latitude;
varying   vec2 vUV;

#define M_PI 3.1415926535897932384626433832795

void main() {
    vUV = uv;
    longitude = -2. * M_PI * (uv.x - 0.5);
    latitude  = -1. * M_PI * (uv.y - 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
*/}.getComment();
