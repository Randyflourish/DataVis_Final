let url =
    "https://api.lbrt.tw/vis_final/player_shots/?player_id=1630166&season=2024",
  player = "Deni Avdija",
  colorMode = 1, // 1: by shooting successful rate, 2: by area
  areaMode = 1, // 1: by shooting number, 2: by success number
  myData,
  showData;

// Copyright 2021, Observable Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/color-legend
function Legend(
  color,
  {
    title,
    tickSize = 10,
    width = 480,
    height = 70 + tickSize,
    marginTop = 24,
    marginRight = 0,
    marginBottom = 30 + tickSize,
    marginLeft = 5,
    ticks = width / 64,
    tickFormat,
    tickValues,
  } = {}
) {
  function ramp(color, n = 256) {
    const canvas = document.createElement("canvas");
    canvas.width = n;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    for (let i = 0; i < n; ++i) {
      context.fillStyle = color(i / (n - 1));
      context.fillRect(i, 0, 1, 1);
    }
    return canvas;
  }

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .style("overflow", "visible")
    .style("display", "block");

  let tickAdjust = (g) =>
    g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height);
  let x;

  // Continuous
  if (color.interpolate) {
    const n = Math.min(color.domain().length, color.range().length);

    x = color
      .copy()
      .rangeRound(
        d3.quantize(d3.interpolate(marginLeft, width - marginRight), n)
      );

    svg
      .append("image")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("preserveAspectRatio", "none")
      .attr(
        "xlink:href",
        ramp(
          color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))
        ).toDataURL()
      );
  }

  // Sequential
  else if (color.interpolator) {
    x = Object.assign(
      color
        .copy()
        .interpolator(d3.interpolateRound(marginLeft, width - marginRight)),
      {
        range() {
          return [marginLeft, width - marginRight];
        },
      }
    );

    svg
      .append("image")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("preserveAspectRatio", "none")
      .attr("xlink:href", ramp(color.interpolator()).toDataURL());

    // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
    if (!x.ticks) {
      if (tickValues === undefined) {
        const n = Math.round(ticks + 1);
        tickValues = d3
          .range(n)
          .map((i) => d3.quantile(color.domain(), i / (n - 1)));
      }
      if (typeof tickFormat !== "function") {
        tickFormat = d3.format(tickFormat === undefined ? ",f" : tickFormat);
      }
    }
  }

  // Threshold
  else if (color.invertExtent) {
    const thresholds = color.thresholds
      ? color.thresholds() // scaleQuantize
      : color.quantiles
      ? color.quantiles() // scaleQuantile
      : color.domain(); // scaleThreshold

    const thresholdFormat =
      tickFormat === undefined
        ? (d) => d
        : typeof tickFormat === "string"
        ? d3.format(tickFormat)
        : tickFormat;

    x = d3
      .scaleLinear()
      .domain([-1, color.range().length - 1])
      .rangeRound([marginLeft, width - marginRight]);

    svg
      .append("g")
      .selectAll("rect")
      .data(color.range())
      .join("rect")
      .attr("x", (d, i) => x(i - 1))
      .attr("y", marginTop)
      .attr("width", (d, i) => x(i) - x(i - 1))
      .attr("height", height - marginTop - marginBottom)
      .attr("fill", (d) => d);

    tickValues = d3.range(thresholds.length);
    tickFormat = (i) => thresholdFormat(thresholds[i], i);
  }

  // Ordinal
  else {
    x = d3
      .scaleBand()
      .domain(color.domain())
      .rangeRound([marginLeft, width - marginRight]);

    svg
      .append("g")
      .selectAll("rect")
      .data(color.domain())
      .join("rect")
      .attr("x", x)
      .attr("y", marginTop)
      .attr("width", Math.max(0, x.bandwidth() - 1))
      .attr("height", height - marginTop - marginBottom)
      .attr("fill", color);

    tickAdjust = () => {};
  }

  svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined)
        .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
        .tickSize(tickSize)
        .tickValues(tickValues)
    )
    .call(tickAdjust)
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .append("text")
        .attr("x", marginLeft)
        .attr("y", marginTop + marginBottom - height - 6)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .attr("class", "title")
        .text(title)
    );

  return svg.node();
}

