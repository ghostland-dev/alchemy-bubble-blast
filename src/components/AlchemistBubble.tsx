
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface Bubble {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  element: string;
  color: string;
  icon: string;
}

interface Combination {
  result: string;
  color: string;
  icon: string;
  points: number;
  name: string;
}

const ELEMENTS = {
  fire: { color: '#ef4444', icon: '🔥', name: 'Feu' },
  water: { color: '#3b82f6', icon: '💧', name: 'Eau' },
  air: { color: '#eab308', icon: '🌪️', name: 'Air' },
  earth: { color: '#22c55e', icon: '🌱', name: 'Terre' }
};

const COMBINATIONS: Record<string, Combination> = {
  'fire+water': { result: 'steam', color: '#e5e7eb', icon: '☁️', points: 20, name: 'Vapeur' },
  'air+earth': { result: 'pollen', color: '#fbbf24', icon: '✨', points: 15, name: 'Pollen' },
  'water+earth': { result: 'mud', color: '#92400e', icon: '🟤', points: 10, name: 'Boue' },
  'fire+air': { result: 'lightning', color: '#a855f7', icon: '⚡', points: 25, name: 'Foudre' },
  'fire+earth': { result: 'lava', color: '#dc2626', icon: '🌋', points: 30, name: 'Lave' },
  'water+air': { result: 'mist', color: '#cbd5e1', icon: '🌫️', points: 18, name: 'Brume' }
};

