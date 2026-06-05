/**

 * ANGGOTA 4: Algorithm Visualization

 * 

 * Modul ini menangani visualisasi proses pathfinding dan algoritma.

 * Fitur:

 * - Visualisasi nodes yang di-explore

 * - Menampilkan path yang ditemukan

 * - Step-by-step visualization

 * - Statistics dan metrics

 * - Visual feedback untuk algoritma

 */



class AlgorithmVisualizer {

    constructor(renderer, pathfinder) {

        this.renderer = renderer;

        this.pathfinder = pathfinder;



        this.visualizationMode = 'none'; // 'none', 'exploration', 'path', 'both'

        this.exploredNodes = [];

        this.exploredEdges = [];

        this.pathNodes = [];

        this.pathEdges = [];

        this.startNode = null;

        this.endNode = null;



        this.animationSpeed = 50; // ms per step

        this.isVisualizing = false;

        this.visualizationRAF = null;

    }



    /**

     * Visualisasi pathfinding menggunakan A*

     */

    async visualizePathfindingAStar(startNode, endNode, onProgress = null, onComplete = null) {

        if (this.isVisualizing) return;



        this.isVisualizing = true;

        this.startNode = startNode;

        this.endNode = endNode;

        this.exploredNodes = [];

        this.exploredEdges = [];

        this.pathNodes = [];

        this.pathEdges = [];



        // Save renderer state

        const prevShowPath = this.renderer.showPath;

        this.renderer.showPath = true;

        this.visualizationMode = 'both';



        try {

            // Find path menggunakan A*

            const path = await this.runPathfindingVisualization(startNode, endNode, onProgress);



            if (path) {

                this.pathNodes = path;

                this.showPathVisualization(path);

            }



            if (onComplete) {

                onComplete(path);

            }

        } finally {

            this.isVisualizing = false;

            this.renderer.showPath = prevShowPath;

        }

    }



    /**

     * Run pathfinding dengan visualization step by step

     */

    async runPathfindingVisualization(startNode, endNode, onProgress = null) {

        const pathfinder = this.pathfinder;



        // Simple A* implementation dengan visualization

        const openSet = new Set([startNode.id]);

        const cameFrom = new Map();

        const gScore = new Map();

        const fScore = new Map();

        const visited = new Set();



        // Initialize

        for (const node of pathfinder.network.getAllNodes()) {

            gScore.set(node.id, Infinity);

            fScore.set(node.id, Infinity);

        }



        gScore.set(startNode.id, 0);

        fScore.set(startNode.id, pathfinder.heuristic(startNode, endNode));



        let stepCount = 0;



        while (openSet.size > 0 && !this.stopVisualization) {

            // Find node dengan lowest f score

            let current = null;

            let lowestFScore = Infinity;



            for (const nodeId of openSet) {

                const score = fScore.get(nodeId);

                if (score < lowestFScore) {

                    lowestFScore = score;

                    current = nodeId;

                }

            }



            if (current === null) break;



            visited.add(current);

            this.exploredNodes = Array.from(visited);



            if (onProgress) {

                onProgress({

                    step: stepCount++,

                    visitedCount: visited.size,

                    openSetSize: openSet.size,

                    currentNode: current

                });

            }



            // Render visualization

            await this.renderVisualizationStep();



            if (current === endNode.id) {

                // Path found

                return this.pathfinder.reconstructPath(cameFrom, current);

            }



            openSet.delete(current);

            const currentNode = pathfinder.network.getNode(current);



            for (const neighborId of currentNode.neighbors) {

                if (visited.has(neighborId)) continue;



                const neighbor = pathfinder.network.getNode(neighborId);

                const tentativeGScore = gScore.get(current) + currentNode.getDistance(neighbor);



                if (tentativeGScore < gScore.get(neighborId)) {

                    cameFrom.set(neighborId, current);

                    gScore.set(neighborId, tentativeGScore);

                    fScore.set(neighborId, tentativeGScore + pathfinder.heuristic(neighbor, endNode));



                    if (!openSet.has(neighborId)) {

                        openSet.add(neighborId);

                    }

                }

            }

        }



        return null; // Path not found

    }



    /**

     * Render visualization step

     */

    renderVisualizationStep() {

        return new Promise(resolve => {

            setTimeout(() => {

                this.renderer.render(

                    this.exploredNodes,

                    this.exploredEdges,

                    this.startNode,

                    this.endNode

                );

                resolve();

            }, this.animationSpeed);

        });

    }



    /**

     * Show final path visualization

     */

