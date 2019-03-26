define([], function() {
  'use strict';
  
  function getMaxOfArray(numArray) {
    return Math.max.apply(null, numArray);
  }

  function getMinOfArray(numArray) {
    return Math.min.apply(null, numArray);
  }

  // ---------------------------------------------------------------------------------
  class draw{
    constructor (koCanvas, koWidth, koHeight) {
      this.win = {x: 0, y: 0};

      this.plotWin = {x0: 0, y0: 0,
                      xn: 0, yn: 0};

      this.x = [];
      this.y = [];
      this.miny = 0; 
      this.maxy = 0;

      this.plot = {x: [], n: 0, y: []};

      this.legendData = {
        head: { text: "", x: 0, y: 0},
        lines: [] };
      this.axisData = {
        Ox:{},
        Oy:{}
      }
      this.minXTextSize = {width: 0};
      this.maxXTextSize = {width: 0};
      this.maxYTextSize = {width: 0};
      this.axisOxTextSize = {width: 0};
      this.axisOyTextSize = {width: 0};

      this.canvas = document.getElementById(koCanvas());
      this.ctx = this.canvas.getContext('2d');
      this.win.x = koWidth();
      this.win.y = koHeight();

      let style = window.getComputedStyle(this.canvas, null)
      let fontSize = parseFloat(style.getPropertyValue('font-size'));
      let fontFamily = style.getPropertyValue('font-family');
      let fontStyle = style.getPropertyValue('font-style');
      let fontColor = style.getPropertyValue('color');
      let fontWeight = "normal";
      this.letterWidth = 0;

      this.font = { 
        weight: fontWeight,
        px: fontSize, 
        color: fontColor,
        family: fontFamily, 
        } 

      Object.defineProperties(this.font, {
        style: {
          get: function (){
            let acc = "";
            for(let key in this){
              if(key !== "color") {
                if((key !== "px")&&(this[key].length > 0)) acc += " " + this[key];
                if(key === "px") acc += " " + this[key] + "px";
              }
            }
            return acc.trim();
          },
          enumerable: false
        },
        r: {
          get: function (){
            return this.px/2;
          },
          enumerable: false
        }
      });

      this.ctx.font = this.font.style;
    };

    circle(x, y, r, color=""){
      this.ctx.beginPath();
      var startAngle = 0; // Starting point on circle
      var endAngle = Math.PI+Math.PI; // End point on circle
      var anticlockwise = true; // clockwise or anticlockwise  
      this.ctx.arc(x, y, r, startAngle, endAngle, anticlockwise);
      if (color !== "") this.ctx.fillStyle = color;
      this.ctx.fill();
    };

    test (){
      this.ctx.fillStyle = "#FF0000";
      this.ctx.fillRect(0, 15, this.win.x, 15);
    };

    setFont(font) {
      for(let key in font){
        this.font[key] = font[key];
      }

      this.ctx.font = this.font.style;
    };

    init(x, y, head, axis) {
      this.x = x;
      this.minXTextSize = this.ctx.measureText(x[0]);
      this.maxXTextSize = this.ctx.measureText(x[x.length - 1]);

      let maxarr = [];
      let minarr = [];
      this.letterWidth = this.ctx.measureText("ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz").width/53;
      
      for (let i = 0; i < y.length; i++) {
        let line = {
        };
        if ('legend' in y[i])
        {
          line = y[i].legend;
          line.y = this.font.px * ( i + 3 );
          line.x = Math.round((this.win.x - this.ctx.measureText(line.text).width)/2);
          line.r = (this.font.px - 2)/2;
        }
        this.legendData.lines.push(line);

        let ydata = y[i].data;
        maxarr.push(getMaxOfArray(ydata));
        minarr.push(getMinOfArray(ydata));

        for (let j = ydata.length; j < x.length; j++){
          ydata.unshift(0);
        }
        this.y.push({
          data: ydata
        });
      }

      this.maxy = getMaxOfArray(maxarr);
      this.miny = getMinOfArray(minarr);
    
      this.maxYTextSize = this.ctx.measureText(Math.round(this.maxy*10)/10 + "");

      if (head){
         if (head.text.length > 0){
          this.legendData.head.text = head.text;
          this.legendData.head.x = Math.round((this.win.x - this.ctx.measureText(head.text).width)/2);
          this.legendData.head.y = this.font.px;
        }
      }

      
      if(axis){
        if ('y' in axis){
            this.axisOyTextSize = this.ctx.measureText(axis.y + "");
            this.axisData.Oy.x = Math.max(this.maxYTextSize.width, this.maxXTextSize.width, this.axisOyTextSize.width);
            this.axisData.Oy.y = this.legendData.lines[this.legendData.lines.length - 1].y + this.font.px;
            this.axisData.Oy.text = axis.y;
        }
        if ('x' in axis){
            this.axisOxTextSize = this.ctx.measureText(axis.x + "");
            this.axisData.Ox.x = this.win.x - this.axisOxTextSize.width - this.letterWidth;
            this.axisData.Ox.y = this.win.y - this.font.px + this.font.r;
            this.axisData.Ox.text = axis.x;
        }
      }
      

      this.plotWin.y0 = this.legendData.lines[this.legendData.lines.length - 1].y + 2*this.font.px;
      this.plotWin.x0 = Math.max(this.maxYTextSize.width, this.maxXTextSize.width, this.axisOyTextSize.width) + this.letterWidth + this.font.r;
      this.plotWin.xn = this.win.x - this.minXTextSize.width - this.letterWidth - this.axisOxTextSize.width;
      this.plotWin.yn = this.win.y - 2*this.font.px;
      this.rotateDataToPlot();
    };
    
    rotateDataToPlot(){
      let n = this.x.length - 1;
      let dx = this.plotWin.xn - this.plotWin.x0;
      this.plot.hx = dx / n;
  
      for(let i = 0; i < this.x.length; i++){
        let xi = this.plotWin.xn - i * this.plot.hx;
        this.plot.x.push(xi);
      }
  
      let plotdy = this.plotWin.yn - this.plotWin.y0;
      this.plot.hy = plotdy / n;
      let dy = this.maxy - this.miny;
  
      for (let yi of this.y){
        let ploty = [];
        for (let yidata of yi.data){
          let plotydata = 0;
          if(dy !== 0) plotydata = (yidata - this.miny)/dy;
          plotydata = this.plotWin.yn - plotdy*plotydata;
          ploty.push(plotydata)
        }
        this.plot.y.push(ploty);
      }
      this.plot.n = n + 1;
    };

    axis(color = "#000000", lineWidth = 1){
      this.ctx.beginPath();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = lineWidth;
      this.ctx.moveTo(this.plotWin.xn, this.plotWin.yn);
      this.ctx.lineTo(this.plotWin.x0, this.plotWin.yn);
      this.ctx.lineTo(this.plotWin.x0 , this.plotWin.y0);
      if(this.axisOxTextSize.width > 0){
        this.ctx.moveTo(this.axisData.Ox.x, this.plotWin.yn);
        this.ctx.lineTo(this.plotWin.xn, this.plotWin.yn);
      }

      if(this.axisOyTextSize.width > 0){
        this.ctx.moveTo(this.plotWin.x0, this.axisData.Oy.y);
        this.ctx.lineTo(this.plotWin.x0, this.plotWin.y0);
      }


      this.ctx.stroke();
    };

    pointsOnAxis(lineWidth = 1, filterx = 2, filtery = 1, color){
      let dot = this.font.r;
      this.ctx.font = this.font.style;
      if (color) this.ctx.strokeStyle = color;
      else 
        if('color' in this.font)
          this.ctx.strokeStyle = this.font.color;
        else 
          this.ctx.strokeStyle = 'black';
        
      
        if ((this.maxXTextSize.width +this.letterWidth) > this.plot.hx)
          filterx = Math.ceil((2*this.maxXTextSize.width + this.letterWidth)/this.plot.hx);

      // Ox рисование 
      this.ctx.beginPath();
      this.ctx.lineWidth = lineWidth;
        
      this.ctx.textBaseline = "middle";
      this.ctx.textAlign = "center";
      for (let i = 0 ; i < this.plot.n; i++){
        this.ctx.moveTo(this.plot.x[i], this.plotWin.yn);
        this.ctx.lineTo(this.plot.x[i], this.plotWin.yn + dot);
        if (i%filterx === 0){
          this.ctx.fillText(this.x[i] + "", this.plot.x[i], this.plotWin.yn + this.font.px + dot);
        }
      }
      // единицы измерения по Ox
      if(this.axisOxTextSize.width > 0 ){
        this.ctx.moveTo(this.axisData.Ox.x, this.axisData.Ox.y);
        this.ctx.fillText(this.axisData.Ox.text, this.axisData.Ox.x, this.axisData.Ox.y);
      }
      this.ctx.stroke();

      if ((2*this.font.px) > this.plot.hy)
        filtery = Math.ceil(2*this.font.px/this.plot.hy);
  
      // Oy рисование
      this.ctx.beginPath();
      this.ctx.textBaseline = "middle";
      this.ctx.textAlign = "right";
      let hy = (this.maxy - this.miny)/(this.plot.n - 1);
  
      for (let i = 0 ; i < this.plot.n; i++) {
        this.ctx.moveTo(this.plotWin.x0, this.plotWin.yn - i*this.plot.hy);
        this.ctx.lineTo(this.plotWin.x0 - dot, this.plotWin.yn - i*this.plot.hy);
        if (i%filtery === 0){
          let ycurr = this.miny + i*hy;
          if (hy*filtery < 1) ycurr = Math.round(ycurr*10)/10;
          else ycurr = Math.round(ycurr);
          this.ctx.fillText(ycurr + "", this.plotWin.x0 - this.letterWidth - dot, this.plotWin.yn - i*this.plot.hy);
        }
      }
      // единицы измерения по Oy
      if(this.axisOyTextSize.width > 0 ){
        this.ctx.moveTo(this.axisData.Oy.x, this.axisData.Oy.y);
        this.ctx.fillText(this.axisData.Oy.text, this.axisData.Oy.x, this.axisData.Oy.y);
      }

      this.ctx.stroke();
    }

    clear(...params){
      if(params.length > 0)
        this.ctx.clearRect(...params);
      else
        this.ctx.clearRect(0,0,this.win.x,this.win.y);
    };

    legend (color) {
      if(!color)
        if('color' in this.font)
          color = this.font.color;
        else 
          color = '#000000';
      
      this.ctx.textBaseline = "middle";
      this.ctx.textAlign = "left";

      // легенда
      this.ctx.font = this.font.style;
      for(let line of this.legendData.lines){
        if ('color' in line) this.circle(line.x - this.font.px, line.y, line.r, line.color);
        if ('text' in line){
          this.ctx.fillStyle = color;
          this.ctx.fillText(line.text, line.x, line.y);
        }
      }

      // шапка полужирным
      this.ctx.save();
      let weightSave = this.font.weight;
      this.font.weight = "bold";
      this.ctx.font = this.font.style;
      this.font.weight = weightSave;
        this.ctx.fillText(this.legendData.head.text, this.legendData.head.x, this.legendData.head.y);
      this.ctx.restore();
      this.ctx.font = this.font.style;
    }

    graph(lineWidth = 1, color = "#000000") {
      this.ctx.lineWidth = lineWidth;
      if (this.plot.n > 0)
      {
        for (let yi = 0; yi < this.plot.y.length; yi++) {
          this.ctx.beginPath();
          let y = this.plot.y[yi];
          let x = this.plot.x;
          let yp = y[0];
          let xp = x[0];
          let line = this.legendData.lines[yi];
          
          if ('color' in line) 
            this.ctx.strokeStyle = line.color;
          else
            this.ctx.strokeStyle = color;

          this.ctx.moveTo(xp, yp);   
          for(let i = 1; i < this.plot.n; i++) {
            xp = x[i];
            yp = y[i];  
            this.ctx.lineTo(xp, yp);
          }
          this.ctx.stroke();
        }
      }
    }
  }

  return {
    create: function (...params) {
        var drawModule = new draw(...params);
        return drawModule;
    }
  }
});
