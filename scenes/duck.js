/* This game uses the following model and sound assets:
 *
 *   Name              | Designer      | License  | Hyperlink
 * ---------------     | ------------- | -------- | -----------
 *   background.png    | Matt Surabian |  MIT     | https://github.com/MattSurabian/DuckHunt-JS
 *   black_duck.png    | Matt Surabian |  MIT     | https://github.com/MattSurabian/DuckHunt-JS
 *   bush.png          | Matt Surabian |  MIT     | https://github.com/MattSurabian/DuckHunt-JS
 *   dog1.png          | Matt Surabian |  MIT     | https://github.com/MattSurabian/DuckHunt-JS
 *   dog2.png          | Matt Surabian |  MIT     | https://github.com/MattSurabian/DuckHunt-JS
 *   red_duck.png      | Matt Surabian |  MIT     | https://github.com/MattSurabian/DuckHunt-JS
 *   tree.png          | Matt Surabian |  MIT     | https://github.com/MattSurabian/DuckHunt-JS
 *
 *   Sound             | Designer      | License  | Hyperlink
 *  ------------------ | ------------  | -------- | -----------
 *   quacking.ogg      | Matt Surabian |  MIT     | https://github.com/MattSurabian/DuckHunt-JS
 *   sniff.ogg         | Matt Surabian |  MIT     | https://github.com/MattSurabian/DuckHunt-JS
 *   victory.ogg       | Jim Hancock   |  CC0 1.0 | https://www.freesound.org/people/jimhancock/sounds/256128
 */
GameConfig = {
    treeAzimuth: [7, 100, 128, 167, 303],
    renderOrder: {
        ducks:           0,
        tree:            1,
        backgroundHound: 2,
        grass:           3,
        foregroundHound: 4,
        reticle:         5
    },
    renderDepth: {
        ducks:           0.9,
        tree:            0.5,
        backgroundHound: 0.3,
        grass:           0,
        foregroundHound: -0.25,
        reticle:         -0.4
    },
    additionalDucksPerRound: 3
}

include("DomeInteraction");

var texureLoader = new THREE.TextureLoader();
var ducks = [];
var audioLoader   = new THREE.AudioLoader();
var audioListener = new THREE.AudioListener();

// Returns a reference frame which is centered and aligned with
// the dome.
function domeCentricReferenceFrame(scene) {
    var frame = new THREE.Object3D();
    frame.rotation.x = -RendererConfig.dome.inclination;
    frame.position.y = RendererConfig.camera.startingPosition.y;
    scene.add(frame);
    return frame;
}

