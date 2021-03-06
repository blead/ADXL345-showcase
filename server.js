const express = require('express');
var io = require('socket.io');

const PORT = 80,
      LOG_API = false,
      LOG_SCORE = true,
      LOG_VIEW = true,
      LOG_SCOREBOARD = true,
      LOG_CLEAR = true,
      LOG_404 = true;

var app = express();
var data = [];
var highscores = [];

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

app.use('/scoreboard',(req,res,next) => {
  var responseString = '<h1>scoreboard</h1>\n';
  if(highscores.length == 0) {
    responseString += '<p>no score recorded</p>';
  } else {
    responseString += '<ol>\n';
    for(let i=0;i<highscores.length;i++)
      responseString += '<li>' + highscores[i].name + ' : ' + highscores[i].score + '</li>\n';
    responseString += '</ol>';
  }
  res.end(responseString);
  if(LOG_SCOREBOARD)
    console.log('/scoreboard:\t\t' + highscores.length + ' output line(s)');
});

app.use('/clear',(req,res,next) => {
  data = [];
  scoreboard = [];
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

  socket.on('score',(data) => {
    if(LOG_SCORE)
      console.log(data);
    highscores.push(data);
    highscores.sort( (a,b) => {
      if(a.score > b.score) return -1;
      else if(a.score == b.score) return 0;
      else return 1;
    });
  });
});
