/**
 * ANGGOTA 3: Computer Graphics Rendering
 * 
 * Modul ini menangani rendering visual menggunakan Canvas 2D.
 * Fitur:
 * - Vector-based rendering untuk scalability
 * - Road rendering dengan curves
 * - Node dan edge visualization
 * - Camera/zoom system
 * - Grid overlay
 * - Smooth rendering pipeline
 */

class MapRenderer {
    constructor(canvas, roadNetwork) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.network = roadNetwork;
        
        // Camera properties
        this.cameraX = 0;
        this.cameraY = 0;
        this.zoom = 1.0;
        this.minZoom = 0.25;
        this.maxZoom = 4.0;

        // Rendering options
        this.showGrid = false;
        this.showNodes = false;
        this.showPath = false;
        this.showStats = true;

        // Display nodes (for flags)
        this.startNodeForDisplay = null;
        this.endNodeForDisplay = null;
        
        // Path track untuk ditampilkan
        this.pathTrackForDisplay = null;

        // Colors and styles
        this.colors = {
            road: '#444',
            node: '#667eea',
            nodeOutline: '#3c4fa0',
            highlight: '#ff6b6b',
            path: '#51cf66',
            pathNode: '#40c057',
            startFlag: '#ff0000',
            endFlag: '#00aa00',
            grid: '#e0e0e0',
            background: '#ffffff'
        };

        this.lineWidth = 8;
        this.nodeRadius = 6;

