
var colorList = {yellow : "0xFFFF99", blue : "0x0033ff", red : "0xFF0033", green: "0x336600", violet: "0x663399", orange:"0xFF6600"};

function ThreeDraw(world) {
	var scene = null;
	var camera = null;
	var renderer = null;
	var projector = null;
	var objects = [];
	var mesh = [];
	var material = [];
	var LEFT = 65;
	var UP = 87;
	var RIGHT = 68;
	var DOWN = 83;
	var Q = 81;
	var E = 69;
	var Z = 90;
	var X = 88;
	var cameraSpeed = 10;
	var startX = 0;
	var curX = 0;
	var intersects = null;
	var vector = null;
	var raycaster = null;
	EventHandler = function() {
		document.addEventListener("keydown", moveCamera);
		document.addEventListener( 'mousedown', onDocumentMouseDown, false );
		document.addEventListener( 'mouseup', onDocumentMouseUp, false );
	};
	moveCamera = function(e) {
		if(e.keyCode === LEFT) {
			camera.position.x += -cameraSpeed;
		} else if(e.keyCode === UP) {
			camera.position.z += -cameraSpeed;
		} else if(e.keyCode === RIGHT) {
			camera.position.x += cameraSpeed;
		} else if(e.keyCode === DOWN) {
			camera.position.z += cameraSpeed;
		} else if(e.keyCode === Q) {
			camera.position.y += cameraSpeed;
		} else if(e.keyCode === E) {
			camera.position.y += -cameraSpeed;
		} else if(e.keyCode === Z) {
			camera.rotation.x += -0.1;
		} else if(e.keyCode === X) {
			camera.rotation.x += 0.1;
		}
	};

	convertCoordinates = function(eventX) {
		return (0.223*eventX) - 100.245;
	}

	onDocumentMouseDown = function(e) {
		e.preventDefault();
		getCurrentObject();
		console.log(e.x);
		if(intersects[0].object.id) {
			if ( intersects.length > 0 ) {
				console.log("mouse down");
				startX = world[intersects[0].object.id].x;
				curX = startX;
				console.log(startX);
				intersects[0].object.material.color.setHex( Math.random() * 0xffffff );
				window.addEventListener('mousemove', onDocumentMouseMove, false);
			}
		}	
	};

	onDocumentMouseUp = function(e) {
		console.log("mouseup");
		window.removeEventListener('mousemove', onDocumentMouseMove, false);
	};

	onDocumentMouseMove = function(e) {
		getCurrentObject();
		if(intersects[0].object.id === "ball_0")  {
			console.log("mouse move");
			var convertedX = convertCoordinates(e.x);
			world[intersects[0].object.id].x = convertedX;
			worker.postMessage({'cmd': 'mousemove', 'msg': world[intersects[0].object.id]});
			curX = world[intersects[0].object.id].x;
		}	
	};

	getCurrentObject = function(e) {
		vector = new THREE.Vector3( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1, 0.5 );
		projector.unprojectVector( vector, camera );
		raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
		intersects = raycaster.intersectObjects(objects);
	};

	this.draw = function() {
		EventHandler();
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 1000);
		camera.position.y = 500;
		camera.position.z = 250;
		camera.rotation.x = -1;

		var light = new THREE.DirectionalLight( 0xffffff );
		light.position.set(-70, 100, 1).normalize();
		scene.add(light);
		projector = new THREE.Projector();
		for(var i in world) {
			if(world[i].radius) { //radiusEntity
				var geometry = makeObject.Sphere(world[i].radius, 30, 30);
			}else if(world[i].polys)	{ //polyEntity
				//polys 관련 생성 로직을 추가한다.
			}else { //RectangleEntity
				//가로, 높이, 세
				var geometry = makeObject.Box(world[i].halfWidth, world[i].halfHeight, world[i].depth); //추후 마지막 인자를 넘겨주게 수정
			}
			material[i] = makeObject.getMaterial(0x050505, world[i].color, 0x555555, 30);
			mesh = new THREE.Mesh(geometry, material[i]);
			mesh.position.x = world[i].x;
			mesh.position.y = world[i].y;
			mesh.position.z = -50
			mesh.id = world[i].id;

			objects.push(mesh);

			scene.add(mesh);
		}



		renderer = new THREE.WebGLRenderer();
		renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild(renderer.domElement );
	};
	this.animate = function() {
		var count = 0;
		for(var i in world) {
			objects[count].position.x = world[i].x;
			objects[count].position.y = world[i].y;
			objects[count].rotation.z = world[i].angle;
			++count;
		}
		this.render();
	};
	this.render = function() {
		renderer.render(scene, camera );
	};
}

var makeObject = {
	Box : function(halfWidth, halfHeight, depth) {
		//실제 Box2D상의 연산과 랜더링해서 그려지는 영상 사이에 오차가 존재한다. 수동으로 보정.
		return new THREE.BoxGeometry(halfWidth*2, halfHeight*2, depth);
	},
	Sphere : function(radius,  widthSegments, heightSegments) {
		return new THREE.SphereGeometry(radius, widthSegments, heightSegments);
	},
	getMaterial : function(ambientValue, colorValue, specularValue, shininessValue) {
	//	console.log(colorList[colorValue]);
		return new THREE.MeshPhongMaterial( { ambient: ambientValue, color: parseInt(colorList[colorValue]), specular: specularValue, shininess: shininessValue } );
	}
}