function setupScene(scene) {
    const domeDiameterInMeters = 10.668;
    
    scene.background = new THREE.Color( 0x00ffff );
    var scene = domeCentricReferenceFrame(scene);

    var light = new THREE.AmbientLight( 0x555555 );
    scene.add(light);
    
    var light = new THREE.PointLight( 0xffffff, 1 );
    light.position.set( 10, 15, 20 );
    scene.add(light);
    
    scene.add(audioListener);
    
    var quacking = new THREE.Audio(audioListener);
    audioLoader.load('../sounds/duckhunt/quacking.ogg', buffer => {
        quacking.setBuffer(buffer);
        quacking.setLoop(true);
    });
    
    var tada = new THREE.Audio(audioListener);
    audioLoader.load('../sounds/duckhunt/tada.ogg', buffer => {
        tada.setBuffer(buffer);
    });

    var backdrop = new Backdrop(domeDiameterInMeters/2);
    scene.add(backdrop.representation);
    
    var backgroundHound = new BackgroundHound();
    var foregroundHound = new ForegroundHound();
    
    scene.add(backgroundHound.representation);
    scene.add(foregroundHound.representation);
    
    foregroundHound.start(startRound);
    
    function startRound() {
        // During the first round, keep the URL up,
        // but subsequently hide the text at the
        // start of each round.
        if(this.firstRoundDone) {
            displayStr("");
        } else {
            this.firstRoundDone = true;
        }
        // Reset hit count and show all participants
        interact.forEach(p => {
            p.visible = true;
            p.ducksShot = 0;
        });

        // Respawn existing ducks
        for(var i = 0; i < ducks.length; i++) {
            ducks[i].spawn();
        }
        // Add more ducks ducks to round
        for(var i = 0; i < GameConfig.additionalDucksPerRound; i++) {
            duck = new Duck(ducks.length, i%2);
            scene.add(duck.representation);
            ducks.push(duck);
        }
        quacking.play();
    }

    function showRoundWinner() {
        var maxHits  = 0;
        var nPlayers = 0;
        // Figure out the high score
        interact.forEach(p => {
            if(p.ducksShot > maxHits) {
                maxHits = p.ducksShot;
            }
        });
        // Figure out how many players had the high score.
        // Hide those who did not have the high score.
        interact.forEach(p => {
            if(p.ducksShot == maxHits) {
                nPlayers++;
                p.visible = true;
            } else {
                p.visible = false;
            }
        });

        if(nPlayers == 1) {
            displayStr("Round winner hit " + maxHits + " ducks");
            tada.play();
        } else {
            displayStr(nPlayers + " participants tied for " + maxHits + " ducks");
        }
    }

    function displayStr(str, scale) {
        if(this.obj) {
            this.obj.text = str;
        } else {
            var obj = getTextElement(str, scale || 0.8);
            obj.position.z = -4;
            obj.position.y = 4.65;
            obj.lookAt(new THREE.Vector3());
            scene.add(obj);
            this.obj = obj;
            return obj;
        }
    }
    
    // Manage participants
    function stateChanged(state) {
        if(state == 'open') {
            var url = "dome.marciot.com/interact" + interact.getUrlSuffix();
            displayStr("Go to \u201C" + url + "\u201D on\nyour smartphone to participate.");
        }
    }
    var interact = new DomeInteraction(id => new MyParticipant(scene, backgroundHound), stateChanged);
    
    // Animate the participants
    RendererConfig.animationCallback = function(t, dt) {
        foregroundHound.animate(t, dt);
        backgroundHound.animate(t, dt);
        interact.animate(t, dt);
                
        var roundOver = true;
        for(var i = 0; i < ducks.length; i++) {
            ducks[i].animate(t, dt);
            if(!ducks[i].isFallen) {
                roundOver = false;
            }
        }
        if(ducks.length && roundOver && !foregroundHound.animating) {
            try {
                quacking.stop();
            } catch(e) {
                // Happens on iPhone, when loading of ogg vorbis fails
            }
            foregroundHound.start(startRound);
            showRoundWinner();
        }
    }
}

class MyParticipant extends DomeParticipant {
    constructor(scene, hitCounter) {
        super();
        this.scene = scene;
        this.cursor = new Reticle();
        scene.add(this.cursor.representation);
        this.hitCounter = hitCounter;
        
        this.tmpVector        = new THREE.Vector3();
        this.ducksShot        = 0;
    }
    
    disconnected() {
        this.scene.remove(this.cursor.representation);
    }

    buttonDown(e) {
        this.tmpVector.copy(e.pointing).applyQuaternion(this.scene.quaternion);
        var raycaster = new THREE.Raycaster(RendererConfig.camera.rig.position, this.tmpVector);
        var intersects = raycaster.intersectObject(this.scene, true);
        for(var i = 0; i < intersects.length; i++) {
            if(intersects[i].object.userData.isDuck) {
                var duck = intersects[i].object.userData.isDuck;
                if(!duck.isShot) {
                    duck.shot(() => {this.hitCounter.tallyHit(e.azimuth);});
                    this.ducksShot++;
                }
                return;
            }
        }
        // No hits.
        this.hitCounter.tallyMiss(e.azimuth);
    }

    buttonUp(e) {
    }

    pointerMoved(e) {
        this.cursor.setFromUnitVector(e.pointing, this.cursor.distance);
    }

    animate(t, dt) {
    }

    set visible(value) {
        this.cursor.visible = value;
    }
}

