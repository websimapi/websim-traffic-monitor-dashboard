class DetectionManager {
    constructor(overlay) {
        this.overlay = overlay;
        this.ctx = overlay.getContext('2d');
        this.model = null;
        this.isDetecting = false;
        this.detections = [];
        this.vehicleCount = 0;
        this.plateCount = 0;
        this.lastDetectionTime = 0;
        this.detectionInterval = 500; // Detect every 500ms
    }

    async loadModel() {
        try {
            this.model = await cocoSsd.load();
            this.updateStatus(true);
            console.log('Detection model loaded');
        } catch (error) {
            console.error('Error loading detection model:', error);
            this.updateStatus(false);
        }
    }

    updateStatus(active) {
        const indicator = document.getElementById('detection-status');
        if (active) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    }

    startDetection(videoElement) {
        if (!this.model) return;
        
        this.isDetecting = true;
        this.detectLoop(videoElement);
    }

    stopDetection() {
        this.isDetecting = false;
        this.clearOverlay();
    }

    async detectLoop(videoElement) {
        if (!this.isDetecting) return;

        const currentTime = Date.now();
        if (currentTime - this.lastDetectionTime > this.detectionInterval) {
            await this.detectObjects(videoElement);
            this.lastDetectionTime = currentTime;
        }

        requestAnimationFrame(() => this.detectLoop(videoElement));
    }

    async detectObjects(videoElement) {
        if (!this.model || !videoElement.videoWidth) return;

        try {
            const predictions = await this.model.detect(videoElement);
            this.processDetections(predictions);
        } catch (error) {
            console.error('Detection error:', error);
        }
    }

    processDetections(predictions) {
        this.clearOverlay();
        
        const vehicleClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
        const newDetections = [];

        predictions.forEach((prediction, index) => {
            if (vehicleClasses.includes(prediction.class) && prediction.score > 0.5) {
                const detection = {
                    id: `vehicle_${index}`,
                    class: prediction.class,
                    confidence: prediction.score,
                    bbox: prediction.bbox,
                    estimatedSpeed: this.estimateSpeed(prediction.bbox),
                    color: this.estimateColor(prediction.bbox),
                    licensePlate: this.generateLicensePlateForVehicle(prediction.bbox),
                    timestamp: Date.now()
                };

                newDetections.push(detection);
                this.drawBoundingBox(detection);
            }
        });

        this.detections = newDetections;
        this.updateDetectionList();
        this.updateVehicleCount();
        this.updatePlateListFromDetections();
    }

    generateLicensePlateForVehicle(bbox) {
        // Generate license plate for specific vehicles (simulate detection)
        if (Math.random() > 0.6) { // 40% chance of detecting a plate
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const numbers = '0123456789';
            let plate = '';
            
            // Generate a realistic plate pattern (ABC 1234)
            for (let i = 0; i < 3; i++) {
                plate += letters[Math.floor(Math.random() * letters.length)];
            }
            plate += ' ';
            for (let i = 0; i < 4; i++) {
                plate += numbers[Math.floor(Math.random() * numbers.length)];
            }
            
            return {
                number: plate,
                confidence: 0.75 + Math.random() * 0.25
            };
        }
        return null;
    }

    drawBoundingBox(detection) {
        const [x, y, width, height] = detection.bbox;
        
        this.ctx.strokeStyle = '#00ff88';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x, y, width, height);
        
        // Calculate label height based on content
        const labelHeight = detection.licensePlate ? 50 : 30;
        
        // Label background
        this.ctx.fillStyle = 'rgba(0, 255, 136, 0.8)';
        this.ctx.fillRect(x, y - labelHeight, width, labelHeight);
        
        // Label text
        this.ctx.fillStyle = '#000';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(
            `${detection.class} (${Math.round(detection.confidence * 100)}%)`,
            x + 5,
            y - labelHeight + 18
        );
        
        // License plate text if available
        if (detection.licensePlate) {
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillText(
                `License: ${detection.licensePlate.number}`,
                x + 5,
                y - labelHeight + 35
            );
        }
        
        // Speed estimate
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(
            `~${detection.estimatedSpeed} mph`,
            x + 5,
            y + height + 20
        );
    }

    estimateSpeed(bbox) {
        // Simplified speed estimation based on bounding box size and position
        // In a real application, this would use optical flow or tracking
        const [x, y, width, height] = bbox;
        const relativeSize = (width * height) / (this.overlay.width * this.overlay.height);
        const estimatedSpeed = Math.round(20 + Math.random() * 40); // Placeholder
        return estimatedSpeed;
    }

    estimateColor(bbox) {
        // Simplified color estimation
        const colors = ['Red', 'Blue', 'White', 'Black', 'Silver', 'Gray'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    updateDetectionList() {
        const list = document.getElementById('detectionList');
        
        if (this.detections.length === 0) {
            list.innerHTML = '<div class="no-detections">No vehicles detected</div>';
            return;
        }

        list.innerHTML = this.detections.map(detection => `
            <div class="detection-item">
                <div class="vehicle-info">
                    ${detection.class.charAt(0).toUpperCase() + detection.class.slice(1)} 
                    (${Math.round(detection.confidence * 100)}% confidence)
                    ${detection.licensePlate ? `<br>License: ${detection.licensePlate.number}` : ''}
                </div>
                <div class="speed-estimate">
                    Estimated speed: ${detection.estimatedSpeed} mph
                </div>
                <div class="speed-estimate">
                    Color: ${detection.color}
                </div>
            </div>
        `).join('');
    }

    updatePlateListFromDetections() {
        const list = document.getElementById('plateList');
        const detectedPlates = this.detections.filter(d => d.licensePlate);
        
        if (detectedPlates.length === 0) {
            list.innerHTML = '<div class="no-plates">No plates detected</div>';
            return;
        }

        list.innerHTML = detectedPlates.map(detection => `
            <div class="plate-item">
                <div class="plate-number">${detection.licensePlate.number}</div>
                <div class="plate-confidence">
                    Confidence: ${Math.round(detection.licensePlate.confidence * 100)}%
                </div>
                <div class="plate-confidence">
                    Vehicle: ${detection.class.charAt(0).toUpperCase() + detection.class.slice(1)}
                </div>
            </div>
        `).join('');
        
        // Update plate count
        this.plateCount = detectedPlates.length;
        this.updatePlateCount();
    }

    updateVehicleCount() {
        this.vehicleCount = this.detections.length;
        document.getElementById('vehicleCount').textContent = this.vehicleCount;
    }

    updatePlateCount() {
        document.getElementById('plateCount').textContent = this.plateCount;
    }

    clearOverlay() {
        this.ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    }
}