/**
 *  Pathfinding Algorithm
 * 
 * Modul ini menangani algoritma pencarian jalur optimal menggunakan A*.
 * Fitur:
 * - A* Pathfinding Algorithm (optimal dengan heuristik)
 * - Caching hasil pathfinding untuk performa
 * - Visualisasi path yang ditemukan
 */

class Pathfinder {
    constructor(roadNetwork) {
        this.network = roadNetwork;
        this.pathCache = new Map();
        this.lastPath = null;
        this.lastVisitedNodes = [];
    }

    /**
     * Heuristik Euclidean distance untuk A*
     */
    heuristic(nodeA, nodeB) {
        const dx = nodeA.x - nodeB.x;
        const dy = nodeA.y - nodeB.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * A* Pathfinding Algorithm
     * Lebih efisien dari Dijkstra dengan heuristik
     */
    findPathAStar(startNode, endNode) {
        if (!startNode || !endNode) return null;
        
        const cacheKey = `${startNode.id}-${endNode.id}`;
        // if (this.pathCache.has(cacheKey)) {
        //     return this.pathCache.get(cacheKey);
        // }

        const openSet = new Set([startNode.id]);
        const cameFrom = new Map();
        const gScore = new Map(); // Cost dari start ke node
        const fScore = new Map(); // gScore + heuristic

        // Inisialisasi scores
        for (const node of this.network.getAllNodes()) {
            gScore.set(node.id, Infinity);
            fScore.set(node.id, Infinity);
        }

        gScore.set(startNode.id, 0);
        fScore.set(startNode.id, this.heuristic(startNode, endNode));

        this.lastVisitedNodes = [];

        while (openSet.size > 0) {
            // Cari node dengan fScore terendah
            let current = null;
            let lowestFScore = Infinity;

            for (const nodeId of openSet) {
                const score = fScore.get(nodeId);
                if (score < lowestFScore) {
                    lowestFScore = score;
                    current = nodeId;
                }
            }

            this.lastVisitedNodes.push(current);

            if (current === endNode.id) {
                const path = this.reconstructPath(cameFrom, current);
                this.lastPath = path;
                this.pathCache.set(cacheKey, path);
                return path;
            }

            openSet.delete(current);
            const currentNode = this.network.getNode(current);

            // Jelajahi neighbors
            for (const neighborId of currentNode.neighbors) {
                const neighbor = this.network.getNode(neighborId);
                const tentativeGScore = gScore.get(current) + currentNode.getDistance(neighbor);

                if (tentativeGScore < gScore.get(neighborId)) {
                    cameFrom.set(neighborId, current);
                    gScore.set(neighborId, tentativeGScore);
                    fScore.set(neighborId, tentativeGScore + this.heuristic(neighbor, endNode));

                    if (!openSet.has(neighborId)) {
                        openSet.add(neighborId);
                    }
                }
            }
        }

        return null; // Path tidak ditemukan
    }



    /**
     * Rekonstruksi path dari node cameFrom map
     */
    reconstructPath(cameFrom, current) {
        const path = [current];

        while (cameFrom.has(current)) {
            current = cameFrom.get(current);
            path.unshift(current);
        }

        return path.map(nodeId => this.network.getNode(nodeId));
    }

    /**
     * Konversi path nodes menjadi path points untuk smooth animation dengan Bezier interpolation
     */
    getPathPoints(pathNodes) {
        const points = [];

        for (let i = 0; i < pathNodes.length - 1; i++) {
            const currentNode = pathNodes[i];
            const nextNode = pathNodes[i + 1];

            // Tambahkan starting node
            points.push({ x: currentNode.x, y: currentNode.y, node: currentNode });

            // Cari edge dan interpolasi dengan Bezier curve
            const edge = this.findEdgeBetweenNodes(currentNode, nextNode);
            if (edge && edge.controlPoints.length > 0) {
                // Interpolasi points sepanjang Bezier curve untuk smooth animation
                const segments = 20; // Jumlah intermediate points untuk smooth curve
                
                for (let t = 1; t <= segments; t++) {
                    const tNorm = t / (segments + 1);
                    
                    if (edge.controlPoints.length === 1) {
                        // Quadratic Bezier interpolation
                        const cp = edge.controlPoints[0];
                        const x = (1 - tNorm) * (1 - tNorm) * currentNode.x +
                                  2 * (1 - tNorm) * tNorm * cp.x +
                                  tNorm * tNorm * nextNode.x;
                        const y = (1 - tNorm) * (1 - tNorm) * currentNode.y +
                                  2 * (1 - tNorm) * tNorm * cp.y +
                                  tNorm * tNorm * nextNode.y;
                        points.push({ x, y, isBezier: true });
                    } else if (edge.controlPoints.length === 2) {
                        // Cubic Bezier interpolation
                        const cp1 = edge.controlPoints[0];
                        const cp2 = edge.controlPoints[1];
                        const x = (1 - tNorm) * (1 - tNorm) * (1 - tNorm) * currentNode.x +
                                  3 * (1 - tNorm) * (1 - tNorm) * tNorm * cp1.x +
                                  3 * (1 - tNorm) * tNorm * tNorm * cp2.x +
                                  tNorm * tNorm * tNorm * nextNode.x;
                        const y = (1 - tNorm) * (1 - tNorm) * (1 - tNorm) * currentNode.y +
                                  3 * (1 - tNorm) * (1 - tNorm) * tNorm * cp1.y +
                                  3 * (1 - tNorm) * tNorm * tNorm * cp2.y +
                                  tNorm * tNorm * tNorm * nextNode.y;
                        points.push({ x, y, isBezier: true });
                    } else {
                        // Multiple control points - gunakan first dua
                        const cp1 = edge.controlPoints[0];
                        const cp2 = edge.controlPoints[Math.min(1, edge.controlPoints.length - 1)];
                        const x = (1 - tNorm) * (1 - tNorm) * (1 - tNorm) * currentNode.x +
                                  3 * (1 - tNorm) * (1 - tNorm) * tNorm * cp1.x +
                                  3 * (1 - tNorm) * tNorm * tNorm * cp2.x +
                                  tNorm * tNorm * tNorm * nextNode.x;
                        const y = (1 - tNorm) * (1 - tNorm) * (1 - tNorm) * currentNode.y +
                                  3 * (1 - tNorm) * (1 - tNorm) * tNorm * cp1.y +
                                  3 * (1 - tNorm) * tNorm * tNorm * cp2.y +
                                  tNorm * tNorm * tNorm * nextNode.y;
                        points.push({ x, y, isBezier: true });
                    }
                }
            }
        }

        // Tambahkan end node
        if (pathNodes.length > 0) {
            const lastNode = pathNodes[pathNodes.length - 1];
            points.push({ x: lastNode.x, y: lastNode.y, node: lastNode });
        }

        return points;
    }

    /**
     * Cari edge antara dua nodes
     */
    findEdgeBetweenNodes(nodeA, nodeB) {
        for (const edge of this.network.getAllEdges()) {
            if ((edge.nodeA.id === nodeA.id && edge.nodeB.id === nodeB.id) ||
                (edge.nodeB.id === nodeA.id && edge.nodeA.id === nodeB.id && edge.isBidirectional)) {
                return edge;
            }
        }
        return null;
    }

    /**
     * Hitung total distance dari path
     */
    getPathDistance(pathNodes) {
        let distance = 0;
        for (let i = 0; i < pathNodes.length - 1; i++) {
            distance += pathNodes[i].getDistance(pathNodes[i + 1]);
        }
        return distance;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.pathCache.clear();
    }

    /**
     * Get stats pathfinding terakhir
     */
    getLastStats() {
        return {
            pathLength: this.lastPath ? this.lastPath.length : 0,
            visitedNodes: this.lastVisitedNodes.length,
            distance: this.lastPath ? this.getPathDistance(this.lastPath) : 0
        };
    }
}
