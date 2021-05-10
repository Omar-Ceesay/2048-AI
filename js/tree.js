class Node {
    constructor(parent, grid, pointsEarned) {
        this.leaves = [];
        this.parent = parent;
        this.wins = 0;
        this.times = 0;
        this.grid = grid;
        this.pointsEarned = pointsEarned;
    }

    calculateUTC() {
        if (this.times === 0) {
            return Infinity
        } else {
            return (this.wins / this.times) + Math.sqrt((2 * Math.log(this.parent.times)) / this.times)
        }
    }
}

function MCTree(initalGrid) {
    this.head = new Node(null, initalGrid);
}


