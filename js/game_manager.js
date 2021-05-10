function GameManager(size, InputManager, Actuator, ScoreManager) {
  this.size         = size; // Size of the grid
  this.inputManager = new InputManager;
  this.scoreManager = new ScoreManager;
  this.actuator     = new Actuator;


  this.startTiles   = 2;

  this.inputManager.on("move", this.move.bind(this));
  // this.inputManager.on("move", this.getMoves.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
}

function flatten(arr) {
  return arr.reduce((acc, cur) => acc + cur)
}

// Restart the game
GameManager.prototype.restart = function () {
  this.actuator.continue();
  this.setup();
};

// Keep playing after winning
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continue();
};

GameManager.prototype.isGameTerminated = function () {
  if (this.over) {
    return true;
  } else {
    return false;
  }
  // if (this.over || (this.won && !this.keepPlaying)) {
  //   return true;
  // } else {
  //   return false;
  // }
};

// Set up the game
GameManager.prototype.setup = function () {
  this.grid        = new Grid(this.size);
  this.testGrid    = new Grid(this.size);
  this.lastMove    = -1;

  this.score       = 0;
  this.over        = false;
  this.won         = false;
  this.keepPlaying = false;

  // Add the initial tiles
  this.addStartTiles();

  // Update the actuator
  this.actuate();

  // tree init
  this.tree = new MCTree(this.grid)
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile(this.grid);
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function (grid) {
  if (grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(grid.randomAvailableCell(), value);

    grid.insertTile(tile);
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.scoreManager.get() < this.score) {
    this.scoreManager.set(this.score);
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.scoreManager.get(),
    terminated: this.isGameTerminated()
  });

};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function (grid) {
  grid.eachCell(function (x, y, tile) {
    if (tile) {
      
      tile.mergedFrom = null;
      try {
        tile.savePosition();
      } catch (error) {
        let fixedTile = new Tile(-1, -1, tile);
        tile = fixedTile;
      }
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell, grid) {
  grid.cells[tile.x][tile.y] = null;
  grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

GameManager.prototype.testGridShift = function (direction, grid) {
  var self = this;
  var cell, tile;
  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var pointsEarned = 0;
  var moved = false;

  this.prepareTiles(grid);

  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector, grid);
        var next      = grid.cellContent(positions.next);
        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          moved = true;
          pointsEarned += tile.value * 2

          merged.mergedFrom = [tile, next];
          grid.insertTile(merged);
          grid.removeTile(tile);

        } else {
          // console.log(`Need to move tile at x: ${tile.x}, y: ${tile.y} to x: ${positions.farthest.x}, y: ${positions.farthest.y}`);
          grid.cells[tile.x][tile.y] = null;
          tile.x = positions.farthest.x
          tile.y = positions.farthest.y
          grid.cells[positions.farthest.x][positions.farthest.y] = tile;
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });
  return [pointsEarned, moved];
}

function getMax(arr, prop) {
  var max;
  for (var i=0 ; i<arr.length ; i++) {
    if (max == null || parseInt(flatten(arr[i][prop])) > parseInt(flatten(max[prop])))
      max = arr[i];
  }
  return max;
}

GameManager.prototype.nextStates = function(grid) {
  var self = this;
  this.prepareTiles(self.testGrid);

  var states = []

  for (let i = 0; i < 4; i++) {
    // ! deep copy the grid
    let newGrid = grid.clone()
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        if (newGrid.cells[x][y] !== null) {
          newGrid.cells[x][y].mergedFrom = null;
        }
      }
    }
    let results = self.testGridShift(i, newGrid)
    var pointsEarned = results[0]
    var moved = results[1]
    states.push({grid: newGrid, pointsEarned: pointsEarned, moved: moved})
  }
  
  return states;
}

