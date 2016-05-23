//initialize three.js
onload = function(){
   		var scene = new THREE.Scene();
		var width = 1;
		var height = 1;
		var scale = 1.0;
		
			var camera = new THREE.OrthographicCamera(
      -width/2*scale, width/2*scale, height/2*scale, -height/2*scale, -1, 1
);
			var renderer = new THREE.WebGLRenderer();
			renderer.setSize( window.innerWidth, window.innerHeight );
			document.body.appendChild( renderer.domElement );
			//renderer.setFaceCulling(true, "ccw");
			
			//テクスチャの作成
			var texture = THREE.ImageUtils.loadTexture('frontResizedPadded.png');
			texture.anisotropy = renderer.getMaxAnisotropy();
			texture.magFilter = THREE.NearestFilter;
			texture.minFilter = THREE.NearestFilter;
			
			var geometry = new THREE.PlaneGeometry(1, 1);
			
			var material = new THREE.MeshBasicMaterial( { map: texture } );
			material.doubleSided = true;
			
			var cube = new THREE.Mesh( geometry, material );
			scene.add( cube );
			
			
			//アニメーションする
			var render = function () {
				requestAnimationFrame( render );
				//アニメーション処理
				//cube.rotation.y += 0.01;
				renderer.render(scene, camera);
			};
			
			render();
}