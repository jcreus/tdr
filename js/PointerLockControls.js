/**
 * @author mrdoob / http://mrdoob.com/
 */

define("PointerLockControls", function () {
	var Y_POS=5//2; //2.5
	THREE.PointerLockControls = function ( camera ) {

		var scope = this;

		camera.rotation.set( 0, 0, 0 );

		var pitchObject = new THREE.Object3D();
		pitchObject.add( camera );
		this.pitchObject = pitchObject;

		var yawObject = new THREE.Object3D();
		yawObject.position.y = 3+3;
		yawObject.position.x = 0;
		yawObject.position.z = 0;
		yawObject.add( pitchObject );
		this.yawObject = yawObject;

		var moveForward = false;
		var moveBackward = false;
		var moveLeft = false;
		var moveRight = false;

		var isOnObject = false;
		var canJump = true;

		var velocity = new THREE.Vector3();
		this.velocity = velocity;

		var PI_2 = Math.PI / 2;

		var onMouseMove = function ( event ) {

			if ( scope.enabled === false ) return;

			var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
			var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

			yawObject.rotation.y -= movementX * 0.002;
			pitchObject.rotation.x -= movementY * 0.002;

			pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );

		};

		var onKeyDown = function ( event ) {

			switch ( event.keyCode ) {

				case 38: // up
				case 87: // w
					moveForward = true;
					break;

				case 37: // left
				case 65: // a
					moveLeft = true; break;

				case 40: // down
				case 83: // s
					moveBackward = true;
					break;

				case 39: // right
				case 68: // d
					moveRight = true;
					break;

				case 32: // space
					if ( canJump === true ) velocity.y += .15;
					canJump = false;
					break;

			}

		};

		var onKeyUp = function ( event ) {

			switch( event.keyCode ) {

				case 38: // up
				case 87: // w
					moveForward = false;
					break;

				case 37: // left
				case 65: // a
					moveLeft = false;
					break;

				case 40: // down
				case 83: // s
					moveBackward = false;
					break;

				case 39: // right
				case 68: // d
					moveRight = false;
					break;

			}

		};

		document.addEventListener( 'mousemove', onMouseMove, false );
		document.addEventListener( 'keydown', onKeyDown, false );
		document.addEventListener( 'keyup', onKeyUp, false );

		this.enabled = false;

		this.getObject = function () {

			return yawObject;

		};

		this.isOnObject = function ( boolean ) {

			isOnObject = boolean;
			canJump = boolean;

		};

		this.getDirection = function() {

			// assumes the camera itself is not rotated

			var direction = new THREE.Vector3( 0, 0, -1 );
			var rotation = new THREE.Euler( 0, 0, 0, "YXZ" );

			return function( v ) {

				rotation.set( pitchObject.rotation.x, yawObject.rotation.y, 0 );

				v.copy( direction ).applyEuler( rotation );

				return v;

			}

		}();

		this.update = function ( delta, inverse ) {
			//inverse = false;

			if ( scope.enabled === false ) return;

			delta *= 0.3;

			velocity.x += ( - velocity.x ) * 0.06 * delta;
			velocity.z += ( - velocity.z ) * 0.06 * delta;

			//velocity.y -= 0.005 * delta;

			if ( moveForward ) velocity.z -= 0.02 * delta;
			if ( moveBackward ) velocity.z += 0.02 * delta;

			if ( moveLeft ) velocity.x += 0.02 * delta;
			if ( moveRight ) velocity.x -= 0.02 * delta;

			if ( isOnObject === true ) {

				velocity.y = Math.max( 0, velocity.y );

			}
			if (!inverse) {
				yawObject.translateX( velocity.x );
				//yawObject.translateY( velocity.y ); 
				yawObject.translateZ( velocity.z );
			} else {
				yawObject.translateX( -2*velocity.x );
				//yawObject.translateY( velocity.y ); 
				yawObject.translateZ( -2*velocity.z );
			}

			if ( yawObject.position.y < Y_POS ) {

				velocity.y = 0;
				yawObject.position.y = Y_POS;

				canJump = false;true;

			}

		};

	};

});
