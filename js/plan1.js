
///////////////////////////////////////////////////////////
//Marching cubes algorithmで使う値を返す
//signedDist, z, zMaxは0.0 ~ 1.0
///////////////////////////////////////////////////////////
getExtrusionFunction = function(signedDist,z,zMax){
    return Math.min(Math.min(signedDist, z), zMax-z);
}

///////////////////////////////////////////////////////////
//符号付距離画像からボリュームデータを得る。
///////////////////////////////////////////////////////////
getVolumeData = function(zMax, height, width, signedDistArray, volumeData){
      //volume data
        for(var z = 0; z < zMax; ++z)
        {
            for(var y = 0; y < height; ++y)
            {
                for(var x = 0; x < width; ++x)
                {
                var idx = z * height * width + y * width + x;
                var idx2 = y * width + x;
                var zdiv = z/zMax;
                
                volumeData[idx] = getExtrusionFunction(signedDistArray[idx2], zdiv, 1.0);
                }
            }
        }
}

///////////////////////////////////////////////////////////
//ページがロードされた後に呼ばれる
/////////////////////////////////////////////////////////////
onload = function(){
    
    var volumeData;
    
    var time = 0;
    var clock = new THREE.Clock();
    
    
    if ( ! canvas || ! canvas.getContext ) {
    return false;
    }
  
    var image = new Image();
    image.src = "./frontResizedPadded.png"

    var width;
    var height;
    var zMax;
    
    
    //画像のロードに成功
    image.onload = function(e){
    //イメージを白黒画像にして出力
        console.log("w" + image.width);
        console.log("h" + image.height);
        //
        //キャンバスに画像をセット
        var canvas = document.getElementById('canvas');
        var context = canvas.getContext('2d');
            
        width = image.width;
        height = image.height;
        zMax = image.width*0.9;
        
        //canvasと画像のサイズを同じにする     
        canvas.width = 3*image.width;
        canvas.height = image.height;
        
        context.drawImage(image,0,0);
        
        var srcImage = context.getImageData(0,0,width,height);
        var dstImage = context.createImageData(width, height);
        
        var laplacianImage = context.createImageData(width, height);
        
        var binArray = [];
        var negativeArray = [];
        var coutourPosArray = [];
        var signedDistArray = new Float32Array(width * height);//float32 array
        var volumeData = new Float32Array(width * height * zMax);
        
        //filter
        binarizationFilter(srcImage, binArray, 1);
        negativeFilter(binArray, negativeArray, srcImage.width, srcImage.height);
        
        Laplacian(negativeArray, laplacianImage);

   
        getContourPosArray(laplacianImage, coutourPosArray);

        getSignedDistImage(coutourPosArray, binArray, dstImage, signedDistArray); 
        
        //signedDistArrayからボリュームデータを作成
        getVolumeData(zMax, image.height, image.width, signedDistArray, volumeData);
        
	    context.putImageData(laplacianImage, image.width, 0);
	    context.putImageData(dstImage, 2*image.width, 0);
	    
	    //
	    //init three.js
	    var MARGIN = 0;
	    var SCREEN_WIDTH = window.innerWidth;
	    var SCREEN_HEIGHT = window.innerHeight - 2 * MARGIN;
	
        var camera, scene, renderer, controls;
        var light, pointLight, ambientLight;
        var mesh, texture, geometry, materials, material, current_material;
        var effect, resolution, numBlobs;
        
        //do function
        init();
        animate();
        
        ////////////////////////////////////////////////////////////
        //initialize three.js
        /////////////////////////////////////////////////////////
        function init(){
            
            
            //CAMERA
            camera = new THREE.PerspectiveCamera(45, SCREEN_WIDTH/SCREEN_HEIGHT, 1, 10000);
            camera.position.set(0, 0, 3000);
            
            
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
            resolution *= 2;
             
            numBlobs = 10;//metabolls num
            
            
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
        
            //CONTROLS
            controls = new THREE.OrbitControls(camera, renderer.domElement);
        }
    
        ////////////////////////////////////////////////////////////////////////
        //アニメーション　コールバックされる。
        /////////////////////////////////////////////////////////////////////////
        function animate(){
            requestAnimationFrame(animate);
            render();
            //stats.update()
        }
        
        /////////////////////////////////////////////////////////////////////////
        //描画処理
        /////////////////////////////////////////////////////////////////////////
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
        
        ///////////////////////////////////////////////////////////////////////
        //マテリアルの生成
        ///////////////////////////////////////////////////////////////////////////
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
        
        ///////////////////////////////////////////////////////////////////////
        //this controls content of marching cubes voxel field
        ///////////////////////////////////////////////////////////////////////
        function updateCubes(object, time, numblobs, floor, wallx, wallz)
        {
            object.reset();
            
            //fill the field with some metaballs
            var i, ballx, bally, ballz, subtract, strength;
            
            subtract = 24;
            strength = 1.2 / ((Math.sqrt(numblobs)-1)/4 + 1);
            
            //add balls
    //         for(i = 0; i < numblobs; ++i){
    //             ballx = Math.sin( i + 1.26 * time * ( 1.03 + 0.5 * Math.cos( 0.21 * i ) ) ) * 0.27 + 0.5;
    // 			bally = Math.abs( Math.cos( i + 1.12 * time * Math.cos( 1.22 + 0.1424 * i ) ) ) * 0.77; // dip into the floor
    // 			ballz = Math.cos( i + 1.32 * time * 0.1 * Math.sin( ( 0.92 + 0.53 * i ) ) ) * 0.27 + 0.5;
    // 			object.addBall(ballx, bally, ballz, strength, subtract);
    //         }
            
            //ボリュームデータからマーチングキューブ法を用いてモデルを生成
             object.addExtrusionObject(
             volumeData,
             image.width, 
             image.height, 
             zMax,
             2,
             12);
            
            
            if( floor ) object.addPlaneY(2, 12);
            if( wallz ) object.addPlaneZ(2, 12);
            if( wallx ) object.addPlaneX(2, 12);
        }
        
        
        ///////////////////////////////////////////////////////////////////////
        //test volumeData
        ///////////////////////////////////////////////////////////////////////
        function generateVolumeData(sizeX, sizeY, sizeZ){
            var x, y, z;
            var volumeData = new Float32Array(sizeX * sizeY * sizeZ);
            
            for(x = 0; x < sizeX; ++x){
                for(y = 0; y < sizeY; ++y){
                     for(z = 0; z < sizeZ; ++z){
                        var idx = z*sizeX*sizeY + y*sizeX + x;
                        volumeData[idx] = Math.min(Math.min((x/sizeX), (z/sizeZ)), (y/sizeY));
                    }
                }
            }
            return volumeData;
        }
    };
}