GameManager.prototype.findBestPath = function(grid, depth) {
  var self = this;
  
  if (depth === null || depth === undefined) {
    console.log("You must pass in a depth");
    return
  }
  
  if (this.isGameTerminated()) return null;
  
  for (let i = 0; i < grid.cells.length; i++) {
    for (let j = 0; j < grid.cells.length; j++) {
      
      self.testGrid.cells[i][j] = grid.cells[i][j]
    }    
  }
  
  this.prepareTiles(self.testGrid);
  
  
  var states = []

  // For each direction
  for (let i = 0; i < 3; i++) {
    states.push({
      direction: i,

    })
    for (let j = 0; j < depth; j++) {
      // console.log(self.testGrid);
      let bestMove = self.getMoves(0, self.testGrid, 3)
      states.push(bestMove)
      self.testGridShift(bestMove, self.testGrid)
    }
  }
  // console.log("+++++++++++ bestPath +++++++++++");
  // console.log(states);
  return states;
}

/**
Checks all possible moves from current state and returns the "best" one.
grid: grid to find the next best move
**/
GameManager.prototype.getMoves = function (direction, grid, maxDepth, bestMove, minTiles, moves, sumOfPointsEarned) {
  // 0: up, 1: right, 2:down, 3: left
  if (this.isGameTerminated()) return null;

  if (maxDepth === 0) {
    // console.log("Sorry I don't have any good moves I can see...");
    return Math.floor(Math.random() * 4);
  }

  // console.log(`Testing direction ${direction}`);
  var self = this;

  var grid = (grid === null || grid === undefined) ? self.grid : grid; 

  for (let i = 0; i < grid.cells.length; i++) {
    for (let j = 0; j < grid.cells.length; j++) {

      self.testGrid.cells[i][j] = grid.cells[i][j]
    }    
  }

  var pointsEarned = 0
  var ogTileCount = self.testGrid.numOfTiles()

  // Save the current tile positions and remove merger information
  this.prepareTiles(self.testGrid);

  // Traverse the grid in the right direction and move tiles
  pointsEarned = self.testGridShift(direction, self.testGrid)[0];
  // console.log(`Direction: ${direction}, points: ${pointsEarned}`);
  // console.log(`************testGrid.... id =  + ${self.testGrid.id}*****************`);
  // console.log("Has " + self.testGrid.numOfTiles(false) + " tiles");
  // console.log(`Would earn ${pointsEarned} points`);
  // console.log(self.testGrid)
  // console.log("*********************************************************************");

  let currentTiles = self.testGrid.numOfTiles();

  if (direction === 0) {
    moves = []
    sumOfPointsEarned = 0;
    bestMove = 0;
    minTiles = currentTiles
  } else if (minTiles > self.testGrid.numOfTiles()) {
    bestMove = direction;
  }
  sumOfPointsEarned += pointsEarned
  moves.push({direction: direction, points: pointsEarned, tiles: currentTiles})
  
  if (direction == 3) {
    if (sumOfPointsEarned !== 0) {
      let values = []

      moves.forEach(e => {
        cost = 1 - (e.tiles / ogTileCount) + (e.points / sumOfPointsEarned);
        values.push(cost)
      });

      bestMove = values.indexOf(Math.max.apply(Math, values));
      // console.log(moves);
      // console.log(values);
      // console.log(`The best move is ${bestMove} with ${moves[bestMove].tiles} tiles and a score of ${values[bestMove]}`);
    } else {
      // I'm pretty sure at this point the algorithm doesn't know what to do.
      // console.log("++++++++++++++++++++WHAT HAPPENED HERE++++++++++++++++++++");
      bestMove = Math.floor(Math.random() * 4);
      // return self.getMoves(0, self.testGrid, maxDepth-1);
    }
    self.lastMove = bestMove;
    return bestMove
  } else {
    return self.getMoves(direction+1, grid, maxDepth, bestMove, minTiles, moves, sumOfPointsEarned);
  }
}

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2:down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles(self.grid);

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector, self.grid);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += merged.value;

          // The mighty 2048 tile
          if (merged.value === 2048) {
            console.log("Game won");
            self.won = true;
          }
        } else {
          self.moveTile(tile, positions.farthest, self.grid);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    this.addRandomTile(self.grid);

    if (!this.movesAvailable(self.grid)) {
      this.over = true; // Game over!
    }

    this.actuate();
    
    return 0;
  } else {
    return -1;
  }
};

