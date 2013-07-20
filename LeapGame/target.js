"use strict";

function KeyFrame(time, position) {
	this.time = time;
	this.pos = position;
};

function areNums() {

	var result = true;
	for (var i = 0, l = arguments.length; i < l; ++i) {
		var a = arguments[i];
		if (isNaN(a)) {
            result = false;
            break;
        }
	};

	return result;
};

function interpolateFrames(f1, f2, time) {

	var x, y, z;

	time = time - f1.time;
	var tt = f2.time - f1.time;
	var perc = Math.abs(time/tt);

	if ( areNums(f1.pos.x, f2.pos.x) ) x = f1.pos.x + perc * (f2.pos.x - f1.pos.x);
	if ( areNums(f1.pos.y, f2.pos.y) ) y = f1.pos.y + perc * (f2.pos.y - f1.pos.y);
	if ( areNums(f1.pos.z, f2.pos.z) ) z = f1.pos.z + perc * (f2.pos.z - f1.pos.z);

	var frame = { x: x, y: y, z: z };
	return frame;
};

var Game = {
	viewWidth: window.innerWidth,
	viewHeight: window.innerHeight,
	clock: new THREE.Clock(true),
	frameDelta: 0,
	scene: null,
    camera: null,
	renderer: null,
	target: undefined,
	score: 0
};

function Target(mesh) {

	this.animations = {
		away: [
			new KeyFrame(0.0, {z: 0}),
			new KeyFrame(0.5, {z: -20}/*, function () {thisTarget.reposition()}*/),
		],
		towards: [
			new KeyFrame(0.0, {z: -20}),
			new KeyFrame(0.5, {z: 0})
		]
	};

	this.mesh = mesh;
	this.currentAnimation = null;
	this.animating = false;
	this.loopAnimation = false;
	this.animationTime = 0;

	var thisTarget = this;
	this.onAnimationEnd = {
		"away": function () {
			thisTarget.reposition();
			thisTarget.setAnimation("towards");
		}
	}

	function hit() {

	};

	Game.scene.add(this.mesh);
};

Target.prototype.animate = function (delta) {
	if (!this.animating) return;	
	var frames = this.animations[this.currentAnimation];

	this.animationTime += delta;

	var frameA;
	var frameB;

	for (var i = 0, l = frames.length; i < l; ++i ) {
		var frame = frames[i];
		if (this.animationTime >= frame.time) {
			frameA = frame;
			if (!frames[i+1]) {
				if (this.loopAnimation) {
					this.animationTime -= frames[i].time;
					this.animate(0);
				} else {
					this.setPosition(frameA.pos);
					this.clearAnimation();
					this.animationTime = 0;
				}
			}
		} else {
			if (!frameA) return this.setPosition(frameA.pos);
			frameB = frame;
			this.setPosition(interpolateFrames(frameA, frameB, this.animationTime));
			break;
		}
	}
};

Target.prototype.clearAnimation = function () {
	this.animating = false;

	var action = this.onAnimationEnd[this.currentAnimation];
	if (!action) return this.currentAnimation = null;

	action();
};

Target.prototype.setAnimation = function (animation) {
	if (!this.animations[animation]) throw new Error("Invalid animation specified: " + animation);
	this.currentAnimation = animation;
	this.animationTime = 0;
	this.animating = true;
};

Target.prototype.reposition = function () {

	var xRange = 7;
	var yRange = 4;

	var x = (Math.random() * xRange)-(xRange/2);
	var y = (Math.random() * yRange)-(yRange/2);

	this.setPosition({x: x, y: y});
};

Target.prototype.setPosition = function (position) {
	var newPosition = {
		x: position.x || this.mesh.position.x,
		y: position.y || this.mesh.position.y,
		z: position.z || this.mesh.position.z,
	}
	this.mesh.position = newPosition;
};

Target.prototype.hit = function () {

	this.setAnimation("away");
	//var x = Math.random() * g.myWidth;
	//var y = Math.random() * g.myHeight;
}

function gameEnd() {
	Game.score = 0;
}

function leapConnected() {
    // Determine if leap is connected.
    return false;
}

function onDocumentMouseDown( event ) {

    if (!leapConnected()) {
        event.preventDefault();

        var projector = new THREE.Projector();

        var x = (event.clientX / window.innerWidth) * 2 - 1;
        var y = -( event.clientY / window.innerHeight) * 2 + 1;
        var z = 0.5;
        var vector = new THREE.Vector3( x, y, z );

        var raycaster = projector.pickingRay( vector, Game.camera );
        var intersects = raycaster.intersectObjects(Game.scene.children, true);

        for (var i = 0, l = intersects.length; i < l; ++i) {
            Game.target.hit();  
        }
    } else {
        // To be implemented.
    };

};

function loadAssets(cb) {
	var texture = new THREE.Texture();

	async.series([
		function (cb) {
			var loader = new THREE.ImageLoader();
			loader.addEventListener( 'load', function ( event ) {
				texture.image = event.content;
				texture.needsUpdate = true;
				return cb();
			} );
			loader.load( 'uv.png' );

		},
		function (cb) {
			var loader = new THREE.OBJMTLLoader();
			loader.addEventListener('load', function (event) {
				var o = event.content;
				o.traverse( function ( child ) {
					if ( child instanceof THREE.Mesh ) {
						child.material.map = texture;
					}
				} );
				//Game.scene.add( o );
				Game.target = new Target(o);
				Game.target.setAnimation("towards");
				return cb();
			} );
			loader.load( "./target.obj", "./target.mtl" );
		}
	], function (err) {
		if (err) throw err;
		return cb();
	});
};

function main() {

    var clearColor = 0xFFFFFF;

	Game.renderer = new THREE.WebGLRenderer ( { antialias: true } );
	Game.renderer.setClearColor(clearColor, 1);
	Game.renderer.setSize(Game.viewWidth, Game.viewHeight);

	document.body.appendChild(Game.renderer.domElement);
 
	Game.camera = new THREE.PerspectiveCamera(45, Game.viewWidth/Game.viewHeight, 1, 1000);
	Game.camera.position.y = 0;
	Game.camera.position.z = 5;
	Game.camera.rotation.x = 0;
 
	Game.scene = new THREE.Scene();
    Game.scene.fog = new THREE.FogExp2( clearColor, 0.1 );

	var pointLight = new THREE.PointLight(0xFFFFFF);
	pointLight.position.x = 0;
	pointLight.position.y = 0;
	pointLight.position.z = 10;
	Game.scene.add(pointLight);

	var stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	$("body").append( stats.domElement );

	function renderScene() {
		requestAnimationFrame(function () {
			Game.frameDelta = Game.clock.getDelta();
			Game.target.animate(Game.frameDelta);
			Game.renderer.render(Game.scene, Game.camera);
			stats.update();
			renderScene();
		});
	}

	document.addEventListener( 'mousedown', onDocumentMouseDown, false );

	async.series([
		loadAssets
	], function (err) {
		if (err) throw err;
		renderScene();
	});
};

window.onload = function () {
	main();
};
