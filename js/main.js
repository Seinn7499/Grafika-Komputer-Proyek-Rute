/**
 * Urban Spatial Mapping - Main Application
 * 
 * Mengintegrasikan semua modul:
 * - Graph data structure
 * - Pathfinding algorithm
 * - Computer graphics rendering
 * - Algorithm visualization
 * - Animation system
 */

class UrbanMapApplication {
    constructor() {
        // Initialize canvas dan context
        this.canvas = document.getElementById('mapCanvas');
        
        // Initialize modules
        this.network = new RoadNetwork(2000, 2000);
        this.renderer = new MapRenderer(this.canvas, this.network);
        this.pathfinder = new Pathfinder(this.network);
        this.visualizer = new AlgorithmVisualizer(this.renderer, this.pathfinder);
        this.animationSystem = new AnimationSystem(this.renderer, this.pathfinder);
        
        // Application state
        this.currentObject = null;
        this.startNode = null;
        this.endNode = null;
        this.currentPath = null;
        
        this.isAnimating = false;
        this.dragMode = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

        // Initialize UI
        this.setupEventListeners();
        this.updateStats();

        // Generate initial map
        this.generateNewMap();

        // Start rendering
        this.animationSystem.start();
    }

    /**
     * Setup semua event listeners
     */
    setupEventListeners() {
        // Button listeners
        document.getElementById('zoomInBtn').addEventListener('click', () => this.handleZoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.handleZoomOut());
        document.getElementById('resetViewBtn').addEventListener('click', () => this.handleResetView());
        document.getElementById('regenerateMapBtn').addEventListener('click', () => this.handleRegenerateMap());
        document.getElementById('startTrackBtn').addEventListener('click', () => this.handleStartTrack());
        document.getElementById('stopTrackBtn').addEventListener('click', () => this.handleStopTrack());
        document.getElementById('resetAnimationBtn').addEventListener('click', () => this.handleResetAnimation());
        document.getElementById('randomizePositionBtn').addEventListener('click', () => this.handleRandomizePosition());

        // Canvas listeners
        this.canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleCanvasMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleCanvasWheel(e));
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleCanvasRightClick(e));

        // Update stats regularly
        setInterval(() => this.updateStats(), 500);
    }

    /**
     * Generate map baru dengan jalan yang terhubung
     */
    generateNewMap() {
        this.network.clear();
        
        const mapWidth = 2000;
        const mapHeight = 2000;
        const nodeCount = 40; // Generate 40 nodes
        
        // Generate random nodes dengan constraints
        const nodes = [];
        const minDistance = 80; // Minimum distance antara nodes
        
        for (let i = 0; i < nodeCount; i++) {
            let x, y, tooClose;
            
            do {
                x = Math.random() * mapWidth;
                y = Math.random() * mapHeight;
                
                tooClose = false;
                for (const node of nodes) {
                    const dx = x - node.x;
                    const dy = y - node.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < minDistance) {
                        tooClose = true;
                        break;
                    }
                }
            } while (tooClose);
            
            const newNode = this.network.addNode(x, y);
            nodes.push(newNode);
        }

        // Create connected edges dengan Delaunay-like approach
        // Sederhana: connect setiap node ke 3-5 nearest neighbors
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const distances = [];

            for (let j = 0; j < nodes.length; j++) {
                if (i !== j) {
                    const distance = node.getDistance(nodes[j]);
                    distances.push({ node: nodes[j], distance });
                }
            }

            // Sort by distance
            distances.sort((a, b) => a.distance - b.distance);

            // Connect ke 3-5 nearest neighbors
            const connectionCount = 3 + Math.floor(Math.random() * 3);
            for (let k = 0; k < Math.min(connectionCount, distances.length); k++) {
                const targetNode = distances[k].node;
                
                // Check if already connected
                if (!node.neighbors.includes(targetNode.id)) {
                    // Add some curves untuk roads
                    const edge = this.network.addEdge(node, targetNode, true);
                    
                    // Tambahkan kurva smooth dengan probability tinggi (70%)
                    if (Math.random() < 0.7) {
                        const distance = node.getDistance(targetNode);
                        const midX = (node.x + targetNode.x) / 2;
                        const midY = (node.y + targetNode.y) / 2;
                        
                        // Generate 1-2 control points untuk smooth curve
                        const numControlPoints = Math.random() < 0.6 ? 1 : 2;
                        
                        for (let cp = 0; cp < numControlPoints; cp++) {
                            // Offset untuk membuat kurva yang natural
                            const perpAngle = Math.atan2(targetNode.y - node.y, targetNode.x - node.x) + Math.PI / 2;
                            
                            // Variasi offset untuk setiap control point
                            const offsetMagnitude = (distance * 0.15) * (0.5 + Math.random() * 1.5);
                            const offsetVariation = (cp === 0 ? 1 : -1) * (0.5 + Math.random() * 0.5);
                            
                            const offsetX = Math.cos(perpAngle) * offsetMagnitude * offsetVariation;
                            const offsetY = Math.sin(perpAngle) * offsetMagnitude * offsetVariation;
                            
                            // Posisi control point sepanjang garis dari start ke end
                            const t = (cp + 1) / (numControlPoints + 1);
                            const controlX = node.x + (targetNode.x - node.x) * t + offsetX;
                            const controlY = node.y + (targetNode.y - node.y) * t + offsetY;
                            
                            edge.controlPoints.push({ x: controlX, y: controlY });
                        }
                    }
                }
            }
        }

        // Ensure graph is connected (if not, add random edges)
        let attempts = 0;
        while (!this.network.isConnected() && attempts < 50) {
            const node1 = nodes[Math.floor(Math.random() * nodes.length)];
            const node2 = nodes[Math.floor(Math.random() * nodes.length)];
            
            if (node1.id !== node2.id && !node1.neighbors.includes(node2.id)) {
                this.network.addEdge(node1, node2, true);
            }
            attempts++;
        }

        this.renderer.centerView();
        this.renderer.showPath = false;
        this.renderer.pathTrackForDisplay = null;
        this.renderer.startNodeForDisplay = null;
        this.renderer.endNodeForDisplay = null;

        this.startNode = null;
        this.endNode = null;
        this.currentPath = null;
        this.currentObject = null;
        this.isAnimating = false;

        this.animationSystem.clearObjects();
        document.getElementById('startTrackBtn').disabled = false;
        document.getElementById('stopTrackBtn').disabled = true;
        document.getElementById('animationStatus').textContent = 'Stopped';

        this.updateStats();
    }

    /**
     * Handle zoom in
     */
    handleZoomIn() {
        this.renderer.zoomIn(1.3);
    }

    /**
     * Handle zoom out
     */
    handleZoomOut() {
        this.renderer.zoomOut(1.3);
    }

    /**
     * Handle reset view
     */
    handleResetView() {
        this.renderer.centerView();
    }

    /**
     * Handle regenerate map
     */
    handleRegenerateMap() {
        if (confirm('Apakah Anda yakin ingin membuat peta baru?')) {
            this.generateNewMap();
        }
    }

    /**
     * Handle start track animation
     */
    handleStartTrack() {
        if (!this.startNode || !this.endNode) {
            alert('Pilih start node (klik) dan end node (klik kanan) terlebih dahulu!');
            return;
        }

        // Jika ada object yang sudah dipause, lanjutkan
        if (this.currentObject && this.currentObject.isPaused) {
            this.animationSystem.resumeObjectAnimation(this.currentObject.id);
            this.isAnimating = true;
            document.getElementById('startTrackBtn').disabled = true;
            document.getElementById('stopTrackBtn').disabled = false;
            document.getElementById('animationStatus').textContent = 'Animating';
            return;
        }

        // Find path untuk animasi baru
        const path = this.pathfinder.findPathAStar(this.startNode, this.endNode);

        if (!path) {
            alert('Jalur tidak ditemukan!');
            return;
        }

        this.currentPath = path;
        this.renderer.showPath = true;
        
        // Set display nodes untuk flags
        this.renderer.startNodeForDisplay = this.startNode;
        this.renderer.endNodeForDisplay = this.endNode;

        // Create animated object hanya jika tidak ada
        if (this.currentObject) {
            this.animationSystem.removeObject(this.currentObject.id);
        }

        // Create car with fixed properties
        const carColor = '#ff6b6b';
        const carSpeed = 200;

        this.currentObject = this.animationSystem.addObject(
            'car',
            carSpeed,
            carColor
        );

        // Set path dan start animation
        this.animationSystem.setObjectPath(this.currentObject.id, path);
        this.animationSystem.startObjectAnimation(this.currentObject.id);

        // Store path untuk displaynya track
        this.renderer.pathTrackForDisplay = path;

        this.isAnimating = true;
        document.getElementById('startTrackBtn').disabled = true;
        document.getElementById('stopTrackBtn').disabled = false;
        document.getElementById('animationStatus').textContent = 'Animating';
    }

    /**
     * Handle stop track - pause animasi agar bisa dilanjutkan
     */
    handleStopTrack() {
        if (this.currentObject) {
            this.animationSystem.pauseObjectAnimation(this.currentObject.id);
        }

        this.isAnimating = false;
        document.getElementById('startTrackBtn').disabled = false;
        document.getElementById('stopTrackBtn').disabled = true;
        document.getElementById('animationStatus').textContent = 'Paused';
    }

    /**
     * Handle reset animation
     */
    handleResetAnimation() {
        if (!this.currentObject || !this.currentPath) {
            alert('Tidak ada animasi yang dapat di-reset. Mulai animasi terlebih dahulu.');
            return;
        }

        const resetSuccess = this.animationSystem.resetObjectAnimation(this.currentObject.id);
        if (!resetSuccess) {
            alert('Reset animasi gagal. Pastikan jalur animasi tersedia.');
            return;
        }

        this.isAnimating = false;
        document.getElementById('startTrackBtn').disabled = false;
        document.getElementById('stopTrackBtn').disabled = true;
        document.getElementById('animationStatus').textContent = 'Stopped';

        this.renderer.showPath = true;
        this.renderer.pathTrackForDisplay = this.currentPath;
        this.renderer.startNodeForDisplay = this.startNode;
        this.renderer.endNodeForDisplay = this.endNode;

        this.updateStats();
        console.log('Animasi mobil telah direset ke posisi awal.');
    }

    /**
     * Handle randomize position
     */
    handleRandomizePosition() {
        const allNodes = this.network.getAllNodes();
        if (allNodes.length < 2) {
            alert('Peta harus memiliki minimal 2 node!');
            return;
        }

        const maxAttempts = 50; // Coba maksimal 50 kali untuk menemukan path
        let attempts = 0;
        let path = null;
        let randomStart, randomEnd;

        while (!path && attempts < maxAttempts) {
            // Generate random start node
            randomStart = allNodes[Math.floor(Math.random() * allNodes.length)];
            
            // Generate random end node yang berbeda dari start
            randomEnd = allNodes[Math.floor(Math.random() * allNodes.length)];
            while (randomEnd.id === randomStart.id && allNodes.length > 1) {
                randomEnd = allNodes[Math.floor(Math.random() * allNodes.length)];
            }

            // Try to find path
            path = this.pathfinder.findPathAStar(randomStart, randomEnd);
            attempts++;
        }

        if (!path) {
            alert('Tidak dapat menemukan jalur yang valid setelah ' + maxAttempts + ' percobaan. Coba generate map baru.');
            return;
        }

        // Update start dan end nodes
        this.startNode = randomStart;
        this.endNode = randomEnd;
        
        // Set display nodes untuk flags
        this.renderer.startNodeForDisplay = randomStart;
        this.renderer.endNodeForDisplay = randomEnd;

        console.log('✓ Random Position Set - Start Node ID:', randomStart.id, 'End Node ID:', randomEnd.id, '(attempts:', attempts + ')');

        this.currentPath = path;
        this.renderer.showPath = true;
        this.renderer.pathTrackForDisplay = path;

        // Jika ada animasi yang sedang berjalan, update path-nya
        if (this.isAnimating && this.currentObject) {
            // Stop current animation
            this.animationSystem.stopObjectAnimation(this.currentObject.id);

            // Set new path
            this.animationSystem.setObjectPath(this.currentObject.id, path);
            this.animationSystem.startObjectAnimation(this.currentObject.id);

            console.log('✓ Animasi diperbarui dengan path baru (' + path.length + ' nodes)');
        } else {
            // Jika tidak ada animasi, hanya update positions saja
            console.log('✓ Posisi awal dan tujuan diperbarui. Klik "Start Track" untuk memulai animasi.');
        }
    }

    /**
     * Handle canvas mouse down
     */
    handleCanvasMouseDown(e) {
        this.dragMode = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
    }

    /**
     * Handle canvas mouse move (pan)
     */
    handleCanvasMouseMove(e) {
        if (!this.dragMode) return;

        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;

        this.renderer.panCamera(dx, dy);

        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
    }

    /**
     * Handle canvas mouse up
     */
    handleCanvasMouseUp(e) {
        this.dragMode = false;
    }

    /**
     * Handle canvas wheel (zoom)
     */
    handleCanvasWheel(e) {
        e.preventDefault();

        if (e.deltaY < 0) {
            this.handleZoomIn();
        } else {
            this.handleZoomOut();
        }
    }

    /**
     * Handle canvas click (set start node)
     */
    handleCanvasClick(e) {
        const worldPos = this.renderer.screenToWorld(e.offsetX, e.offsetY);
        const nearestNode = this.network.getNearestNode(worldPos.x, worldPos.y, 50);

        if (nearestNode) {
            this.startNode = nearestNode;
            this.renderer.startNodeForDisplay = nearestNode;
            console.log('Start node set:', nearestNode.id);
        }
    }

    /**
     * Handle canvas right click (set end node)
     */
    handleCanvasRightClick(e) {
        e.preventDefault();

        const worldPos = this.renderer.screenToWorld(e.offsetX, e.offsetY);
        const nearestNode = this.network.getNearestNode(worldPos.x, worldPos.y, 50);

        if (nearestNode) {
            this.endNode = nearestNode;
            this.renderer.endNodeForDisplay = nearestNode;
            console.log('End node set:', nearestNode.id);
        }
    }

    /**
     * Update statistics panel dan markers
     */
    updateStats() {
        const networkStats = this.network.getStats();
        
        document.getElementById('zoomLevel').textContent = (this.renderer.zoom).toFixed(2) + 'x';
        document.getElementById('mapSize').textContent = `${this.network.width}x${this.network.height}`;
        document.getElementById('nodeCount').textContent = networkStats.nodeCount;
        document.getElementById('roadCount').textContent = networkStats.edgeCount;

        // Camera position
        document.getElementById('position').textContent =
            `${Math.round(this.renderer.cameraX)}, ${Math.round(this.renderer.cameraY)}`;

        // Animation stats
        if (this.currentObject && this.currentObject.isAnimating) {
            const progress = (this.currentObject.getProgress() * 100).toFixed(1);
            document.getElementById('animationStatus').textContent = `Animating (${progress}%)`;
            document.getElementById('animationSpeed').textContent = this.currentObject.speed + ' px/s';
        } else if (this.currentObject) {
            document.getElementById('animationStatus').textContent = 'Paused';
        } else {
            document.getElementById('animationStatus').textContent = 'Stopped';
        }

        // Update display nodes untuk flags
        this.renderer.startNodeForDisplay = this.startNode;
        this.renderer.endNodeForDisplay = this.endNode;
    }
}

// Initialize aplikasi ketika DOM ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🗺️ Urban Spatial Mapping System Initialized');
    const app = new UrbanMapApplication();
    window.app = app; // Expose untuk debugging
});
