import matplotlib
import matplotlib.pyplot as plt
import numpy as np
from os import listdir
from os.path import isfile, join
import json

file_path = "./data"

all_data_files = [f for f in listdir(file_path) if isfile(join(file_path, f))]
all_data = []

for filename in all_data_files:
    f = open("./data/"+filename, "r")
    json_data = json.loads(f.read())
    for entry in json_data:
        all_data.append(entry)
        

mc_data = {
    "10": {
        "count": 0,
        "items": []
    },
    "50": {
        "count": 0,
        "items": []
    },
    "60": {
        "count": 0,
        "items": []
    },
    "100": {
        "count": 0,
        "items": []
    },
    "150": {
        "count": 0,
        "items": []
    },
    "200": {
        "count": 0,
        "items": []
    },
    "250": {
        "count": 0,
        "items": []
    },
    "300": {
        "count": 0,
        "items": []
    }
}

for entry in all_data:
    sim_number_as_string = str(entry["simulation_number"])
    mc_data[sim_number_as_string]["count"] += 1
    mc_data[sim_number_as_string]["items"].append(entry)

count = 0
total_score = 0
total_time = 0
data = []
scores = []
average_scores = []
wins = 0


get_these = ["50", "100", "150", "200", "250", "300"]

for simulation_number in get_these:
    total_score = 0
    total_time = 0
    wins = 0
    count = 0
    scores = []
    for entry in mc_data[simulation_number]["items"]:
        count += 1
        total_score += entry["score"]
        scores.append(entry["score"])

        if (entry["highestTile"] >= 2048):
            wins += 1

        if "time" in entry:
            # I have some messed up times in here
            if (entry["time"] < 150000):
                total_time += entry["time"]
    print("*"*20)
    print("Total number of samples: " + str(count))
    print("Total wins: " + str(wins))
    print("Average number of wins: " + str(round(wins/count, 3)))
    average_scores.append(total_score/count)
    print("Average score for "+ simulation_number +" simulations is " + str(total_score/count))
    print("Average time for "+ simulation_number +" simulations is " + str((total_time/count)/1000) + " seconds")
    print("*"*20)
    data.append(scores)


np.random.seed(19680801)

# Data for plotting
fig1, ax1 = plt.subplots()
ax1.set_title('Final score vs number of simulations')
ax1.boxplot(data, labels=get_these)

plt.plot([1,2,3,4,5,6], average_scores)
# fig.savefig("test.png")
plt.show()