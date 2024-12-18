let rmv = false,
  player = "Anthony Gill",
  myData,
  showData;

let init = () => {
  d3.csv("/NBA_2024_Shots.csv").then((data) => {
    var originData = [];
    data
      .filter((d) => (d.PLAYER_NAME === null ? false : true))
      .forEach((d) => {
        var tmpobj = {};
        tmpobj["Name"] = d.PLAYER_NAME;
        tmpobj["X"] = Math.min(Math.floor(parseFloat(d.LOC_X) + 25), 49);
        tmpobj["Y"] = Math.min(Math.floor(parseFloat(d.LOC_Y)), 46);
        tmpobj["suc"] = d.SHOT_MADE === "TRUE" ? 1 : 0;
        tmpobj["dist"] = Math.floor(d.SHOT_DISTANCE);
        originData.push(tmpobj);
      });
    myData = d3.group(originData, (d) => d.Name);
    drawHeatmap();
    drawLinechart1();
    drawLinechart2();
  });
};

let drawHeatmap = () => {
  if (rmv) {
    d3.select("#Heatmap").select("svg").remove();
  }
  rmv = true;

  var chooseData = myData.get(player),
    showArr = Array.from({ length: 50 }, () => new Array(47).fill(0)),
    sucArr = Array.from({ length: 50 }, () => new Array(47).fill(0)),
    showData = [],
    maxVal = 0;

  chooseData.forEach((d) => {
    showArr[d.X][d.Y]++;
    if (d.suc === 1) {
      sucArr[d.X][d.Y]++;
    }
    if (showArr[d.X][d.Y] > maxVal) {
      maxVal += 1;
    }
  });

  for (var i = 0; i <= 49; i++) {
    for (var j = 0; j <= 46; j++) {
      if (showArr[i][j] === 0) {
        continue;
      }
      showData.push({ X: i, Y: j, val: showArr[i][j], suc: sucArr[i][j] });
    }
  }

  var margin = { top: 0, right: 0, bottom: 0, left: 0 },
    width = 600 - margin.left - margin.right,
    height = 564 - margin.top - margin.bottom;

  var svg = d3
    .select("#Heatmap")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("class", "heatmap")
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // create and draw axis

  var xDomain = [...Array(50).keys()].map((i) => i),
    yDomain = [...Array(47).keys()].map((i) => i);

  var Xaxis = d3.scaleBand().range([0, width]).domain(xDomain).padding(0.1),
    Yaxis = d3.scaleBand().range([0, height]).domain(yDomain).padding(0.1),
    areaU = Xaxis.bandwidth() * Yaxis.bandwidth(),
    areaL = (areaU * 1) / 3,
    Length = (v) =>
      Math.sqrt(d3.scaleLinear().range([areaL, areaU]).domain([1, maxVal])(v)),
    Color = d3.scaleSequential(
      d3.interpolateRgbBasis(["red", "#cc00cc", "blue"])
    );

  // draw area

  svg
    .selectAll()
    .data(showData)
    .enter()
    .append("rect")
    .attr("x", function (d) {
      return Xaxis(d.X) + Xaxis.bandwidth() / 2 - Length(d.val) / 2;
    })
    .attr("y", function (d) {
      return Yaxis(d.Y) + Yaxis.bandwidth() / 2 - Length(d.val) / 2;
    })
    .attr("width", function (d) {
      return Length(d.val);
    })
    .attr("height", function (d) {
      return Length(d.val);
    })
    .attr("rx", 2)
    .attr("ry", 2)
    .attr("class", "heatmap_block")
    .style("fill", function (d) {
      return Color(d.suc / d.val);
    })
    .append("title")
    .text(function (d) {
      return `shot: ${
        d.val
      }\nhit: ${d.suc}\nhit rate: ${((100 * d.suc) / d.val).toFixed(1)}%`;
    });
};

let drawLinechart1 = () => {
  if (rmv) {
    d3.select("#Linechart1").select("svg").remove();
  }
  rmv = true;

  var chooseData = myData.get(player),
    showArr = Array(47).fill(0),
    showData = [],
    maxVal = 0,
    totalShot = 0;

  chooseData.forEach((d) => {
    showArr[d.dist]++;
    totalShot++;
  });

  for (var i = 0; i <= 46; i++) {
    tmpobj = { dist: i, val: showArr[i] };
    if (showArr[i] > maxVal) {
      maxVal = showArr[i];
    }
    showData.push(tmpobj);
  }

  var margin = { top: 10, right: 10, bottom: 100, left: 40 },
    width = 640 - margin.left - margin.right,
    height = 540 - margin.top - margin.bottom;

  var svg = d3
    .select("#Linechart1")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("class", "linechart1")
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // create and draw axis

  var Yaxis = d3
      .scaleLinear()
      .range([height, 0])
      .domain([0, (maxVal * 1.1) / totalShot]),
    Xaxis = d3.scaleLinear().range([0, width]).domain([0, 46]),
    Line = d3
      .line()
      .x((d) => Xaxis(d.dist))
      .y((d) => Yaxis(d.val / totalShot));

  // draw
  svg
    .append("g")
    .call(d3.axisLeft(Yaxis).tickFormat((x) => `${(x * 100).toFixed(0)}%`));
  svg
    .append("g")
    .call(d3.axisBottom(Xaxis))
    .attr("transform", `translate(0, ${height + margin.top})`);

  svg
    .append("path")
    .data(showData)
    .attr("d", Line(showData))
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5);

  // mouse monitor
  var circle = svg.append("circle").attr("r", 0).attr("class", "current_pos");
  var cline = svg
    .append("path")
    .attr("visibility", "hidden")
    .attr("class", "current_pos_line");
  var tooltip = svg
    .append("g")
    .attr("class", "tooltip")
    .attr("visibility", "visible");

  var listeningRect = svg
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("opacity", 0)
    .on("mousemove", function (event) {
      var [xcoord, ycoord] = d3.pointer(event, this);
      var bisectDist = d3.bisector((d) => d.dist).center;
      var x0 = Xaxis.invert(xcoord);
      var nearDist = bisectDist(showData, x0);
      var d = showData[nearDist];

      var cx = Xaxis(nearDist),
        cy = Yaxis(d.val / totalShot);
      circle.attr("cx", cx).attr("cy", cy);
      circle.transition().duration(50).attr("r", 8);

      cline
        .attr("d", `M${cx} 0 L${cx} ${height}`)
        .attr("visibility", "visible");

      tooltip.select("rect").remove();
      tooltip.select("text").remove();

      tooltip
        .attr("visibility", "visible")
        .append("rect")
        .attr("x", cx)
        .attr("y", cy)
        .attr("height", 60)
        .attr("class", "tooltip_block");

      var tt = tooltip
        .append("text")
        .attr("fill", "black")
        .attr("class", "tooltip_text");

      tt.append("tspan")
        .text(`distance: ${nearDist}ft`)
        .attr("x", cx + 12)
        .attr("y", cy + 16);
      tt.append("tspan")
        .text(`number of shot: ${d.val}`)
        .attr("x", cx + 12)
        .attr("y", cy + 32);
      tt.append("tspan")
        .text(`shot rate: ${((100 * d.val) / totalShot).toFixed(0)}%`)
        .attr("x", cx + 12)
        .attr("y", cy + 48);
    })
    .on("mouseleave", function () {
      circle.transition().duration(50).attr("r", 0);
      cline.attr("visibility", "hidden");

      tooltip.attr("visibility", "hidden");
    });
};

