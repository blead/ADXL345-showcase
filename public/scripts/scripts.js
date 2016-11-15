/* constants =========================================================================== */
const INPUT_MODE = 2, // 0: exponential, 1: linear, 2: dual-zone
      INPUT_DEADZONE = 0.05,
      INPUT_SENSITIVITY = 16,
      INPUT_DUAL_ZONE_THRESHOLD = 0.8,
      RETICLE_COLOR = 0xB1EAD0,
      RETICLE_RADIUS = 20,
      SHOOT_COOLDOWN = 15,
      MAX_TARGET_SPEED = 12,
      MIN_SPAWN_COOLDOWN = 60,
      MAX_SPAWN_COOLDOWN = 120,
      SIMPLE_TARGET_COLOR = 0x0000FF,
      SIMPLE_TARGET_RADIUS = 30,
      SIMPLE_TARGET_HP = 3,
      SIMPLE_TARGET_SCORE = 3,
      SIMPLE_TARGET_SPAWN_CHANCE = 0.35,
      SMALL_TARGET_COLOR = 0xFFFF00,
      SMALL_TARGET_RADIUS = 15,
      SMALL_TARGET_HP = 2,
      SMALL_TARGET_SCORE = 2,
      SMALL_TARGET_SPAWN_CHANCE = 0.40,
      SPLITTER_TARGET_COLOR = 0xFF0000,
      SPLITTER_TARGET_RADIUS = 40,
      SPLITTER_TARGET_HP = 5,
      SPLITTER_TARGET_SCORE = 5,
      SPLITTER_TARGET_SPAWN_CHANCE = 0.25,
      TIME_LIMIT = 180,
      SCOREBAR_HEIGHT = 40;

/* classes ============================================================================= */
class GameObjectContainer extends PIXI.Container {
  adjustToViewport(oldViewportWidth,oldViewportHeight) {
    this.children.forEach( child => child.adjustToViewport(oldViewportWidth,oldViewportHeight) );
  }
}

class GameObject extends PIXI.Graphics {
  constructor(x,y,vx,vy) {
    super();
    this.position.set(x,y);
    this.vx = vx;
    this.vy = vy;
  }
  updateState() {
    this.x += this.vx;
    this.y += this.vy;
  }
  adjustToViewport(oldViewportWidth,oldViewportHeight) {
    this.position.set((this.x/oldViewportWidth)*viewportWidth,(this.y/oldViewportHeight)*viewportHeight);
  }
}

class ShootAnimation extends PIXI.extras.MovieClip {
  constructor(x,y) {
    super(shootAnimationFrames);
    this.position.set(x,y);
    this.anchor.set(0.5);
    this.animationSpeed = 0.4;
    this.loop = false;
    this.play();
  }
  updateState() {
    if(this.currentFrame + 1 == this.totalFrames)
      this.destroy();
  }
  adjustToViewport(oldViewportWidth,oldViewportHeight) {
    this.position.set((this.x/oldViewportWidth)*viewportWidth,(this.y/oldViewportHeight)*viewportHeight);
  }
}

class Reticle extends GameObject {
  constructor(color,radius,x,y) {
    super(x,y,0,0);
    this.lineStyle(2,color,1).drawCircle(0,0,radius);
    this.cooldown = 0;
    this.power = 1;
  }
  updateState(ax,ay) {
    let a = Math.sqrt(ax*ax + ay*ay);
    if(a < INPUT_DEADZONE) {
      this.vx = 0;
      this.vy = 0;
    } else if(INPUT_MODE == 0) {
      this.vx = Math.exp( Math.abs(ax) * Math.log(INPUT_SENSITIVITY*1.5625) ) * Math.sign(ax);
      this.vy = Math.exp( Math.abs(ay) * Math.log(INPUT_SENSITIVITY*1.5625) ) * Math.sign(ay);
    } else {
      let zoneFactor = 1.125; // linear
      if(INPUT_MODE == 2)
        zoneFactor = (a < INPUT_DUAL_ZONE_THRESHOLD) ? 1 : 1.25; //dual-zone
      this.vx = ax * INPUT_SENSITIVITY * zoneFactor;
      this.vy = ay * INPUT_SENSITIVITY * zoneFactor;
    }
    super.updateState();
    contain(this,getPlayableAreaContainer());
    if(this.cooldown > 0) this.cooldown--;
  }
}

