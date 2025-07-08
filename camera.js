class CameraManager {
    constructor() {
        this.stream = null;
        this.video = document.getElementById('video');
        this.isActive = false;
        this.constraints = {
            video: {
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
                facingMode: 'environment'
            },
            audio: false
        };
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
            this.video.srcObject = this.stream;
            this.isActive = true;
            this.updateStatus(true);
            
            // Wait for video to load
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.updateStatus(false);
            throw error;
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.video.srcObject = null;
            this.isActive = false;
            this.updateStatus(false);
        }
    }

    updateStatus(active) {
        const indicator = document.getElementById('camera-status');
        if (active) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    }

    captureFrame() {
        if (!this.isActive) return null;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        
        ctx.drawImage(this.video, 0, 0);
        return canvas;
    }

    getVideoElement() {
        return this.video;
    }
}

