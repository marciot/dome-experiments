class DomeInteraction {
    constructor(participantFactory, stateChanged) {
        this.participants = [];
        this.participantMap = new Map();
        this.participantFactory = participantFactory;
        
        this.communications = new PeerCommunications(
            {key: DomeInteractionConfig.apiKey},
            DomeInteractionConfig.peerPrefix,
            {
                receivedData: this.receivedData.bind(this),
                connectionClosed: this.connectionClosed.bind(this),
                stateChanged: stateChanged
            }
        );
        this.communications.join(true);
    }
    
    receivedData(e, peer) {
        var participant;
        if(!this.participantMap.has(peer)) {
            participant = this.participantFactory(peer);
            this.participantMap.set(peer, participant);
            this.participants.push(participant);
        } else {
            participant = this.participantMap.get(peer);
        }
        participant.processEvent(e);
    }
    
    connectionClosed(peer) {
        if(this.participantMap.has(peer)) {
            var participant = this.participantMap.get(peer);
            this.participantMap.delete(peer);
            var index = this.participants.indexOf(participant);
            if (index > -1) {
                this.participants.splice(index, 1);
            }
            participant.disconnected();
        }
    }
    
    animate(t, dt) {
        this.participants.forEach(function(p) {p.animate(t, dt)});
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