class Target extends GameObject {
  constructor(color,radius,x,y,vx,vy,hp) {
    super(x,y,vx,vy);
    this.beginFill(color).lineStyle(2,0x000000,1).drawCircle(0,0,radius).endFill();
    this.hp = hp;
    this.highlightEffect = false;
  }
  updateState() {
    super.updateState();
    if(this.hp <= 0 || isOutOfBound(this,getPlayableAreaContainer())) {
      this.destroy();
    } else if(isColliding(this,reticle)) {
      this.highlight();
      if(reticle.cooldown == 0) {
        this.hp -= reticle.power;
        reticle.cooldown = SHOOT_COOLDOWN;
        animations.addChild(new ShootAnimation(reticle.x,reticle.y));
      }
    } else {
      this.unHighlight();
    }
  }
  highlight() {
    if(!this.highlightEffect) {
      this.highlightEffect = new PIXI.Graphics();
      this.highlightEffect.beginFill(0xFFFFFF,0.7).drawCircle(0,0,this.width/2).endFill();
      this.addChild(this.highlightEffect);
    }
  }
  unHighlight() {
    if(this.highlightEffect) {
      this.highlightEffect.destroy();
      this.highlightEffect = false;
    }
  }
}

class SimpleTarget extends Target {
  constructor(x,y,vx,vy,hp) {
    super(SIMPLE_TARGET_COLOR,SIMPLE_TARGET_RADIUS,x,y,vx,vy,SIMPLE_TARGET_HP);
  }
  destroy() {
    if(this.hp <= 0)
      score.setScore(score.score + SIMPLE_TARGET_SCORE);
    super.destroy();
  }
}

class SmallTarget extends Target {
  constructor(x,y,vx,vy) {
    super(SMALL_TARGET_COLOR,SMALL_TARGET_RADIUS,x,y,vx,vy,SMALL_TARGET_HP);
  }
  destroy() {
    if(this.hp <= 0)
      score.setScore(score.score + SMALL_TARGET_SCORE);
    super.destroy();
  }
}


class SplitTarget extends Target {
  constructor(x,y,vx,vy) {
    super(SMALL_TARGET_COLOR,SPLITTER_TARGET_RADIUS/2,x,y,vx,vy,SMALL_TARGET_HP);
  }
  destroy() {
    if(this.hp <= 0)
      score.setScore(score.score + SMALL_TARGET_SCORE);
    super.destroy();
  }
}

class SplitterTarget extends Target {
  constructor(x,y,vx,vy) {
    super(SPLITTER_TARGET_COLOR,SPLITTER_TARGET_RADIUS,x,y,vx,vy,SPLITTER_TARGET_HP);
  }
  destroy() {
    if(this.hp <= 0) {
      score.setScore(score.score + SPLITTER_TARGET_SCORE);
      let splitNumber = 3 + Math.round(Math.random()*3),
          v = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      for(let i=0;i<splitNumber;i++) {
        let angle = (Math.random() * 2 * Math.PI) + Math.atan2(this.vy,this.vx),
            splitv = (Math.random() * 0.05 + 0.97) * v;
        targets.addChild(new SplitTarget(this.x,this.y,Math.cos(angle) * v,Math.sin(angle) * v));
      }
    }
    super.destroy();
  }
}

class Scorebar extends PIXI.Graphics {
  constructor() {
    super();
    this.beginFill(0x000000).drawRect(0,0,viewportWidth,SCOREBAR_HEIGHT).endFill().position.set(0);
  }
  adjustToViewport() {
    this.width = viewportWidth;
  }
}

class Time extends PIXI.Text {
  constructor(time) {
    super('TIME : ' + time,{font: '30px Tahoma, sans-serif', fill: 'white', fontWeight: 'bold'});
    this.adjustToViewport();
    this.time = time;
  }
  setTime(time) {
    this.time = time;
    this.text = 'TIME : ' + time;
  }
  adjustToViewport() {
    this.position.set(6,(SCOREBAR_HEIGHT - this.height) * 0.75);
  }
}

