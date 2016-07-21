///////////////////////////////////////////////////////////
//Marching cubes algorithmで使う値を返す
//signedDist, zは0.0 ~ 1.0, zMaxは1
///////////////////////////////////////////////////////////
// getExtrusionFunction = function(signedDist,z,zMax){
//     return Math.min(Math.min(signedDist, z), zMax-z);
// }
getExtrusionFunction = function(sf, sb, z,zMax){
    var sd = (zMax - z) * sf + sb*z;
    return Math.min(zMax - z, Math.min(sd, z));
    
    //return Math.min(zMax - z, Math.min(sb + z, sf));
}

///////////////////////////////////////////////////////////
//対になった符号付距離画像の配列からボリュームデータを得る
///////////////////////////////////////////////////////////
getVolumeDataFrom2Img = function(zMax, height, width, array0, array1, volumeData)
{
     //volume data
     //array0とarray1は対になっている
     //前と後ろ、左右、上下
      var sfArray = array0;
      var sbArray = array1;
      
        for(var z = 0; z < zMax; ++z)
        {
            for(var y = 0; y < height; ++y)
            {
                for(var x = 0; x < width; ++x)
                {
                var idx = z * height * width + y * width + x;
                var idx2 = y * width + x;
                var zdiv = z/zMax;
                
                volumeData[idx] = getExtrusionFunction(sfArray[idx2], sbArray[idx2],  zdiv, 1.0);
                }
            }
        }
}

///////////////////////////////////////////////////////////
//符号付距離画像からボリュームデータを得る。
///////////////////////////////////////////////////////////
getVolumeData = function(zMax, height, width, sArrays, volumeData){
      //volume data
      var sfArray = sArrays[0];//front
      var sbArray = sArrays[1];//back
      
        for(var z = 0; z < zMax; ++z)
        {
            for(var y = 0; y < height; ++y)
            {
                for(var x = 0; x < width; ++x)
                {
                var idx = z * height * width + y * width + x;
                var idx2 = y * width + x;
                var zdiv = z/zMax;
                
                volumeData[idx] = getExtrusionFunction(sfArray[idx2], sbArray[idx2],  zdiv, 1.0);
                }
            }
        }
}



/////////////////////////////////////////////////////////////
//最初に実行される
////////////////////////////////////////////////////////////
//to do
var imageNum = 6;
var imagesSrc = [
                 './front.png',
                 './back.png',
                 './left.png',
                 './right.png',
                 './top.png',
                 './bottom.png'
                 ];

//画像のロード    
var images = [];
for(var i = 0; i < imageNum; ++i)
{
    var image = new Image();
    image.src = imagesSrc[i];
    images[i] = image;
}