function fixTiles(grid) {
  grid.cells.forEach(row => {
    for (let i = 0; i < row.length; i++) {
      if (row[i]) {
        let tile = new Tile(-1, -1, row[i]);
        row[i] = tile
      }
    }
  })
}

GameManager.prototype.monte_carlo = function(numberOfSimulations, tree) {
  // node: the current node we are running simulations on
  // 0: up, 1: right, 2:down, 3: left
  let self = this;
  // * Step 1: Selection
  let node = tree.head
  let direction;
  while (node.leaves.length !== 0) {
    let UTC_Values = node.leaves.map((leaf) => {
                      if (leaf === null) return -1;
                      return leaf.calculateUTC()
                    })
    
    // ! max UTC index;; also the direction we need to move
    let i = UTC_Values.indexOf(Math.max(...UTC_Values));
    direction = i
    node = node.leaves[i]
    
  }
  
  // if (moved !== undefined) {
  //   moved = self.move(direction);
  // }

  // Special case
  // while (moved === -1 || moved === undefined) {
  //   direction = Math.floor(Math.random() * 4)
  //   console.log("Special case hit: "+direction);
  //   moved = self.move(direction);
  // }

  // * Step 2: Expansion
  node.leaves = self.nextStates(self.grid).map((one) => {
    if (!one.moved) {
      // console.log("NO move!");
      return null;
    } else {
      return new Node(node, one.grid, one.pointsEarned)
    }
  })
  
  // * Step 3: Simulation
  let finalDirectionScores = [0,0,0,0]
  let finalDirectionEmptyTileCount = [0,0,0,0]
  let heuristicScore = [0,0,0,0]
  let hardcopiedGrid;
  let totalMoves = 1;
  for (let oneDirection = 0; oneDirection < 4; oneDirection++) {
    totalMoves = 1
    if (node.leaves[oneDirection] === null) {
      // Direction results in no initial movement on the board 
      continue;
    } else {
      for (let i = 0; i < numberOfSimulations; i++) {
        // *This
        hardcopiedGrid = self.grid.clone()
        // hardcopiedGrid = node.leaves[oneDirection].grid.clone()
        direction = oneDirection
        let result = self.testGridShift(oneDirection, hardcopiedGrid)
        if (!result[1]) break;
        let scoreEarned = result[0]
        // *or that
        // hardcopiedGrid = new Grid(-1, JSON.parse(JSON.stringify(node.leaves[oneDirection].grid)));
        // let scoreEarned = node.leaves[oneDirection].pointsEarned

        // console.log("Running simulation on direction "+oneDirection);
        for (let j = 0; j < 9999; j++) {
          if (!this.movesAvailable(hardcopiedGrid)) {
            // console.log("Early simulation finish");
            break;
          }
          direction = Math.floor(Math.random() * 4)
          result = self.testGridShift(direction, hardcopiedGrid)
          if (!result[1]) continue; // if it didn't move
          scoreEarned += result[0]
          self.addRandomTile(hardcopiedGrid)
  
          totalMoves++;
          let emptyTileCount = 0;
          // hardcopiedGrid.eachCell(function (x, y, tile) {
          //   if (!tile) {
          //     emptyTileCount ++;
          //   } else {
          //     val += tile.value;
          //   }
          // })
          finalDirectionEmptyTileCount[oneDirection] += emptyTileCount;
          finalDirectionScores[oneDirection] += scoreEarned;
          
        }
      }

      // console.log(`Total points earned from direction ${oneDirection}: ${finalDirectionScores[oneDirection]}`);
      // console.log(`Average score based on direction ${oneDirection}: ${finalDirectionScores[oneDirection]/totalMoves}`);
      // finalDirectionScores[oneDirection] /= totalMoves;
    }

  }

  // console.log("Direction merge scores");
  finalDirectionScores = finalDirectionScores.map(normalize(Math.min(...finalDirectionScores), Math.max(...finalDirectionScores)))
  // console.log("Direction merge scores | Normalized");
  // console.log(finalDirectionScores);
  // let bestMove = heuristicScore.indexOf(Math.max(...heuristicScore));

  function normalize(min, max) {
    var delta = max - min;

    if (max === 0 && min === 0) return 0;

    return function (val) {
        return (val - min) / delta;
    };
  }

  let bestMove = finalDirectionScores.indexOf(Math.max(...finalDirectionScores));
  // console.log(`Best move: ${bestMove}`);
  self.move(bestMove)

  // * Step 4: Backpropagation
  // Losers
  for (let i = 0; i < 4; i++) {
    if (i !== bestMove) {
      let loser = node.leaves[i];
      if (loser !== null) loser.times++;
    }
  }

  // Winner
  node = node.leaves[bestMove]
  while (node !== null) {
    node.times ++;
    node.wins ++;

    node = node.parent;
  }

  // Removes circular structures from object so it caan be printed as string
  // var cache = [];
  // console.log(JSON.stringify(tree, (key, value) => {
  //   if (typeof value === 'object' && value !== null) {
  //     // Duplicate reference found, discard key
  //     if (cache.includes(value)) return;
  
  //     if (key === "grid") return

  //     // Store value in our collection
  //     cache.push(value);
  //   }
  //   return value;
  // }));
  // cache = null; 

  // console.log(tree);

  let gameover = self.isGameTerminated()

  let gameResults = {}
  if (gameover) {
    gameResults.highestTile = 0

    hardcopiedGrid.eachCell(function (x, y, tile) {
      if (tile) {
        if (tile.value > gameResults.highestTile) {
          gameResults.highestTile = tile.value
        }
      }
    })
  } 

  return [gameover, gameResults]
}

