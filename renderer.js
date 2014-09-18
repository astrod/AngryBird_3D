
var colorList = {yellow : "0xFFFF99", blue : "0x0033ff", red : "0xFF0033", green: "0x336600", violet: "0x663399", orange:"0xFF6600"};

function ThreeDraw(world) {
	var scene = null;
	var camera = null;
	var renderer = null;
	var projector = null;
	var canDeleted = [];
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
	var C = 67;
	var V = 86;
	var R = 82;
	var F = 70;
	var cameraSpeed = 10;
	var startX = 0;
	var startY = 0;
	var ready = null;
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
		} else if(e.keyCode ===  C) {
			camera.rotation.y += 0.1;
		} else if(e.keyCode ===  V) {
			camera.rotation.y += -0.1;
		} else if(e.keyCode === R) {
			camera.rotation.z += 0.1;
		} else if(e.keyCode === F) {
			camera.rotation.z += -0.1;
		}
	};

	onDocumentMouseDown = function(e) {
		e.preventDefault();
		getCurrentObject();
		if(intersects[0].object.id === "ball_0") { //ball_0
			ready = true;
			if ( intersects.length > 0 ) {
				if(startX === 0 && startY === 0) {
					startX = intersects[0].point.x;
					startY = intersects[0].point.y;
				}
				window.addEventListener('mousemove', onDocumentMouseMove, false);

			}
		}	
	};

	onDocumentMouseUp = function(e) {
		getCurrentObject();
		if(ready === true && intersects[0].object.id === "ball_0") {
			window.removeEventListener('mousemove', onDocumentMouseMove, false);
			var degreeAndPower = [];
			degreeAndPower.push(calculateDegree(startX, startY, intersects[0].point.x, intersects[0].point.y) - 90);
			degreeAndPower.push(calculateDistance(startX, startY,  intersects[0].point.x,  intersects[0].point.y)*1000);
			for(var i in degreeAndPower) {
				console.log(degreeAndPower[i]);
			}
			worker.postMessage({'cmd': 'setGravity', 'msg':world, 'value' : degreeAndPower});
			ready = false;
		}
	};

	onDocumentMouseMove = function(e) {
		getCurrentObject();
		if(intersects[0].object.id)  {
			if(calculateDistance(startX, startY,  intersects[0].point.x,  intersects[0].point.y) < 50) {
				world["ball_0"].x = intersects[0].point.x;
				world["ball_0"].y = intersects[0].point.y;
				worker.postMessage({'cmd': 'mousemove', 'msg': world});
			}
		}	
	};

	calculateDistance = function(preX, preY, curX, curY) {
		return Math.sqrt((curX-preX)*(curX-preX)+(curY-preY)*(curY-preY));
	};

	calculateDegree = function(preX, preY, curX, curY) {
			var conversionX = curX - preX;
			var conversionY = curY - preY;
			var innerProductValue = (conversionX*0 + conversionY*(-1))/Math.sqrt((conversionX*conversionX)+(conversionY*conversionY));
			return Math.degrees(Math.acos(innerProductValue));
	};

	getCurrentObject = function(e) {
		vector = new THREE.Vector3( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1, 0.5 );
		projector.unprojectVector( vector, camera );
		raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
		intersects = raycaster.intersectObjects(objects);

	};

	Math.degrees = function(radians) {
  		return radians * 180 / Math.PI;
	};

	this.draw = function() {
		EventHandler();
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 100000);
		camera.position.x = -300;
		camera.position.y = 540;
		camera.position.z = 1020;
		camera.rotation.x = -0.4;
		camera.rotation.y = -0.3;
		camera.rotation.z = 0;

		var light = new THREE.DirectionalLight( 0xffffff );
		light.position.set(40, 110, 140).normalize();
		scene.add(light);
		projector = new THREE.Projector();
		for(var i in world) {
			if(world[i].radius) { //radiusEntity
				var geometry = makeObject.Sphere(world[i].radius, 30, 30);
			}else if(world[i].polys)	{ //polyEntity
				//polys 관련 생성 로직을 추가한다.
			}else { //RectangleEntity
				//가로, 높이, 세로
				var geometry = makeObject.Box(world[i].halfWidth, world[i].halfHeight, world[i].depth); //추후 마지막 인자를 넘겨주게 수정
			}
			material[i] = choiceMaterial(world[i].id);
			mesh = new THREE.Mesh(geometry, material[i]);
			mesh.position.x = world[i].x;
			mesh.position.y = world[i].y;
			mesh.position.z = -50
			mesh.id = world[i].id;
			mesh.rotation.z = 0;
			if(world[i].strength) {
				canDeleted.push(mesh);
			}

			objects.push(mesh);

			scene.add(mesh);
		}



		renderer = new THREE.WebGLRenderer();
		renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild(renderer.domElement );
	};
	this.animate = function() {
		var count = 0;
		for(var i in world) { //i 는 id 이고 count 는 숫자이다.
			if(world[i].state === "dead") {
				console.log(world[i].id);
				var deleteTarget = findDeletedObject(world[i].id);
				scene.remove(deleteTarget);
			}
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
	
	findDeletedObject = function(findId) {
		for(var i in canDeleted) {
			if(canDeleted[i].id = findId) return canDeleted[i];
		}
	};
	this.getpos = function() {
		return camera;
	};

	choiceMaterial = function(id) {
		var splitedId = splitString(id);
		return makeObject.getMaterial(0x050505, 'img/'+ splitedId + '.jpg', 0x555555, 30);
	}

	splitString = function(id) {
		return id.split("_")[0];
	}

}

var makeObject = {
	Box : function(halfWidth, halfHeight, depth) {
		//실제 Box2D상의 연산과 랜더링해서 그려지는 영상 사이에 오차가 존재한다. 수동으로 보정.
		return new THREE.BoxGeometry(halfWidth*2, halfHeight*2, depth);
	},
	Sphere : function(radius,  widthSegments, heightSegments) {
		return new THREE.SphereGeometry(radius, widthSegments, heightSegments);
	},
	// getMaterial : function(ambientValue, colorValue, specularValue, shininessValue) {
	// 	return new THREE.MeshPhongMaterial({
	// 		map: THREE.ImageUtils.loadTexture('weed.jpg'),
	// 	ambient: ambientValue, color: parseInt(colorList[colorValue]), specular: specularValue, shininess: shininessValue } );
	// },
	getMaterial : function(ambientValue, url, specularValue, shininessValue) {
		return new THREE.MeshPhongMaterial({
			map: THREE.ImageUtils.loadTexture(url),
		ambient: ambientValue, specular: specularValue, shininess: shininessValue } );
	}
}