class Backdrop {
    constructor(domeRadius) {
        const grassHeight = 1;
        
        var texture = texureLoader.load('../textures/duckhunt/background.png');
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.set(4, 1);
        
        var geometry = new THREE.CylinderBufferGeometry(
            domeRadius, domeRadius,
            grassHeight,
            20,
            20,
            true
        );
        geometry.translate(0, grassHeight/2, 0);
        var material = new THREE.MeshBasicMaterial(
            {
                map:         texture,
                side:        THREE.BackSide,
                transparent: true
            }
        );
        var grass = new THREE.Mesh(geometry, material);
        grass.renderOrder = GameConfig.renderOrder.grass;
        grass.position.z  = GameConfig.renderDepth.grass;
        
        this.representation = new THREE.Object3D();
        this.representation.add(grass);
        
        Sprite.domeRadius = domeRadius;
        
        // Place the trees
        for(var i = 0; i < GameConfig.treeAzimuth.length; i++) {
            this.representation.add(new Tree(GameConfig.treeAzimuth[i]).representation);
        }
        
        this.representation.renderOrder = GameConfig.renderOrder.grass;
    }
}

class Sprite {
    constructor(staticClass, url, options) {
        if(!options.nRows) {
            // If this sprite is non-animated, then create a
            // material that is shared by all instances.
            this.loadMaterial(options.unique ? this : staticClass, url, options);
        } else {
            // If this sprite is animated, then each instance
            // gets a unique material.
            this.loadMaterial(this, url, options);
            this.material.map.wrapS = THREE.RepeatWrapping;
            this.material.map.wrapT = THREE.RepeatWrapping;
            this.nCols = options.nCols;
            this.nRows = options.nRows;
            this.material.map.repeat.set( 1/this.nCols, 1 / this.nRows );
        }
        this.representation = new THREE.Mesh(this.geometry, this.material);
        this.representation.scale.set(options.size || 1, options.size || 1, 1);
    }
    
    set renderOrder(value) {
        this.representation.renderOrder = value;
    }
    
    set frame(i) {
        if(this.nCols) {
            this.material.map.offset.x = (i % this.nCols) / this.nCols;
            this.material.map.offset.y = (this.nRows - 1 - Math.floor(i / this.nCols)) / this.nRows;
        }
    }
    
    get geometry() {
        if(!Sprite.geometry) {
            Sprite.geometry = new THREE.PlaneBufferGeometry(1, 1);
            console.log("Creating sprite geometry");
        }
        return Sprite.geometry;
    }
    
    loadMaterial(obj, url, options) {
        if(!obj.material) {
            if(options.color) {
                // If a color is specified, use the texture as an alpha map.
                obj.material = new THREE.MeshBasicMaterial(
                    {
                        alphaMap:    texureLoader.load(url),
                        side:        THREE.FrontSide,
                        transparent: true,
                        color:       options.color,
                        depthTest: false
                    }
                );
            } else {
                obj.material = new THREE.MeshBasicMaterial(
                    {
                        map:         texureLoader.load(url),
                        side:        THREE.FrontSide,
                        transparent: true,
                        depthTest: false
                    }
                );
            }
        }
        this.material = obj.material;
    }
    
    setFromUnitVector(vec, distanceFromDome) {
        this.representation.position.copy(vec).multiplyScalar(Sprite.domeRadius + distanceFromDome);
        this.representation.lookAt(RendererConfig.camera.rig.position);
    }
    
    setPolar(azimuth, elevation, distanceFromDome) {
        /* Adjust the values to make a coordinate system which makes sense for a
         * dome theater:
         *
         *    azimuth =   0  Straight ahead
         *    azimuth =  90  Right of ahead
         *    azimuth = -90  Left of ahead
         */
        var inclination = 90 - elevation;
        azimuth = -azimuth + 180;
        
        var distance = Sprite.domeRadius + distanceFromDome;
        
        // Convert to radians from degrees
        inclination *= Math.PI / 180;
        azimuth     *= Math.PI / 180;
        
        /* The equations are from wikipedia but were adjusted to match the
         * THREE.js coordinate system which puts positive Z away from the
         * screen towards the user.
         *
         *    https://en.wikipedia.org/wiki/Spherical_coordinate_system
         */
        this.representation.position.z = distance * Math.sin(inclination) * Math.cos(azimuth);
        this.representation.position.x = distance * Math.sin(inclination) * Math.sin(azimuth);
        this.representation.position.y = distance * Math.cos(inclination);
        
        // Make sure the sprite always faces the camera.
        this.representation.lookAt(RendererConfig.camera.rig.position);
    }
    
