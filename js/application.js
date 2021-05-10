function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


var startTime, endTime;
var times = {}
function start(label) {
  if (times[label]) {
    return
  }
  times[label] = {}
  times[label].start = performance.now();
};

function end(label) {
  if (times[label]) {
    times[label].end = performance.now()
  } else {
    console.log("Cannot find label: " + label);
    return -1;
  }
  var timeDiff = times[label].end - times[label].start; //in ms 
  // strip the ms 
  // timeDiff /= 1000; 
  
  var ms = timeDiff;
  return ms
}

let games = []
let allGames = []


// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  let test = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalScoreManager);
  // setTimeout(function() {
  // 	test.move(1)
	//   console.log(test.grid)
  //   for (let i = 0; i < 90; i++) {
      
  //   }

  // }, 1000);

  document.addEventListener('keypress', changeState);

  var interval = null
  var flag = false
  const reducer = (accumulator, currentValue) => {
    return {score: accumulator.score + currentValue.score}
  }

  document.getElementById("run").onclick = async (e) => {
    test.restart();
    games = []
    simNumber = document.getElementById("simNumber").value
    time = document.getElementById("speed").value
    simNumber = parseInt(simNumber)
    time = parseInt(time)
    if (simNumber <= 0 || Number.isNaN(simNumber)) simNumber = 1
    if (time < 0 || Number.isNaN(time)) time = 500
    await runMCTS(simNumber, 1, time)
  }
  
  async function runMCTS(simNumber, numOfGames, speed) {
      console.log("Simulation number: "+simNumber);
      let numOfMoves = 0
      while (games.length < numOfGames) {
        str = "SIMULATION"+simNumber+"f"+games.length
        start(str)
        let results = test.monte_carlo(simNumber, test.tree);
        let gameover = results[0]
    
        if (gameover) {
          await sleep(5);
          score = document.getElementsByClassName("score-container");
          data = {
            score: parseInt(score[0].textContent),
            simulation_number: simNumber,
            time: parseInt(end(str).toFixed(0)),
            highestTile: results[1].highestTile,
            numberOfMoves: numOfMoves
          }
          numOfMoves = 0
          games.push(data)
          allGames.push(data)
          // test.restart();
          // await sleep(100);
          console.log(allGames);
        } else {
          numOfMoves += 1;
          // uncomment this if you wanna see the board move
          if (!time) time = 0
          await sleep(time);
        }
      }
      console.log(`Average score: ${games.reduce(reducer).score/games.length}`);
    }

  async function changeState(e) {
    if (e.code === "Semicolon") {
      flag = !flag
      while (games.length < 10 && flag) {
        let move = test.run();
        if (move === null) {
          console.log("Gameover!");
          await sleep(5);
          score = document.getElementsByClassName("score-container");
          games.push(parseInt(score[0].textContent))
          // test.restart();
          // await sleep(300);
          console.log(games);
          // Remove if you want to run x amount of games
          flag = false
        } else {
          test.move(move);
          await sleep(1000);
        }
      }

      console.log(`Average score: ${games.reduce(reducer)/10}`);
    } else if (e.code === "KeyM") {

      console.log("=============Running MCTS=============");

      let s = 50
      // await runMCTS(s, 50)
      for (let i = 0; i < 1; i++) {
        await runMCTS(s, 100)
        games = []
        s += 50
      }
      download(allGames)



      // old shit
      // flag = !flag
      // while (games.length < 10 && flag) {
      //   let gameover = test.monte_carlo(simNumber, test.tree);
      //   if (gameover) {
      //     console.log("Gameover!");
      //     await sleep(5);
      //     score = document.getElementsByClassName("score-container");
      //     games.push(parseInt(score[0].textContent))
      //     // test.restart();
      //     // await sleep(300);
      //     console.log(games);
      //     // Remove if you want to run x amount of games
      //     // flag = false
      //   } else {
      //     await sleep(1);
      //   }
      // }
      // console.log(`Average score: ${games.reduce(reducer)/10}`);


    } else if (e.code === "KeyC") {
      games = []
    } else if (e.code === "KeyO") {
      // Download
      download(games)
    }


  }

});


function download(games) {
  console.log("Downloading data...");
  let a = document.createElement('a');
  a.href = "data:application/octet-stream,"+encodeURIComponent(JSON.stringify(games));
  a.download = 'results.json';
  a.click();
}