function zoneConvert(zid) {
  switch (zid) {
    case 1:
      return "corner";
    case 2:
      return "side center";
    case 3:
      return "center";
    default:
      return undefined;
  }
}

let testBtn = () => {
  colorMode = 3 - colorMode;
  update();
};

let update = () => {
  d3.json(url)
    .then((fetchData) => {
      myData = [];
      fetchData
        .filter((d) => (d.PLAYER_NAME === null ? false : true))
        .forEach((d) => {
          var tmpobj = {};
          tmpobj["Name"] = d.PLAYER_NAME;
          tmpobj["X"] = Math.min(Math.floor(parseFloat(d.LOC_X) + 25), 49);
          tmpobj["Y"] = Math.min(Math.floor(parseFloat(d.LOC_Y)), 46);
          tmpobj["suc"] = d.SHOT_MADE === true ? 1 : 0;
          tmpobj["dist"] = Math.floor(d.SHOT_DISTANCE);
          tmpobj["zone"] =
            d.ZONE_ABB === "L" || d.ZONE_ABB === "R"
              ? 1
              : d.ZONE_ABB === "C"
              ? 3
              : 2;
          myData.push(tmpobj);
        });
      return 1;
    })
    .then((r) => {
      drawHeatmap();
      drawLinechart1();
      drawLinechart2();
    })
    .catch((err) => console.log(err));
};

let drawHeatmap = () => {
  d3.select("#Heatmap").selectAll(".legend").remove();
  d3.select("#Heatmap").selectAll("svg").remove();

  var showArr = Array.from({ length: 50 }, () => new Array(47).fill(0)),
    sucArr = Array.from({ length: 50 }, () => new Array(47).fill(0)),
    zoneArr = Array.from({ length: 50 }, () => new Array(47).fill(0)),
    showData = [],
    maxVal = 0;

  myData.forEach((d) => {
    showArr[d.X][d.Y]++;
    if (zoneArr[d.X][d.Y] !== 0 && zoneArr[d.X][d.Y] !== d.zone) {
      console.log("zone conflict");
    }
    zoneArr[d.X][d.Y] = d.zone;
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
      showData.push({
        X: i,
        Y: j,
        val: showArr[i][j],
        suc: sucArr[i][j],
        zone: zoneArr[i][j],
      });
    }
  }

  var margin = { top: 0, right: 0, bottom: 0, left: 0 },
    width = 600 - margin.left - margin.right,
    height = 564 - margin.top - margin.bottom;

  var leg = d3.select("#Heatmap").append("div").attr("class", "legend");

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
    sucRateColor = d3.scaleSequential(
      d3.interpolateRgbBasis(["#e74c3c", "#2e86c1"])
    ),
    zoneColor = d3
      .scaleOrdinal()
      .domain([1, 2, 3])
      .range(["#9b59b6", "#52be80", "#f39c12"]);
  var sucRateLegend = Legend(sucRateColor, {
      title: "Hit Rate",
      tickFormat: (d) => (d * 100).toFixed(0).toString().concat("%"),
    }),
    zoneLegend = Legend(zoneColor, {
      title: "Zone Name",
      tickSize: 0,
      tickFormat: (d) => zoneConvert(d),
    });

  // append legend
  if (colorMode === 1) {
    leg.node().appendChild(sucRateLegend);
  } else if (colorMode === 2) {
    leg.node().appendChild(zoneLegend);
  }
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
      if (colorMode === 1) {
        return sucRateColor(d.suc / d.val);
      } else if (colorMode === 2) {
        return zoneColor(d.zone);
      }
    })
    .append("title")
    .text(function (d) {
      return `shot: ${
        d.val
      }\nhit: ${d.suc}\nhit rate: ${((100 * d.suc) / d.val).toFixed(1)}%`;
    });
};

let drawLinechart1 = () => {
  d3.select("#Linechart1").select("svg").remove();

  var showArr = Array(47).fill(0),
    showData = [],
    maxVal = 0,
    totalShot = 0;

  myData.forEach((d) => {
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
  d3.select("#Linechart2").select("svg").remove();

  var shotArr = Array(47).fill(0),
    sucArr = Array(47).fill(0),
    showData = [],
    totalSuc = 0;

  myData.forEach((d) => {
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
