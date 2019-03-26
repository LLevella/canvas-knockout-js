define([
    'knockout',
    'knockoutmapping',
    'momentwithlocales',
    'core/configd',
    'core/utils',
    'core/draw',
    'text!./template.html',
], function (ko, komapping, momentwithlocales, configd, utils, draw, template) {
    'use strict';

    function TxRxMonitoring(params) {
        this.$container = params.$container;
        this.isFirstLoad = true;
        this.timer = null;
        this.showPage = ko.observable(true);
        this.alertMessage = utils.addAlertMessage(this.$container);
        this.RxTxLan = ko.observable('RxTxLan-canvas'); 
        this.RxTxWlan = ko.observable('RxTxWlan-canvas');
        this.imageWidth = ko.observable('700');
        this.imageHeight = ko.observable('400');
        this.byteToBit = 8; // бит в байте
        this.timeMax = 30; // количество точек по оси абсцисс
        this.timeStep = 3; // в секундах
        this.timeCounter = 0;// прошло прыжков по времени с момента начала отображения
        this.x = []; // значения на Ox
        this.y = {  // значения на Oy
          wlan:{
            rx:[],
            tx:[],
          },
          lan:{
            rx:[],
            tx:[]
          }
        };
        this.canShowRx = ko.observable(false);
        this.canShowTx = ko.observable(false);
    }

    TxRxMonitoring.prototype.template = template;

    TxRxMonitoring.prototype.alive = function () {
        var $dom = ko.utils.parseHtmlFragment('<div data-bind="visible: showPage()">' + this.template + '</div>')[0];
        this.$container.appendChild($dom);
        try {
            ko.applyBindings({
                data: this.data,
                showPage: this.showPage,
                RxTxLan: this.RxTxLan,
                RxTxWlan: this.RxTxWlan,
                imageWidth: this.imageWidth,
                imageHeight: this.imageHeight,
                changeRx: this.changeRx,
                changeTx: this.changeTx,
                canShowRx: this.canShowRx,
                canShowTx: this.canShowTx,
            }, $dom);
        }
        catch(e) {
            console.error(e);
            throw(e);
        }
    };

    function initXY(data){
      this.y.lan.rx.push(+data.eth0['rx-bytes']*this.byteToBit);
      this.y.lan.tx.push(+data.eth0['tx-bytes']*this.byteToBit);
      this.y.wlan.rx.push(+data.wlan1['rx-bytes']*this.byteToBit);
      this.y.wlan.tx.push(+data.wlan1['tx-bytes']*this.byteToBit);

      for(let i = 0; i < this.timeMax; i++){
        this.x.push(utils.timerHuman(i* this.timeStep));
        this.y.lan.rx.push(0);
        this.y.lan.tx.push(0);
        this.y.wlan.rx.push(0);
        this.y.wlan.tx.push(0);
      }
    }

    function addNewPointToXY(data){
      if(this.timeCounter > this.timeMax) {
        this.x.shift(); 
        this.y.lan.rx.shift();
        this.y.lan.tx.shift();
        this.y.wlan.rx.shift();
        this.y.wlan.tx.shift();
        this.x.push(utils.timerHuman(this.timeStep*this.timeCounter)); 
        this.y.lan.rx.push(data.eth0['rx-bytes']*this.byteToBit);
        this.y.lan.tx.push(data.eth0['tx-bytes']*this.byteToBit);
        this.y.wlan.rx.push(data.wlan1['rx-bytes']*this.byteToBit);
        this.y.wlan.tx.push(data.wlan1['tx-bytes']*this.byteToBit);
      }
      else{
        this.y.lan.rx[this.timeCounter] = +data.eth0['rx-bytes']*this.byteToBit;
        this.y.lan.tx[this.timeCounter] = +data.eth0['tx-bytes']*this.byteToBit;
        this.y.wlan.rx[this.timeCounter] = +data.wlan1['rx-bytes']*this.byteToBit;
        this.y.wlan.tx[this.timeCounter] = +data.wlan1['tx-bytes']*this.byteToBit;
      }
    }

    function drawDataInCanvas(cnv, x, y, lines, head, axis){
      cnv.clear();
      cnv.setFont({color: "#000000"});
      cnv.init(x, [{data: y.rx, legend: lines.rx},{data: y.tx, legend: lines.tx}], head, axis);
      //cnv.setFont({color: "#000000"});
      cnv.axis("#000000");
      cnv.pointsOnAxis();
      cnv.graph();
      cnv.setFont({color: "#000000"});
      cnv.legend();
    }

    function getDataByInterfaces(data, trafficDirection){
      data[trafficDirection] = [];
      
      function compare(a, b){
        if (a.name === b.name) return 0;
        if (a.name > b.name) return 1;
        return -1;
      }

      let point = {
          name: "LAN",
          packets: data.eth0[trafficDirection + "-packets"],
          bytes: data.eth0[trafficDirection + "-bytes"],
          drop: data.eth0[trafficDirection + "-drop"],
          errors: data.eth0[trafficDirection + "-errors"]
        };
      data[trafficDirection].push(point);
      
      point = {
        name: "WLAN",
        packets: data.wlan1[trafficDirection + "-packets"],
        bytes: data.wlan1[trafficDirection + "-bytes"],
        drop: data.wlan1[trafficDirection + "-drop"],
        errors: data.wlan1[trafficDirection + "-errors"],
      }
      data[trafficDirection].push(point);
      
      let unsortData = []
      for(let key in data){
        if((key !== 'wlan1')&&(key !== 'eth0')&&(key !== 'br0')){
          if(trafficDirection + "-packets" in data[key])
          point = {
            name: data[key]['name'],
            packets: data[key][trafficDirection + "-packets"],
            bytes: data[key][trafficDirection + "-bytes"],
            drop: data[key][trafficDirection + "-drop"],
            errors: data[key][trafficDirection + "-errors"],
          }
          unsortData.push(point);
        }
      }
      unsortData = unsortData.sort(compare);
      data[trafficDirection].push(...unsortData);
      return data;
    };

    TxRxMonitoring.prototype.changeRx = function(){
      this.canShowRx(!this.canShowRx());
    }

    TxRxMonitoring.prototype.changeTx = function(){
      this.canShowTx(!this.canShowTx());
    }

    TxRxMonitoring.prototype.load = function () {
        this.alertMessage('');
        return configd.getMonitoring("/interface")
            .next(function (data) {
                if(this.isFirstLoad) {
                    initXY.call(this, data);
                    data = getDataByInterfaces(data, 'rx');
                    data = getDataByInterfaces(data, 'tx');
                    this.data = komapping.fromJS(data);
                    this.alive();
                    this.isFirstLoad = false;
                }
                else {
                    addNewPointToXY.call(this, data);
                    data = getDataByInterfaces(data, 'rx');
                    data = getDataByInterfaces(data, 'tx');
                    komapping.fromJS(data, this.data);
                }
                
                let totalBytes = {
                  lan: {
                    rx: utils.trafficHumanArray(this.y.lan.rx, this.timeCounter, this.timeStep),
                    tx: utils.trafficHumanArray(this.y.lan.tx, this.timeCounter, this.timeStep),
                  },
                  wlan: {
                    rx: utils.trafficHumanArray(this.y.wlan.rx, this.timeCounter, this.timeStep),
                    tx: utils.trafficHumanArray(this.y.wlan.tx, this.timeCounter, this.timeStep),
                  }
                };
                
                let maxLanRx = utils.formatBites(Math.max.apply(null,totalBytes.lan.rx));
                
                let maxLanTx = utils.formatBites(Math.max.apply(null,totalBytes.lan.tx));
                let maxWlanRx = utils.formatBites(Math.max.apply(null,totalBytes.wlan.rx));
                let maxWlanTx = utils.formatBites(Math.max.apply(null,totalBytes.wlan.tx));
                
                function objMapForConvert(pow) {
                  for(let key in this){
                    this[key] = this[key].map(function(elem) {
                      return elem/pow;
                    })
                  }
                }
                
                objMapForConvert.call(totalBytes.lan, Math.max(maxLanRx.exp, maxLanTx.exp));
                objMapForConvert.call(totalBytes.wlan, Math.max(maxWlanRx.exp, maxWlanTx.exp));

                const self = this;
                function getCurrVal() {
                  const currInd = ((self.timeCounter < self.timeMax) ? self.timeCounter : self.timeMax) - 1;
                  return {
                    rx: currInd > -1 ? Math.round(this.rx[currInd]*10)/10: 0,
                    tx: currInd > -1 ? Math.round(this.tx[currInd]*10)/10: 0,
                  }
                }
                
                let units = {
                  lan: (maxLanRx.exp > maxLanTx.exp ? maxLanRx.key : maxLanTx.key),
                  wlan: (maxWlanRx.exp > maxWlanTx.exp ? maxWlanRx.key : maxWlanTx.key)
                };

                let lines = {
                  lan:{
                    rx:{
                      text: "Rx, " + (getCurrVal.call(totalBytes.lan)).rx + ", " + units.lan +
                          ", max: " + Math.round(Math.max.apply(null,totalBytes.lan.rx)*10)/10 + ", " + units.lan,
                      color: "green"
                    },
                    tx:{
                      text: "Tx, " + (getCurrVal.call(totalBytes.lan)).tx  + ", " + units.lan +
                          ", max: " + Math.round(Math.max.apply(null,totalBytes.lan.tx)*10)/10 + ", " + units.lan,
                      color: "blue"
                    }
                  },
                  wlan:{
                    rx: {
                      text: "Rx, " + (getCurrVal.call(totalBytes.wlan)).rx  + ", " + units.wlan +
                          ", max: " + Math.round(Math.max.apply(null,totalBytes.wlan.rx)*10)/10 + ", " + units.wlan,
                      color: "green"
                    },
                    tx: {
                      text: "Tx, " + (getCurrVal.call(totalBytes.wlan)).tx  + ", " + units.wlan +
                          ", max: " + Math.round(Math.max.apply(null,totalBytes.wlan.tx)*10)/10 + ", " + units.wlan,
                      color: "blue"
                    }
                  }
                };
                
                let axis = {
                  lan:{
                    x: "t,s",
                    y: units.lan
                  },
                  wlan: {
                    x: "t,s",
                    y: units.wlan
                  }
                };

                let rxTxLanCanvas = draw.create(this.RxTxLan, this.imageWidth, this.imageHeight);
                drawDataInCanvas(rxTxLanCanvas, this.x, totalBytes.lan, lines.lan, 
                  {text: "LAN Tx/Rx, " + units.lan}, axis.lan);
                let rxTxWlanCanvas = draw.create(this.RxTxWlan, this.imageWidth, this.imageHeight);
                drawDataInCanvas(rxTxWlanCanvas, this.x, totalBytes.wlan, lines.wlan, 
                  {text: "WLAN Tx/Rx, " + units.wlan}, axis.wlan);
                
                this.showPage(true);
                this.timeCounter++;
              
            }.bind(this))
            .error(function(e) {
                console.error(e);
                clearInterval(this.timer);
                this.timer = null;
                this.showPage(false);
                this.alertMessage('ErrorCantGetInformation');
                throw '';
            }.bind(this));
    };

    TxRxMonitoring.prototype.enter = function (params) {
        this.load()
          .next(function () {
              if(this.timer !== null)
                  clearInterval(this.timer);
              this.timer = setInterval(this.load.bind(this), this.timeStep * 1000);
          }.bind(this));
    };

    TxRxMonitoring.prototype.exit = function () {
        if(this.timer !== null)
            clearInterval(this.timer);
        this.timer = null;
    };

    return {
        init: function (params) {
            var module = new TxRxMonitoring(params);
            return module;
        }
    };
});