class Gun extends PIXI.Sprite {
  constructor() {
    super(PIXI.Texture.fromImage('images/gun_inf.png'));
    this.anchor.set(0.5);
    this.adjustToViewport();
  }
  adjustToViewport() {
    this.position.set(0.5 * viewportWidth,(SCOREBAR_HEIGHT)/2);
  }
}

class Score extends PIXI.Text {
  constructor(score) {
    super('SCORE : ' + score,{font: '30px Tahoma, sans-serif', fill: 'white', fontWeight: 'bold'});
    this.adjustToViewport();
    this.score = score;
  }
  setScore(score) {
    this.score = score;
    this.text = 'SCORE : ' + score;
  }
  adjustToViewport() {
    this.position.set(0.55 * viewportWidth,(SCOREBAR_HEIGHT - this.height) * 0.75);
  }
}

/* variables =========================================================================== */
var viewportWidth = getViewportWidth(),
    viewportHeight = getViewportHeight(),
    renderer = PIXI.autoDetectRenderer(viewportWidth,viewportHeight,{transparent: true}),
    stage = new GameObjectContainer(),
    shootAnimationFrames = getShootAnimationFrames(),
    state, gameTimer, targetSpawnTimer,
    targets, animations,
    reticle, scorebar, time, gun, score;

/* render ============================================================================== */
var init = new Promise((resolve,reject) => {
  document.body.appendChild(renderer.view);
  renderer.render(stage);
  renderer.view.style.position = 'absolute';
  renderer.view.style.display = 'block';
  renderer.autoResize = true;
  window.addEventListener('resize',adjustObjectsToViewport);
  resolve();
});

var setup = new Promise(setupObjects);

init.then(setup).then(mainLoop);

function mainLoop() {
  requestAnimationFrame(mainLoop);
  state();
  renderer.render(stage);
}

function play() {
  if(gameTimer < 0) {
    console.log('Game over!\nYour score is ' + score.score);
    alert('Game over!\nYour score is ' + score.score);
    stage.removeChildren();
    setupObjects();
    return;
  } else {
    if(gameTimer % 60 == 0)
      time.setTime(gameTimer/60);
    gameTimer--;
  }
  if(targetSpawnTimer <= 0) {
    spawnRandomTargets();
    targetSpawnTimer = MIN_SPAWN_COOLDOWN + Math.random() * (MAX_SPAWN_COOLDOWN - MIN_SPAWN_COOLDOWN);
  } else {
    targetSpawnTimer--;
  }
  reticle.updateState(input.x,input.y);
  targets.children.forEach( target => target.updateState() );
  animations.children.forEach( animation => animation.updateState() );
}

/* utilities =========================================================================== */
function setupObjects(resolve,reject) {
  targets = new GameObjectContainer();
  stage.addChild(targets);

  animations = new GameObjectContainer();
  stage.addChild(animations);

  reticle = new Reticle(RETICLE_COLOR,RETICLE_RADIUS,viewportWidth/2,viewportHeight/2 - SCOREBAR_HEIGHT/2);
  stage.addChild(reticle);

  scorebar = new Scorebar();
  stage.addChild(scorebar);
  time = new Time(TIME_LIMIT);
  stage.addChild(time);
  gun = new Gun();
  stage.addChild(gun);
  score = new Score(0);
  stage.addChild(score);

  state = play;
  gameTimer = TIME_LIMIT * 60;
  targetSpawnTimer = MIN_SPAWN_COOLDOWN + Math.random() * (MAX_SPAWN_COOLDOWN - MIN_SPAWN_COOLDOWN);

  if(resolve)
    resolve();
}