    update() {
        this.setPolar(this.azimuth, this.elevation, this.distance);
    }

    set visible(value) {
        this.representation.visible = value;
    }
}

class Reticle extends Sprite {
    constructor() {
        if(!Reticle.colorIndex) {
            Reticle.colorIndex = 0;
        }
        function vary(i) {
            // Offset is a sequence of numbers ranging from -0.5
            // through 0.5 which are chosen in a sequence to be well
            // separated, starting at zero.
            i ^= 0b00001;
            return 0.5 - (((i & 0b00001) << 4) |
                          ((i & 0b00010) << 2) |
                          ((i & 0b00100) << 0) |
                          ((i & 0b01000) >> 2) |
                          ((i & 0b10000) >> 4)) / 32;
        }
        function maximallySparatedHues(i, backgroundHue, excludedArc) {
            var hue = vary(i % 8) + 0.5;
            var lightness = 0.5 + vary(Math.floor(i/8)) * 0.5;
            if(typeof backgroundHue !== "undefined") {
                hue = (backgroundHue/360 + 0.5) + (hue - 0.5) * (360 - excludedArc)/360;
            }
            return new THREE.Color().setHSL(hue, 1.0, lightness);
        }
        super(Reticle, '../textures/duckhunt/reticle_alphaMap.png', {
            size: 0.45,
            color: maximallySparatedHues(Reticle.colorIndex++, 120, 120),
            unique: true // Each instance gets its own material
        });
        this.renderOrder = GameConfig.renderOrder.reticle;
        this.distance    = GameConfig.renderDepth.reticle;
    }
}

class Tree extends Sprite {
    constructor(azimuth) {
        super(Tree, '../textures/duckhunt/tree.png', {size: 2});
        this.renderOrder = GameConfig.renderOrder.tree;
        this.distance    = GameConfig.renderDepth.tree;
        this.azimuth     = azimuth;
        this.elevation   = 15;
        this.update();
    }
}

class BackgroundHound extends Sprite {
    constructor(azimuth) {
        super(BackgroundHound, '../textures/duckhunt/dog1.png', {size: 1, nCols: 4, nRows: 1});
        this.renderOrder = GameConfig.renderOrder.backgroundHound;
        this.distance    = GameConfig.renderDepth.backgroundHound;
        this.azimuth     = 20;
        this.elevation   = 0;
        this.frame = 1;
        this.update();
        
        this.hitAzimuth     = 20;
        this.hitCount       = 0;
        this.timeUntilPopup = 5;
        this.riseDuration   = 2;
        this.riseDistance   = 12;
        
        this.act = new ActionSequence([
            this.animateRise.bind(this),         this.riseDuration,
            this.animateJest.bind(this),         2,
            this.animateHide.bind(this),         this.riseDuration,
            this.animationResetCount.bind(this), 0.1,
            this.animationDone.bind(this),       Infinity
        ], 2);
    }
    
    setPose(t, animate) {
        if(this.hitCount > 1) {
            this.frame = 0;
        }
        else if(this.hitCount > 0) {
            this.frame = 1;
        }
        else {
            this.frame = (animate ? Math.floor(t*4 % 2) : 0) + 2;
        }
    }
    
    animateRise(t) {
        this.setPose(t);
        this.elevation = (t/this.riseDuration) * this.riseDistance;
        this.update();
    }
    
    animateJest(t) {
        this.setPose(t, true);
        this.update();
    }
    
    animateHide(t) {
        this.setPose(t);
        this.elevation = (1 - t/this.riseDuration) * this.riseDistance;
        this.update();
    }
    
    animationResetCount() {
        this.hitCount = 0;
    }
    
    animationDone() {
    }
    
    tallyHit(azimuth) {
        if(this.hitAzimuth && Math.abs(azimuth - this.hitAzimuth) < 30) {
            this.hitCount++;
        } else {
            this.hitAzimuth = azimuth;
            this.hitCount   = 1;
        }
    }
    
    tallyMiss(azimuth) {
        if(this.hitCount == 0) {
            this.hitAzimuth = azimuth;
            this.hitCount = -1;
        }
    }
    
    popup() {
        this.azimuth = this.hitAzimuth;
        this.act.start();
    }
    
