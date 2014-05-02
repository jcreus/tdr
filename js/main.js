require(["PointerLockControls", "OBJMTLLoader", "text!../shaders/relativity.vs"], function (_, _, vertexShader) {
	oldpos = undefined;// all = {x:[],y:[],z:[]}
	doRun = true;
	allmats = [];
	var camera, scene, renderer;
	var geometry, material, mesh;
	var controls,time = Date.now();

	var objects = [];

	var ray;



	VX =0; VY=0; VZ=0;
	setupPointerLock();
	init();
	animate();

function clone(item) {
	if (!item) { return item; } // null, undefined values check

	var types = [ Number, String, Boolean ], 
		result;

	// normalizing primitives if someone did new String('aaa'), or new Number('444');
	types.forEach(function(type) {
		if (item instanceof type) {
			result = type( item );
		}
	});

	if (typeof result == "undefined") {
		if (Object.prototype.toString.call( item ) === "[object Array]") {
			result = [];
			item.forEach(function(child, index, array) { 
				result[index] = clone( child );
			});
		} else if (typeof item == "object") {
			// testing that this is DOM
			if (item.nodeType && typeof item.cloneNode == "function") {
				var result = item.cloneNode( true );    
			} else if (!item.prototype) { // check that this is a literal
				if (item instanceof Date) {
					result = new Date(item);
				} else {
					// it is an object literal
					result = {};
					for (var i in item) {
						result[i] = clone( item[i] );
					}
				}
			} else {
				// depending what you would like here,
				// just keep the reference, or create new object
				if (false && item.constructor) {
					// would not advice to do that, reason? Read below
					result = new item.constructor();
				} else {
					result = item;
				}
			}
		} else {
			result = item;
		}
	}

	return result;
}

	function setupPointerLock() {
		var blocker = document.getElementById( 'blocker' );
		var instructions = document.getElementById( 'instructions' );

		// http://www.html5rocks.com/en/tutorials/pointerlock/intro/

		var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

		if ( havePointerLock ) {

			var element = document.body;

			var pointerlockchange = function ( event ) {

				if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {

					controls.enabled = true;
					doRun = true;

					blocker.style.display = 'none';

				} else {

					controls.enabled = false;
					doRun=false;

					blocker.style.display = '-webkit-box';
					blocker.style.display = '-moz-box';
					blocker.style.display = 'box';

					instructions.style.display = '';

				}

			}

			var pointerlockerror = function ( event ) {

				instructions.style.display = '';

			}

			// Hook pointer lock state change events
			document.addEventListener( 'pointerlockchange', pointerlockchange, false );
			document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
			document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );

			document.addEventListener( 'pointerlockerror', pointerlockerror, false );
			document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
			document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );

			instructions.addEventListener( 'click', function ( event ) {

				instructions.style.display = 'none';

				// Ask the browser to lock the pointer
				element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;

				if ( /Firefox/i.test( navigator.userAgent ) ) {

					var fullscreenchange = function ( event ) {

						if ( document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element ) {

							document.removeEventListener( 'fullscreenchange', fullscreenchange );
							document.removeEventListener( 'mozfullscreenchange', fullscreenchange );

							element.requestPointerLock();
						}

					}

					document.addEventListener( 'fullscreenchange', fullscreenchange, false );
					document.addEventListener( 'mozfullscreenchange', fullscreenchange, false );

					element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;

					element.requestFullscreen();

				} else {

					element.requestPointerLock();

				}

			}, false );

		} else {

			instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API. Sorry, pal.';

		}
	}

	var heightData = []; // y, x

	function makeHeightMap() {
		var canvas = document.createElement( 'canvas' );
		canvas.width = 1024;
		canvas.height = 1024;
		//document.body.appendChild(canvas);
		canvas.style.zIndex = 10000;
		canvas.style.position = "fixed";

		var context = canvas.getContext( '2d' );

		var size = 1024*1024, data = new Float32Array( size );

		var img = document.createElement("img");
		img.src = "heightmap.png";
		img.onload = function () {
			//console.log(img);
			context.drawImage(img,0,0);

			var hdiff = 22.25;
			var imgd = context.getImageData(0, 0, 1024, 1024);
			var data = imgd.data;
	        for(var y = 0; y < 1024; y++) {
	          var arr = [];
	          for(var x = 0; x < 1024; x++) {
	            var red = data[((1024 * y) + x) * 4];
	            /*var green = data[((1024 * y) + x) * 4 + 1];
	            var h1 = hdiff*(255-red)/128;
	            var h2 = hdiff*(255-green)/128;
	            if (red == green) {
	            	arr.push([h1]);
	            } else {
	            	arr.push([h1, h2])
	            }*/
	            arr.push(23.22*(255-red)/128);
	          }
	          heightData.push(arr);
	        }
	        ready = true;
   	    }

	}
	
	var ready = false;
	function init() {
		makeHeightMap();
		camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 0.1, 1000 );

		scene = new THREE.Scene();		scene.fog = new THREE.Fog( 0xffffff, 1, 5000 );
		scene.fog.color.setHSL( 0.6, 0, 1 );


		hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
		hemiLight.color.setHSL( 0.6, 1, 0.6 );
		hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
		hemiLight.position.set( 0, 500, 0 );
		scene.add( hemiLight );

		//

		dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
		dirLight.position.set( 0, 5, 0 );
		dirLight.position.multiplyScalar( 50 );
		scene.add( dirLight );

		uniforms = {
			playerPosition: new THREE.Vector3(),
			topColor: 	 { type: "c", value: new THREE.Color( 0x0077ff ) },
			bottomColor: { type: "c", value: new THREE.Color( 0xffffff ) },
			offset:		 { type: "f", value: 33 },
			exponent:	 { type: "f", value: 0.6 }
		}
		uniforms.topColor.value.copy( hemiLight.color );

		scene.fog.color.copy( uniforms.bottomColor.value );
		moreuniforms = THREE.UniformsUtils.merge([THREE.ShaderLib[ 'lambert' ].uniforms, {velx: { type: "f", value:VX},vely: { type: "f", value:VY},velz: { type: "f", value:VZ}, playerPosition: { type: "v3", value: new THREE.Vector3() }}]);
		var skyGeo = new THREE.SphereGeometry( 4000, 50, 50 );
		//var skyMat = new THREE.MeshLambertMaterial()// { vertexShader: vertexShader, fragmentShader: fragmentShader, uniforms: uniforms, side: THREE.BackSide } );
		//skyMat.vertexShader = vertexShader;
		var opts = {fog:true, lights:true, vertexShader: vertexShader, fragmentShader: THREE.ShaderLib['lambert'].fragmentShader, uniforms: moreuniforms, attributes: {}};
		var skyMat = new THREE.ShaderMaterial({fog:true, lights:true, vertexShader: vertexShader, fragmentShader: THREE.ShaderLib['lambert'].fragmentShader, uniforms: moreuniforms, attributes: {}});
		//console.log(skyMat.vertexShader);
		var sky = new THREE.Mesh( skyGeo, skyMat );
		//scene.add( sky );

		controls = new THREE.PointerLockControls( camera );
		scene.add( controls.getObject() );

		/*var loader = new THREE.OBJMTLLoader( );
		loader.load( 'modelmiki.obj', 'modelmiki.mtl', opts, allmats, function ( geometry ) {
		console.log(allmats);
			//console.log(geometry);
			//var mesh = new THREE.Mesh( geometry, skyMat );
			console.log(geometry);
			geometry.scale.set(1.0, 1.0, 1.0);
			//geometry.material = skyMat;
			scene.add(geometry);
			objects.push(geometry);
		});*/
		var loader = new THREE.JSONLoader();

		loader.load( "guardo2.js", function(geometry, materials){
		  var material = new THREE.MeshLambertMaterial({color: 0x55B663});
		  var material = new THREE.MeshFaceMaterial(materials);
		  mesh = new THREE.Mesh(geometry, material);
		  //console.log(mesh);
		  for (var i=0; i<mesh.material.materials.length; i++) {
			var mat = mesh.material.materials[i];
			//console.log(mat.name);
			//console.log(mat.color);
			var newmat = new THREE.ShaderMaterial(clone(opts));
			newmat.uniforms.diffuse.value = clone(mat.color)
			allmats.push(newmat);
			mesh.material.materials[i] = newmat;
		  }
		  scene.add(mesh);
		  ready = false; meshscene = mesh;
		  objects.push(mesh);
		});
		//

		renderer = new THREE.WebGLRenderer();
		renderer.setClearColor( 0xffffff );
		renderer.setSize( window.innerWidth, window.innerHeight );
		renderer.setClearColor( scene.fog.color, 1 );

		renderer.gammaInput = true;
		renderer.gammaOutput = true;
		renderer.physicallyBasedShading = true;

		renderer.shadowMapEnabled = true;
		renderer.shadowMapCullFace = THREE.CullFaceBack;

		document.body.appendChild( renderer.domElement );

		//

		window.addEventListener( 'resize', onWindowResize, false );

	}

	function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize( window.innerWidth, window.innerHeight );

	}
