/**
 * Animation System
 * 
 * Modul ini menangani animasi pergerakan obyek di atas jalan.
 * Fitur:
 * - Smooth movement interpolation
 * - Object trajectory calculation
 * - Direction/rotation synchronization
 * - Multiple object animation
 * - Collision detection (optional)
 */

class AnimatedObject {
    constructor(id, type = 'car', speed = 50) {
        this.id = id;
        this.type = type; // 'car', 'motorcycle', 'bicycle', 'person'
        this.speed = speed; // pixels per second

        // Position
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;

        // Rotation/direction
        this.angle = 0;
        this.targetAngle = 0;

        // Path
        this.pathPoints = [];
        this.currentPointIndex = 0;
        this.progressOnSegment = 0; // 0 to 1

        // Animation state
        this.isAnimating = false;
        this.isPaused = false;
        this.color = '#667eea';

        // Statistics
        this.distanceTraveled = 0;
        this.animationTime = 0;
    }

    /**
     * Set path untuk object
     */
    setPath(pathPoints) {
        if (!pathPoints || pathPoints.length < 2) {
            return false;
        }

        this.pathPoints = pathPoints;
        this.currentPointIndex = 0;
        this.progressOnSegment = 0;
        this.distanceTraveled = 0;
        this.animationTime = 0;

        // Set starting position
        this.x = pathPoints[0].x;
        this.y = pathPoints[0].y;
        this.targetX = pathPoints[0].x;
        this.targetY = pathPoints[0].y;

        // Calculate initial angle
        this.updateAngleTowardsNextPoint();

        return true;
    }

    /**
     * Start animation
     */
    startAnimation() {
        this.isAnimating = true;
        this.isPaused = false;
        this.currentPointIndex = 0;
        this.progressOnSegment = 0;
    }

    /**
     * Pause animation
     */
    pauseAnimation() {
        this.isPaused = true;
    }

    /**
     * Resume animation
     */
    resumeAnimation() {
        this.isPaused = false;
    }

    /**
     * Stop animation
     */
    stopAnimation() {
        this.isAnimating = false;
        this.isPaused = false;
    }

    /**
     * Update posisi berdasarkan deltaTime
     */
    update(deltaTime) {
        if (!this.isAnimating || this.isPaused || this.pathPoints.length < 2) {
            return false;
        }

        // Hitung jarak yang ditempuh dalam frame ini
        const distanceThisFrame = (this.speed * deltaTime) / 1000;
        let remainingDistance = distanceThisFrame;

        while (remainingDistance > 0 && this.currentPointIndex < this.pathPoints.length - 1) {
            const currentPoint = this.pathPoints[this.currentPointIndex];
            const nextPoint = this.pathPoints[this.currentPointIndex + 1];

            const dx = nextPoint.x - currentPoint.x;
            const dy = nextPoint.y - currentPoint.y;
            const segmentLength = Math.sqrt(dx * dx + dy * dy);

            if (segmentLength === 0) {
                this.currentPointIndex++;
                continue;
            }

            // Jarak yang tersisa untuk segment ini
            const distanceToEndOfSegment = segmentLength * (1 - this.progressOnSegment);

            if (remainingDistance >= distanceToEndOfSegment) {
                // Finish current segment
                remainingDistance -= distanceToEndOfSegment;
                this.currentPointIndex++;
                this.progressOnSegment = 0;
                this.distanceTraveled += distanceToEndOfSegment;
            } else {
                // Move partway through segment
                this.progressOnSegment += remainingDistance / segmentLength;
                this.distanceTraveled += remainingDistance;
                remainingDistance = 0;
            }
        }

        // Update position
        if (this.currentPointIndex < this.pathPoints.length) {
            const currentPoint = this.pathPoints[this.currentPointIndex];
            this.x = currentPoint.x;
            this.y = currentPoint.y;

            if (this.currentPointIndex < this.pathPoints.length - 1) {
                const nextPoint = this.pathPoints[this.currentPointIndex + 1];
                const dx = nextPoint.x - currentPoint.x;
                const dy = nextPoint.y - currentPoint.y;
                const segmentLength = Math.sqrt(dx * dx + dy * dy);

                if (segmentLength > 0) {
                    // Interpolate position pada segment
                    this.x += (nextPoint.x - currentPoint.x) * this.progressOnSegment;
                    this.y += (nextPoint.y - currentPoint.y) * this.progressOnSegment;
                }

                // Update angle
                this.updateAngleTowardsPoint(nextPoint);
            }
        }

        this.animationTime += deltaTime;

        // Cek apakah sudah mencapai akhir
        if (this.currentPointIndex >= this.pathPoints.length - 1 && this.progressOnSegment >= 1) {
            this.isAnimating = false;
            return true; // Animation finished
        }

        return false;
    }

    /**
     * Update angle untuk menghadap ke next point
     */
    updateAngleTowardsNextPoint() {
        if (this.currentPointIndex >= this.pathPoints.length - 1) {
            return;
        }

        const nextPoint = this.pathPoints[this.currentPointIndex + 1];
        this.updateAngleTowardsPoint(nextPoint);
    }

