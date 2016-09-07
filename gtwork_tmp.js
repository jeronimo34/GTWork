/////////////////////////////////////////////////////////////
//最初に実行される
////////////////////////////////////////////////////////////
if(!Detector.webgl) Detector.addGetWebGLMessage();

// var imageNum = 6;
// var imagesSrc = [
//                  './front.png',
//                  './back.png',
//                  './left.png',
//                  './right.png',
//                  './top.png',
//                  './bottom.png'
//                  ];

// //画像のロード    
// var images = [];
// for(var i = 0; i < imageNum; ++i)
// {
//     var image = new Image();
//     image.src = imagesSrc[i];
//     images[i] = image;
// }



///////////////////////////////////////////////////////////
//ページがロードされた後に呼ばれる　すべてのリソースがロードされたとき
/////////////////////////////////////////////////////////////
function initThreeJs(images1, images2){
    
    //init three.js
    var MARGIN = 0;
    var SCREEN_WIDTH = window.innerWidth;
    var SCREEN_HEIGHT = window.innerHeight - 2 * MARGIN;
    
    var container, stats;
    
    var camera, scene, renderer, controls;
    var light, pointLight, ambientLight;
    var mesh, texture, geometry, materials, material, current_material;
    
    
    //MARCHING CUBES
    var effect, resolution, numBlobs;
    var composer, effectFXAA, hblur, vblur;
    
    //export obj data
    var exportButton, floatingDiv;
    var max_resolution = 256;
    
    var time = 0;
    var clock = new THREE.Clock();
    var effectController;

    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');
    
    
    if ( ! canvas || ! canvas.getContext ) {
        throw new Error('canvas error');
    }
    
    var volumeData1 = createVolumeData(images1);
    var volumeData2 = createVolumeData(images2);
    var volumeData = new Float32Array(max_resolution * max_resolution * max_resolution);
        
    //initialize three.js
    init();
    
    //render scene
    animate();
    
    
    //////////////////////////////////////////////////////////////
    //６枚の画像からボリュームデータを生成
    //////////////////////////////////////////////////////////////
    function createVolumeData(images){
        var imageNum = images.length;
        
        //画像が正方形になるようリサイズする
        var mx = 0;
        for(var i = 0; i < images.length; ++i)
        {
            mx = Math.max(Math.max(images[i].width, images[i].height), mx);    
        }
        
        var volDataX = max_resolution;
        var volDataY = volDataX;
        var volDataZ = volDataX;
        var rlvolData, fbvolData, tbvolData;
        
        var imagesData = [];
        //ロードした画像からimageDataの配列を作成
        for(var i = 0; i < imageNum; ++i){
            var imageData = createImageData(images[i], mx, mx);
            imagesData[i] = imageData;
        }
        
        //volumeDataの作成
        fbvolData = createVolumeDataFrom2ImgData(imagesData[0], imagesData[1],0);//front, back
        rlvolData = createVolumeDataFrom2ImgData(imagesData[2], imagesData[3],1);//right, left
        tbvolData = createVolumeDataFrom2ImgData(imagesData[4], imagesData[5],2);//top bottom
        var volData = new Float32Array(max_resolution * max_resolution * max_resolution);
        
        //三つの密度データを合わせた密度データを生成する
        for(var x = 0; x < volDataX; ++x){
            for(var y = 0; y <  volDataY; ++y){
                for(var z = 0; z < volDataZ; ++z){
                    var idx0 = x + y*volDataX + z*volDataX*volDataY;
                    volData[idx0] = Math.min(fbvolData[idx0], Math.min(rlvolData[idx0], tbvolData[idx0]));
                }
            }
        }
        //
        
        return volData;
        
    }

    /////////////////////////////////////////////////////////////
    //ロード済みの画像からimageDataを作成
    //画像はwidth X heightにリサイズされる
    /////////////////////////////////////////////////////////////
    function createImageData(image, width, height){
        
        canvas.width = width;
        canvas.height = height;
        
        //黒で塗りつぶして
        //から画像を貼る
        context.fillStyle = "rgb(0,0,0)";
        context.fillRect(0,0,width,height);
        context.drawImage(image,0,0,width,height);
        var imageData = context.getImageData(0,0, width, height);
        
        context.clearRect(0,0,width,height);
        canvas.width  = 0;
        canvas.height = 0;
        
        return imageData;
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
        
        pointLight = new THREE.PointLight( 0xff3300 );
		pointLight.position.set( 0, 0, 100 );
		scene.add( pointLight );
		
		ambientLight = new THREE.AmbientLight( 0x080808 );
		scene.add( ambientLight );
        
        //MATERIALS
        current_material = "colors";
        materials = generateMaterials();
        
        //MARCHING CUBES
        resolution = 28;//立方体の1辺の長さ
        //numBlobs = 10;//metabolls num
        
        //空間の分割数、マテリアル、テクスチャ、カラー、CCW
        effect = new THREE.MarchingCubes( resolution, materials[ current_material ].m, true, true , true);
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
    	//document.body.appendChild( renderer.domElement );
        
        renderer.domElement.style.position = "absolute";
        renderer.domElement.style.top = MARGIN + "px";
        renderer.domElement.style.left = "0px";
        
        container = document.getElementById( 'container' );
        container.appendChild( renderer.domElement );

        //CONTROLS
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        
        //STATS
        stats = new Stats();
        //document.appendChild(stats.dom);
        
        // COMPOSER
        renderer.autoClear = false;
        
        var renderTargetParameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, stencilBuffer: false };
		var renderTarget = new THREE.WebGLRenderTarget( SCREEN_WIDTH, SCREEN_HEIGHT, renderTargetParameters );

		effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );

		hblur = new THREE.ShaderPass( THREE.HorizontalTiltShiftShader );
		vblur = new THREE.ShaderPass( THREE.VerticalTiltShiftShader );

		var bluriness = 8;

		hblur.uniforms[ 'h' ].value = bluriness / SCREEN_WIDTH;
		vblur.uniforms[ 'v' ].value = bluriness / SCREEN_HEIGHT;

		hblur.uniforms[ 'r' ].value = vblur.uniforms[ 'r' ].value = 0.5;

		effectFXAA.uniforms[ 'resolution' ].value.set( 1 / SCREEN_WIDTH, 1 / SCREEN_HEIGHT );

		composer = new THREE.EffectComposer( renderer, renderTarget );

		var renderModel = new THREE.RenderPass( scene, camera );

		vblur.renderToScreen = true;
		//effectFXAA.renderToScreen = true;

		composer = new THREE.EffectComposer( renderer, renderTarget );

		composer.addPass( renderModel );

		composer.addPass( effectFXAA );

		composer.addPass( hblur );
		composer.addPass( vblur );
        
        
        // GUI
		setupGui();
        
        
        //EVENT
        window.addEventListener('click', onWindowClick, false);
        window.addEventListener( 'resize', onWindowResize, false );
        
        //export obj data
        exportButton = document.getElementById( 'export' );
		exportButton.addEventListener( 'click', function() { exportToObj(); });
    	floatingDiv = document.createElement( 'div' );
		floatingDiv.className = 'floating';
		document.body.appendChild( floatingDiv );

        effect.init(max_resolution);
        updateModel(effect);
    }

    
    ///////////////////////////////////////////////////////////////
    //export current model data to obj file
    ////////////////////////////////////////////////////////////////
    function exportToObj() {
        //clear scene
        for( var i = 0; i < scene.children.length; i++ ) {
			var current = scene.children[ i ];
			if( current instanceof THREE.Mesh ) {
				current.geometry.dispose();
				scene.remove( current );
				i--;
			}
		}
		//add mesh
        var geo = effect.generateGeometry();
        var mesh = new THREE.Mesh(geo, materials[current_material]);
        scene.add(mesh);
        //export obj file
    	var exporter = new THREE.OBJExporter();
    	var result = exporter.parse( scene );
    	floatingDiv.style.display = 'block';
    	floatingDiv.innerHTML = result.split( '\n' ).join ( '<br />' );
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
        SCREEN_WIDTH = window.innerWidth;
		SCREEN_HEIGHT = window.innerHeight - 2 * MARGIN;
		
		camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
		camera.updateProjectionMatrix();
		
		renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
		composer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );

		hblur.uniforms[ 'h' ].value = 4 / SCREEN_WIDTH;
		vblur.uniforms[ 'v' ].value = 4 / SCREEN_HEIGHT;

		effectFXAA.uniforms[ 'resolution' ].value.set( 1 / SCREEN_WIDTH, 1 / SCREEN_HEIGHT );
	}
	
    ////////////////////////////////////////////////////////////////////////
    //アニメーション　コールバックされる。
    /////////////////////////////////////////////////////////////////////////
    function animate(){
        //requestAnimationFrame(animate);
        render();
        stats.update()
    }
    
    /////////////////////////////////////////////////////////////////////////
    //描画処理
    /////////////////////////////////////////////////////////////////////////
    function render(){
        var delta = clock.getDelta();
        time += delta * effectController.speed * 0.5;
        controls.update(delta);
        
        //lights
        light.position.set( effectController.lx, effectController.ly, effectController.lz );
		light.position.normalize();
		pointLight.color.setHSL( effectController.lhue, effectController.lsaturation, effectController.llightness );
		
        // render
        if ( effectController.postprocessing ){
            composer.render(delta);
        } else {
            renderer.clear();
            renderer.render(scene, camera);
        }
    }
    
    ///////////////////////////////////////////////////////////////////////
    //マテリアルの生成
    ///////////////////////////////////////////////////////////////////////////
    function generateMaterials(){
        var texture = new THREE.TextureLoader().load( "./cube.png" );
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
// 		var urls = [
// 		    path + 'left' + format,path + 'right' + format,
// 		    path + 'top' + format,path + 'bottom' + format,
// 		    path + 'front' + format,path + 'back' + format
// 		    ];
		var cubeTextureLoader = new THREE.CubeTextureLoader();
		
		var reflectionCube = cubeTextureLoader.load( urls );
		reflectionCube.format = THREE.RGBFormat;
		reflectionCube.mapping = THREE.CubeRefractionMapping;
		
        var materials = {
            "textured" :
		    {
			m: new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0x111111, shininess: 1, map: texture} ),//, ,side:THREE.DoubleSide
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
    function updateModel(object)
    {
        object.reset();
    
        var morph = effectController.morph;
        
        //三つの密度データを合わせた密度データを生成する
        for(var x = 0; x < max_resolution; ++x){
            for(var y = 0; y <  max_resolution; ++y){
                for(var z = 0; z < max_resolution; ++z){
                    var idx0 = x + y*max_resolution + z*max_resolution*max_resolution;
                    volumeData[idx0] = volumeData1[idx0] * (1.0-morph) + volumeData2[idx0]*morph;
                }
            }
        }
        //
        
        object.addExtrusionObject(
        volumeData,
        max_resolution, 
        max_resolution, 
        max_resolution);
    }
    
    ///////////////////////////////////////////////////////////////////////
    //2枚の画像データから密度データを生成する
    ///////////////////////////////////////////////////////////////////////
    function createVolumeDataFrom2ImgData(imgData0, imgData1, rotateFlag){
        
        var width = imgData0.width;
        var height = imgData0.height;//image height
        var zMax = width;
        var sArrays = [];//signed distance Arrayの配列
        
        sArrays[0] = createSignedDistArrayFromImageData(imgData0);
        sArrays[1] = createSignedDistArrayFromImageData(imgData1);
        
        
        var volumeData = new Float32Array(width * height * zMax);
        
        //signedDistArrayからボリュームデータを作成
        getVolumeDataFrom2Img(zMax, height, width, sArrays[0], sArrays[1], volumeData, rotateFlag);
        
        return volumeData;
    }
    
    function createSignedDistArrayFromImageData(srcImgData){
        var width = srcImgData.width;//image width
        var height = srcImgData.height;//image height
        var zMax = width;
        
        var srcImage = srcImgData;
        var dstImage = context.createImageData(width, height);
        
        var binArray = [];
        var negativeArray = [];
        var laplacianArray = [];
        var coutourPosArray = [];
        var signedDistArray = new Float32Array(width * height);//float32 array
        
        //image process
        binarizationFilter(srcImage, binArray, 1);
        negativeFilter(binArray, negativeArray, width, height);
        Laplacian(negativeArray, laplacianArray);
        
        //resize laplacianArray
        //１辺がresolutionになるようにリサイズする。
        //distArrayのサイズはresolution X resolution
        //laplacianArray = resizeLaplacianArray(laplacianArray, width, height, max_resolution);
        
        getContourPosArray(laplacianArray, coutourPosArray);
        getSignedDistImage(coutourPosArray, binArray, dstImage, signedDistArray); 
        
        return signedDistArray;
    }

    //    
    function resizeLaplacianArray(srcArray, width, height, resolution)
    {
        var distArray = new Float32Array(resolution * resolution);
        for(var i = 0; i < resolution; ++i)
        {
            for(var j = 0; j < resolution; ++j)
            {
                var isCoutour = checkCoutour(srcArray, width, height, resolution, j, i);
                if( isCoutour )
                {
                    distArray[i*resolution + j] = 1;
                }
                else distArray[i*resolution + j] = 0;
            }
        }
        return distArray;
    }
    
    function checkCoutour(srcArray, width, height, resolution, x, y)
    {
        var left = Math.floor(width/resolution) * x;
        var top = Math.floor(height/resolution) * y;
        var right = Math.min(left + resolution, width);
        var bottom = Math.min(top + resolution, height);
        
        var isCoutour = false;
        for(var i = top; i < bottom; ++i)
        {
            for(var j = left; j < right; ++j)
            {
                if(srcArray[i*width + j] == 1){
                    isCoutour = true;
                    break;
                }
            }
        }
        return isCoutour;
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
		lz: -1.0,
		postprocessing: false,
		dummy: function() {},
		morph: 0.0
		};
		
		var h, m_h, m_s, m_l;
		
		var gui = new dat.GUI();
		gui.addFolder("dummy");
		
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
		//h = gui.addFolder( "Simulation" );
		//h.add( effectController, "resolution", 14, max_resolution, 1 );
		
		//h.add( effectController, "isolation", 10, 300, 1 );
		//h.add( effectController, "floor" );
		//h.add( effectController, "wallx" );
		//h.add( effectController, "wallz" );
		// rendering
		h = gui.addFolder( "Rendering" );
		h.add( effectController, "postprocessing" );
		
		//h = gui.addFolder( "Morphing" );
		//h.add( effectController , "morph",0.0, 1.0, 0.0).name("morph");
	}
	

}

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
}