canmove=true;
	function animate() {

if (ready) {
		requestAnimationFrame( animate );
		//
		var pos = clone(controls.getObject().position);
		//pos.y = 0;
		var mapCoords = [(pos.x+98)/198*1024, (pos.z-56)/198*1024];
		var newh = heightData[Math.round(Math.abs(mapCoords[0]))][Math.round(Math.abs(mapCoords[1]))];
		var oldh = pos.y;
		//console.log(newh, oldh);//fdsafdas;
		//controls.yawObject.position.y = pos.y = newh;
		document.getElementById("msg").innerHTML = Math.floor(pos.x)+","+Math.floor(pos.y)+","+Math.floor(pos.z)+"<br>"+Math.floor(pos.x+98)+","+Math.floor(pos.y)+","+Math.floor(pos.z-56)
		//scene.updateMatrixWorld();
		//var ray = new THREE.Raycaster(pos, THREE.Vector3(0,1,0));
		//var intersections = ray.intersectObjects(scene.children);
		//console.log(typeof scene.children[0])
		//console.log(intersections.length);
		//console.log(meshscene.geometry.vertices.length);
		/*controls.isOnObject( false );
		//var vector = controls.target.clone().subSelf( controls.object.position ).normalize();
		var ray = new THREE.Ray(controls.position);
		var intersections = ray.intersectObjects( scene.children, true );
		if ( intersections.length > 0 ) {
			//console.log(intersections[0].distance);
			var distance = intersections[ 0 ].distance;
			if ( distance > 0 && distance < 10 ) {

				controls.isOnObject( true );

			}

		}*/
		var delta = Date.now() - time;


		if (oldpos != undefined && canmove) {
			if (newh-oldh < 2) {
				pos.y = newh;
				controls.yawObject.position.y = newh+1;
				controls.update( delta );
			} else {
				controls.update( delta, true);
			}

			/*var ray = new THREE.Raycaster(new THREE.Vector3(pos.x,0,pos.z), new THREE.Vector3(0,1,0));
			var intersections = ray.intersectObjects(scene.children, true );
			if (intersections.length >= 1) {
				console.log("collision");
				console.log(controls.yawObject.position.x);
				controls.yawObject.position = oldpos;
				//controls.update(-delta);
			} else {*/
			//console.log(oldpos.x, pos.x);
				VX = 2*(pos.x-oldpos.x)//delta;
				VY = 0;//2*(pos.y-oldpos.y)//delta;
				VZ = 2*(pos.z-oldpos.z)//delta;
				//console.log(VX,VY,VZ);
				//console.log(allmats.length);
				for (var i=0; i<allmats.length; i++) {
					//console.log(i,allmats[i]);
				allmats[i].uniforms.velx.value = VX;
				allmats[i].uniforms.vely.value = VY;
				allmats[i].uniforms.velz.value = VZ;
				allmats[i].uniforms.playerPosition.value = pos;
				}
			//}

			//console.log(VX,VY,VZ, Math.sqrt(VX*VX+VY*VY+VZ*VZ));
		}
		oldpos = pos.clone();
		//uniforms.playerPosition = pos;
		renderer.render( scene, camera );

		time = Date.now();
} else
		requestAnimationFrame( animate ); console
	}
});
