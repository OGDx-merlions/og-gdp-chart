(function() {
  Polymer({

    is: 'og-gdp-chart',

    properties: {
      /**
      * Width of the Chart.
      *
      * @property width
      */
      width: {
				type: Number,
				value: 960
      },
      /**
      * Height of the Chart.
      *
      * @property height
      */
			height: {
				type: Number,
				value: 250
      },
      /**
      * Margin of the Chart.
      Eg: {top: 20, right: 20, bottom: 30, left: 50}
      *
      * @property margin
      */
      margin: {
				type: Object,
				value() {
					return {top: 20, right: 20, bottom: 30, left: 50};
				},
				observer: '_redraw'
			},
      /**
      * Chart Data
      * Format: {
        "gamma": {"historical": [{"x": 1, "y": 2, "band": "1"}], 
          "current": [{"x": 1, "y": 2, "band": "1"}]},
        "density": {"historical": [{"x": 1, "y": 2, "band": "1"}], 
          "current": [{"x": 1, "y": 2, "band": "1"}]},
        "porosity": {"historical": [{"x": 1, "y": 2, "band": "1"}], 
          "current": [{"x": 1, "y": 2, "band": "1"}]}
      }
      * @property data
      */
      data: {
				type: Array,
				value() {
					return [];
				},
				observer: '_redraw'
      },
      /**
       * Axis Data
       *
       * @property axisData
       */
      axisData: {
        type: Object,
        notify: true,
        observer: '_redraw'
      },
      /**
       * Legend Alignment
       * Eg: right, left, center
       *
       * @property legendAlignment
       */
      legendAlignment: {
        type: String,
        value: "right"
      },
      _bands: {
        type: Array
      }
    },

    __defaultAxisData: {
        "x": {
          "color": "",
          "axisLabel": "Measured Depth",
          "unit": "",
          "hideGrid": true,
          "axisColor": "#c1c0c0",
          "tickColor": "#c1c0c0",
          "gamma": {
            "tickFormat": "",
            "d3NiceType": "",
            "niceTicks": 0,
            "start": 0
          },
          "density": {
            "tickFormat": "",
            "d3NiceType": "",
            "niceTicks": 0,
            "start": 0
          },
          "porosity": {
            "tickFormat": "",
            "d3NiceType": "",
            "niceTicks": 0,
            "start": 0
          }
        },
        "y": {
          "hideGrid": false,
          "axisColor": "#c1c0c0",
          "tickColor": "#c1c0c0",
          "dotRadius": 2,
          "interpolation": "curveCardinal",
          "bands": {
            "1": {
              "color": "steelblue",
              "label": "Formation 1"
            }
          },
          "gamma": {
            "historical": {
              "niceTicks": 6,
              "start": 0,
              "tickFormat": "",
              "label": ""
            },
            "current": {
              "niceTicks": 6,
              "start": 0,
              "tickFormat": "",
              "label": ""
            }
          },
          "density": {
            "historical": {
              "niceTicks": 6,
              "start": 0,
              "tickFormat": "",
              "label": ""
            },
            "current": {
              "niceTicks": 6,
              "start": 0,
              "tickFormat": "",
              "label": ""
            }
          },
          "porosity": {
            "historical": {
              "niceTicks": 6,
              "start": 0,
              "tickFormat": "",
              "label": ""
            },
            "current": {
              "niceTicks": 6,
              "start": 0,
              "tickFormat": "",
              "label": ""
            }
          },
          "currentDepth": {
            "color": "#c1c0c0",
            "dashArray": "",
            "unit": "ft",
            "label": "Current Depth"
          }
        }
    },

    ready() {
      this.scopeSubtree(this.$.gammaChart, true);
      this.scopeSubtree(this.$.densityChart, true);
      this.scopeSubtree(this.$.porosityChart, true);
    },

    attached() {
      if(this.data && this.data.length) {
        this.draw();
      }
    },

    draw() {
      let data = this.data;
      if(!data || !this.axisData || !this.axisData.x || !this.axisData.y) {return;}
      this._setupDefaults();
      if(Object.keys(this.axisData.y.bands).length > 1) {
        let _bands = [];
        Object.keys(this.axisData.y.bands).forEach((_bandId) => {
          let obj = this.axisData.y.bands[_bandId];
          _bands.push(obj);
        });
        this.set("_bands", _bands);
        this.notifyPath('_bands.*');
      }
      this._draw('gamma');
      this._draw('density');
      this._draw('porosity');
      this.fire("chart-drawn", {});
    },

    _draw(type) {
      let data = this.data;
      if(!data || !this.axisData || !this.axisData.x || !this.axisData.y) {return;}
      this._prepareChartingArea(type);
      this._prepareAxes(data, type);
      this._drawGridLines(data, type);
      this._drawAxes(data, type);
      this._drawCurrentDepthSeparator(data, type);
      this._drawChart(data, type);
    },
    
    _setupDefaults() {
      this.gamma = this.gamma || {"historical": {}, "current": {}};
      this.density = this.density || {"historical": {}, "current": {}};
      this.porosity = this.porosity || {"historical": {}, "current": {}};

      this.axisData = this.axisData ? this.axisData : this.__defaultAxisData;
      this.axisData.x = this.axisData.x ? this.axisData.x : this.__defaultAxisData.x;
      this.axisData.y = this.axisData.y ? this.axisData.y : this.__defaultAxisData.y;

      if(this.axisData.x.axisColor) {
        this.customStyle['--x-axis-color'] = this.axisData.x.axisColor;
      }
      if(this.axisData.x.tickColor) {
        this.customStyle['--x-tick-color'] = this.axisData.x.tickColor;
      }
      if(this.axisData.y.axisColor) {
        this.customStyle['--y-axis-color'] = this.axisData.y.axisColor;
      }
      if(this.axisData.y.tickColor) {
        this.customStyle['--y-tick-color'] = this.axisData.y.tickColor;
      }
      this.updateStyles();
    },

    _prepareChartingArea(type) {
      let d3 = Px.d3;
      // set the dimensions and margins of the graph
      this.margin = this.margin || {top: 30, right: 20, bottom: 40, left: 50},
      this.adjustedWidth = this.width - this.margin.left - this.margin.right,
      this.adjustedHeight = this.height/2 - this.margin.top - this.margin.bottom;

      let chartId = `${type}Chart`;
      d3.select(this.$[chartId]).select("svg").remove();
      this[type].svg = d3.select(this.$[chartId]).append("svg")
          .attr("viewBox", "0 0 "+this.width+" "+this.height/2)
          .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
          .attr("transform",
                "translate(" + this.margin.left + "," + this.margin.top + ")");
      this[type].toolTip = d3.tip(d3.select(this.$[chartId]))
        .attr("class", "d3-tip")
        .offset([-8, 0])
        .html(function(d) {
          return d.msg;
        });

      this[type].svg.call(this[type].toolTip);
    },
    _prepareAxes(data, type) {
      // set the ranges
      let d3 = Px.d3;
      this[type].historical.x= d3.scaleLinear().range([0, this.adjustedWidth]);
      this[type].current.x= this[type].historical.x;
      this[type].historical.y = d3.scaleLinear().range([this.adjustedHeight/2, 0]).clamp(true);
      this[type].current.y = d3.scaleLinear().range([this.adjustedHeight/2, 0]).clamp(true);

      let historicalX = this[type].historical.x,
          currentX = this[type].current.x,
          historicalY = this[type].historical.y,
          currentY = this[type].current.y;

      let _setDomain = (_axis, _axisData, _axisType, subType) => {
        let min = _axisData[type][subType] ? 
          _axisData[type][subType].start : _axisData[type].start;
        if(!min && min != 0) {
          min = min || d3.min(data[type][subType], function(d) {
            return d[_axisType];
          });
        }
        let max = d3.max(data[type][subType], function(d) {
          return d[_axisType];
        });
        _axis.domain([min, max*1.2]);

        //matches only historical X and all y
        if('historical' == subType || _axisData[type][subType]) {
          let niceTicks = _axisData[type][subType] ? 
            _axisData[type][subType].niceTicks : _axisData[type].niceTicks;
          if(niceTicks) {
            _axis.nice(niceTicks);
          } else {
            _axis.nice();
          }
        }
      };

      _setDomain(historicalX, this.axisData.x, 'x', 'historical');
      _setDomain(historicalY, this.axisData.y, 'y', 'historical');
      _setDomain(currentY, this.axisData.y, 'y', 'current');
    },
    _drawGridLines(data, type) {
      let historicalX = this[type].historical.x,
          currentX = this[type].current.x,
          historicalY = this[type].historical.y,
          currentY = this[type].current.y,
          d3 = Px.d3;
      let _drawGrid = (_axisX, _axisY, subType) => {
        if(!this.axisData.x.hideGrid) {
          let _xGrid = d3.axisBottom(_axisX)
            .tickSize(this.adjustedHeight)
            .tickFormat("");
          this[type].svg.append("g")
            .attr("class", `grid x-grid ${type}-x-grid`)
            .call(_xGrid);
        }
  
        if(!this.axisData.y.hideGrid) {
          let _translateY = subType == 'historical' ? this.adjustedHeight/2 : 0;
          let _yGrid = d3.axisLeft(_axisY)
            .tickSize(-this.adjustedWidth)
            .tickFormat("");
          this[type].svg.append("g")
            .attr("class", `grid y-grid ${type}-y-grid`)
            .attr("transform", "translate(0," + _translateY + ")")
            .call(_yGrid);
        }
      };
      _drawGrid(historicalX, historicalY, 'historical');
      _drawGrid(currentX, currentY, 'current');
    },
    _drawCurrentDepthSeparator(data, type) {
      let historicalX = this[type].historical.x,
          currentX = this[type].current.x,
          historicalY = this[type].historical.y,
          currentY = this[type].current.y,
          d3 = Px.d3;
      let currentDepth = d3.max(data[type].current, (d) => d.x),
      _axisData = this.axisData.y.currentDepth;
      this[type].svg.append("svg:line")
        .attr("class", "current-depth")
        .style("stroke", _axisData.color || this.axisData.y.axisColor)
        .style("stroke-dasharray", _axisData.dashArray || "2,2")
        .attr("x1", currentX(currentDepth))
        .attr("y1", this.adjustedHeight + 20)
        .attr("x2", currentX(currentDepth))
        .attr("y2", -7);
    },
    _drawChart(data, type) {
      this._plot(data, type);
    },
    _plot(data, type) {
      let historicalX = this[type].historical.x,
          historicalY = this[type].historical.y,
          currentX = this[type].current.x,
          currentY = this[type].current.y,
          d3 = Px.d3;
      this._plotLineAndDot(historicalX, 
        historicalY, data[type].historical, type, 'historical');
      this._plotLineAndDot(currentX, 
        currentY, data[type].current, type, 'current');
    },
    _plotLineAndDot(x, y, data, type, subType) {
      let d3 = Px.d3, radius = 2, _axisData = this.axisData, me = this;
      let line = d3.line()
          .x(function(d) { return x(+d.x); })
          .y(function(d) { return y(+d.y); });

      if(_axisData.y.interpolation) {
        line.curve(d3[_axisData.y.interpolation]);
      }
      let _bands = [];
      data = data.sort((a, b) => {
        return a.x - b.x;
      })
      let lastBand = data[0].band;
      let xMax = x.domain()[1], len = data.length;
      _bands.push({"offset": 0, 
            "color": me.axisData.y.bands[data[0].band].color});
      data.map((obj, idx) => {
        if(obj.band != lastBand) {
          _bands.push({"offset": obj.x/xMax, 
            "color": me.axisData.y.bands[data[idx-1].band].color});
          _bands.push({"offset": obj.x/xMax, 
            "color": me.axisData.y.bands[obj.band].color});
          lastBand = obj.band;
        }
      });
      _bands.push({"offset": 1, 
            "color": me.axisData.y.bands[data[len-1].band].color});
      me[type].svg.append("linearGradient")
        .attr("id", "line-gradient")            
        .attr("gradientUnits", "userSpaceOnUse")    
        .attr("x1", x(0)).attr("y1", 0)         
        .attr("x2", x(x.domain()[1])).attr("y2", 0)      
      .selectAll("stop")                      
          .data(_bands)                  
      .enter().append("stop")         
          .attr("offset", function(d) { return d.offset; })   
          .attr("stop-color", function(d) { return d.color; });

      let path = me[type].svg.append('path')
          .datum(data)
          .attr("class", `series-${type} ${type}-${subType}`)
          .attr("fill", "transparent")
          .attr("d", line)
          .style("stroke", 'url(#line-gradient)')
          .style("pointer-events", "none");

      let dots = me[type].svg.selectAll(".dot")
        .data(data)
        .enter()
          .append("circle")
          .attr("r", radius)
          .attr("cx", (d, i) => x(+d.x))
          .attr("cy", (d) => y(+d.y))
          .attr("fill", (d) => {return _axisData.y.bands[d.band].color || 'steelblue';})
          .attr("class", `series-${type}-${subType}`)
          .on('mouseover', (d, i) => {
            d3.select(me)
              .attr('r', radius + 2);
            let prefix = _axisData.y[type][subType].label ? 
              _axisData.y[type][subType].label + ": " : "";
            d.msg = prefix + d.y;
            me[type].toolTip.show(d);
          })
          .on('mouseout', (d) => {
            d3.select(this)
              .attr('r', radius);
            me[type].toolTip.hide(d);
          });

      if(subType == 'historical') {
        let _translateY = this.adjustedHeight;
        path.attr("transform", "translate(0," + _translateY/2 + ")");
        dots.attr("transform", "translate(0," + _translateY/2 + ")");
      }
    },
    _drawAxes(data, type) {
      let historicalX = this[type].historical.x,
          historicalY = this[type].historical.y,
          currentX = this[type].current.x,
          currentY = this[type].current.y,
          d3 = Px.d3;
      this._drawAxesBySubType(historicalX, historicalY, type, 'historical');
      this._drawAxesBySubType(currentX, currentY, type, 'current');
    },

    _drawAxesBySubType(x, y, type, subType) {
      // Add the X Axis
      let _xAxis = d3.axisBottom(x),
          _translateY = this.adjustedHeight;
      if('current' == subType) {
        _xAxis.tickValues([]);
        this[type].svg.append("g")
            .attr("transform", "translate(0," + _translateY/2 + ")")
            .attr("class", "x-axis")
            .call(_xAxis);
      } else {
        _xAxis.tickFormat(d3.format(this.axisData.x[type].tickFormat));
        this[type].svg.append("g")
            .attr("transform", "translate(0," + _translateY + ")")
            .attr("class", "x-axis")
            .call(_xAxis);
      }

      // Add the Y Axis
      let _yAxis = d3.axisLeft(y).ticks(this.axisData.y[type][subType].niceTicks || 5);
      if(this.axisData.y[type][subType].tickFormat) {
        _yAxis.tickFormat(d3.format(this.axisData.y[type][subType].tickFormat));
      }
      if('current' == subType) {
        this[type].svg.append("g")
            .attr("class", "y-axis")
            //.attr("transform", "translate(0,"+_translateY/2+")")
            .call(_yAxis);
      } else {
        this[type].svg.append("g")
            .attr("class", `y-axis y-axis-${type}-${subType}`)
            .attr("transform", "translate(0,"+_translateY/2+")")
            .call(_yAxis);
        let arr = this.querySelectorAll(`.y-axis-${type}-${subType} g.tick`);
        d3.select(arr[arr.length - 1]).attr('style', 'display: none')
      }

      if(this.axisData.y[type][subType].label) {
        let labelPositionY;
        if('current' == subType) {
          labelPositionY = _translateY/2;
        } else {
          labelPositionY = _translateY;
        }
        this[type].svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 0 - this.margin.left)
          .attr("x",0 - labelPositionY)
          .attr("dy", "1em")
          .attr("class", "y-axis-label")
          .text(this.axisData.y[type][subType].label);
      }

      if(subType == 'historical' && 
        this.axisData.x.axisLabel) {
        this[type].svg.append("text")
          .attr("dy", "1em")
          .attr("class", "x-axis-label")
          .attr("text-anchor", "middle")
          .attr("transform", "translate("+ 
            (this.adjustedWidth/2) +","+(this.adjustedHeight + this.margin.top)+")")
          .text(this.axisData.x.axisLabel);
      }
    },

    _redraw(newData, oldData) {
      Px.d3.select(this.$.gammaChart).select("svg").remove();
      Px.d3.select(this.$.densityChart).select("svg").remove();
      Px.d3.select(this.$.porosityChart).select("svg").remove();
      this.draw();
    }
  });
})();
