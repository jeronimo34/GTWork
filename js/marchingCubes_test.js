//https://github.com/mrdoob/three.js/blob/master/examples/webgl_marchingcubes.html

//initialize three.js
onload = function(){

    var MARGIN = 0;
	var SCREEN_WIDTH = window.innerWidth;
	var SCREEN_HEIGHT = window.innerHeight - 2 * MARGIN;
	
    var camera, scene, renderer;
    var light, pointLight, ambientLight;
    var mesh, texture, geometry, materials, material, current_material;
    var effect, resolution, numBlobs;
    
    var volumeData;
    
    var time = 0;
    var clock = new THREE.Clock();
    
    //do function
    init();
    animate();
    
    //initialize three.js
    function init(){
        
        //container = document.getElementById('container');
        
        //CAMERA
        camera = new THREE.PerspectiveCamera(45, SCREEN_WIDTH/SCREEN_HEIGHT, 1, 10000);
        camera.position.set(0, 0, 2000);
        
        //SCENE
        scene = new THREE.Scene();
        
        //LIGHT
        light = new THREE.DirectionalLight(0xffffff);
        light.position.set(0.5, 0.5, 1);
        scene.add(light);
        
        pointLight = new THREE.PointLight( 0xff3300 );
		pointLight.position.set( 0, 0, 100 );
		scene.add( pointLight );
		ambientLight = new THREE.AmbientLight( 0x080808 );
		scene.add( ambientLight );
        
        //MATERIALS
        materials = generateMaterials();
        current_material = "colors";
        
        //MARCHING CUBES
        resolution = 28;//立方体の1辺の長さ
        numBlobs = 10;
        
        effect = new THREE.MarchingCubes( resolution, materials[ current_material ].m, true, true );
        effect.position.set(0,0,0);
        effect.scale.set(700, 700, 700);
        
        effect.enableUvs = false;
        effect.enableColors = false;
        
        scene.add(effect);
        
        //RENDERER
        
        renderer = new THREE.WebGLRenderer();
    	renderer.setClearColor(0x4f8080);
    	renderer.setPixelRatio(window.devicePixelRatio);
    	renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
    	document.body.appendChild( renderer.domElement );
    
    
        volumeData = generateVolumeData(30, 30, 30);
        
    	//テクスチャの作成
    // 	var texture = THREE.ImageUtils.loadTexture('frontResizedPadded.png');
    // 	texture.anisotropy = renderer.getMaxAnisotropy();
    // 	texture.magFilter = THREE.NearestFilter;
    // 	texture.minFilter = THREE.NearestFilter;
    			
    // 	var geometry = new THREE.PlaneGeometry(700, 700);
    			
    // 	var material = new THREE.MeshBasicMaterial( { map: texture } );
    // 	material.doubleSided = true;
    			
    // 	var cube = new THREE.Mesh( geometry, material );
    // 	scene.add( cube );		
    }

    function animate(){
        requestAnimationFrame(animate);
        
        render();
        //stats.update()
    }
    
    function render(){
        var delta = clock.getDelta();
        time += delta;
        
        //marching cube
        
        updateCubes(effect, time, 10, false, false, false);
        
        //lights
        
        //light.position.set( effectController.lx, effectController.ly, effectController.lz );
		//light.position.normalize();
		//pointLight.color.setHSL( effectController.lhue, effectController.lsaturation, effectController.llightness );

        // render
        renderer.clear();
        renderer.render(scene, camera);
    }
    
    function generateMaterials(){
        
        var materials = {
            "shiny" :
            {
                m: new THREE.MeshStandardMaterial({color: 0x550000, metalness: 1.0 }),
                h: 0, s: 0.8, l: 0.2
            },
            "colors" :
			{
				m: new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0xffffff, shininess: 2, vertexColors: THREE.VertexColors } ),
				h: 0, s: 0, l: 1
			},
        };
        
        return materials;
    }
 
    //this controls content of marching cubes voxel field
    
    function updateCubes(object, time, numblobs, floor, wallx, wallz)
    {
        object.reset();
        
        //fill the field with some metaballs
        var i, ballx, bally, ballz, subtract, strength;
        
        subtract = 24;
        strength = 1.2 / ((Math.sqrt(numblobs)-1)/4 + 1);
        
        for(i = 0; i < numblobs; ++i){
            ballx = Math.sin( i + 1.26 * time * ( 1.03 + 0.5 * Math.cos( 0.21 * i ) ) ) * 0.27 + 0.5;
			bally = Math.abs( Math.cos( i + 1.12 * time * Math.cos( 1.22 + 0.1424 * i ) ) ) * 0.77; // dip into the floor
			ballz = Math.cos( i + 1.32 * time * 0.1 * Math.sin( ( 0.92 + 0.53 * i ) ) ) * 0.27 + 0.5;
			object.addBall(ballx, bally, ballz, strength, subtract);
        }
        
        //to do
        // object.addExtrusionObject(
        // volumeData,
        // 30,30,30,
        // strength, subtract);
        
        
        if( floor ) object.addPlaneY(2, 12);
        if( wallz ) object.addPlaneZ(2, 12);
        if( wallx ) object.addPlaneX(2, 12);
    }
    
    //test volumeData
    function generateVolumeData(sizeX, sizeY, sizeZ){
        var x, y, z;
        var volumeData = new Float32Array(sizeX * sizeY * sizeZ);
        
        for(x = 0; x < sizeX; ++x){
            for(y = 0; y < sizeY; ++y){
                 for(z = 0; z < sizeZ; ++z){
                    var idx = z*sizeX*sizeY + y*sizeX + x;
                    volumeData[idx] = (x/sizeX) * (x/sizeX);
                }
            }
        }
        return volumeData;
    }
}