///////////////////////////////////////////////////////////
//ページがロードされた後に呼ばれる　すべてのリソースがロードされたとき
/////////////////////////////////////////////////////////////
onload = function(){
    console.log("onload");
    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');
    
    if ( ! canvas || ! canvas.getContext ) {
    return false;
    }
    
    
    var mx = 0;
    
    for(var i = 0; i < images.length; ++i)
    {
        mx = Math.max(Math.max(images[i].width, images[i].height), mx);    
    }
    
    //密度データの横縦奥行きは一番目の画像（前からの画像に合わせる）
    var volDataX = mx;//Math.max(images[0].width, images[0].height);
    var volDataY = volDataX;
    var volDataZ = volDataX;
    var volumeData, rlvolData, fbvolData, tbvolData;
    
    var imagesData = [];
    //ロードした画像からimageDataの配列を作成
    for(var i = 0; i < imageNum; ++i){
        imageData = createImageData(images[i], volDataX, volDataY);
        imagesData[i] = imageData;
    }
    
    //volumeDataの作成
    //var volumeData = createVolumeDataFromImagesData(imagesData);
    fbvolData = createVolumeDataFrom2ImgData(imagesData[0], imagesData[1]);//front, back
    rlvolData = createVolumeDataFrom2ImgData(imagesData[2], imagesData[3]);//right, left
    tbvolData = createVolumeDataFrom2ImgData(imagesData[4], imagesData[5]);//top bottom
    volumeData = new Float32Array(volDataX * volDataY * volDataZ);
    
    //三つの密度データを合わせた密度データを生成する
    for(var x = 0; x < volDataX; ++x){
        for(var y = 0; y <  volDataY; ++y){
            for(var z = 0; z < volDataZ; ++z){
                var idx0 = x + y*volDataX + z*volDataX*volDataY;
                var idx1 = y + (volDataZ - z)*volDataX + x*volDataX*volDataY;
                var idx2 = volDataZ-z + x*volDataX + (volDataY-y)*volDataX*volDataY;
                //volumeData[idx0] = fbvolData[idx0];
                //volumeData[idx0] = Math.min(fbvolData[idx0], rlvolData[idx1]);
                volumeData[idx0] = Math.min(fbvolData[idx0], Math.min(rlvolData[idx1], tbvolData[idx2]));
            }
        }
    }
    
    
    //three.jsの初期化
    //init three.js
    var MARGIN = 0;
    var SCREEN_WIDTH = window.innerWidth;
    var SCREEN_HEIGHT = window.innerHeight - 2 * MARGIN;
    var camera, scene, renderer, controls;
    var light, pointLight, ambientLight;
    var mesh, texture, geometry, materials, material, current_material;
    var effect, resolution, numBlobs;
    
    //export obj data
    var exportButton, floatingDiv;
    
    var time = 0;
    var clock = new THREE.Clock();
    var effectController;
    
    //do function
    init();
    animate();
    
    /////////////////////////////////////////////////////////////
    //ロード済みの画像からimageDataを作成
    /////////////////////////////////////////////////////////////
    function createImageData(image, width, height){
        
        canvas.width = width;
        canvas.height = height;
        
        //黒で塗りつぶして
        //から画像を貼る
        context.fillStyle = "rgb(0,0,0)";
        context.fillRect(0,0,width,height);
        context.drawImage(image,0,0);
        var imageData = context.getImageData(0,0, width, height);
        
        context.clearRect(0,0,width,height);
        canvas.width  = 0;
        canvas.height = 0;
        
        return imageData;
    }
    
    ///////////////////////////////////////////////////////////////
    //export current model data to obj file
    ////////////////////////////////////////////////////////////////
    function exportToObj() {
    	var exporter = new THREE.OBJExporter();
    	var result = exporter.parse( scene );
    	floatingDiv.style.display = 'block';
    	floatingDiv.innerHTML = result.split( '\n' ).join ( '<br />' );
    }
    
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
        current_material = "colors";
        materials = generateMaterials();
        
        //MARCHING CUBES
        resolution = 28;//立方体の1辺の長さ
        //resolution *= 2;
         
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
		
		//ボリュームデータからマーチングキューブ法を用いてモデルを生成
		//シーンに追加
        effect.addExtrusionObject(
        volumeData,
        volDataX, 
        volDataY, 
        volDataZ);
        
        var geo = effect.generateGeometry();
        var mesh = new THREE.Mesh(geo, materials[current_material]);
        scene.add(mesh);
        
        //export obj data
        window.addEventListener('click', onWindowClick, false);
        window.addEventListener( 'resize', onWindowResize, false );
        
        exportButton = document.getElementById( 'export' );
		exportButton.addEventListener( 'click', function() { exportToObj(); });
    	floatingDiv = document.createElement( 'div' );
		floatingDiv.className = 'floating';
		document.body.appendChild( floatingDiv );


    }

    //////////////////////////////////////////////
    //ウィンドウをクリックしたときに呼ばれる
    //////////////////////////////////////////////
    function onWindowClick( event ) {

				var needToClose = true;
				var target = event.target;

				while( target !== null ) {

					if ( target === floatingDiv || target === exportButton ) {

						needToClose = false;
						break;

					}

					target = target.parentElement;

				}

				if ( needToClose ) {

					floatingDiv.style.display = 'none';

				}

	}
			
    //////////////////////////////////////////////////////////
    //ウィンドウのサイズが変わったときに呼ばれる
    //////////////////////////////////////////////////////////
	function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize( window.innerWidth, window.innerHeight );

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
        
    //   effect.reset();
    //     effect.addExtrusionObject(
    //     volumeData,
    //     volDataX, 
    //     volDataY, 
    //     volDataZ);
    //     deleteVolData();
    //    console.log(count);
        
        //marching cube
        //updateCubes(effect, time, 10, false, false, false);
        
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
        var texture = new THREE.TextureLoader().load( "./front.png" );
        //var texture = new THREE.TextureLoader().load( "textures/UV_Grid_Sm.jpg" );
		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		
		// environment map
		var path = "./";//"textures/cube/SwedishRoyalCastle/";
		var format = '.png';
