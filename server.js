const express = require('express');
var io = require('socket.io');

const PORT = 80;
const LOG_API = false;
const LOG_VIEW = true;
const LOG_CLEAR = true;
const LOG_404 = true;

var app = express();
var data = [];

var server = app.listen(PORT,() => {
  console.log('server started, listening on port ' + PORT);
});

io = io(server);

app.use('/api',(req,res,next) => {
  var entry = {date: new Date()};
  Object.assign(entry,req.query);
  data.push(entry);
  io.emit('data',entry);
  entry = JSON.stringify(entry);
  if(LOG_API)
    io.emit('log',{type: 'data', message: entry});
  res.status(200).end(entry);
  if(LOG_API)
    console.log('/api:\t\t' + entry);
});

app.use('/view',(req,res,next) => {
  var responseString = req.query.interval ? '<p>Showing data from the last ' + req.query.interval + ' minutes.</p><p>' : '<p>';
  var interval = req.query.interval ? parseInt(req.query.interval)*60000 : 0;
  var dataCount = 0;
  for(let i=0;i<data.length;i++) {
    if(!interval || Date.now() - data[i].date.getTime() < interval) {
      responseString += JSON.stringify(data[i]) + '<br>';
      dataCount++;
    }
  }
  if(dataCount === 0)
    responseString += 'no data';
  responseString += '</p>';
  res.end(responseString);
  if(LOG_VIEW)
    console.log('/view:\t\t(interval = ' + req.query.interval + ') ' + dataCount + ' output line(s)');
});

app.use('/clear',(req,res,next) => {
  data = [];
  res.end('data cleared');
  if(LOG_CLEAR)
    console.log('/clear:\t\tdata cleared');
});

app.use(express.static('./public'));

app.use((req,res,next) => {
  res.redirect('/404.html');
  if(LOG_404)
    console.log(req.url + ':\t\t404 not found');
});

io.on('connection',(socket) => {
  socket.emit('log',{type: 'info', message: 'connection successful'});
});