function spawnRandomTargets() {
  let targetTypeRoll = Math.random(),
      playableHeight = viewportHeight - SCOREBAR_HEIGHT,
      speed = Math.exp( Math.random() * Math.log(MAX_TARGET_SPEED) ),
          x = Math.random() * viewportWidth,
          y = Math.random() * playableHeight,
         dx = (Math.random() * viewportWidth * 0.8) + (viewportWidth * 0.1),
         dy = (Math.random() * playableHeight * 0.8) + (playableHeight * 0.1),
         rx = 0,
         ry = 0;
  if(Math.random() > 0.5) {
    rx = (x > viewportWidth/2) ? 1 : -1;
    x = (x > viewportWidth/2) ? viewportWidth : 0;
  } else {
    ry = (y > playableHeight/2) ? 1 : -1;
    y = (y > playableHeight/2) ? viewportHeight : SCOREBAR_HEIGHT;
  }

  if(targetTypeRoll <= SIMPLE_TARGET_SPAWN_CHANCE) {
    x += rx * (SIMPLE_TARGET_RADIUS - 1);
    y += ry * (SIMPLE_TARGET_RADIUS - 1);
    let vx = Math.cos(Math.atan2((dy-y),(dx-x))) * speed,
        vy = Math.sin(Math.atan2((dy-y),(dx-x))) * speed;
    targets.addChild(new SimpleTarget(x,y,vx,vy));
  } else if ( (targetTypeRoll -= SIMPLE_TARGET_SPAWN_CHANCE) <= SMALL_TARGET_SPAWN_CHANCE) {
    x += rx * (SMALL_TARGET_RADIUS - 1);
    y += ry * (SMALL_TARGET_RADIUS - 1);
    let vx = Math.cos(Math.atan2((dy-y),(dx-x))) * speed,
        vy = Math.sin(Math.atan2((dy-y),(dx-x))) * speed;
    targets.addChild(new SmallTarget(x,y,vx,vy));
  } else if ( (targetTypeRoll -= SMALL_TARGET_SPAWN_CHANCE) <= SPLITTER_TARGET_SPAWN_CHANCE) {
    x += rx * (SPLITTER_TARGET_RADIUS - 1);
    y += ry * (SPLITTER_TARGET_RADIUS - 1);
    let vx = Math.cos(Math.atan2((dy-y),(dx-x))) * speed,
        vy = Math.sin(Math.atan2((dy-y),(dx-x))) * speed;
    targets.addChild(new SplitterTarget(x,y,vx,vy));
  }
}

function contain(object,container) {
  let leftBound = container.x + object.width/2,
      topBound = container.y + object.height/2,
      rightBound = container.x + container.width - object.width/2,
      bottomBound = container.y + container.height - object.height/2;
  if(object.x < leftBound)
    object.x = leftBound;
  if(object.y < topBound)
    object.y = topBound;
  if(object.x > rightBound)
    object.x = rightBound;
  if(object.y > bottomBound)
    object.y = bottomBound;
}

function adjustObjectsToViewport() {
  let oldViewportWidth = viewportWidth,
      oldViewportHeight = viewportHeight;
  viewportWidth = getViewportWidth();
  viewportHeight = getViewportHeight();
  stage.adjustToViewport(oldViewportWidth,oldViewportHeight);
  renderer.resize(viewportWidth,viewportHeight);
}

function isOutOfBound(object,container) {
  let left = object.x + object.width/2 < container.x,
      top = object.y + object.height/2 < container.y,
      right = object.x - object.width/2 > container.x + container.width,
      bottom = object.y - object.height/2 > container.y + container.height;
  return left || top || right || bottom;
}

function isColliding(a,b) {
  let dx = a.x - b.x,
      dy = a.y - b.y,
      halfWidthSum = a.width/2 + b.width/2;
  return dx * dx + dy * dy < halfWidthSum * halfWidthSum;
}

function getViewportWidth() {
  return Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
}

function getViewportHeight() {
  return Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
}

function getPlayableAreaContainer() {
  return {x: 0, y: SCOREBAR_HEIGHT, width: viewportWidth, height: viewportHeight - SCOREBAR_HEIGHT};
}

function getShootAnimationFrames() {
  let frames = [];
  for(let i=0;i<8;i++) {
    frames.push(PIXI.Texture.fromImage('images/shootAnim' + i + '.png'));
  }
  return frames;
}

/* socket ============================================================================== */
var socket = io(),
    input = {x: 0, y: 0, z: 0};

socket.on('log',(data) => {
  console.log('[' + data.type + '] ' + data.message);
});

socket.on('data',(data) => {
  input.x = Number.parseFloat(data.y) || 0; // swap x/y axis from controller
  input.y = Number.parseFloat(data.x) || 0;
  input.z = Number.parseFloat(data.z) || 0;
});
