
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
    var effectController;
    
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
        zMax = image.width;
        
        //canvasと画像のサイズを同じにする     
        canvas.width = 3*image.width;
        canvas.height = image.height;
        
        context.drawImage(image,0,0);
        
        var srcImage = context.getImageData(0,0,width,height);
        
        //画像からfrontdataを得る
        volumeData  = createVolumeDataFromImageData(srcImage);
        
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
            camera.position.set(1000, 1000, 3000);
            
            //SCENE
            scene = new THREE.Scene();
            
            //LIGHT
            light = new THREE.DirectionalLight(0xffffff);
            light.position.set(0.5, 0.5, -1);
            scene.add(light);
            
            pointLight = new THREE.PointLight( 0x111111 );
    		pointLight.position.set( 0, 0, -1 );
    		scene.add( pointLight );
    		ambientLight = new THREE.AmbientLight( 0x484848 );
    		scene.add( ambientLight );
            
            //MATERIALS
            current_material = "textured";
            materials = generateMaterials();
            
            
			
            //MARCHING CUBES
            resolution = 28;//立方体の1辺の長さ
            resolution *= 2;
             
            numBlobs = 10;//metabolls num
            
            //空間の分割数、マテリアル、テクスチャ、カラー、CCW
            effect = new THREE.MarchingCubes( resolution, materials[ current_material ].m, true, true ,true);
            effect.position.set(0,0,0);
            effect.scale.set(700, 700, 700);
            
            effect.enableUvs = true;
            effect.enableColors = true;
            
            scene.add(effect);
            
            //RENDERER
            
            renderer = new THREE.WebGLRenderer();
        	renderer.setClearColor(0x4f8080);
        	renderer.setPixelRatio(window.devicePixelRatio);
        	renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
        	document.body.appendChild( renderer.domElement );
        
            //CONTROLS
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            
            // GUI
			setupGui();
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
            var texture = new THREE.TextureLoader().load( "./frontResizedPadded.png" );
            //var texture = new THREE.TextureLoader().load( "textures/UV_Grid_Sm.jpg" );
			texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
			
			// environment map
			var path = "textures/cube/SwedishRoyalCastle/";
			var format = '.jpg';
			var urls = [
				path + 'px' + format, path + 'nx' + format,
				path + 'py' + format, path + 'ny' + format,
				path + 'pz' + format, path + 'nz' + format
			];
			var cubeTextureLoader = new THREE.CubeTextureLoader();
			var reflectionCube = cubeTextureLoader.load( urls );
			reflectionCube.format = THREE.RGBFormat;
			var refractionCube = cubeTextureLoader.load( urls );
			reflectionCube.format = THREE.RGBFormat;
			refractionCube.mapping = THREE.CubeRefractionMapping;
			
            var materials = {
                "textured" :
			    {
				m: new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0x111111, shininess: 1, map: texture} ),//side:THREE.DoubleSide
				h: 0, s: 0, l: 1
			    },
                "shiny"  :
			    {
				m: new THREE.MeshStandardMaterial( { color: 0x550000, envMap: reflectionCube, roughness: 0.1, metalness: 1.0 , side:THREE.DoubleSide} ),
				h: 0, s: 0.8, l: 0.2
			    },
    			"colors" :
			    {
				m: new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0xffffff, shininess: 2, vertexColors: THREE.VertexColors, side:THREE.DoubleSide} ),
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
            effect.addExtrusionObject(
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
        
        ///////////////////////////////////////////////////////////////////////
        //画像から密度データを生成する
        //引数 ロード後の画像データ
        ///////////////////////////////////////////////////////////////////////
        function createVolumeDataFromImageData(srcImgData){
            
            var width = srcImgData.width;//image width
            var height = srcImgData.height;//image height
            var zMax = width;
            
            var srcImage = srcImgData;
            var dstImage = context.createImageData(width, height);
            
            var laplacianImage = context.createImageData(width, height);
            
            var binArray = [];
            var negativeArray = [];
            var coutourPosArray = [];
            var signedDistArray = new Float32Array(width * height);//float32 array
            var volumeData = new Float32Array(width * height * zMax);
            
            //image process
            binarizationFilter(srcImage, binArray, 1);
            negativeFilter(binArray, negativeArray, width, height);
            Laplacian(negativeArray, laplacianImage);
            getContourPosArray(laplacianImage, coutourPosArray);
            getSignedDistImage(coutourPosArray, binArray, dstImage, signedDistArray); 
            
            //signedDistArrayからボリュームデータを作成
            getVolumeData(zMax, height, width, signedDistArray, volumeData);
            
            return volumeData;
        }
        
        function setupGui() {
			var createHandler = function( id ) {
				return function() {
					var mat_old = materials[ current_material ];
					mat_old.h = m_h.getValue();
					mat_old.s = m_s.getValue();
					mat_old.l = m_l.getValue();
					current_material = id;
					var mat = materials[ id ];
					effect.material = mat.m;
					m_h.setValue( mat.h );
					m_s.setValue( mat.s );
					m_l.setValue( mat.l );
					if ( current_material === "textured" ) {
						effect.enableUvs = true;
					} else {
						effect.enableUvs = false;
					}
					if ( current_material === "colors" ) {
						effect.enableColors = true;
					} else {
						effect.enableColors = false;
					}
				};
			};
			
			effectController = {
			material: "shiny",
			speed: 1.0,
			numBlobs: 10,
			resolution: 28,
			isolation: 80,
			floor: true,
			wallx: false,
			wallz: false,
			hue: 0.0,
			saturation: 0.8,
			lightness: 0.1,
			lhue: 0.04,
			lsaturation: 1.0,
			llightness: 0.5,
			lx: 0.5,
			ly: 0.5,
			lz: 1.0,
			postprocessing: false,
			dummy: function() {
			}
			};
			var h, m_h, m_s, m_l;
			
			var gui = new dat.GUI();
			
			// material (type)
			h = gui.addFolder( "Materials" );
			for ( var m in materials ) {
				effectController[ m ] = createHandler( m );
				h.add( effectController, m ).name( m );
			}
			// material (color)
			h = gui.addFolder( "Material color" );
			m_h = h.add( effectController, "hue", 0.0, 1.0, 0.025 );
			m_s = h.add( effectController, "saturation", 0.0, 1.0, 0.025 );
			m_l = h.add( effectController, "lightness", 0.0, 1.0, 0.025 );
			// light (point)
			h = gui.addFolder( "Point light color" );
			h.add( effectController, "lhue", 0.0, 1.0, 0.025 ).name("hue");
			h.add( effectController, "lsaturation", 0.0, 1.0, 0.025 ).name("saturation");
			h.add( effectController, "llightness", 0.0, 1.0, 0.025 ).name("lightness");
			// light (directional)
			h = gui.addFolder( "Directional light orientation" );
			h.add( effectController, "lx", -1.0, 1.0, 0.025 ).name("x");
			h.add( effectController, "ly", -1.0, 1.0, 0.025 ).name("y");
			h.add( effectController, "lz", -1.0, 1.0, 0.025 ).name("z");
			// simulation
			h = gui.addFolder( "Simulation" );
			h.add( effectController, "speed", 0.1, 8.0, 0.05 );
			h.add( effectController, "numBlobs", 1, 50, 1 );
			h.add( effectController, "resolution", 14, 100, 1 );
			h.add( effectController, "isolation", 10, 300, 1 );
			h.add( effectController, "floor" );
			h.add( effectController, "wallx" );
			h.add( effectController, "wallz" );
			// rendering
			h = gui.addFolder( "Rendering" );
			h.add( effectController, "postprocessing" );
		}

    };
}