///////////////////////////////////////////////////////////
//対になった符号付距離画像の配列からボリュームデータを得る
///////////////////////////////////////////////////////////
getVolumeDataFrom2Img = function(zMax, height, width, array0, array1, volumeData, rotateFlag)
{
     //volume data
     //array0とarray1は対になっている
     //前と後ろ、左右、上下
      var sfArray = array0;
      var sbArray = array1;
      
        var side = width;
        for(var x = 0; x < side; ++x){
            var div = x/side;
            for(var y = 0; y < side; ++y){
                for(var z = 0; z < side; ++z){
                var idx = x + y * side + z * side * side;
                
                var idx2Array = [y * width + x, (side-1-z) * side + y, x * side + side-1-z];
                
                var idx2 = idx2Array[rotateFlag];
                volumeData[idx] = getExtrusionFunction(sfArray[idx2], sbArray[idx2], div, 1.0);
                    
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
            var zdiv = z/zMax;
            for(var y = 0; y < height; ++y)
            {
                for(var x = 0; x < width; ++x)
                {
                var idx = z * height * width + y * width + x;
                var idx2 = y * width + x;
                
                volumeData[idx] = getExtrusionFunction(sfArray[idx2], sbArray[idx2],  zdiv, 1.0);
                }
            }
        }
}








