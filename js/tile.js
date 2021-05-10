function Tile(position, value, tile) {
  if (tile) {
    this.x                = tile.x;
    this.y                = tile.y;
    this.value            = tile.value;

    this.previousPosition = tile.previousPosition;
    this.mergedFrom       = tile.mergedFrom;

  } else {

    this.x                = position.x;
    this.y                = position.y;
    this.value            = value || 2;
  
    this.previousPosition = null;
    this.mergedFrom       = null; // Tracks tiles that merged together
  }
}

Tile.prototype.clone = function() {
  newTile = new Tile({ x: this.x, y: this.y }, this.value);
  //newTile.previousPosition = { x: this.previousPosition.x, y: this.previousPosition.y };
  //newTile.mergedFrom = { x: this.previousPosition.x, y: this.previousPosition.y };
  return newTile;
}

Tile.prototype.savePosition = function () {
  this.previousPosition = { x: this.x, y: this.y };
};

Tile.prototype.updatePosition = function (position) {
  this.x = position.x;
  this.y = position.y;
};
