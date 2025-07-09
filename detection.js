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
        this.plateImages = []; // Store cropped license plate images
        this.videoElement = null; // Reference to video element
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
        this.videoElement = videoElement; // Store reference
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
                    licensePlate: this.detectLicensePlate(prediction.bbox),
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

    detectLicensePlate(bbox) {
        // More accurate license plate detection simulation
        const [x, y, width, height] = bbox;
        
        // Only detect plates on larger vehicles (more realistic)
        const vehicleArea = width * height;
        const minVehicleSize = 5000; // Minimum vehicle size for plate detection
        
        if (vehicleArea < minVehicleSize) {
            return null;
        }
        
        // Higher accuracy for frontal/rear views (wider than tall)
        const aspectRatio = width / height;
        const detectionProbability = aspectRatio > 1.2 ? 0.7 : 0.3;
        
        if (Math.random() > detectionProbability) {
            return null;
        }
        
        // Generate more realistic license plate patterns
        const platePatterns = [
            () => this.generateStandardPlate(), // ABC 1234
            () => this.generateCustomPlate(),   // CUSTOM1
            () => this.generateCommercialPlate() // C123456
        ];
        
        const plateGenerator = platePatterns[Math.floor(Math.random() * platePatterns.length)];
        const plateNumber = plateGenerator();
        
        // Calculate realistic plate position within vehicle bbox
        const plateRegion = this.calculatePlateRegion(bbox);
        
        // Crop the license plate image
        const plateImage = this.cropLicensePlate(plateRegion);
        
        const plateData = {
            number: plateNumber,
            confidence: 0.65 + Math.random() * 0.35,
            region: plateRegion,
            image: plateImage,
            vehicleType: this.getVehicleTypeFromBbox(bbox)
        };
        
        // Store the plate image for cataloging
        this.plateImages.push({
            ...plateData,
            timestamp: Date.now(),
            vehicleId: `vehicle_${Date.now()}`
        });
        
        return plateData;
    }

    generateStandardPlate() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        let plate = '';
        
        // ABC 1234 format
        for (let i = 0; i < 3; i++) {
            plate += letters[Math.floor(Math.random() * letters.length)];
        }
        plate += ' ';
        for (let i = 0; i < 4; i++) {
            plate += numbers[Math.floor(Math.random() * numbers.length)];
        }
        
        return plate;
    }

    generateCustomPlate() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let plate = '';
        const length = 5 + Math.floor(Math.random() * 3); // 5-7 characters
        
        for (let i = 0; i < length; i++) {
            plate += chars[Math.floor(Math.random() * chars.length)];
        }
        
        return plate;
    }

    generateCommercialPlate() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        
        let plate = letters[Math.floor(Math.random() * letters.length)];
        for (let i = 0; i < 6; i++) {
            plate += numbers[Math.floor(Math.random() * numbers.length)];
        }
        
        return plate;
    }

    calculatePlateRegion(vehicleBbox) {
        const [vx, vy, vw, vh] = vehicleBbox;
        
        // License plate is typically in the front or rear, lower portion
        const plateWidth = vw * 0.3; // Plate is about 30% of vehicle width
        const plateHeight = vh * 0.08; // Plate is about 8% of vehicle height
        
        // Position in lower portion of vehicle
        const plateX = vx + (vw - plateWidth) / 2;
        const plateY = vy + vh * 0.7; // 70% down from top
        
        return [plateX, plateY, plateWidth, plateHeight];
    }

    cropLicensePlate(plateRegion) {
        if (!this.videoElement) return null;
        
        const [x, y, width, height] = plateRegion;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = width;
        canvas.height = height;
        
        // Scale coordinates to match video dimensions
        const scaleX = this.videoElement.videoWidth / this.overlay.width;
        const scaleY = this.videoElement.videoHeight / this.overlay.height;
        
        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        const scaledWidth = width * scaleX;
        const scaledHeight = height * scaleY;
        
        try {
            ctx.drawImage(
                this.videoElement,
                scaledX, scaledY, scaledWidth, scaledHeight,
                0, 0, width, height
            );
            
            return canvas.toDataURL('image/jpeg', 0.8);
        } catch (error) {
            console.error('Error cropping license plate:', error);
            return null;
        }
    }

    getVehicleTypeFromBbox(bbox) {
        const [x, y, width, height] = bbox;
        const aspectRatio = width / height;
        
        if (aspectRatio > 2.5) return 'truck';
        if (aspectRatio > 1.8) return 'car';
        if (aspectRatio < 1.2) return 'motorcycle';
        return 'car';
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
                <div class="plate-header">
                    <div class="plate-number">${detection.licensePlate.number}</div>
                    ${detection.licensePlate.image ? `<img src="${detection.licensePlate.image}" class="plate-image" alt="License plate">` : ''}
                </div>
                <div class="plate-details">
                    <div class="plate-confidence">
                        Confidence: ${Math.round(detection.licensePlate.confidence * 100)}%
                    </div>
                    <div class="plate-confidence">
                        Vehicle: ${detection.class.charAt(0).toUpperCase() + detection.class.slice(1)}
                    </div>
                    <div class="plate-confidence">
                        Color: ${detection.color}
                    </div>
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