let drawLinechart2 = () => {
  if (rmv) {
    d3.select("#Linechart2").select("svg").remove();
  }
  rmv = true;

  var chooseData = myData.get(player),
    shotArr = Array(47).fill(0),
    sucArr = Array(47).fill(0),
    showData = [],
    totalSuc = 0;

  chooseData.forEach((d) => {
    shotArr[d.dist]++;
    if (d.suc === 1) {
      sucArr[d.dist]++;
      totalSuc++;
    }
  });

  for (var i = 0; i <= 46; i++) {
    tmpobj = { dist: i, val: shotArr[i], goal: sucArr[i], sucRate: 0 };
    if (shotArr[i] !== 0) {
      tmpobj.sucRate = sucArr[i] / shotArr[i];
    }
    showData.push(tmpobj);
  }

  var margin = { top: 10, right: 10, bottom: 100, left: 40 },
    width = 640 - margin.left - margin.right,
    height = 540 - margin.top - margin.bottom;

  svg = d3
    .select("#Linechart2")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("class", "linechart2")
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // create and draw axis
  var Yaxis = d3.scaleLinear().range([height, 0]).domain([0, 1]),
    Xaxis = d3.scaleLinear().range([0, width]).domain([0, 46]),
    Line = d3
      .line()
      .x((d) => Xaxis(d.dist))
      .y((d) => Yaxis(d.sucRate));

  // draw
  svg.append("g").call(
    d3
      .axisLeft(Yaxis)
      .ticks(6)
      .tickFormat((x) => `${x * 100}%`)
  );
  svg
    .append("g")
    .call(d3.axisBottom(Xaxis))
    .attr("transform", `translate(0, ${height + margin.top})`);

  svg
    .append("path")
    .data(showData)
    .attr("d", Line(showData))
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5);

  // mouse monitor
  var circle = svg.append("circle").attr("r", 0).attr("class", "current_pos");
  var cline = svg
    .append("path")
    .attr("visibility", "hidden")
    .attr("class", "current_pos_line");
  var tooltip = svg
    .append("g")
    .attr("class", "tooltip")
    .attr("visibility", "visible");

  var listeningRect = svg
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("opacity", 0)
    .on("mousemove", function (event) {
      var [xcoord, ycoord] = d3.pointer(event, this);
      var bisectDist = d3.bisector((d) => d.dist).center;
      var x0 = Xaxis.invert(xcoord);
      var nearDist = bisectDist(showData, x0);
      var d = showData[nearDist];

      var cx = Xaxis(nearDist),
        cy = Yaxis(d.sucRate);
      circle.attr("cx", cx).attr("cy", cy);
      circle.transition().duration(50).attr("r", 8);

      cline
        .attr("d", `M${cx} 0 L${cx} ${height}`)
        .attr("visibility", "visible");

      tooltip.select("rect").remove();
      tooltip.select("text").remove();

      tooltip
        .attr("visibility", "visible")
        .append("rect")
        .attr("x", cx)
        .attr("y", cy)
        .attr("height", 80)
        .attr("class", "tooltip_block");

      var tt = tooltip
        .append("text")
        .attr("fill", "black")
        .attr("class", "tooltip_text");

      tt.append("tspan")
        .text(`distance: ${nearDist}ft`)
        .attr("x", cx + 12)
        .attr("y", cy + 16);
      tt.append("tspan")
        .text(`number of shot: ${d.val}`)
        .attr("x", cx + 12)
        .attr("y", cy + 32);
      tt.append("tspan")
        .text(`number of goal: ${d.goal}`)
        .attr("x", cx + 12)
        .attr("y", cy + 48);
      tt.append("tspan")
        .text(`goal rate: ${d.sucRate.toFixed(0)}%`)
        .attr("x", cx + 12)
        .attr("y", cy + 64);
    })
    .on("mouseleave", function () {
      circle.transition().duration(50).attr("r", 0);
      cline.attr("visibility", "hidden");

      tooltip.attr("visibility", "hidden");
    });
};
