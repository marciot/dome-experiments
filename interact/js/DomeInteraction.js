function PeerCommunications(peerOptions, roomId, callbacks) {
    var me = this;
    
    this.roomId      = roomId;
    this.connections = [];
    this.callbacks   = callbacks;
    
    this.join = function (asMaster) {
        function errorFunc(err) {
            console.log('error', err.type);
            if(me.callbacks.stateChanged) {
                me.callbacks.stateChanged('error', err.type);
            }
        }
        function peerOpenFunc(id) {
            console.log("Connected. My id is", id);
            if(me.callbacks.stateChanged) {
                me.callbacks.stateChanged('open');
            }
            me.isJoined    = true;
            me.isMaster    = false;
            me.myPeerId    = id;
        }
        console.log("Attempting to connect to", me.roomId);
        if(asMaster) {
            me.peer = new Peer(me.roomId, peerOptions);
        } else {
            me.peer = new Peer(peerOptions);
        }
        me.peer.on('error', errorFunc);
        me.peer.on('open', peerOpenFunc);
        me.peer.on('connection', me.processConnection.bind(me));
        if(!asMaster) {
            me.processConnection(me.peer.connect(me.roomId));
        }
    }
    
    this.processConnection = function(newConnection) {
        var peer = newConnection.peer;
        var me = this;
        function openCallback() {
            if(me.callbacks.stateChanged) {
                me.callbacks.stateChanged('connected');
            }
            console.log("Accepting connection from", peer);
            me.connections.push(newConnection);
        }
        newConnection.on('data',  function(obj) {me.receivedNetworkObject(peer, obj);});
        newConnection.on('close', function()    {me.connectionClosed(peer);});
        newConnection.on('open', openCallback);
    }
    
    this.connectionClosed = function(peer) {
        console.log("Peer closed connection", peer);
        if(me.callbacks.connectionClosed) {
            me.callbacks.connectionClosed(peer);
        }
    }
    
    this.receivedNetworkObject = function(peer, obj) {
        if(me.callbacks.receivedData) {
            me.callbacks.receivedData(obj, peer);
        }
    }
    
    this.sendDataToAll = function(obj) {
        this.connections.forEach(function(c) {c.send(obj);});
    }
    
    this.setState = function(state, info) {
        console.log(state, info);
    }
}

function DomeParticipant(options) {
    this.comm = new PeerCommunications(
        {key: options.apiKey},
        options.roomId,
        {
            stateChanged: options.statusCallback
        }
    );
    this.comm.join(false);
    
    var vrDisplay = null;
    function setupVR(callback) {
        if(!navigator.getVRDisplays) {
            alert("WebVR is not supported");
            return;
        }

        // Get the VRDisplay and save it for later.
        navigator.getVRDisplays().then(
            function(displays) {
                for(var i = 0; i < displays.length; i++) {
                    if(displays[i].capabilities.hasOrientation) {
                        vrDisplay = displays[i];
                        callback()
                        return;
                    }
                }
                alert("WebVR is supported, but no VR displays found");
            }
        );
    }

    var touching = false;
    var me       = this;
    function update() {
        var pose = vrDisplay.getPose();
        me.comm.sendDataToAll({
            orientation: [pose.orientation[0],pose.orientation[1],pose.orientation[2],pose.orientation[3]],
            touching:    touching
        });
        vrDisplay.requestAnimationFrame(update);
    }
    
    setupVR(function() {
        vrDisplay.requestAnimationFrame(update);
    });
    
    document.body.style.background = "black";
    options.touchElement.addEventListener("touchstart", function(e) {
        touching = true;
        options.touchElement.classList.add("pressed");
        e.stopPropagation();
        e.preventDefault();
    });
    options.touchElement.addEventListener("touchend",   function(e) {
        touching = false;
        options.touchElement.classList.remove("pressed");
        e.stopPropagation();
        e.preventDefault();
    });
}

function DomeEventListener(peerOptions, roomId, callbacks) {
    var clock        = new THREE.Clock();
    var quaternion   = new THREE.Quaternion();
    var pointing     = new THREE.Vector3();
    var lastTouching = null;
    function receivedData(e, peer) {
        const timeSinceLastTouch = clock.getElapsedTime() - lastTouching;
        if(e.touching) {
            if(!lastTouching) {
                lastTouching = clock.getElapsedTime();
            } else {
                if(timeSinceLastTouch > 0.1) {
                    e.touchState = "holding";
                }
            }
        } else {
            if(lastTouching && timeSinceLastTouch < 0.1) {
                e.touchState = "tap";
            }
            lastTouching = null;
        }
        quaternion.fromArray(e.orientation);
        pointing.set(0,1,0).applyQuaternion(quaternion);
        e.pointing = pointing;
        callbacks.interaction(e, peer);
    }
    this.controller = new PeerCommunications(
        peerOptions,
        roomId,
        {
            receivedData: receivedData,
            connectionClosed: callbacks.connectionClosed
        }
    );
    this.controller.join(true);
}

function DomeInteraction(createParticipant, removeParticipant) {
    var participants = [];
    var participantMap = new Map();
    function interactCallback(e, peer) {
        var participant;
        if(!participantMap.has(peer)) {
            participant = createParticipant(e, peer);
            participantMap.set(peer, participant);
            participants.push(participant);
        } else {
            participant = participantMap.get(peer);
        }
        participant.interact(e);
    }
    function connectionClosed(peer) {
        if(participantMap.has(peer)) {
            var participant = participantMap.get(peer);
            participantMap.delete(peer);
            var index = participants.indexOf(participant);
            if (index > -1) {
                participants.splice(index, 1);
            }
            removeParticipant(participant);
        }
    }
    new DomeEventListener(
        {key: 'u7htss9n8pz257b9'},
        "domeInteraction",
        {
            interaction:      interactCallback,
            connectionClosed: connectionClosed
        }
    );
    this.animate = function(t) {
        participants.forEach(function(p) {p.animate(t)});
    }
}