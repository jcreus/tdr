require(["PointerLockControls", "OBJMTLLoader", "utils",
	"text!../shaders/relativity.vs"
], function(_, __, Utils, vertexShader) {
	var oldpos; // all = {x:[],y:[],z:[]}
	var doRun = true;
	var allmats = [];
	var camera, scene, renderer;
	var geometry, material, mesh;
	var controls, time = Date.now();
	var objects = [];
	var heightData = []; // y, x
	var ray;
	var ready = false;
	var VX = 0;
	var VY = 0;
	var VZ = 0;
	var clone = Utils.clone;
	var players = {};
	var alienData;
	var C = 1.0;
	var naame = location.href.split('?')[1];
	if (naame) {
		var socket = io.connect('//serene-everglades-7014.herokuapp.com:80');///'//192.168.66.21:1137');
		socket.emit('identify', naame);
	}
	setupPointerLock();
	makeHeightMap();
	init();
	animate();

	function setupPointerLock() {
		var blocker = document.getElementById('blocker');
		var instructions = document.getElementById('instructions');
		var havePointerLock = 'pointerLockElement' in document ||
			'mozPointerLockElement' in document || 'webkitPointerLockElement' in
			document;
		if (havePointerLock) {
			var element = document.body;
			var pointerlockchange = function(event) {
				if (document.pointerLockElement === element || document.mozPointerLockElement ===
					element || document.webkitPointerLockElement === element) {
					controls.enabled = true;
					doRun = true;
					blocker.style.display = 'none';
				} else {
					controls.enabled = false;
					doRun = false;
					blocker.style.display = '-webkit-box';
					blocker.style.display = '-moz-box';
					blocker.style.display = 'box';
					instructions.style.display = '';
				}
			};
			var pointerlockerror = function(event) {
				instructions.style.display = '';
			};
			// Hook pointer lock state change events
			document.addEventListener('pointerlockchange', pointerlockchange, false);
			document.addEventListener('mozpointerlockchange', pointerlockchange,
				false);
			document.addEventListener('webkitpointerlockchange', pointerlockchange,
				false);
			document.addEventListener('pointerlockerror', pointerlockerror, false);
			document.addEventListener('mozpointerlockerror', pointerlockerror, false);
			document.addEventListener('webkitpointerlockerror', pointerlockerror,
				false);
			instructions.addEventListener('click', function(event) {
				instructions.style.display = 'none';
				// Ask the browser to lock the pointer
				element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock ||
					element.webkitRequestPointerLock;
				if (/Firefox/i.test(navigator.userAgent)) {
					var fullscreenchange = function(event) {
						if (document.fullscreenElement === element || document.mozFullscreenElement ===
							element || document.mozFullScreenElement === element) {
							document.removeEventListener('fullscreenchange', fullscreenchange);
							document.removeEventListener('mozfullscreenchange',
								fullscreenchange);
							element.requestPointerLock();
						}
					};
					document.addEventListener('fullscreenchange', fullscreenchange, false);
					document.addEventListener('mozfullscreenchange', fullscreenchange,
						false);
					element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen ||
						element.mozRequestFullScreen || element.webkitRequestFullscreen;
					element.requestFullscreen();
				} else {
					element.requestPointerLock();
				}
			}, false);
		} else {
			instructions.innerHTML =
				'Your browser doesn\'t seem to support Pointer Lock API. Sorry, pal.';
		}
	}

	function makeHeightMap() {
		canvas = document.createElement('canvas');
		canvas.width = 1024;
		canvas.height = 1024;
		//document.body.appendChild(canvas);
		//canvas.style.transform="scale(0.5)";
		canvas.style.zIndex = 10000;
		canvas.style.position = "fixed";
		window.onclick = function() {
			if (controls.enabled) {
				console.log("bang");
			}
		}
		var context = canvas.getContext('2d');
		var size = 1024 * 1024,
			data = new Float32Array(size);
		var img = document.createElement("img");
		img.src = "nova.png";
		img.onload = function() {
			context.drawImage(img, 0, 0);
			var hdiff = 22.25;
			var imgd = context.getImageData(0, 0, 1024, 1024);
			var data = imgd.data;
			for (var y = 0; y < 1024; y++) {
				var arr = [];
				for (var x = 0; x < 1024; x++) {
					var red = data[((1024 * y) + x) * 4] / 255 * 40.2;
					var green = data[((1024 * y) + x) * 4 + 1] / 255 * 40.2;
					if (red == green) {
						arr.push([red]);
					} else {
						arr.push([red, green]);
					}
				}
				heightData.push(arr);
			}
			ready = true;
		};
	}

	function distance(v1, v2) {
		return Math.sqrt(Math.pow(v1[0] - v2.x, 2) + Math.pow(v1[1] - v2.y, 2) +
			Math.pow(v1[2] - v2.z, 2));
	}

	function init() {
		camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight,
			0.1, 1000);
		scene = new THREE.Scene();
		if (naame) {
			socket.on('newpos', function(data) {
				if (data.name == naame) return;
				if (players[data.name] === undefined) {
					console.log("New player detected", data.name);
					players[data.name] = new THREE.Mesh(aliendata[0], aliendata[1]);
					players[data.name].position.set(0, 0, 0);
					players[data.name].scale.set(1.5, 1.5, 1.5);
					scene.add(players[data.name]);
				} else {
					setTimeout(function() {
						players[data.name].position.set(data.pos[0], data.pos[1] + 0.5,
							data.pos[2]);
						players[data.name].rotation.set(0, data.pos[4] + Math.PI, 0);
					}, distance(data.pos, oldpos) / C * 1000);
				}
			});
		}
		scene.fog = new THREE.Fog(0xffffff, 1, 5000);
		scene.fog.color.setHSL(0.6, 0, 1);
		hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
		hemiLight.groundColor.setHSL(0.095, 1, 0.75);
		hemiLight.position.set(0, 500, 0);
		dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
		dirLight.position.set(-30, 500, 0);
		scene.add(dirLight);
		var light = new THREE.AmbientLight(0x404040);
		scene.add(light);
		uniforms = {
			playerPosition: new THREE.Vector3(),
			topColor: {
				type: "c",
				value: new THREE.Color(0x0077ff)
			},
			bottomColor: {
				type: "c",
				value: new THREE.Color(0xffffff)
			},
			offset: {
				type: "f",
				value: 33
			},
			exponent: {
				type: "f",
				value: 0.6
			}
		};
		uniforms.topColor.value.copy(hemiLight.color);
		scene.fog.color.copy(uniforms.bottomColor.value);
		moreuniforms = THREE.UniformsUtils.merge([THREE.ShaderLib.lambert.uniforms, {
			velx: {
				type: "f",
				value: VX
			},
			vely: {
				type: "f",
				value: VY
			},
			velz: {
				type: "f",
				value: VZ
			},
			c: {
				type: "f",
				value: C
			},
			playerPosition: {
				type: "v3",
				value: new THREE.Vector3()
			}
		}]);
		var skyGeo = new THREE.SphereGeometry(4000, 50, 50);
		//var skyMat = new THREE.MeshLambertMaterial()// { vertexShader: vertexShader, fragmentShader: fragmentShader, uniforms: uniforms, side: THREE.BackSide } );
		//skyMat.vertexShader = vertexShader;
		var opts = {
			fog: true,
			lights: true,
			vertexShader: vertexShader,
			fragmentShader: THREE.ShaderLib.lambert.fragmentShader,
			uniforms: moreuniforms,
			attributes: {}
		};
		var skyMat = new THREE.ShaderMaterial({
			fog: true,
			lights: true,
			vertexShader: vertexShader,
			fragmentShader: THREE.ShaderLib.lambert.fragmentShader,
			uniforms: moreuniforms,
			attributes: {}
		});
		//console.log(skyMat.vertexShader);
		var sky = new THREE.Mesh(skyGeo, skyMat);
		scene.add(sky);
		controls = new THREE.PointerLockControls(camera);
		scene.add(controls.getObject());
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
		loader.load("caram.js", function(geometry, materials) { // guardo2
			//var material = new THREE.MeshLambertMaterial({color: 0x55B663});
			//var material = new THREE.MeshFaceMaterial(materials);
			var materialx = new THREE.MeshLambertMaterial({});
			materialx.uniforms = moreuniforms; //.map = THREE.ImageUtils.loadTexture('img2.png');
			//materialx.uniforms.map = THREE.ImageUtils.loadTexture('img2.png');
			materialx.map = THREE.ImageUtils.loadTexture('img2.png');
			materialx.vertexShader = vertexShader;
			materialx.needsUpdate = true;
			var material = new THREE.MeshLambertMaterial({
				map: THREE.ImageUtils.loadTexture('img2.png')
			});
			//moreuniforms.map = THREE.ImageUtils.loadTexture('img2.png');
			/*var material = new THREE.ShaderMaterial({
				fog: true,
				lights: true,
				vertexShader: vertexShader,
				fragmentShader: THREE.ShaderLib.lambert.fragmentShader,
				uniforms: moreuniforms,
				attributes: {}});*/
			mesh = new THREE.Mesh(geometry, materialx);
			allmats.push(materialx);
			console.log("ambimatge", materialx);
			console.log("senseimg", material)
				/*for (var i = 0; i < mesh.material.materials.length; i++) {
					var mat = mesh.material.materials[i];
					//mesh.material.materials[i] = mesh.material.materials[danum];
					//console.log(mat);
					//console.log(mat.name);
					//console.log(mat.color);
					var newmat = new THREE.ShaderMaterial(clone(opts));
					//console.log(newmat.uniforms);
					/*if (mat.uniforms && mat.uniforms.map) {
						newmat.uniforms.map.value = clone(mat.uniforms.map.value4);
					} else 
						newmat.uniforms.ambient.value = clone(mat.color);

					allmats.push(newmat);
					mesh.material.materials[i] = newmat;
				}
				console.log(mesh);*/
				/*for (var i = 0; i < mesh.material.materials.length; i++) {
					var m = mesh.material.materials[i];
					if (m.name == "Dabest") {
						console.log(i);
						danum = i;
						break;
					}
				}
				//conssole.log(mesh);
				for (var i = 0; i < mesh.material.materials.length; i++) {
					var mat = mesh.material.materials[i];
					mesh.material.materials[i] = mesh.material.materials[danum];
					//console.log(mat);
					//console.log(mat.name);
					//console.log(mat.color);
					var newmat = new THREE.ShaderMaterial(clone(opts));
					//console.log(newmat.uniforms);
					if (mat.uniforms && mat.uniforms.map) {
						newmat.uniforms.map.value = clone(mat.uniforms.map.value4);
					} else 
						newmat.uniforms.ambient.value = clone(mat.color);

					allmats.push(newmat);
					//mesh.material.materials[i] = newmat;
				}*/
			scene.add(mesh);
			meshscene = mesh;
			objects.push(mesh);
		});
		loader.load("alien.js", function(geometry, materials) {
			var material = new THREE.MeshFaceMaterial(materials);
			aliendata = [geometry, material];
		});
		//
		renderer = new THREE.WebGLRenderer();
		renderer.setClearColor(0xffffff);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setClearColor(scene.fog.color, 1);
		renderer.gammaInput = true;
		renderer.gammaOutput = true;
		renderer.physicallyBasedShading = true;
		renderer.shadowMapEnabled = true;
		renderer.shadowMapCullFace = THREE.CullFaceBack;
		document.body.appendChild(renderer.domElement);
		//
		window.addEventListener('resize', onWindowResize, false);
	}

	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}
	canmove = true;
	var oldxpos = null;
	var iii = 0;

	function animate() {
		if (ready) {
			requestAnimationFrame(animate);

			var pos = clone(controls.getObject().position);
			var mapCoords = [(pos.x + 118.03) / 437.01 * 1024, (pos.z + 287.21) /
				437.01 * 1024
			];

			var newh = heightData[Math.round(Math.abs(mapCoords[1]))][Math.round(Math
				.abs(mapCoords[0]))];
			var oldh = pos.y - 3;

			var delta = Date.now() - time;
			if (oldpos !== undefined && canmove) {
				var nova = -1;
				var mindiff = 100000;
				for (var h = 0; h < newh.length; h++) {
					var noudiff = Math.abs(newh[h] - oldh);
					if (noudiff < 3) {
						if (noudiff < mindiff) {
							nova = newh[h];
							mindiff = noudiff;
						}
					}
				}
				if (nova != -1) {
					pos.y = nova;
					controls.yawObject.position.y = nova + 3;
					controls.update(delta);
				} else {
					controls.update(delta, true);
				}
				var rot = new THREE.Vector3(controls.pitchObject.rotation.x, controls.yawObject
					.rotation.y, 0);
				var euler = new THREE.Euler(0, 0, 0, "YXZ");
				rot.applyEuler(euler);
				globalCont = controls;
				var xpos = [parseFloat(pos.x.toFixed(1)),
					parseFloat(pos.y.toFixed(1)),
					parseFloat(pos.z.toFixed(1)),
					parseFloat(rot.x.toFixed(1)),
					parseFloat(rot.y.toFixed(1)),
					parseFloat(rot.z.toFixed(1))
				];
				if (naame && JSON.stringify(oldxpos) != JSON.stringify(xpos)) {
					socket.emit('position', xpos);
				}
				oldxpos = xpos;

				VX = 2 * (pos.x - oldpos.x);
				VY = 0;
				VZ = 2 * (pos.z - oldpos.z);
				for (var i = 0; i < allmats.length; i++) {
					allmats[i].uniforms.velx.value = VX;
					allmats[i].uniforms.vely.value = VY;
					allmats[i].uniforms.velz.value = VZ;
					allmats[i].uniforms.playerPosition.value = pos;
				}
			}
			document.getElementById("msg").innerHTML = Math.sqrt(VX * VX + VY * VY +
				VZ * VZ).toFixed(3) + " / " + (Math.sqrt(VX * VX + VY * VY + VZ * VZ) / C).toFixed(3);
			oldpos = pos.clone();
			renderer.render(scene, camera);
			time = Date.now();
		} else {
			requestAnimationFrame(animate);
		}
		//requestAnimationFrame( animate ); console
	}
});