const AlchemistBubble: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [currentElement, setCurrentElement] = useState('fire');
  const [gameOver, setGameOver] = useState(false);
  const [missedCombinations, setMissedCombinations] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const animationFrameRef = useRef<number>();
  const [particles, setParticles] = useState<Array<{id: string, x: number, y: number, opacity: number}>>([]);

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 500;
  const BUBBLE_RADIUS = 20;

  const createBubble = useCallback((x: number, y: number, vx: number, vy: number, element: string): Bubble => {
    return {
      id: Math.random().toString(36),
      x,
      y,
      vx,
      vy,
      element,
      color: ELEMENTS[element as keyof typeof ELEMENTS].color,
      icon: ELEMENTS[element as keyof typeof ELEMENTS].icon
    };
  }, []);

  const checkCollisions = useCallback((newBubbles: Bubble[]) => {
    const collisions: Array<[number, number]> = [];
    
    for (let i = 0; i < newBubbles.length; i++) {
      for (let j = i + 1; j < newBubbles.length; j++) {
        const dx = newBubbles[i].x - newBubbles[j].x;
        const dy = newBubbles[i].y - newBubbles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < BUBBLE_RADIUS * 2) {
          collisions.push([i, j]);
        }
      }
    }

    collisions.forEach(([i, j]) => {
      const bubble1 = newBubbles[i];
      const bubble2 = newBubbles[j];
      const elements = [bubble1.element, bubble2.element].sort();
      const comboKey = elements.join('+');
      
      if (COMBINATIONS[comboKey]) {
        const combo = COMBINATIONS[comboKey];
        
        // Create particle effect
        const particleId = Math.random().toString(36);
        setParticles(prev => [...prev, {
          id: particleId,
          x: (bubble1.x + bubble2.x) / 2,
          y: (bubble1.y + bubble2.y) / 2,
          opacity: 1
        }]);

        // Remove particle after animation
        setTimeout(() => {
          setParticles(prev => prev.filter(p => p.id !== particleId));
        }, 1000);
        
        // Update score
        setScore(prev => prev + combo.points);
        
        // Show success message
        toast.success(`${combo.name} créé! +${combo.points} points`);
        
        // Remove collided bubbles
        newBubbles.splice(Math.max(i, j), 1);
        newBubbles.splice(Math.min(i, j), 1);
      }
    });

    return newBubbles;
  }, []);

  const updateBubbles = useCallback(() => {
    setBubbles(prevBubbles => {
      let newBubbles = prevBubbles.map(bubble => ({
        ...bubble,
        x: bubble.x + bubble.vx,
        y: bubble.y + bubble.vy
      }));

      // Remove bubbles that hit the ceiling
      const bubblesBeforeRemoval = newBubbles.length;
      newBubbles = newBubbles.filter(bubble => {
        if (bubble.y <= BUBBLE_RADIUS) {
          setMissedCombinations(prev => {
            const newMissed = prev + 1;
            if (newMissed >= 3) {
              setGameOver(true);
              toast.error("Game Over! 3 combinaisons ratées.");
            } else {
              toast.warning(`Combinaison ratée! ${3 - newMissed} chances restantes.`);
            }
            return newMissed;
          });
          return false;
        }
        return true;
      });

      // Check for collisions
      newBubbles = checkCollisions(newBubbles);

      return newBubbles;
    });
  }, [checkCollisions]);

  const shootBubble = useCallback((targetX: number, targetY: number) => {
    if (gameOver || !gameStarted) return;

    const startX = CANVAS_WIDTH / 2;
    const startY = CANVAS_HEIGHT - 30;
    
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const speed = 5;
    const vx = (dx / distance) * speed;
    const vy = (dy / distance) * speed;
    
    const newBubble = createBubble(startX, startY, vx, vy, currentElement);
    setBubbles(prev => [...prev, newBubble]);
    
    // Change to next random element
    const elementKeys = Object.keys(ELEMENTS);
    const randomElement = elementKeys[Math.floor(Math.random() * elementKeys.length)];
    setCurrentElement(randomElement);
  }, [gameOver, gameStarted, currentElement, createBubble]);

  const resetGame = () => {
    setBubbles([]);
    setScore(0);
    setMissedCombinations(0);
    setGameOver(false);
    setGameStarted(false);
    setParticles([]);
    setCurrentElement('fire');
  };

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = () => {
      updateBubbles();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameOver, updateBubbles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw bubbles
    bubbles.forEach(bubble => {
      ctx.fillStyle = bubble.color;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, BUBBLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw element icon
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bubble.icon, bubble.x, bubble.y);
    });

    // Draw particles
    particles.forEach(particle => {
      ctx.save();
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = '#fbbf24';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('✨', particle.x, particle.y);
      ctx.restore();
    });

    // Draw shooter
    if (gameStarted && !gameOver) {
      const shooterX = CANVAS_WIDTH / 2;
      const shooterY = CANVAS_HEIGHT - 30;
      
      ctx.fillStyle = ELEMENTS[currentElement as keyof typeof ELEMENTS].color;
      ctx.beginPath();
      ctx.arc(shooterX, shooterY, BUBBLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'white';
      ctx.fillText(ELEMENTS[currentElement as keyof typeof ELEMENTS].icon, shooterX, shooterY);
    }
  }, [bubbles, particles, currentElement, gameStarted, gameOver]);

  // Animate particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        opacity: Math.max(0, particle.opacity - 0.02),
        y: particle.y - 1
      })).filter(p => p.opacity > 0));
    }, 16);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">Alchemist's Bubble</h1>
          <p className="text-purple-200">Combinez les éléments pour créer des potions magiques!</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-white">
                <span className="text-xl font-semibold">Score: {score}</span>
                <span className="text-lg">Échecs: {missedCombinations}/3</span>
              </div>

              <div className="relative bg-black/30 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="w-full cursor-crosshair"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
                    const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
                    shootBubble(x, y);
                  }}
                />
                
                {!gameStarted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Button 
                      onClick={() => setGameStarted(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg"
                    >
                      Commencer le Jeu
                    </Button>
                  </div>
                )}

                {gameOver && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/75">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-white mb-4">Game Over!</h3>
                      <p className="text-white mb-4">Score final: {score}</p>
                      <Button 
                        onClick={resetGame}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Rejouer
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {gameStarted && !gameOver && (
                <div className="text-center">
                  <p className="text-white mb-2">Élément suivant:</p>
                  <div className="inline-flex items-center space-x-2 text-white">
                    <span className="text-2xl">{ELEMENTS[currentElement as keyof typeof ELEMENTS].icon}</span>
                    <span>{ELEMENTS[currentElement as keyof typeof ELEMENTS].name}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">Combinaisons</h3>
            <div className="space-y-3">
              {Object.entries(COMBINATIONS).map(([key, combo]) => {
                const [elem1, elem2] = key.split('+');
                return (
                  <div key={key} className="flex items-center justify-between text-white bg-white/5 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <span>{ELEMENTS[elem1 as keyof typeof ELEMENTS].icon}</span>
                      <span>+</span>
                      <span>{ELEMENTS[elem2 as keyof typeof ELEMENTS].icon}</span>
                      <span>=</span>
                      <span>{combo.icon}</span>
                      <span className="text-sm">{combo.name}</span>
                    </div>
                    <span className="text-yellow-300 font-semibold">{combo.points}pts</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <h4 className="text-lg font-semibold text-white mb-2">Éléments de Base</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ELEMENTS).map(([key, element]) => (
                  <div key={key} className="flex items-center space-x-2 text-white bg-white/5 rounded-lg p-2">
                    <span className="text-lg">{element.icon}</span>
                    <span className="text-sm">{element.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AlchemistBubble;