GameManager.prototype.run = function () {
  let self = this;
  if (this.isGameTerminated()) return null;

  // ! This is the old method
  // let states = this.nextStates(self.grid)
  // console.log(states);
  // let paths = []
  // for (let i = 0; i < states.length; i++) {
  //   const e = states[i];
  //   paths.push({
  //     points: [e.pointsEarned],
  //     moves: [i],
  //     states: this.nextStates(e.grid)
  //   })
  // }
  // function getLayer(paths) {

  //   paths.forEach((option, i) => {
  //     let bestPoints = -1;
  //     let bestDirection = -1;
  //     option.states.forEach((z, j) => {
  //       let currentPoints = flatten(option.points) + z.pointsEarned
  //       if (currentPoints > bestPoints) {
  //         bestPoints = currentPoints
  //         bestDirection = j;
  //       }
  //     })
  //     option.points.push(option.states[bestDirection].pointsEarned)
  //     option.moves.push(bestDirection)
  //   });
  // }

  // getLayer(paths)
  // paths = paths.map(e => {
  //   e.points.forEach((val, i) => {
  //     e.points[i] = val/(1+(i*0.5))
  //   })
  //   return e
  // })
  // console.log(paths);
  // let path = getMax(paths, "points")
  // console.log(path)

  // console.log(`Best path is ${path.moves} with ${path.points} points`);

  // if (flatten(path.points) === 0) {
  //   console.log("Sending random move");
  //   return Math.floor(Math.random() * 4);
  // }


  // ! New shit here
  self.monte_carlo(250, self.tree)

  // sending random move for testing purposes
  return Math.floor(Math.random() * 4);
}

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // up
    1: { x: 1,  y: 0 },  // right
    2: { x: 0,  y: 1 },  // down
    3: { x: -1, y: 0 }   // left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();
  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector, grid) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (grid.withinBounds(cell) &&
           grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function (grid) {
  return grid.cellsAvailable() || this.tileMatchesAvailable(grid);
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function (grid) {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
