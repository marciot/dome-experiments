![alt text][logo]

THREE.js Dome Experiments
=========================

This repository contains experiments in building THREE.js content for [DomeLab]. Click this [link](http://marciot.com/dome-experiments) for online demonstrations.

## How to see the demos:

Dome projection can be done by using [CefWithSyphon] and [Blendy Dome VJ]. If you do not have these, you can also see the demos in VR.

## Supported VR Headsets:

The two WebVR renderers should work on all major headsets, including Cardboard.

'''GearVR:''' You must download the [Samsung Internet Browser for Gear VR] from the ''Oculus Store'' Android app. You must then visit this demo page while in VR mode.

'''Oculus Rift and HTC Vive:''' Rift and Vive users must visit this page using an experimental [WebVR] version of [Chrome] or [Firefox].
        
## Resources:

* [THREE.CubemapToEquirectangular] - Code from which I built the PanoramaRenderer.
* [CefWithSyphon] - Special build of Chrome that can send content to Blendy Dome VJs via Syphon
* [Blendy Dome VJ] - Dome projection software that can project Syphon content to dome.
* [WebVR Polyfill] - Information on the WebVR polyfil used in the renderers
* [THREE.js] - The JavaScript graphics library used in these demos

## Licensing:

I am a strong believer in open source. As such, this code has been released under the Affero GPL license.

## How can you help this project?

Please visit my [Patreon page] to learn how you can support this open-source project with a donation!

[logo]: https://github.com/marciot/dome-experiments/raw/master/images/banner.jpg "A dome picture"
[DomeLab]: https://www.facebook.com/groups/DomeLab
[THREE.CubemapToEquirectangular]: https://github.com/spite/THREE.CubemapToEquirectangular
[CefWithSyphon]: https://github.com/vibber/CefWithSyphon
[Blendy Dome VJ]: http://www.blendydomevj.com
[THREE.js]: https://threejs.org
[WebVR polyfill]: https://github.com/googlevr/webvr-polyfill
[WebVR]: https://webvr.info
[Samsung Internet Browser for Gear VR]: https://www.oculus.com/experiences/gear-vr/849609821813454/
[Chrome]: https://webvr.info/get-chrome/
[Firefox]: https://mozvr.com/