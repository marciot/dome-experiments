// Cordova/Crosswalk initialization

if(! /^http/.test(location.protocol)) {
   window.isCrosswalk  = /crosswalk\.html/.test(location.pathname);
   window.isCordova    = !window.isCrosswalk;
   console.log("isCrosswalk:", window.isCrosswalk, "isCordova:", window.isCordova);
} else {
    window.isCrosswalk = false;
    window.isCordova   = false;
}

function onDeviceReady() {
    window.isCordovaIOS = (window.device && window.device.platform === 'iOS');

    if (window.isCordovaIOS) {
        cordova.plugins.iosrtc.registerGlobals();
    }
    if(peerJsInit) {
        peerJsInit();
    }
}

if(window.isCordova) {
    document.addEventListener("deviceready", onDeviceReady, false);
} else {
    onDeviceReady();
}