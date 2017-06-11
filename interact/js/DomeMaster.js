class DomeInteraction {
    constructor(participantFactory, stateChanged) {
        this.participants = [];
        this.participantMap = new Map();
        this.participantFactory = participantFactory;
        
        this.enableNetworkInteraction(stateChanged);
        this.enableLocalInteraction();
    }

    dispatchEventFromPolarCoordinates(azimuth, elevation, touching) {
        if(!this.quaternion) {
            this.quaternion     = new THREE.Quaternion();
            this.euler          = new THREE.Euler(-RendererConfig.dome.inclination,0,0, 'YXZ');
            this.tiltQuaternion = new THREE.Quaternion().setFromEuler(this.euler);
        }
        this.euler.set((90 - elevation)/180*Math.PI, (180 - azimuth) /180*Math.PI, 0, 'YXZ');
        this.quaternion.setFromEuler(this.euler).premultiply(this.tiltQuaternion);
        this.dispatchParticipationEvent("local", {
            orientation: [this.quaternion.x,this.quaternion.y,this.quaternion.z,this.quaternion.w],
            touching:    touching
        });
    }

    dispatchParticipationEvent(participantId, event) {
        var participant;
        if(!this.participantMap.has(participantId)) {
            participant = this.participantFactory(participantId);
            this.participantMap.set(participantId, participant);
            this.participants.push(participant);
        } else {
            participant = this.participantMap.get(participantId);
        }
        participant.processEvent(event);
    }

    removeParticipant(participantId) {
        if(this.participantMap.has(participantId)) {
            var participant = this.participantMap.get(participantId);
            this.participantMap.delete(participantId);
            var index = this.participants.indexOf(participant);
            if (index > -1) {
                this.participants.splice(index, 1);
            }
            participant.disconnected();
        }
    }

    forEach(func) {
        for(var i = 0; i < this.participants.length; i++) {
            func(this.participants[i]);
        }
    }

    animate(t, dt) {
        this.participants.forEach(function(p) {p.animate(t, dt)});
    }

    enableNetworkInteraction(stateChanged) {
        this.communications = new PeerCommunications(
            {key: DomeInteractionConfig.apiKey},
            DomeInteractionConfig.peerPrefix,
            {
                receivedData:     (e, peer) => this.dispatchParticipationEvent(peer, e),
                connectionClosed: (peer)    => this.removeParticipant(peer),
                stateChanged: stateChanged
            }
        );
        this.communications.join(true);
    }

    enableLocalInteraction() {
        RendererConfig.interaction = this;
    }

    getUrlSuffix() {
        return this.communications.getUrlSuffix();
    }
}

class DomeParticipant {
    constructor() {
        this.clock        = new THREE.Clock();
        this.lastTouching = null;
        this.quaternion   = new THREE.Quaternion();
        this.pointing     = new THREE.Vector3();

        this.inclinationQuat = new THREE.Quaternion();
        this.inclinationQuat.setFromEuler(new THREE.Euler(RendererConfig.dome.inclination, 0, 0));
    }

    processEvent(e) {
        // Convert the quaternion into a direction vector
        this.quaternion.fromArray(e.orientation);
        this.pointing.set(0, 1, 0)
            .applyQuaternion(this.quaternion)
            .applyQuaternion(this.inclinationQuat);

        e.pointing   = this.pointing;
        e.quaternion = this.quaternion;
        e.touchState = null;

        // Convert into azimuth and elevation
        var l        = Math.sqrt(this.pointing.x*this.pointing.x + this.pointing.z*this.pointing.z);
        e.azimuth    = 180 - Math.atan2(this.pointing.x, this.pointing.z) / Math.PI * 180;
        e.elevation  = Math.atan2(this.pointing.y, l)                     / Math.PI * 180;

        // Set the touch state.
        const timeSinceLastTouch = this.clock.getElapsedTime() - this.lastTouching;
        if(e.touching) {
            if(!this.lastTouching) {
                this.lastTouching = this.clock.getElapsedTime();
                this.buttonDown(e);
            } else {
                if(timeSinceLastTouch > 0.1) {
                    e.touchState = "holding";
                }
            }
        } else {
            if(this.lastTouching) {
                if(timeSinceLastTouch < 0.1) {
                    e.touchState = "tap";
                }
                this.buttonUp(e);
            }
            this.lastTouching = null;
        }
        this.pointerMoved(e);
    }

    interact(e) {
        // This function is overidden in the subclass.
    }

    disconnected() {
        // This function is overidden in the subclass.
    }
}