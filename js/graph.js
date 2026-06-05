/**
 * Graph Data Structure
 * 
 * Modul ini menangani struktur data graf untuk representasi jaringan jalan.
 * Fitur:
 * - Representasi node (persimpangan/titik jalan)
 * - Representasi edge (ruas jalan)
 * - Manajemen konektivitas graf
 * - Validasi graf terhubung
 * - Struktur data untuk pathfinding
 */

class RoadNode {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.edges = []; // Array of connected edges
        this.neighbors = []; // Array of neighboring node IDs
    }

    addEdge(edge) {
        if (!this.edges.includes(edge)) {
            this.edges.push(edge);
        }
    }

    addNeighbor(nodeId) {
        if (!this.neighbors.includes(nodeId)) {
            this.neighbors.push(nodeId);
        }
    }

    getDistance(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

class RoadEdge {
    constructor(id, nodeA, nodeB, isBidirectional = true) {
        this.id = id;
        this.nodeA = nodeA;
        this.nodeB = nodeB;
        this.isBidirectional = isBidirectional;
        this.controlPoints = []; // For curved roads
        this.length = nodeA.getDistance(nodeB);
    }

    getOtherNode(nodeId) {
        return this.nodeA.id === nodeId ? this.nodeB : this.nodeA;
    }

    contains(x, y, threshold = 10) {
        if (this.controlPoints.length === 0) {
            return this.distanceToPoint(x, y) <= threshold;
        }
        return this.distanceToPoint(x, y) <= threshold;
    }

    distanceToPoint(x, y) {
        if (this.controlPoints.length === 0) {
            return this.distanceToLineSegment(
                this.nodeA.x, this.nodeA.y,
                this.nodeB.x, this.nodeB.y,
                x, y
            );
        }

        let minDistance = Infinity;
        const points = [this.nodeA, ...this.controlPoints, this.nodeB];
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const distance = this.distanceToLineSegment(
                p1.x || p1, p1.y || typeof p1 === 'object' ? p1.y : 0,
                p2.x || p2, p2.y || typeof p2 === 'object' ? p2.y : 0,
                x, y
            );
            minDistance = Math.min(minDistance, distance);
        }
        
        return minDistance;
    }

    distanceToLineSegment(x1, y1, x2, y2, px, py) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;

        let xx = x1;
        let yy = y1;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

class RoadNetwork {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.nodes = new Map(); // Map<nodeId, RoadNode>
        this.edges = new Map(); // Map<edgeId, RoadEdge>
        this.nodeIndex = 0;
        this.edgeIndex = 0;
    }

    addNode(x, y) {
        const node = new RoadNode(this.nodeIndex++, x, y);
        this.nodes.set(node.id, node);
        return node;
    }

    addEdge(nodeA, nodeB, isBidirectional = true) {
        if (!this.nodes.has(nodeA.id) || !this.nodes.has(nodeB.id)) {
            console.error('Node tidak ditemukan dalam network');
            return null;
        }

        const edge = new RoadEdge(this.edgeIndex++, nodeA, nodeB, isBidirectional);
        this.edges.set(edge.id, edge);

        nodeA.addEdge(edge);
        nodeB.addEdge(edge);
        nodeA.addNeighbor(nodeB.id);
        
        if (isBidirectional) {
            nodeB.addNeighbor(nodeA.id);
        }

        return edge;
    }

    getNode(nodeId) {
        return this.nodes.get(nodeId);
    }

    getEdge(edgeId) {
        return this.edges.get(edgeId);
    }

    getAllNodes() {
        return Array.from(this.nodes.values());
    }

    getAllEdges() {
        return Array.from(this.edges.values());
    }

    // Validasi bahwa jaringan terhubung menggunakan DFS
    isConnected() {
        if (this.nodes.size === 0) return true;
        if (this.nodes.size === 1) return true;

        const visited = new Set();
        const startNode = this.nodes.values().next().value;

        const dfs = (nodeId) => {
            visited.add(nodeId);
            const node = this.getNode(nodeId);
            
            for (const neighborId of node.neighbors) {
                if (!visited.has(neighborId)) {
                    dfs(neighborId);
                }
            }
        };

        dfs(startNode.id);

        return visited.size === this.nodes.size;
    }

    // Cari node terdekat dengan posisi (x, y)
    getNearestNode(x, y, maxDistance = Infinity) {
        let nearest = null;
        let minDistance = maxDistance;

        for (const node of this.nodes.values()) {
            const distance = Math.sqrt(
                (node.x - x) ** 2 + (node.y - y) ** 2
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearest = node;
            }
        }

        return nearest;
    }

    // Cari edge yang paling dekat dengan posisi (x, y)
    getNearestEdge(x, y, maxDistance = Infinity) {
        let nearest = null;
        let minDistance = maxDistance;

        for (const edge of this.edges.values()) {
            const distance = edge.distanceToPoint(x, y);

            if (distance < minDistance) {
                minDistance = distance;
                nearest = edge;
            }
        }

        return nearest;
    }

    // Hapus node dan edge yang terhubung
    removeNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        // Hapus semua edge yang terhubung
        const edgesToRemove = [];
        for (const edge of this.edges.values()) {
            if (edge.nodeA.id === nodeId || edge.nodeB.id === nodeId) {
                edgesToRemove.push(edge.id);
            }
        }

        for (const edgeId of edgesToRemove) {
            this.edges.delete(edgeId);
        }

        this.nodes.delete(nodeId);
    }

    // Hapus edge
    removeEdge(edgeId) {
        const edge = this.edges.get(edgeId);
        if (!edge) return;

        edge.nodeA.edges = edge.nodeA.edges.filter(e => e.id !== edgeId);
        edge.nodeB.edges = edge.nodeB.edges.filter(e => e.id !== edgeId);

        edge.nodeA.neighbors = edge.nodeA.neighbors.filter(id => id !== edge.nodeB.id);
        if (edge.isBidirectional) {
            edge.nodeB.neighbors = edge.nodeB.neighbors.filter(id => id !== edge.nodeA.id);
        }

        this.edges.delete(edgeId);
    }

    // Clear semua data
    clear() {
        this.nodes.clear();
        this.edges.clear();
        this.nodeIndex = 0;
        this.edgeIndex = 0;
    }

    // Statistik jaringan
    getStats() {
        return {
            nodeCount: this.nodes.size,
            edgeCount: this.edges.size,
            isConnected: this.isConnected(),
            totalLength: Array.from(this.edges.values()).reduce((sum, edge) => sum + edge.length, 0),
            averageNodeDegree: this.nodes.size > 0 
                ? Array.from(this.nodes.values()).reduce((sum, node) => sum + node.neighbors.length, 0) / this.nodes.size 
                : 0
        };
    }
}
