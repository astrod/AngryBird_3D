
var colorList = {yellow : "0xFFFF99", blue : "0x0033ff", red : "0xFF0033", green: "0x336600", violet: "0x663399", orange:"0xFF6600", white:"0xFFFFFF"};

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
	var resetX = 0;
	var resetY = 0;
	var movedBallX = null;
	var movedBallY = null;
	var ready = null;
	var beforeTime = null;
	var intersects = null;
	var vector = null;
	var raycaster = null;
	var LineMesh = null;
	var EventHandler = function() {
		document.addEventListener("keydown", moveCamera);
		document.addEventListener( 'mousedown', onDocumentMouseDown, false );
		document.addEventListener( 'mouseup', onDocumentMouseUp, false );
	};
	var moveCamera = function(e) {
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

	var onDocumentMouseDown = function(e) {
		e.preventDefault();
		getCurrentObject();
		if(intersects[0].object.id === "ball_" + ballCount) { //ball_0
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

	var onDocumentMouseUp = function(e) {
		getCurrentObject();
		if(ready === true && intersects[0].object.id) {
			window.removeEventListener('mousemove', onDocumentMouseMove, false);
			var degreeAndPower = [];
			degreeAndPower.push(calculateDegree(startX, startY, intersects[0].point.x, intersects[0].point.y) - 90);
			degreeAndPower.push(calculateDistance(startX, startY,  intersects[0].point.x,  intersects[0].point.y)*1000);
			worker.postMessage({'cmd': 'setGravity', 'msg':world, 'value' : degreeAndPower, 'ballCount' : "ball_" + ballCount});
			ready = false;
		}
	};

	var onDocumentMouseMove = function(e) {
		getCurrentObject();
		if(intersects[0].object.id === "ball_" + ballCount)  {
			if(calculateDistance(startX, startY,  intersects[0].point.x,  intersects[0].point.y) < 50) {
				world["ball_" + ballCount].x = intersects[0].point.x;
				world["ball_" + ballCount].y = intersects[0].point.y;
				scene.remove(LineMesh);
				LineMesh = drawLine(startX, startY, intersects[0].point.x, intersects[0].point.y, "red", 5);
				worker.postMessage({'cmd': 'mousemove', 'msg': world});
			}
		}	
	};

	var calculateDistance = function(preX, preY, curX, curY) {
		return Math.sqrt((curX-preX)*(curX-preX)+(curY-preY)*(curY-preY));
	};

	var calculateDegree = function(preX, preY, curX, curY) {
			var conversionX = curX - preX;
			var conversionY = curY - preY;
			var innerProductValue = (conversionX*0 + conversionY*(-1))/Math.sqrt((conversionX*conversionX)+(conversionY*conversionY));
			return Math.degrees(Math.acos(innerProductValue));
	};

	var getCurrentObject = function(e) {
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
			if(world[i].id === "ball_0") {
				resetX = world[i].x;
				resetY = world[i].y;
				drawStartCircle(world[i].x, world[i].y);
			}
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

	this.setBall = function(id, timeStemp) {
		var mesh = findObject(id);
		if(movedBallX === null) movedBallX = mesh.position.x;
		if(movedBallY === null) movedBallY = mesh.position.y;
		
		moveObjectFromPointToPoint(id, movedBallX, movedBallY, resetX, resetY, timeStemp);
	}

	var moveObjectFromPointToPoint = function(id, startX, startY, endX, endY, timeStemp) {
		
		var mesh = findObject(id);
		if(beforeTime === null) beforeTime = timeStemp;
		var progress = timeStemp - beforeTime;
		console.log("progress : " + progress);
		var pieceOfX = (endX-startX)/1000;
		var pieceOfY = (endY-startY)/1000;
		console.log(movedBallX+pieceOfX*progress);
		mesh.position.x = movedBallX+pieceOfX*progress;
		mesh.position.y = movedBallY+pieceOfY*progress;
		world[id].x = movedBallX+pieceOfX*progress;
		world[id].y = movedBallY+pieceOfY*progress;
		
		if(progress > 1000) {
			mesh.position.x = endX;
			mesh.position.y = endY;
			beforeTime = null;
			reloadFlag = false;
			movedBallX = null;
			movedBallY = null;
			worker.postMessage({'cmd': 'bodies', 'msg': world});
		}

		renderer.render(scene, camera);
	};

	var drawStartCircle = function(xPos, yPos) {
		var geometry = makeObject.Sphere(60, 40, 40);
		var material = makeObject.getMaterial(0x050505, "white", 0x050505, 30);
		material.opacity = 0.2;
		mesh = new THREE.Mesh(geometry, material);
		mesh.position.x = xPos-1;
		mesh.position.y = yPos;
		mesh.position.z = -50;		
		mesh.id = "opacityCircle";
		scene.add(mesh);
	};

	var drawLine = function(startX, startY, endX, endY, color, width) {
		geometry = new THREE.Geometry();
		geometry.vertices.push(new THREE.Vector3( startX, startY), new THREE.Vector3( endX, endY));
		var line = new THREE.Line( geometry, makeObject.Line(color, width));
		scene.add(line);
		return line;
	};

	this.animate = function() {
		var count = 0;
		for(var i in world) { //i 는 id 이고 count 는 숫자이다.
			if(world[i].state === "dead") {
				var deleteTarget = findDeletedObject(world[i].id);

				scene.remove(deleteTarget);
			}
			if(reloadFlag === true && world[i].id === "ball_" + ballCount) {
				++count;
				this.render();
			} else {
				objects[count].position.x = world[i].x;
				objects[count].position.y = world[i].y;
				objects[count].rotation.z = world[i].angle;
				++count;
			}
		}
		this.render();
	};
	this.render = function() {
		renderer.render(scene, camera );
	};
	
	var findDeletedObject = function(findId) {
		for(var i in canDeleted) {
			if(canDeleted[i].id === findId) return canDeleted[i];
		}
	};

	var findObject = function(findId) {
		for(var i in objects) {
			if(objects[i].id === findId) return objects[i];
		}
	}

	var choiceMaterial = function(id) {
		var splitedId = splitString(id);
		return makeObject.getMaterialForTexture(0x050505, 'img/'+ splitedId + '.jpg', 0x555555, 30);
	}

	var splitString = function(id) {
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
	Line : function(color, width) {
		return new THREE.LineBasicMaterial( { color: parseInt(colorList[color]), linewidth : width} );
	},
	getMaterial : function(ambientValue, colorValue, specularValue, shininessValue) {
		return new THREE.MeshPhongMaterial({
			ambient: ambientValue, color: parseInt(colorList[colorValue]), specular: specularValue, shininess: shininessValue, transparent: true} );
	},
	getMaterialForTexture : function(ambientValue, url, specularValue, shininessValue) {
		return new THREE.MeshPhongMaterial({
			map: THREE.ImageUtils.loadTexture(url),
		ambient: ambientValue, specular: specularValue, shininess: shininessValue } );
	}
}