    animate(t, dt) {
        this.act.animate(t, dt);
        
        this.timeUntilPopup -= dt;
        if(this.timeUntilPopup < 0) {
            this.timeUntilPopup = Math.random() * 10 + 2;
            if(this.hitCount != 0) {
                this.popup();
            }
        }
    }
}

class ForegroundHound extends Sprite {
    constructor(azimuth) {
        super(ForegroundHound, '../textures/duckhunt/dog2.png', {size: 1, nCols: 8, nRows: 1});
        this.act = new ActionSequence([
            this.animateWalking.bind(this),    3,
            this.animateSniffing.bind(this),   2,
            this.animateWalking.bind(this),    5,
            this.animateSniffing.bind(this),   2,
            this.animateExcited.bind(this),    1,
            this.animateLeap.bind(this),       1,
            this.animateFall.bind(this),       1,
            this.animationFinished.bind(this), 0
        ], 4);
        
        this.sound = new THREE.Audio(audioListener);
        audioLoader.load('../sounds/duckhunt/sniff.ogg', buffer => {
            this.sound.setBuffer(buffer);
            this.sound.play();
            this.soundReady = true;
        });
    }
    
    derJump(t) {
        const jumpHeight = 10;
        // Equation of jump:
        //    y    = 2t - t^2
        //   dy/dt = 2 - 2t
        return (2 - 2 * t) * jumpHeight;
    }
    
    animateSniffing(t, dt, absT) {
        this.frame   = Math.floor((absT/2) % 2);
    }
    
    animateWalking(t, dt, absT) {
        this.frame   = 1 + Math.floor((absT/2) % 4);
        this.azimuth += dt;
        this.update();
    }
    
    animateExcited(t, dt, absT) {
        this.frame   = 5;
    }
    
    animateLeap(t, dt, absT) {
        this.frame     = 6;
        this.azimuth   += dt;
        this.elevation += dt * this.derJump(t);
        this.update();
    }
    
    animateFall(t, dt, absT) {
        this.frame     = 7;
        this.azimuth   += dt;
        this.elevation += dt * this.derJump(t + 1);
        this.renderOrder = GameConfig.renderOrder.backgroundHound;
        this.distance    = 0.15;
        this.update();
    }
    
    animationFinished(t, dt, absT) {
        this.representation.visible = false;
        if(this.callback) {
            this.callback();
        }
    }
  
    animate(t, dt) {
        this.act.animate(t, dt);
    }
    
    start(callback) {
        this.callback    = callback;
        this.renderOrder = GameConfig.renderOrder.foregroundHound;
        this.distance    = GameConfig.renderDepth.foregroundHound;
        this.azimuth     = -15;
        this.elevation   = 5;
        this.frame       = 1;
        this.representation.visible = true;
        this.update();
        this.act.start();
        if(this.soundReady) {
            this.sound.play();
        }
    }
    
    get animating() {
        return this.act.animating;
    }
}

class Duck extends Sprite {
    constructor(id, isBlack) {
        super(Duck,
            '../textures/duckhunt/' + (isBlack ? 'black_duck.png' : 'red_duck.png'),
            {size: 0.75, nCols: 4, nRows: 4}
        );
        this.renderOrder = GameConfig.renderOrder.ducks;
        this.distance    = GameConfig.renderDepth.ducks;
        this.azimuth     = 10;
        this.elevation   = 45;
        this.frame       = 1;
        this.id          = id;
        this.update();
        
        this.elevationMax = 80;
        this.elevationMin = 10;
        
        this.dy          =  -0.6;
        this.dx          =  -1.5;
        
        this.isFallen    = false;
        
        this.targetElevation = 45;
        this.timeUntilDirectionChange = 0;
        
        this.representation.userData.isDuck = this;
        
        this.act = new ActionSequence([
            this.animateFlying.bind(this),    Infinity,
            this.animateShocked.bind(this),   1,
            this.animateFalling.bind(this),   Infinity
        ]);
        
        this.spawn();
    }
    