    showPathVisualization(pathNodes) {

        if (!pathNodes || pathNodes.length < 2) return;



        this.pathNodes = pathNodes;

        this.pathEdges = [];



        // Find edges antara path nodes

        for (let i = 0; i < pathNodes.length - 1; i++) {

            const edge = this.pathfinder.findEdgeBetweenNodes(pathNodes[i], pathNodes[i + 1]);

            if (edge) {

                this.pathEdges.push(edge.id);

            }

        }



        this.visualizationMode = 'path';

    }



    /**

     * Clear visualization

     */

    clearVisualization() {

        this.exploredNodes = [];

        this.exploredEdges = [];

        this.pathNodes = [];

        this.pathEdges = [];

        this.visualizationMode = 'none';

        this.isVisualizing = false;

        this.stopVisualization = false;

    }



    /**

     * Stop ongoing visualization

     */

    stopOngoingVisualization() {

        this.stopVisualization = true;

    }



    /**

     * Visualisasi network statistics

     */

    getNetworkStats() {

        const network = this.pathfinder.network;

        const allNodes = network.getAllNodes();

        const allEdges = network.getAllEdges();



        const stats = {

            totalNodes: allNodes.length,

            totalEdges: allEdges.length,

            isConnected: network.isConnected(),

            averageDegree: allNodes.reduce((sum, n) => sum + n.neighbors.length, 0) / Math.max(1, allNodes.length),

            averageEdgeLength: allEdges.reduce((sum, e) => sum + e.length, 0) / Math.max(1, allEdges.length),

            totalNetworkLength: allEdges.reduce((sum, e) => sum + e.length, 0),

            exploredNodesCount: this.exploredNodes.length,

            pathNodesCount: this.pathNodes.length,

            visualizationMode: this.visualizationMode

        };



        return stats;

    }



    /**

     * Get exploration statistics

     */

    getExplorationStats() {

        const exploredCount = this.exploredNodes.length;

        const pathLength = this.pathNodes.length;

        const totalNodes = this.pathfinder.network.getAllNodes().length;



        return {

            exploredCount,

            exploredPercentage: totalNodes > 0 ? ((exploredCount / totalNodes) * 100).toFixed(2) : 0,

            pathLength,

            pathDistance: this.pathNodes.length > 0 

                ? this.pathfinder.getPathDistance(this.pathNodes) 

                : 0,

            efficiency: exploredCount > 0 ? (pathLength / exploredCount * 100).toFixed(2) : 0

        };

    }



    /**

     * Visualisasi dengan highlight nodes dan edges

     */

    visualizeHighlight(nodeIds = [], edgeIds = []) {

        this.exploredNodes = nodeIds;

        this.exploredEdges = edgeIds;

        this.visualizationMode = 'exploration';

    }



    /**

     * Draw heatmap based pada exploration

     */

    drawExplorationHeatmap() {

        // TODO: Implementasi heatmap visualization

        // Bisa ditunjukkan dengan gradient colors pada nodes

    }



    /**

     * Get visualization info untuk UI

     */

    getVisualizationInfo() {

        return {

            mode: this.visualizationMode,

            isVisualizing: this.isVisualizing,

            exploredCount: this.exploredNodes.length,

            pathLength: this.pathNodes.length,

            startNode: this.startNode?.id,

            endNode: this.endNode?.id

        };

    }

}



/**

 * Debug visualizer untuk unit testing

 */

class DebugVisualizer {

    constructor(renderer, pathfinder) {

        this.renderer = renderer;

        this.pathfinder = pathfinder;

        this.debugMode = false;

        this.debugText = [];

    }



    /**

     * Toggle debug mode

     */

    toggleDebugMode() {

        this.debugMode = !this.debugMode;

        return this.debugMode;

    }



    /**

     * Add debug text untuk ditampilkan

     */

    addDebugText(text, level = 'info') {

        const timestamp = new Date().toLocaleTimeString();

        this.debugText.push({

            text,

            level,

            timestamp

        });



        // Keep only last 50 messages

        if (this.debugText.length > 50) {

            this.debugText.shift();

        }

    }



    /**

     * Draw debug info pada canvas

     */

    drawDebugInfo() {

        if (!this.debugMode) return;



        const ctx = this.renderer.ctx;

        const x = 10;

        let y = 30;



        ctx.font = '12px monospace';

        ctx.fillStyle = '#000';



        // Render debug text

        for (let i = Math.max(0, this.debugText.length - 15); i < this.debugText.length; i++) {

            const debug = this.debugText[i];

            const color = debug.level === 'error' ? '#ff0000' : debug.level === 'warning' ? '#ff9900' : '#0066cc';

            

            ctx.fillStyle = color;

            ctx.fillText(`[${debug.level.toUpperCase()}] ${debug.text}`, x, y);

            y += 15;

        }

    }



    /**

     * Clear debug messages

     */

    clearDebugText() {

        this.debugText = [];

    }

          }
