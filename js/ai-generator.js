class AIGenerator {
    constructor() {
        this.difficultyParams = {
            easy: {
                objectDensity: 0.3,
                maxGapSize: 200,
                speedMultiplier: 0.8,
                patternComplexity: 0.2
            },
            normal: {
                objectDensity: 0.5,
                maxGapSize: 150,
                speedMultiplier: 1.0,
                patternComplexity: 0.4
            },
            hard: {
                objectDensity: 0.7,
                maxGapSize: 100,
                speedMultiplier: 1.2,
                patternComplexity: 0.6
            },
            harder: {
                objectDensity: 0.85,
                maxGapSize: 80,
                speedMultiplier: 1.4,
                patternComplexity: 0.75
            },
            insane: {
                objectDensity: 0.95,
                maxGapSize: 60,
                speedMultiplier: 1.6,
                patternComplexity: 0.9
            },
            demon: {
                objectDensity: 1.0,
                maxGapSize: 40,
                speedMultiplier: 2.0,
                patternComplexity: 1.0
            }
        };
    }

    generateLevel(difficulty, length = 5000) {
        const params = this.difficultyParams[difficulty];
        const objects = [];
        let currentX = 200;
        
        // Generate ground blocks
        for (let x = 0; x < length; x += 30) {
            if (Math.random() < params.objectDensity) {
                objects.push({
                    id: Date.now() + Math.random(),
                    type: 'block',
                    x: x,
                    y: 500,
                    size: 30,
                    color: '#00ff88',
                    shape: 'square'
                });
            }
        }

        // Generate obstacles
        while (currentX < length) {
            const pattern = this.selectPattern(params.patternComplexity);
            
            switch (pattern) {
                case 'single_spike':
                    objects.push({
                        id: Date.now() + Math.random(),
                        type: 'spike',
                        x: currentX,
                        y: 470,
                        size: 30,
                        color: '#ff4444',
                        shape: 'triangle'
                    });
                    currentX += 120 * (1 - params.objectDensity);
                    break;
                
                case 'triple_spike':
                    for (let i = 0; i < 3; i++) {
                        objects.push({
                            id: Date.now() + Math.random() + i,
                            type: 'spike',
                            x: currentX + (i * 40),
                            y: 470,
                            size: 30,
                            color: '#ff4444',
                            shape: 'triangle'
                        });
                    }
                    currentX += 200 * (1 - params.objectDensity);
                    break;
                
                case 'orb_sequence':
                    for (let i = 0; i < 3; i++) {
                        objects.push({
                            id: Date.now() + Math.random() + i,
                            type: 'orb',
                            x: currentX + (i * 80),
                            y: 400,
                            size: 20,
                            color: '#ffaa00',
                            shape: 'circle'
                        });
                    }
                    currentX += 300;
                    break;
                
                case 'platform_section':
                    const platformHeight = 300 + Math.random() * 100;
                    for (let i = 0; i < 5; i++) {
                        objects.push({
                            id: Date.now() + Math.random() + i,
                            type: 'block',
                            x: currentX + (i * 30),
                            y: platformHeight,
                            size: 30,
                            color: '#00ff88',
                            shape: 'square'
                        });
                    }
                    currentX += 200;
                    break;
                
                case 'portal':
                    objects.push({
                        id: Date.now() + Math.random(),
                        type: 'portal',
                        x: currentX,
                        y: 400,
                        size: 30,
                        color: '#4488ff',
                        shape: 'portal'
                    });
                    currentX += 500;
                    break;
                
                default:
                    currentX += 100 * (1 - params.objectDensity);
            }
        }

        return {
            objects: objects,
            settings: {
                difficulty: difficulty,
                length: length,
                generatedBy: 'AI'
            }
        };
    }

    selectPattern(complexity) {
        const patterns = [
            'single_spike',
            'triple_spike',
            'orb_sequence',
            'platform_section',
            'portal'
        ];
        
        // Higher complexity means more difficult patterns
        const weights = patterns.map((p, i) => {
            switch (p) {
                case 'single_spike': return 1 - complexity * 0.8;
                case 'triple_spike': return 0.5 + complexity * 0.5;
                case 'orb_sequence': return 0.3 + complexity * 0.7;
                case 'platform_section': return 0.4 + complexity * 0.3;
                case 'portal': return 0.2 + complexity * 0.2;
                default: return 0;
            }
        });

        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < patterns.length; i++) {
            random -= weights[i];
            if (random <= 0) return patterns[i];
        }
        
        return patterns[0];
    }
}

const aiGenerator = new AIGenerator();
