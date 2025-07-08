class TrafficMonitorApp {
    constructor() {
        this.camera = new CameraManager();
        this.detection = new DetectionManager(document.getElementById('overlay'));
        this.speed = new SpeedManager();
        this.isRecording = false;
        this.recordingStartTime = null;
        this.recordingTimer = null;
        
        this.initializeEventListeners();
        this.initialize();
    }

    async initialize() {
        try {
            await this.detection.loadModel();
            this.speed.startTracking();
            console.log('Traffic Monitor initialized');
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    initializeEventListeners() {
        const toggleCameraBtn = document.getElementById('toggleCamera');
        const toggleRecordingBtn = document.getElementById('toggleRecording');
        const captureFrameBtn = document.getElementById('captureFrame');

        toggleCameraBtn.addEventListener('click', () => this.toggleCamera());
        toggleRecordingBtn.addEventListener('click', () => this.toggleRecording());
        captureFrameBtn.addEventListener('click', () => this.captureFrame());

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleResize(), 100);
        });
    }

    async toggleCamera() {
        const btn = document.getElementById('toggleCamera');
        const recordingBtn = document.getElementById('toggleRecording');
        const captureBtn = document.getElementById('captureFrame');

        if (!this.camera.isActive) {
            try {
                btn.textContent = 'Starting...';
                btn.disabled = true;
                
                await this.camera.startCamera();
                this.setupOverlay();
                this.detection.startDetection(this.camera.getVideoElement());
                
                btn.textContent = 'Stop Camera';
                btn.disabled = false;
                recordingBtn.disabled = false;
                captureBtn.disabled = false;
                
            } catch (error) {
                console.error('Failed to start camera:', error);
                alert('Failed to access camera. Please check permissions.');
                btn.textContent = 'Start Camera';
                btn.disabled = false;
            }
        } else {
            this.camera.stopCamera();
            this.detection.stopDetection();
            
            if (this.isRecording) {
                this.stopRecording();
            }
            
            btn.textContent = 'Start Camera';
            recordingBtn.disabled = true;
            captureBtn.disabled = true;
            recordingBtn.textContent = 'Start Recording';
        }
    }

    setupOverlay() {
        const video = this.camera.getVideoElement();
        const overlay = document.getElementById('overlay');
        
        const resizeOverlay = () => {
            overlay.width = video.clientWidth;
            overlay.height = video.clientHeight;
        };
        
        video.addEventListener('loadedmetadata', resizeOverlay);
        window.addEventListener('resize', resizeOverlay);
        
        // Initial resize
        setTimeout(resizeOverlay, 100);
    }

    toggleRecording() {
        if (!this.isRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    startRecording() {
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        
        const btn = document.getElementById('toggleRecording');
        btn.textContent = 'Stop Recording';
        btn.style.background = '#ff4444';
        
        this.startRecordingTimer();
    }

    stopRecording() {
        this.isRecording = false;
        this.recordingStartTime = null;
        
        const btn = document.getElementById('toggleRecording');
        btn.textContent = 'Start Recording';
        btn.style.background = '';
        
        this.stopRecordingTimer();
    }

    startRecordingTimer() {
        this.recordingTimer = setInterval(() => {
            if (this.recordingStartTime) {
                const elapsed = Date.now() - this.recordingStartTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                
                document.getElementById('recordingTime').textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        document.getElementById('recordingTime').textContent = '00:00';
    }

    captureFrame() {
        const canvas = this.camera.captureFrame();
        if (canvas) {
            // Convert to blob and download
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `traffic_capture_${Date.now()}.png`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }
    }

    handleResize() {
        if (this.camera.isActive) {
            this.setupOverlay();
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TrafficMonitorApp();
});

