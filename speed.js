class SpeedManager {
    constructor() {
        this.currentSpeed = 0;
        this.watchId = null;
        this.lastPosition = null;
        this.lastTimestamp = null;
        this.isTracking = false;
        this.speedHistory = [];
        this.maxHistoryLength = 10;
    }

    startTracking() {
        if (!navigator.geolocation) {
            console.error('Geolocation is not supported');
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.handlePosition(position),
            (error) => this.handleError(error),
            options
        );

        this.isTracking = true;
        this.updateStatus(true);
    }

    stopTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            this.isTracking = false;
            this.updateStatus(false);
        }
    }

    handlePosition(position) {
        const currentTime = Date.now();
        const currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: currentTime
        };

        if (this.lastPosition && this.lastTimestamp) {
            const distance = this.calculateDistance(
                this.lastPosition.latitude,
                this.lastPosition.longitude,
                currentPosition.latitude,
                currentPosition.longitude
            );

            const timeDiff = (currentTime - this.lastTimestamp) / 1000; // seconds
            const speed = (distance / timeDiff) * 2.237; // Convert m/s to mph

            if (speed > 0 && speed < 200) { // Filter out unrealistic speeds
                this.currentSpeed = speed;
                this.speedHistory.push(speed);
                
                if (this.speedHistory.length > this.maxHistoryLength) {
                    this.speedHistory.shift();
                }
                
                // Use smoothed speed
                const smoothedSpeed = this.getSmoothedSpeed();
                this.updateSpeedDisplay(smoothedSpeed);
            }
        }

        this.lastPosition = currentPosition;
        this.lastTimestamp = currentTime;
    }

    handleError(error) {
        console.error('Geolocation error:', error);
        this.updateStatus(false);
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    getSmoothedSpeed() {
        if (this.speedHistory.length === 0) return 0;
        
        const sum = this.speedHistory.reduce((a, b) => a + b, 0);
        return sum / this.speedHistory.length;
    }

    updateSpeedDisplay(speed) {
        const speedElement = document.getElementById('currentSpeed');
        speedElement.textContent = Math.round(speed);
        
        // Add speed-based styling
        speedElement.className = 'speed-value';
        if (speed > 70) {
            speedElement.style.color = '#ff4444';
        } else if (speed > 50) {
            speedElement.style.color = '#ffaa00';
        } else {
            speedElement.style.color = '';
        }
    }

    updateStatus(active) {
        const indicator = document.getElementById('gps-status');
        if (active) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    }

    getCurrentSpeed() {
        return this.currentSpeed;
    }
}

