	//physics.js는 메인 페이지에서 웹 워커를 이용하여 계산을 요청하면, 계산을 한 후에 그 결과를 메인 페이지로 전달하는 역할을 한다.
	if( 'undefined' === typeof window){
		importScripts('lib/Box2D.js');
	}


	var   b2Vec2 = Box2D.Common.Math.b2Vec2
	, b2BodyDef = Box2D.Dynamics.b2BodyDef
	, b2Body = Box2D.Dynamics.b2Body
	, b2FixtureDef = Box2D.Dynamics.b2FixtureDef
	, b2Fixture = Box2D.Dynamics.b2Fixture
	, b2World = Box2D.Dynamics.b2World
	, b2MassData = Box2D.Collision.Shapes.b2MassData
	, b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
	, b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
	, b2DebugDraw = Box2D.Dynamics.b2DebugDraw
	, b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef
	;

	var Hz = 60;
	var impulseTimeout = null;
	var initTimeout = null;
	var angleElem = 70;
	var powerElem = 30;
	var beforeImpulse = 0;
	var afterImpulse = 0;
	var intervalListener = null;
	

	//bTest를 생성한다. 
	function bTest(intervalRate, adaptive, width, height, scale) {
		this.intervalRate = parseInt(intervalRate);
		this.adaptive = adaptive;
		this.width = width;
		this.height = height;
		this.scale = scale;

		//bodies는 이런 Map들을 보관할 것이다.
		this.bodiesMap = {};

		this.world = new b2World(
					new b2Vec2(0, 0)    //gravity
			 ,  true                 //allow sleep
			 );

		//ground를 정의한다. ground는 static Object이다.
		this.fixDef = new b2FixtureDef;
		this.fixDef.density = 1.0;
		this.fixDef.friction = 0.5;
		this.fixDef.restitution = 0.2;
	}


	bTest.prototype.update = function() {
		var start = Date.now();
		var stepRate = (this.adaptive) ? (now - this.lastTimestamp) / 1000 : (1 / this.intervalRate);
		var graveyard = [];
		this.world.Step( //물리연산을 Box2D에서 해 주는 과정
				stepRate   //frame-rate
				,10      //velocity iterations
				,10       //position iterations
				);
		this.world.ClearForces();

		for(var id in this.bodiesMap) {
			var entity = this.bodiesMap[id];
			if (entity && this.bodiesMap[id].dead) {
			          box.removeBody(id);
			          graveyard.push(id);
			}
		}
		for (var i = 0; i < graveyard.length; i++) {
		        delete this.bodiesMap[graveyard[i]];
		}

		var world = box.getState();

		postMessage({"cmd" : 'body', "w": world, "g": graveyard});     
		graveyard = [];
	}

	bTest.prototype.getState = function() {
		var state = {};
		for (var b = this.world.GetBodyList(); b; b = b.m_next) {
			if (b.IsActive() && typeof b.GetUserData() !== 'undefined' && b.GetUserData() != null) {
				state[b.GetUserData()] = this.getBodySpec(b);
			}
		}
		return state;
	}

	//물건의 상세 정보를 리턴한다.
	bTest.prototype.getBodySpec = function(b) {
		return {x: b.GetPosition().x, y: b.GetPosition().y, a: b.GetAngle(), c: {x: b.GetWorldCenter().x, y: b.GetWorldCenter().y}, strength : b.strength};
	}

	//물건들을 생성한다.
	bTest.prototype.setBodies = function(bodyEntities) {
		//body를 정의한다. 즉 물체가 world의 어디에 존재하는지를 결정하게 된다.
		var bodyDef = new b2BodyDef;

		for(var id in bodyEntities) {
			var entity = bodyEntities[id];

			//입력된 body가 지면이라면 static, 아니면 dynamic으로 설정해 준다.
			if (entity.id == 'ground') {
				bodyDef.type = b2Body.b2_staticBody;
			} else {
				bodyDef.type = b2Body.b2_dynamicBody;
			}
			
			//body Position, 즉 물체가 wolrd의 어떤 좌표에 위치하게 되는지를 결정한다. world는 가운데를 중점으로 한다.
			bodyDef.position.x = entity.x;
			bodyDef.position.y = entity.y;
			bodyDef.userData = entity.id;
			bodyDef.angle = entity.angle;
			var body = this.registerBody(bodyDef, entity);
			
			//원인 경우
			if (entity.radius) {
				this.fixDef.shape = new b2CircleShape(entity.radius);
				body.CreateFixture(this.fixDef);
			} else if (entity.polys) { //다면체인 경우
				for (var j = 0; j < entity.polys.length; j++) {
					var points = entity.polys[j];
					var vecs = [];
					for (var i = 0; i < points.length; i++) {
						var vec = new b2Vec2();
						vec.Set(points[i].x, points[i].y);
						vecs[i] = vec;
					}
					this.fixDef.shape = new b2PolygonShape;
					this.fixDef.shape.SetAsArray(vecs, vecs.length);
							//다 만들면 body에 붙여준다.
							body.CreateFixture(this.fixDef);
						}
			} else { //ground인 경우. 원도 아니고 polygon도 아니기 때문.
				this.fixDef.shape = new b2PolygonShape;
				this.fixDef.shape.SetAsBox(entity.halfWidth, entity.halfHeight);
				body.CreateFixture(this.fixDef);
			}
		}
		//body를 생성했고 연산을 할 준비가 되었다.
		this.ready = true;
	}

	//만들어 진 body를 world에 등록한다.
	bTest.prototype.registerBody = function(bodyDef, entity) {
		var body = this.world.CreateBody(bodyDef);
		body.strength = entity.strength;
		this.bodiesMap[body.GetUserData()] = body;
		return body;
	}

	bTest.prototype.addRevoluteJoint = function(body1Id, body2Id, params) {
		var body1 = this.bodiesMap[body1Id];
		var body2 = this.bodiesMap[body2Id];
		var joint = new b2RevoluteJointDef();
		joint.Initialize(body1, body2, body1.GetWorldCenter());
		if (params && params.motorSpeed) {
			joint.motorSpeed = params.motorSpeed;
			joint.maxMotorTorque = params.maxMotorTorque;
			joint.enableMotor = true;
		}
		this.world.CreateJoint(joint);
	}

	//impulse를 적용하는 함수이다. 인자로 body id,각도, 힘을 받는다.
	bTest.prototype.applyImpulse = function(bodyId, degrees, power) {
		var body = this.bodiesMap[bodyId];
	 	body.ApplyImpulse(new b2Vec2(Math.cos(degrees * (Math.PI / 180)) * power,
             	                    Math.sin(degrees * (Math.PI / 180)) * power),
                   		              body.GetWorldCenter());
	}

	//damage를 적용하는 callback함수이다.
	bTest.prototype.addContactListener = function(callbacks) {
		var listener = new Box2D.Dynamics.b2ContactListener;
		if (callbacks.BeginContact) listener.BeginContact = function(contact) {
			callbacks.BeginContact(contact.GetFixtureA().GetBody().GetUserData(),
				contact.GetFixtureB().GetBody().GetUserData());
		}
		if (callbacks.EndContact) listener.EndContact = function(contact) {
			callbacks.EndContact(contact.GetFixtureA().GetBody().GetUserData(),
				contact.GetFixtureB().GetBody().GetUserData());
		}
		if (callbacks.PostSolve) listener.PostSolve = function(contact, impulse) {
			callbacks.PostSolve(contact.GetFixtureA().GetBody().GetUserData(),
				contact.GetFixtureB().GetBody().GetUserData(),
				impulse.normalImpulses[0]);
		}
		this.world.SetContactListener(listener);
	}


	var box  = new bTest(Hz, false, 0);
	var callbackFunc = {
	        BeginContact: function(idA, idB) {
	        },
	        
	        PostSolve: function(idA, idB, impulse) {
		          if (impulse < 1000) return; // playing with thresholds
		          if(box.bodiesMap) {
		          	  	var entityA = box.bodiesMap[idA];
			          var entityB = box.bodiesMap[idB];
			          entityA.hit(impulse, entityB);
			          entityB.hit(impulse, entityA);
		          }
	        }
      	}


	//entity를 삭제한다.
	bTest.prototype.removeBody = function(id) {
		this.world.DestroyBody(this.bodiesMap[id]);
	}

	b2Body.prototype.hit = function(impulse, source) {
	      this.isHit = true;
	      afterImpulse += impulse;
	      if (this.strength) {
	        this.strength -= impulse;
	        if (this.strength <= 0) {
	        	console.log("dead");
	          this.dead = true
	        }
		}
    };

    var checkImpulse = function() {
    	console.log("before : " + beforeImpulse + " and after :" + afterImpulse );
    	if(beforeImpulse === afterImpulse) {
    		clearInterval(intervalListener);
    		box.world = new b2World(new b2Vec2(0, 0),  true);
    	
    		postMessage({"cmd" : 'end'});     
    	}
    	beforeImpulse = afterImpulse;
    };


	var loop = function() {
		if (box.ready) box.update();
	};
	setInterval(loop, 1000/240);

	//메인 페이지로부터 메시지를 받으면 실행되는 콜백 함수
	self.onmessage = function(e) {
		switch (e.data.cmd) {
			case 'bodies':
				box.setBodies(e.data.msg);
				break;
			case 'setGravity':
				box.world = new b2World(new b2Vec2(0, -9.8),  true);
				box.addContactListener(callbackFunc);	
				box.setBodies(e.data.msg);
				//callback 함수들
				intervalListener = setInterval(checkImpulse, 3000);
				impulseTimeout = setTimeout(function() {
					box.applyImpulse(e.data.ballCount, -e.data.value[0], e.data.value[1]);
				}.bind(this), 10);
					
				break;  
			case 'mousemove':
				box = new bTest(Hz, false);
				box.setBodies(e.data.msg);
				break;
		}
	}.bind(this);