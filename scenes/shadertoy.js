/* This is an experimental loader for ShaderToys. It will attempt to load
 * the shader indicated by the "shader" variable in the URL.
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

        var material;
        var fragmentShader = shader.renderpass[0].code;
        var shaderInputs   = shader.renderpass[0].inputs;
        var textures       = [];
        var samplerTypes   = ["sampler2D", "sampler2D", "sampler2D", "sampler2D"];

        for(var i = 0; i < shaderInputs.length; i++) {
            console.log("ShaderInput:", i, shaderInputs[i].ctype);
            switch (shaderInputs[i].ctype) {
                case "texture":
                    function textureLoaded(i, texture) {
                        material.uniforms.iChannelResolution.value[i].x = texture.image.width;
                        material.uniforms.iChannelResolution.value[i].y = texture.image.height;
                    }
                    var texture = textureLoader.load(
                        "../textures/shadertoy" + shaderInputs[i].src,
                        textureLoaded.bind(null, i)
                    );
                    if(shaderInputs[i].sampler.vflip == "false") {
                        texture.flipY = false;
                    }
                    if(shaderInputs[i].sampler.wrap == "repeat") {
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                    }
                    if(shaderInputs[i].sampler.srgb == "true") {
                        texture.encoding = THREE.sRGBEncoding;
                    }
                    textures[shaderInputs[i].channel] = texture;
                    console.log("Sampler:", shaderInputs[i].sampler);
                    break;
                case "cubemap":
                    var filename = shaderInputs[i].src.replace(/\.([a-z]+$)/,"\_NUM.$1");
                    var texture = new THREE.CubeTextureLoader()
                        .setPath('../textures/shadertoy')
                        .load(
                            [
                                filename.replace("_NUM",""),
                                filename.replace("_NUM","_1"),
                                filename.replace("_NUM","_2"),
                                filename.replace("_NUM","_3"),
                                filename.replace("_NUM","_4"),
                                filename.replace("_NUM","_5")
                            ]
                        );
                    textures[shaderInputs[i].channel] = texture;
                    samplerTypes[shaderInputs[i].channel] = "samplerCube";
                    break;
            }
        }

        for(var i = 0; i < 4; i++) {
            var slotLabel = "_slot" + i + "_";
            fragmentShaderPreamble = fragmentShaderPreamble.replace(slotLabel, samplerTypes[i]);
            if(samplerTypes[i] == "samplerCube") {
                var regex =new RegExp("texture\\(iChannel"+i,"g");
                fragmentShader = fragmentShader.replace(regex, "textureCube(iChannel"+i);
            }
        }

        material = new THREE.RawShaderMaterial( {
            vertexShader:   vertexShader,
            fragmentShader: fragmentShaderPreamble + fragmentShader,
            uniforms: {
                iGlobalTime: {value: 1.0 },
                iChannel0:   {value: textures[0] },
                iChannel1:   {value: textures[1] },
                iChannel2:   {value: textures[2] },
                iChannel3:   {value: textures[3] },
                iChannelResolution:    {value: [
                    new THREE.Vector3(256, 256),
                    new THREE.Vector3(256, 256),
                    new THREE.Vector3(256, 256),
                    new THREE.Vector3(256, 256)
                ]},
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

        var credit = getTextElement(shader.info.name + "\nShadertoy by " + shader.info.username, 1);
        credit.position.z = -4;
        credit.position.y = 0.65;
        scene.add(credit);
    }

    var query = parseQuery();
    if(query.shader !== null) {
        loadUrl("https://www.shadertoy.com/api/v1/shaders/" + query.shader + "?key=" + apiKey, processShader);
    }
    if(query.ambulatory) {
        fragmentShaderPreamble = "#define AMBULATORY\n" + fragmentShaderPreamble;
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
uniform _slot0_   iChannel0;
uniform _slot1_   iChannel1;
uniform _slot2_   iChannel2;
uniform _slot3_   iChannel3;
uniform vec3      iChannelResolution[4];

void mainVR( out vec4 fragColor, in vec2 fragCoord, in vec3 ro, in vec3 rd );

void main()  {
    float sinOfLatitude = -sin( latitude );
    vec3 rd = vec3(
        sin( longitude ) * sinOfLatitude,
        cos( latitude ),
        cos( longitude ) * sinOfLatitude
    );
    //normalize(rd);

#ifdef AMBULATORY
    vec3 ro = vec3(0., 0., -iGlobalTime);
#else
    vec3 ro = vec3(0., 0., 0.);
#endif
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