    choosePosture(t) {
        var direction     = (this.dx > 0)   ? 6 : 0;
        var flapSpeed     = (this.dy > 0.5) ? 2 : 1;
        var angleOfAttack = (this.dy > 0.5) ? 3 : 0;
        var gliding       = (this.dy < -0.5);
        if(gliding) {
            this.frame = (this.dx > 0) ? 6 : 2; 
        } else {
            this.frame = Math.floor(t*5*flapSpeed % 3) + angleOfAttack + direction;
        }
    }
    
    updatePosition(dt) {
        this.azimuth   += this.dx * dt * 10;
        this.elevation += this.dy * dt * 10;        
    }
    
    animateFlying(t, dt) {
        this.checkExtremes(t, dt);
        this.checkPathChange(t, dt);
        this.choosePosture(t);
    }
    
    checkExtremes(t, dt) {
        if((this.elevation > this.elevationMax && this.dy > 0) ||
           (this.elevation < this.elevationMin && this.dy < 0)) {
            this.dy = 0;
        }
    }
        
    checkPathChange(t, dt) {
        // At random intervals, the duck chooses a new elevation to fly towards.
        this.timeUntilDirectionChange -= dt;
        if(this.timeUntilDirectionChange < 0) {
            this.timeUntilDirectionChange = Math.random() * 10 + 2;
            this.targetElevation = Math.random() * (this.elevationMax - this.elevationMin) + this.elevationMin;
        }
        
        // Adjust change of elevation based on how far the duck is from the target elevation
        this.dy = (this.targetElevation - this.elevation) / 20;
    }
    
    animateShocked(t, dt, tAbs, first) {
        if(first) {
            this.frame   = (this.dx > 0) ? 12 : 13;
        }
        this.dx      = 0;
        this.dy      = 0;
    }
    
    animateFalling(t, dt) {
        if(this.elevation > 0) {
            this.frame   = Math.floor(t*6 % 2) + 14;
            this.dx      = 0;
            this.dy      = -2;
        } else {
            this.isFallen = true;
            if(this.callback) {
                this.callback();
                this.act.stop();
            }
        }
    }
    
    shot(callback) {
        if(!this.isShot) {
            this.isShot = true;
            this.callback = callback;
            this.act.next();
        }
    }
    
    animate(t, dt) {
        if(this.isFallen) {
            return;
        }
        this.act.animate(t, dt);
        this.updatePosition(dt);
        this.update();
    }
    
    spawn() {
        // First three ducks, startled by hound behind first tree.
        // Others start behind other trees.
        var tree = (this.id < 3) ? 0 : Math.floor(Math.random() * GameConfig.treeAzimuth.length);
        var speed = 1.5 + Math.random();
        
        this.isFallen                 = false;
        this.isShot                   = false;
        this.elevation                = 0;
        this.azimuth                  = GameConfig.treeAzimuth[tree];
        this.timeUntilDirectionChange = 0;
        this.dx                       = (Math.random() < 0.5) ? -speed : speed;
        this.act.start();
    }
}

class ActionSequence {
    constructor(sequence, speed) {
        this.sequence  = sequence;
        this.speed     = speed || 1;
    }
    
    start() {
        this.animating = true;
        this.which     = 0;   // Which action are we performing?
        this.tZero     = 0;   // Time at start of action
        this.tAbsolute = 0;   // Absolute time of entire sequence
        this.tInAction = 0;   // Runs from 0 to 1 for each action
        this.first     = 0;   // 1 if first frame in action; 0 otherwise        
    }
    
    stop() {
        this.animating = false;
    }
    
    animate(t, dt) {
        if(!this.animating) {
            return;
        }
        this.lastTInAction = this.tInAction;
        this.tAbsolute    += dt*this.speed;
        this.tInAction     = this.tAbsolute - this.tZero;
        var duration       = this.sequence[this.which+1];
        if(this.tInAction >= duration) {
            this.next();
        }
        if(this.which < this.sequence.length) {
            var func = this.sequence[this.which];
            var dt   = Math.max(this.tInAction - this.lastTInAction, 0);
            func(this.tInAction, dt, this.tAbsolute, this.first);
            this.first = 0;
        } else {
            this.animating = false;
        }
    }
    
    next() {
        this.which        += 2;
        this.tZero        += this.tInAction;
        this.lastTInAction = this.tInAction;
        this.tInAction     = 0;
        this.first         = 1;
    }
}