    /**
     * Update angle ke point tertentu
     */
    updateAngleTowardsPoint(point) {
        const dx = point.x - this.x;
        const dy = point.y - this.y;
        this.angle = Math.atan2(dy, dx);
    }

    /**
     * Get current progress (0 to 1)
     */
    getProgress() {
        if (this.pathPoints.length === 0) return 0;

        const totalSegments = this.pathPoints.length - 1;
        if (totalSegments === 0) return 0;

        const completedSegments = this.currentPointIndex;
        return (completedSegments + this.progressOnSegment) / totalSegments;
    }

    /**
     * Get status info
     */
    getStatus() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            angle: this.angle,
            isAnimating: this.isAnimating,
            isPaused: this.isPaused,
            progress: this.getProgress(),
            distanceTraveled: this.distanceTraveled,
            animationTime: this.animationTime
        };
    }
}

class AnimationSystem {
    constructor(renderer, pathfinder) {
        this.renderer = renderer;
        this.pathfinder = pathfinder;
        this.objects = new Map(); // Map<objectId, AnimatedObject>
        this.objectIndex = 0;

        this.lastFrameTime = Date.now();
        this.isRunning = false;
        this.animationRAF = null;

        // Bind methods
        this.animate = this.animate.bind(this);
    }

    /**
     * Create dan add object baru
     */
    addObject(type = 'car', speed = 50, color = '#667eea') {
        const obj = new AnimatedObject(this.objectIndex++, type, speed);
        obj.color = color;
        this.objects.set(obj.id, obj);
        return obj;
    }

    /**
     * Get object by ID
     */
    getObject(id) {
        return this.objects.get(id);
    }

    /**
     * Remove object
     */
    removeObject(id) {
        this.objects.delete(id);
    }

    /**
     * Set path untuk object
     */
    setObjectPath(objectId, pathNodes) {
        const obj = this.getObject(objectId);
        if (!obj) {
            console.error('Object tidak ditemukan:', objectId);
            return false;
        }

        const pathPoints = this.pathfinder.getPathPoints(pathNodes);
        return obj.setPath(pathPoints);
    }

    /**
     * Start animasi object
     */
    startObjectAnimation(objectId) {
        const obj = this.getObject(objectId);
        if (obj) {
            obj.startAnimation();
        }
    }

    /**
     * Stop animasi object
     */
    stopObjectAnimation(objectId) {
        const obj = this.getObject(objectId);
        if (obj) {
            obj.stopAnimation();
        }
    }

    /**
     * Pause animasi object
     */
    pauseObjectAnimation(objectId) {
        const obj = this.getObject(objectId);
        if (obj) {
            obj.pauseAnimation();
        }
    }

    /**
     * Resume animasi object
     */
    resumeObjectAnimation(objectId) {
        const obj = this.getObject(objectId);
        if (obj) {
            obj.resumeAnimation();
        }
    }

    /**
     * Start animation loop
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.lastFrameTime = Date.now();
        this.animate();
    }

    /**
     * Stop animation loop
     */
    stop() {
        this.isRunning = false;
        if (this.animationRAF) {
            cancelAnimationFrame(this.animationRAF);
        }
    }

    /**
     * Main animation loop
     */
    animate(currentTime = Date.now()) {
        if (!this.isRunning) return;

        // Calculate deltaTime
        if (!this.lastFrameTime) {
            this.lastFrameTime = currentTime;
        }

        const deltaTime = Math.min(currentTime - this.lastFrameTime, 50); // Cap at 50ms
        this.lastFrameTime = currentTime;

        // Update all objects
        let anyFinished = false;
        for (const obj of this.objects.values()) {
            const finished = obj.update(deltaTime);
            if (finished) {
                anyFinished = true;
            }
        }

        // Render
        const highlightedNodes = [];
        const highlightedEdges = [];
        const allPaths = [];

        for (const obj of this.objects.values()) {
            allPaths.push(...obj.pathPoints.map(p => p.node?.id).filter(Boolean));
        }

        // Pass startNode and endNode from renderer if available
        // This allows the flags to be displayed during animation
        const startNode = this.renderer.startNodeForDisplay || null;
        const endNode = this.renderer.endNodeForDisplay || null;

        this.renderer.render(highlightedNodes, highlightedEdges, startNode, endNode);

        // Draw animated objects
        for (const obj of this.objects.values()) {
            this.renderer.drawObject(obj.x, obj.y, obj.type, obj.angle, obj.color);
        }

        // Render next frame
        if (this.isRunning) {
            this.animationRAF = requestAnimationFrame((t) => this.animate(t));
        }
    }

    /**
     * Get all objects
     */
    getAllObjects() {
        return Array.from(this.objects.values());
    }

    /**
     * Clear semua objects
     */
    clearObjects() {
        this.objects.clear();
        this.objectIndex = 0;
    }

    /**
     * Get stats
     */
    getStats() {
        return {
            objectCount: this.objects.size,
            animatingCount: Array.from(this.objects.values()).filter(o => o.isAnimating).length,
            objects: Array.from(this.objects.values()).map(o => o.getStatus())
        };
    }
}