// 		var urls = [
// 			path + 'px' + format, path + 'nx' + format,
// 			path + 'py' + format, path + 'ny' + format,
// 			path + 'pz' + format, path + 'nz' + format
// 		];
		var urls = [
		    path + 'left' + format,path + 'right' + format,
		    path + 'top' + format,path + 'bottom' + format,
		    path + 'front' + format,path + 'back' + format
		    ];
		var cubeTextureLoader = new THREE.CubeTextureLoader();
		
		var reflectionCube = cubeTextureLoader.load( urls );
		reflectionCube.format = THREE.RGBFormat;
		reflectionCube.mapping = THREE.CubeRefractionMapping;
		
        var materials = {
            "textured" :
		    {
			m: new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0x111111, shininess: 1, map: texture} ),//, side:THREE.DoubleSide
			h: 0, s: 0, l: 1
		    },
            "shiny"  :
		    {
			m: new THREE.MeshStandardMaterial( { color: 0x550000, envMap: reflectionCube, roughness: 0.0, metalness: 0.0 } ),
			h: 0, s: 0.8, l: 0.2
		    },
			"colors" :
		    {
			m: new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0xffffff, shininess: 2, vertexColors: THREE.VertexColors} ),
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
        
        if( floor ) object.addPlaneY(2, 12);
        if( wallz ) object.addPlaneZ(2, 12);
        if( wallx ) object.addPlaneX(2, 12);
    }
    
    ///////////////////////////////////////////////////////////////////////
    // 画像から密度データを生成する
    // 引数 ロード後の画像データ
    // imagesData サイズ６のImageData型の配列
    //            0 front, 1 back, 2 left, 3 right, 4 top, 5 bottom
    ///////////////////////////////////////////////////////////////////////
    function createVolumeDataFromImagesData(imagesData){
        
        var width = imagesData[0].width;
        var height = imagesData[0].height;//image height
        var zMax = width;
        var sArrays = [];//signed distance Arrayの配列
        
        for(var i = 0; i < imageNum; ++i)
        {
            sArrays[i] = new Float32Array(width * height);
        }
        
        for(var i = 0; i < imageNum; ++i){
            var srcImageData = imagesData[i];
            sArrays[i] = createSignedDistArrayFromImageData(srcImageData);
        }
        
        var volumeData = new Float32Array(width * height * zMax);
        //signedDistArrayからボリュームデータを作成
        getVolumeData(zMax, height, width, sArrays, volumeData);
        
        return volumeData;
    }
    
    ///////////////////////////////////////////////////////////////////////
    //2枚の画像データから密度データを生成する
    ///////////////////////////////////////////////////////////////////////
    function createVolumeDataFrom2ImgData(imgData0, imgData1){
        
        var width = imgData0.width;
        var height = imgData0.height;//image height
        var zMax = width;
        var sArrays = [];//signed distance Arrayの配列
        
        sArrays[0] = createSignedDistArrayFromImageData(imgData0);
        sArrays[1] = createSignedDistArrayFromImageData(imgData1);
        
        
        var volumeData = new Float32Array(width * height * zMax);
        
        //signedDistArrayからボリュームデータを作成
        getVolumeDataFrom2Img(zMax, height, width, sArrays[0], sArrays[1], volumeData);
        
        return volumeData;
    }
    
    function createSignedDistArrayFromImageData(srcImgData){
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
        
        //TO DO
        getSignedDistImage(coutourPosArray, binArray, dstImage, signedDistArray); 
        
        return signedDistArray;
    }
    
    ///////////////////////////////////////////////////////////
    //guiの初期化
    ///////////////////////////////////////////////////////////
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
}