        // Canvas sizing
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.centerView();
    }

    /**
     * Center view pada pusat network
     */
    centerView() {
        if (this.network.getAllNodes().length === 0) {
            this.cameraX = 0;
            this.cameraY = 0;
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const node of this.network.getAllNodes()) {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x);
            maxY = Math.max(maxY, node.y);
        }

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        this.cameraX = centerX - this.canvas.width / (2 * this.zoom);
        this.cameraY = centerY - this.canvas.height / (2 * this.zoom);

        // Calculate optimal zoom to fit all nodes
        const networkWidth = maxX - minX;
        const networkHeight = maxY - minY;
        const padding = 50;

        const zoomX = (this.canvas.width - padding) / (networkWidth + padding);
        const zoomY = (this.canvas.height - padding) / (networkHeight + padding);

        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, Math.min(zoomX, zoomY) * 0.9));

        this.cameraX = centerX - this.canvas.width / (2 * this.zoom);
        this.cameraY = centerY - this.canvas.height / (2 * this.zoom);
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(x, y) {
        return {
            x: (x - this.cameraX) * this.zoom,
            y: (y - this.cameraY) * this.zoom
        };
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(x, y) {
        return {
            x: x / this.zoom + this.cameraX,
            y: y / this.zoom + this.cameraY
        };
    }

    /**
     * Zoom in/out
     */
    zoomIn(factor = 1.2) {
        const oldZoom = this.zoom;
        this.zoom = Math.min(this.maxZoom, this.zoom * factor);
        
        // Adjust camera to zoom towards center
        const centerX = this.cameraX + this.canvas.width / (2 * oldZoom);
        const centerY = this.cameraY + this.canvas.height / (2 * oldZoom);

        this.cameraX = centerX - this.canvas.width / (2 * this.zoom);
        this.cameraY = centerY - this.canvas.height / (2 * this.zoom);
    }

    zoomOut(factor = 1.2) {
        this.zoomIn(1 / factor);
    }

    /**
     * Pan camera
     */
    panCamera(dx, dy) {
        this.cameraX -= dx / this.zoom;
        this.cameraY -= dy / this.zoom;
    }

    /**
     * Main render function
     */
    render(highlightedNodes = [], highlightedEdges = [], startNode = null, endNode = null) {
        // Clear canvas
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid if enabled
        if (this.showGrid) {
            this.drawGrid();
        }

        // Draw roads (edges)
        this.drawEdges(highlightedEdges);

        // Draw path track if available and enabled
        if (this.showPath && this.pathTrackForDisplay) {
            this.drawPathTrack(this.pathTrackForDisplay);
        }

        // Draw nodes
        this.drawNodes(highlightedNodes, startNode, endNode);

        // Draw animated objects are handled separately in animation system
    }

    /**
     * Draw grid background
     */
    drawGrid() {
        const gridSize = 100;
        const gridScreenSpacing = gridSize * this.zoom;

        // Only draw grid if spacing is large enough
        if (gridScreenSpacing < 10) return;

        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;

        const startX = Math.floor(this.cameraX / gridSize) * gridSize;
        const startY = Math.floor(this.cameraY / gridSize) * gridSize;

        for (let x = startX; x < this.cameraX + this.canvas.width / this.zoom; x += gridSize) {
            const screenX = (x - this.cameraX) * this.zoom;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, 0);
            this.ctx.lineTo(screenX, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = startY; y < this.cameraY + this.canvas.height / this.zoom; y += gridSize) {
            const screenY = (y - this.cameraY) * this.zoom;
            this.ctx.beginPath();
            this.ctx.moveTo(0, screenY);
            this.ctx.lineTo(this.canvas.width, screenY);
            this.ctx.stroke();
        }
    }

    /**
     * Draw edges (roads)
     */
    drawEdges(highlightedEdges = []) {
        for (const edge of this.network.getAllEdges()) {
            this.drawEdge(edge, highlightedEdges.includes(edge.id));
        }
    }

    /**
     * Draw single edge dengan Bezier curve yang smooth
     */
    drawEdge(edge, highlighted = false) {
        const startScreen = this.worldToScreen(edge.nodeA.x, edge.nodeA.y);
        const endScreen = this.worldToScreen(edge.nodeB.x, edge.nodeB.y);

        this.ctx.strokeStyle = highlighted ? this.colors.path : this.colors.road;
        this.ctx.lineWidth = highlighted ? this.lineWidth * 2 : this.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(startScreen.x, startScreen.y);

        if (edge.controlPoints.length === 0) {
            // Garis lurus jika tidak ada control points
            this.ctx.lineTo(endScreen.x, endScreen.y);
        } else if (edge.controlPoints.length === 1) {
            // Quadratic Bezier curve dengan 1 control point
            const cp = this.worldToScreen(edge.controlPoints[0].x, edge.controlPoints[0].y);
            this.ctx.quadraticCurveTo(cp.x, cp.y, endScreen.x, endScreen.y);
        } else if (edge.controlPoints.length === 2) {
            // Cubic Bezier curve dengan 2 control points
            const cp1 = this.worldToScreen(edge.controlPoints[0].x, edge.controlPoints[0].y);
            const cp2 = this.worldToScreen(edge.controlPoints[1].x, edge.controlPoints[1].y);
            this.ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endScreen.x, endScreen.y);
        } else {
            // Multiple control points - gunakan bezier dengan interpolasi
            const controlPoints = edge.controlPoints.map(cp => this.worldToScreen(cp.x, cp.y));
            
            // Gunakan cubic bezier antara setiap pasang control points
            const allPoints = [startScreen, ...controlPoints, endScreen];
            
            for (let i = 0; i < allPoints.length - 1; i++) {
                if (i === 0) continue;
                
                const p0 = allPoints[i - 1];
                const p1 = allPoints[i];
                const p2 = allPoints[i + 1] || allPoints[i];
                const p3 = allPoints[i + 2] || allPoints[i + 1] || allPoints[i];
                
                // Catmull-Rom spline approximation
                const cp1x = p1.x + (p2.x - p0.x) / 6;
                const cp1y = p1.y + (p2.y - p0.y) / 6;
                const cp2x = p2.x - (p3.x - p1.x) / 6;
                const cp2y = p2.y - (p3.y - p1.y) / 6;
                
                this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
            }
        }

        this.ctx.stroke();

        // Draw arrow untuk directed edges
        if (!edge.isBidirectional) {
            this.drawArrow(startScreen, endScreen);
        }
    }

    /**
     * Draw arrow untuk directed edge
     */
    drawArrow(from, to) {
        const headlen = 15 * this.zoom;
        const angle = Math.atan2(to.y - from.y, to.x - from.x);

        // Midpoint untuk arrow placement
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;

        this.ctx.beginPath();
        this.ctx.moveTo(midX, midY);
        this.ctx.lineTo(midX - headlen * Math.cos(angle - Math.PI / 6), midY - headlen * Math.sin(angle - Math.PI / 6));
        this.ctx.moveTo(midX, midY);
        this.ctx.lineTo(midX - headlen * Math.cos(angle + Math.PI / 6), midY - headlen * Math.sin(angle + Math.PI / 6));
        this.ctx.stroke();
    }

    /**
     * Draw nodes
     */
    drawNodes(highlightedNodes = [], startNode = null, endNode = null) {
        for (const node of this.network.getAllNodes()) {
            this.drawNode(
                node,
                highlightedNodes.includes(node.id),
                node.id === startNode?.id,
                node.id === endNode?.id
            );
        }
    }

    /**
     * Draw single node
     */
    drawNode(node, highlighted = false, isStart = false, isEnd = false) {
        const screen = this.worldToScreen(node.x, node.y);
        const radius = this.nodeRadius * (this.zoom / 1.0);

        if (isStart || isEnd) {
            // Draw flag untuk start/end
            this.drawFlag(screen.x, screen.y, isStart ? this.colors.startFlag : this.colors.endFlag);
        }

        // Draw node circle
        this.ctx.fillStyle = highlighted ? this.colors.highlight : this.colors.node;
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw outline
        this.ctx.strokeStyle = this.colors.nodeOutline;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Tampilkan node ID jika zoom cukup besar
        if (this.zoom > 0.8 && this.showNodes) {
            this.ctx.fillStyle = '#666';
            this.ctx.font = `${12 * this.zoom}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(node.id, screen.x, screen.y + radius + 12);
        }
    }

    /**
     * Draw path track yang akan dilalui object
     * Warna biru dengan ukuran lebih kecil dari jalan asli
     */
    drawPathTrack(pathNodes) {
        if (!pathNodes || pathNodes.length < 2) return;

        // Warna biru untuk track
        this.ctx.strokeStyle = '#0066ff';
        this.ctx.lineWidth = this.lineWidth * 0.5; // 50% dari ukuran jalan normal
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.setLineDash([4, 4]); // Dashed line untuk membedakan dengan jalan

        this.ctx.beginPath();

        for (let i = 0; i < pathNodes.length; i++) {
            const screen = this.worldToScreen(pathNodes[i].x, pathNodes[i].y);

            if (i === 0) {
                this.ctx.moveTo(screen.x, screen.y);
            } else {
                this.ctx.lineTo(screen.x, screen.y);
            }
        }

        this.ctx.stroke();
        this.ctx.setLineDash([]); // Reset dashed line
    }

    /**
     * Draw flag marker
     */
    drawFlag(x, y, color) {
        const flagSize = 10;

        // Flag pole
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - flagSize);
        this.ctx.lineTo(x, y + flagSize / 2);
        this.ctx.stroke();

        // Flag
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - flagSize);
        this.ctx.lineTo(x + flagSize, y - flagSize / 2);
        this.ctx.lineTo(x, y - flagSize / 4);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Draw object di canvas
     */
    drawObject(x, y, type = 'car', angle = 0, color = '#667eea') {
        const screen = this.worldToScreen(x, y);

        this.ctx.save();
        this.ctx.translate(screen.x, screen.y);
        this.ctx.rotate(angle);

        switch (type.toLowerCase()) {
            case 'car':
                this.drawCar(color);
                break;
            case 'motorcycle':
                this.drawMotorcycle(color);
                break;
            case 'bicycle':
                this.drawBicycle(color);
                break;
            case 'person':
                this.drawPerson(color);
                break;
            default:
                this.drawCar(color);
        }

        this.ctx.restore();
    }

    drawCar(color) {
        const size = 8;
        
        // Body
        this.ctx.fillStyle = color;
        this.ctx.fillRect(-size, -size / 2, size * 2, size);

        // Windows
        this.ctx.fillStyle = 'rgba(100, 150, 255, 0.5)';
        this.ctx.fillRect(-size + 2, -size / 3, size / 2 - 1, size / 3);
        this.ctx.fillRect(size / 2, -size / 3, size / 2 - 1, size / 3);

        // Lights
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(-size - 1, -size / 3, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawMotorcycle(color) {
        const size = 6;
        
        // Frame
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-size, 0);
        this.ctx.lineTo(size, 0);
        this.ctx.stroke();

        // Wheels
        this.ctx.beginPath();
        this.ctx.arc(-size, 0, 2, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(size, 0, 2, 0, Math.PI * 2);
        this.ctx.stroke();

        // Seat
        this.ctx.fillStyle = color;
        this.ctx.fillRect(-size / 2, -size / 2, size, size / 3);
    }

    drawBicycle(color) {
        const size = 5;
        
        // Frame
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(-size, -size / 2);
        this.ctx.lineTo(0, 0);
        this.ctx.lineTo(size, -size / 2);
        this.ctx.stroke();

        // Wheels
        this.ctx.beginPath();
        this.ctx.arc(-size, 0, 2, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(size, 0, 2, 0, Math.PI * 2);
        this.ctx.stroke();

        // Seat
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.ellipse(size / 2, -size / 2, 1, 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawPerson(color) {
        const size = 4;
        
        // Head
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(0, -size - 2, size / 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Body
        this.ctx.fillRect(-size / 2, -size, size, size);

        // Legs
        this.ctx.beginPath();
        this.ctx.moveTo(-size / 3, 0);
        this.ctx.lineTo(-size / 3, size / 2);
        this.ctx.moveTo(size / 3, 0);
        this.ctx.lineTo(size / 3, size / 2);
        this.ctx.stroke();
    }

    /**
     * Get render statistics
     */
    getStats() {
        return {
            zoomLevel: this.zoom.toFixed(2),
            cameraX: Math.round(this.cameraX),
            cameraY: Math.round(this.cameraY),
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height
        };
    }
}
