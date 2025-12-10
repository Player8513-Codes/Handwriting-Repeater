class HandwritingRepeater {
    constructor() {
        this.drawingCanvas = document.getElementById('drawingCanvas');
        this.replayCanvas = document.getElementById('replayCanvas');
        this.replayCanvas2 = document.getElementById('replayCanvas2');
        this.drawCtx = this.drawingCanvas.getContext('2d');
        this.replayCtx = this.replayCanvas.getContext('2d');
        this.replayCtx2 = this.replayCanvas2 ? this.replayCanvas2.getContext('2d') : null;
        
        this.isDrawing = false;
        this.strokes = [];
        this.currentStroke = [];
        this.isFullscreen = false;
        this.isAnimating = false;
        this.animationFrame = null;
        this.playbackSpeed = 1;
        this.redLineCrossed = false;
        
        this.setupCanvasDPI();
        this.attachEventListeners();
        window.addEventListener('resize', () => this.handleResize());
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
    }

    setupCanvasDPI() {
        const dpr = window.devicePixelRatio || 1;
        this.dpr = dpr;
        
        // Get container dimensions
        const container = document.getElementById('mainContainer');
        let width = 800;
        let height = 600;
        
        if (document.fullscreenElement) {
            width = window.innerWidth - 40;
            height = window.innerHeight - 120;
        }
        
        this.canvasWidth = width;
        this.canvasHeight = height;
        
        // Set actual size of canvas
        this.drawingCanvas.width = width * dpr;
        this.drawingCanvas.height = height * dpr;
        this.replayCanvas.width = width * dpr;
        this.replayCanvas.height = height * dpr;
        if (this.replayCanvas2) {
            this.replayCanvas2.width = width * dpr;
            this.replayCanvas2.height = height * dpr;
        }
        
        // Scale canvas CSS size
        this.drawingCanvas.style.width = width + 'px';
        this.drawingCanvas.style.height = height + 'px';
        this.replayCanvas.style.width = width + 'px';
        this.replayCanvas.style.height = height + 'px';
        if (this.replayCanvas2) {
            this.replayCanvas2.style.width = width + 'px';
            this.replayCanvas2.style.height = height + 'px';
        }
        
        // Reset and scale context
        this.drawCtx = this.drawingCanvas.getContext('2d');
        this.replayCtx = this.replayCanvas.getContext('2d');
        if (this.replayCanvas2) this.replayCtx2 = this.replayCanvas2.getContext('2d');
        this.drawCtx.scale(dpr, dpr);
        this.replayCtx.scale(dpr, dpr);
        if (this.replayCtx2) this.replayCtx2.scale(dpr, dpr);
        
        this.redrawCanvas();
        this.redrawReplayOverlay();
        
        this.redrawCanvas();
    }

    handleResize() {
        if (document.fullscreenElement) {
            this.setupCanvasDPI();
        }
    }

    handleFullscreenChange() {
        this.setupCanvasDPI();
    }

    redrawCanvas() {
        // Clear and redraw background
        this.drawCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.drawLines(this.drawCtx);
        this.redrawStrokes(this.drawCtx);
    }

    drawLines(ctx) {
        // Pattern: grey, red, grey (repeating)
        ctx.lineWidth = 1;
        let yPos = 0;
        const lineHeight = 58;
        const pattern = ['grey', 'red', 'grey',];
        let patternIndex = 0;

        while (yPos < this.canvasHeight) {
            ctx.strokeStyle = pattern[patternIndex % pattern.length];
            ctx.beginPath();
            ctx.moveTo(0, yPos);
            ctx.lineTo(this.canvasWidth, yPos);
            ctx.stroke();
            
            yPos += lineHeight;
            patternIndex++;
        }
    }

    redrawStrokes(ctx) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        for (let stroke of this.strokes) {
            if (stroke.length < 2) continue;
            
            ctx.beginPath();
            ctx.moveTo(stroke[0].x, stroke[0].y);
            
            for (let i = 1; i < stroke.length; i++) {
                ctx.lineTo(stroke[i].x, stroke[i].y);
            }
            ctx.stroke();
        }
    }

    redrawReplayOverlay() {
        // Clear overlay
        this.replayCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Draw lines background
        this.drawLines(this.replayCtx);
        
        // Draw all completed strokes
        this.replayCtx.strokeStyle = '#000';
        this.replayCtx.lineWidth = 2;
        this.replayCtx.lineJoin = 'round';
        this.replayCtx.lineCap = 'round';

        for (let stroke of this.strokes) {
            if (stroke.length < 2) continue;
            this.replayCtx.beginPath();
            this.replayCtx.moveTo(stroke[0].x, stroke[0].y);
            for (let i = 1; i < stroke.length; i++) {
                this.replayCtx.lineTo(stroke[i].x, stroke[i].y);
            }
            this.replayCtx.stroke();
        }
    }

    updatePreview() {
        this.redrawReplayOverlay();
    }

    showCustomAlert(message) {
        const alertModal = document.getElementById('alertModal');
        const alertMessage = document.getElementById('alertMessage');
        const alertOkBtn = document.getElementById('alertOkBtn');
        
        alertMessage.textContent = message;
        alertModal.style.display = 'flex';
        
        alertOkBtn.focus();
        alertOkBtn.onclick = () => {
            alertModal.style.display = 'none';
        };
    }

    attachEventListeners() {
        this.drawingCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.drawingCanvas.addEventListener('mousemove', (e) => this.draw(e));
        this.drawingCanvas.addEventListener('mouseup', (e) => this.stopDrawing(e));
        this.drawingCanvas.addEventListener('mouseout', (e) => this.stopDrawing(e));

        // Touch events for mobile
        this.drawingCanvas.addEventListener('touchstart', (e) => this.startDrawing(e));
        this.drawingCanvas.addEventListener('touchmove', (e) => this.draw(e));
        this.drawingCanvas.addEventListener('touchend', (e) => this.stopDrawing(e));

        const submitBtn = document.getElementById('submitBtn');
        const clearBtn = document.getElementById('clearBtn');
        const againBtn = document.getElementById('againBtn');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const playBtn = document.getElementById('playBtn');
        const stopBtn = document.getElementById('stopBtn');
        const speedSlider = document.getElementById('speedSlider');

        if (submitBtn) submitBtn.addEventListener('click', () => this.submit());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clear());
        if (againBtn) againBtn.addEventListener('click', () => this.again());
        if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        if (playBtn) playBtn.addEventListener('click', () => this.playAnimation());
        if (stopBtn) stopBtn.addEventListener('click', () => this.stopAnimation());
        if (speedSlider) speedSlider.addEventListener('change', (e) => {
            this.playbackSpeed = parseFloat(e.target.value);
        });
    }

    getCanvasCoordinates(e) {
        const rect = this.drawingCanvas.getBoundingClientRect();
        let x, y;

        if (e.touches) {
            x = (e.touches[0].clientX - rect.left) * (this.drawingCanvas.width / rect.width);
            y = (e.touches[0].clientY - rect.top) * (this.drawingCanvas.height / rect.height);
        } else {
            x = (e.clientX - rect.left) * (this.drawingCanvas.width / rect.width);
            y = (e.clientY - rect.top) * (this.drawingCanvas.height / rect.height);
        }

        return { x, y };
    }

    startDrawing(e) {
        e.preventDefault();
        this.isDrawing = true;
        const { x, y } = this.getCanvasCoordinates(e);
        this.currentStroke = [{ x, y }];
    }

    draw(e) {
        if (!this.isDrawing) return;
        e.preventDefault();

        const { x, y } = this.getCanvasCoordinates(e);
        this.currentStroke.push({ x, y });

        const onRed = this.isOnRedLine(y);
        if (onRed && !this.redLineCrossed) {
            this.redLineCrossed = true;
            this.updateRedAlert(true);
        }

        // Draw on canvas
        this.redrawCanvas();
        const strokeColor = onRed ? '#c62828' : '#000';
        this.drawCtx.strokeStyle = strokeColor;
        this.drawCtx.lineWidth = 2;
        this.drawCtx.lineJoin = 'round';
        this.drawCtx.lineCap = 'round';

        this.drawCtx.beginPath();
        const prevPoint = this.currentStroke[this.currentStroke.length - 2];
        this.drawCtx.moveTo(prevPoint.x, prevPoint.y);
        this.drawCtx.lineTo(x, y);
        this.drawCtx.stroke();
        
        // Draw on overlay canvas in real-time
        this.replayCtx.strokeStyle = strokeColor;
        this.replayCtx.lineWidth = 2;
        this.replayCtx.lineJoin = 'round';
        this.replayCtx.lineCap = 'round';
        this.replayCtx.beginPath();
        this.replayCtx.moveTo(prevPoint.x, prevPoint.y);
        this.replayCtx.lineTo(x, y);
        this.replayCtx.stroke();
    }

    stopDrawing(e) {
        if (!this.isDrawing) return;
        e.preventDefault();

        if (this.currentStroke.length > 1) {
            this.strokes.push([...this.currentStroke]);
        }
        this.isDrawing = false;
        this.currentStroke = [];
        this.redrawReplayOverlay();
    }

    clear() {
        this.strokes = [];
        this.currentStroke = [];
        this.redLineCrossed = false;
        this.updateRedAlert(false);
        this.redrawCanvas();
        this.updatePreview();
        // Reset star rating display
        document.getElementById('starBadge').textContent = '☆☆☆☆☆';
        document.getElementById('ratingScore').textContent = '-';
    }

    submit() {
        if (this.strokes.length === 0) {
            this.showCustomAlert('Please write something first!');
            return;
        }

        this.replay();
        this.rateHandwriting();
        this.showResults();
    }

    isOnRedLine(y) {
        const period = 174; // matches background-size height (doubled from 87)
        const offset = y % period;
        return offset >= 0 && offset <= 2;
    }

    replay() {
        // Clear replay canvas for results section
        if (!this.replayCtx2) return;
        this.replayCtx2.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.drawLines(this.replayCtx2);

        // Draw all strokes instantly (no animation)
        this.replayCtx2.strokeStyle = '#000';
        this.replayCtx2.lineWidth = 2;
        this.replayCtx2.lineJoin = 'round';
        this.replayCtx2.lineCap = 'round';

        for (let stroke of this.strokes) {
            if (stroke.length < 2) continue;
            
            this.replayCtx2.beginPath();
            this.replayCtx2.moveTo(stroke[0].x, stroke[0].y);
            
            for (let i = 1; i < stroke.length; i++) {
                this.replayCtx2.lineTo(stroke[i].x, stroke[i].y);
            }
            this.replayCtx2.stroke();
        }
    }

    playAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        document.getElementById('playBtn').style.display = 'none';
        document.getElementById('stopBtn').style.display = 'inline-block';
        
        // Flatten all points with timing
        let allPoints = [];
        for (let stroke of this.strokes) {
            for (let point of stroke) {
                allPoints.push(point);
            }
        }
        
        if (allPoints.length === 0) return;
        
        let pointIndex = 0;
        const pointsPerFrame = Math.max(1, Math.ceil(allPoints.length / (120 * this.playbackSpeed)));
        
        const animate = () => {
            this.replayCtx2.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            this.drawLines(this.replayCtx2);
            
            // Draw all points up to current index
            if (pointIndex < allPoints.length) {
                this.replayCtx2.strokeStyle = '#000';
                this.replayCtx2.lineWidth = 2;
                this.replayCtx2.lineJoin = 'round';
                this.replayCtx2.lineCap = 'round';
                
                this.replayCtx2.beginPath();
                this.replayCtx2.moveTo(allPoints[0].x, allPoints[0].y);
                
                const endIndex = Math.min(pointIndex, allPoints.length - 1);
                for (let i = 1; i <= endIndex; i++) {
                    this.replayCtx2.lineTo(allPoints[i].x, allPoints[i].y);
                }
                this.replayCtx2.stroke();
                
                pointIndex += pointsPerFrame;
                
                if (this.isAnimating) {
                    this.animationFrame = requestAnimationFrame(animate);
                }
            } else {
                // Loop back to start
                pointIndex = 0;
                if (this.isAnimating) {
                    this.animationFrame = requestAnimationFrame(animate);
                }
            }
        };
        
        animate();
    }

    stopAnimation() {
        this.isAnimating = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        document.getElementById('playBtn').style.display = 'inline-block';
        document.getElementById('stopBtn').style.display = 'none';
    }

    rateHandwriting() {
        const { consistency, smoothness } = this.analyzeStrokes();

        // Neatness focuses on smooth lines and consistent stroke lengths
        let neatness = Math.min(1, Math.max(0, (smoothness * 0.6) + (consistency * 0.4)));
        
        // Penalize if red line was crossed (0.5 star = 0.1 on 0-1 scale)
        if (this.redLineCrossed) {
            neatness -= 0.05;
            neatness = Math.max(0, neatness);
        }
        
        this.displayRating(neatness);
    }

    analyzeStrokes() {
        let totalDistance = 0;
        let totalPoints = 0;
        let strokeLengths = [];
        let angles = [];
        let minX = 800, maxX = 0, minY = 400, maxY = 0;

        for (let stroke of this.strokes) {
            let strokeLength = 0;
            
            for (let i = 1; i < stroke.length; i++) {
                const p1 = stroke[i - 1];
                const p2 = stroke[i];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                strokeLength += distance;
                
                // Track bounds
                minX = Math.min(minX, p1.x, p2.x);
                maxX = Math.max(maxX, p1.x, p2.x);
                minY = Math.min(minY, p1.y, p2.y);
                maxY = Math.max(maxY, p1.y, p2.y);

                // Calculate angle for smoothness
                if (i > 1) {
                    const p0 = stroke[i - 2];
                    const a1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
                    const a2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                    let angleDiff = Math.abs(a2 - a1);
                    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                    angles.push(angleDiff);
                }
            }
            
            strokeLengths.push(strokeLength);
            totalDistance += strokeLength;
            totalPoints += stroke.length;
        }

        // Coverage: how much canvas space is used
        const width = Math.max(1, maxX - minX);
        const height = Math.max(1, maxY - minY);
        const coverage = Math.min(1, (width * height) / (800 * 400));

        // Consistency: how uniform the stroke lengths are
        const avgStrokeLength = totalDistance / this.strokes.length;
        let variance = 0;
        for (let length of strokeLengths) {
            variance += Math.pow(length - avgStrokeLength, 2);
        }
        variance /= this.strokes.length;
        const stdDev = Math.sqrt(variance);
        const consistency = Math.max(0, 1 - (stdDev / (avgStrokeLength * 2)));

        // Smoothness: how smooth the curves are (lower angle changes = smoother)
        let avgAngle = 0;
        if (angles.length > 0) {
            avgAngle = angles.reduce((a, b) => a + b) / angles.length;
        }
        const smoothness = Math.max(0, 1 - (avgAngle / (Math.PI / 2)));

        // Pressure (approximated by stroke count - more strokes = more detailed)
        const pressure = Math.min(1, this.strokes.length / 10);

        return { coverage, consistency, smoothness, pressure };
    }

    displayRating(neatness) {
        const starBadge = document.getElementById('starBadge');
        const ratingScore = document.getElementById('ratingScore');

        // Convert neatness [0,1] to 0-5 stars with half-step precision
        const raw = Math.max(0, Math.min(5, neatness * 5));
        const full = Math.floor(raw);
        const half = raw - full >= 0.5 ? 1 : 0;
        const empty = 5 - full - half;
        const starString = '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
        const numeric = (full + 0.5 * half).toFixed(1);
        
        // Put numeric rating in the rating box
        ratingScore.textContent = `${numeric}/5`;
        // Keep just stars in the badge
        starBadge.textContent = `${starString}`;
    }

    updateRedAlert(show) {
        // Removed - no longer showing alert
    }

    showResults() {
        document.querySelector('.section').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('submitBtn').style.display = 'none';
        document.getElementById('playbackControls').style.display = 'flex';
        document.getElementById('playbackControls').style.flexDirection = 'column';
        document.getElementById('playbackControls').style.gap = '10px';
        document.getElementById('againBtn').style.display = 'block';
    }

    again() {
        // Stop animation if it's playing
        if (this.isAnimating) {
            this.stopAnimation();
        }
        
        document.querySelector('.section').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('submitBtn').style.display = 'block';
        document.getElementById('playbackControls').style.display = 'none';
        document.getElementById('againBtn').style.display = 'none';
        this.clear();
        this.updatePreview();
    }

    toggleFullscreen() {
        const container = document.getElementById('mainContainer');
        
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HandwritingRepeater();
});
