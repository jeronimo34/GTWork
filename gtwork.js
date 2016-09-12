/////////////////////////////////////////////////////////////
//最初に実行される
////////////////////////////////////////////////////////////
if(!Detector.webgl) Detector.addGetWebGLMessage();


///////////////////////////////////////////////////////////
//ページがロードされた後に呼ばれる　すべてのリソースがロードされたとき
/////////////////////////////////////////////////////////////
function initThreeJs(images0, images1){
    
    //init three.js
    var MARGIN = 0;
    var SCREEN_WIDTH = window.innerWidth;
    var SCREEN_HEIGHT = window.innerHeight - 2 * MARGIN;
    
    var container, stats;
    
    var camera, scene, renderer, controls;
    var light, pointLight, ambientLight;
    var mesh, texture, geometry, materials, material, current_material;
    
    
    //MARCHING CUBES
    var resolution, numBlobs;
    var composer, effectFXAA, hblur, vblur;
    
    var volToGeometory;
    
    //export obj data
    var exportButton, floatingDiv;
    var resolution = 16;
    
    var time = 0;
    var clock = new THREE.Clock();
    var effectController;

    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');
    
    
    if ( ! canvas || ! canvas.getContext ) {
        throw new Error('canvas error');
    }
    
    var volumeData0 = createVolumeData(images0);
    var volumeData1 = createVolumeData(images1);
    var volumeData = new Float32Array(resolution * resolution * resolution);
    
    //initialize three.js
    init();
    
    //render scene
    animate();
    
    
    //////////////////////////////////////////////////////////////
    //６枚の画像からボリュームデータを生成
    //////////////////////////////////////////////////////////////
    function createVolumeData(images){
        var imageNum = images.length;
        
        var volDataX = resolution;
        var volDataY = volDataX;
        var volDataZ = volDataX;
        var rlvolData, fbvolData, tbvolData;
        
        var imagesData = [];
        //ロードした画像からimageDataの配列を作成
        for(var i = 0; i < imageNum; ++i){
            imageData = createImageData(images[i], resolution, resolution);
            imagesData[i] = imageData;
        }
        
        //volumeDataの作成
        fbvolData = createVolumeDataFrom2ImgData(imagesData[0], imagesData[1],0);//front, back
        rlvolData = createVolumeDataFrom2ImgData(imagesData[2], imagesData[3],1);//right, left
        tbvolData = createVolumeDataFrom2ImgData(imagesData[4], imagesData[5],2);//top bottom
        var volData = new Float32Array(resolution * resolution * resolution);
        
        //三つの密度データを合わせる
        for(var x = 0; x < volDataX; ++x){
            for(var y = 0; y <  volDataY; ++y){
                for(var z = 0; z < volDataZ; ++z){
                    var idx0 = x + y*volDataX + z*volDataX*volDataY;
                    volData[idx0] = Math.min(fbvolData[idx0], Math.min(rlvolData[idx0], tbvolData[idx0]));
                }
            }
        }
        //
        
        //色情報をもとに余計な部分を消す。
        removeCell(volData, imagesData);
        
        return volData;
        
    }
    
    //the voxel carving procedure
    //try to use the color information to remove inconsistent cells.
    function removeCell(volumeData, imagesData){
        
        var front = imagesData[0];
        var back = imagesData[1];
        var left = imagesData[2];
        var right = imagesData[3];
        var top = imagesData[4];
        var bottom = imagesData[5];
        
        var existsRemovableCell = true;
        var count = 0;
        
        while(existsRemovableCell){
            count++;    
            existsRemovableCell = false;
            
            for(var z = 0; z < resolution; ++z)
            {
                for(var y = 0; y < resolution; ++y)
                {
                    for(var x = 0; x < resolution; ++x)
                    {
                        
                        var volidx = z*resolution*resolution+y*resolution+x;
                        
                        //cell completely outside.
                        if(volumeData[volidx] < 0)continue;
                        
                        var canProjectDirection = [];
                        var adjacentNoOutsideCellsIdx = [];
                        
                        //front, back, top, bottom, left, right
                        var dir = [[0,0,1], [0,0,-1],[0,-1,0],
                                   [0,1,0],[-1,0,0],[1,0,0]];
                                   
                        //find the input images on which the cell can project.
                        //look at its 6 adjacent cells
                        for(var i = 0; i < 6; ++i){
                            //１方向にレイを飛ばし、レイがどのセルとも衝突しなければ、その方向から投影することができる
                            var ray = 1;
                            var canProjection = true;
                            while(true){
                                var nx = x + dir[i][0] * ray;
                                var ny = y + dir[i][1] * ray;
                                var nz = z + dir[i][2] * ray;
                                if(outOfRange(nx,0,resolution-1) || outOfRange(ny,0,resolution-1) || outOfRange(nz,0,resolution-1)){
                                    //どのセルとも衝突しなかった
                                    break;
                                }
                                var volidx2 = nz * resolution * resolution + ny * resolution + nx;
                                if(volumeData[volidx2] >= 0){
                                    //セルと衝突したので、この方向には投影できない
                                    canProjection = false;
                                    break;
                                }
                                ray++;
                            }
                            if(canProjection) canProjectDirection.push(i);
                        }
                        
                        
                        //completely inside or the cell projects only one image. keep cell
                        if(canProjectDirection.length <= 1){
                            continue;
                        }
                        
                        //If the cell projects on several images, look up the corresponding pixel color on each image. 
                        //If the pixel colors are similar, then we keep the cell
                        var idxFB = (y*resolution + x)*4;
                        var idxLR = ((resolution-1-z)*resolution + y)*4;
                        var idxTB = (x*resolution + resolution-1-z)*4;
                        
                        var colorFront = [front.data[idxFB], front.data[idxFB+1], front.data[idxFB+2]];
                        var colorBack = [back.data[idxFB], back.data[idxFB+1], back.data[idxFB+2]];
                        
                        var colorTop = [top.data[idxTB], top.data[idxTB+1], top.data[idxTB+2]];
                        var colorBottom = [bottom.data[idxTB], bottom.data[idxTB+1], bottom.data[idxTB+2]];
                        
                        var colorLeft = [left.data[idxLR], left.data[idxLR+1], left.data[idxLR+2]];
                        var colorRight = [right.data[idxLR], right.data[idxLR+1], right.data[idxLR+2]];
                        
                        var projectionColor = [colorFront, colorBack, colorTop, colorBottom, colorLeft, colorRight];
                        
                        var someColor =  true;
                        
                        //canProjectDirection.length >= 2
                        for(var i = 0; i < canProjectDirection.length-1; ++i){
                            var dir0 = canProjectDirection[i];
                            var dir1 = canProjectDirection[i+1];
                            
                            var color0 = projectionColor[dir0];
                            var color1 = projectionColor[dir1];
                            //console.log("dir0" + dir0 + " dir1" + dir1);
                            
                            if(!isSomeColor(color0, color1)){
                                //console.log(">>>color0 : " + color0 + "color1 : " + color1);
                                someColor = false;
                                break;
                            }
                        }
                        
                        //If the pixel colors are some ( or similar), then keep the cell.
                        //otherwase, discard it.
                        if(!someColor){
                            volumeData[volidx] = -1;//outside
                            existsRemovableCell = true;
                        }
                        
                    }
                }
            }
        }
        console.log("repeat num = " + count);
        
    }
    
    function outOfRange(val, mn, mx){
        return val < mn || mx < val;
    }
    
    function isSomeColor(color0, color1){
        return (color0[0] == color1[0]) && (color0[1] == color1[1]) && (color0[2] == color1[2]);
    }
    
    function isSimilarColor(color0, color1){
        var distance = Math.pow((color0[0]-color1[0]), 2) + Math.pow((color0[1]-color1[1]), 2) + Math.pow((color0[2]-color1[2]), 2);
        var similarValue = distance/(255*255*3);
        return similarValue < 0.1;//10%以内なら似てる
    }
    
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
		
		ambientLight = new THREE.AmbientLight( 0x0f0f0f );
		scene.add( ambientLight );
        
        //MATERIALS
        current_material = "colors";
        materials = generateMaterials();
        
        
        //volumeDataToGeometory
        //マーチングキューブといっていいのかわからない。たぶん違う。
        volToGeometory = new THREE.VolumeDataToGeometory(resolution, new THREE.MeshLambertMaterial({color: 0x0000aa}));//,side:THREE.DoubleSide
        volToGeometory.position.set(0,0,0);
        volToGeometory.scale.set(700, 700, 700);
        
        
        //MARCHING CUBES
        //空間の分割数、マテリアル、テクスチャ、カラー、CCW
        // effect = new THREE.MarchingCubes( resolution, materials[ current_material ].m, true, true , true);
        // effect.position.set(0,0,0);
        // effect.scale.set(700, 700, 700);
        
        // effect.enableUvs = true;
        // effect.enableColors = true;
        
        //  scene.add(effect);
        //  effect.init(resolution);
        //updateModel(effect);
        
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
		
		//モデルをシーンに追加
	    scene.add(volToGeometory);
        volToGeometory.init(resolution);
        updateModel(volToGeometory);
        
    }

    
    ///////////////////////////////////////////////////////////////
    //export current model data to obj file
    ////////////////////////////////////////////////////////////////
    function exportToObj() {
        console.log("export!");
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
        var geo = volToGeometory.generateGeometry();
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
        requestAnimationFrame(animate);
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
        var texture = new THREE.TextureLoader().load( "mario_image/front.png" );
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
			m: new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0x111111, shininess: 1, map: texture } ),//, 
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

    function lerp(a,b,t){
        return a * (1-t) + b * t;
    }
    ///////////////////////////////////////////////////////////////////////
    //this controls content of marching cubes voxel field
    ///////////////////////////////////////////////////////////////////////
    function updateModel(object)
    {
        object.reset();
    
        var morph = effectController.morph;
        var czy, cz, idx;
        //三つの密度データを合わせた密度データを生成する
        for(var z = 0; z < resolution; ++z){
            cz = z * resolution * resolution;
            for(var y = 0; y < resolution; ++y){
                czy = cz + y * resolution;
                for(var x = 0; x < resolution; ++x){
                    idx = czy + x;
                    volumeData[idx] = lerp(volumeData0[idx], volumeData1[idx], morph);
                }
            }
        }
        object.update(volumeData);
        //console.log("name" + object);
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
        
        
        var volumeData = new Float32Array(resolution*resolution*resolution);
        
        //signedDistArrayからボリュームデータを作成
        getVolumeDataFrom2Img(resolution, resolution, resolution, sArrays[0], sArrays[1], volumeData, rotateFlag);
        
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
				volToGeometory.material = mat.m;
				m_h.setValue( mat.h );
				m_s.setValue( mat.s );
				m_l.setValue( mat.l );
				// if ( current_material === "textured" ) {
				// 	effect.enableUvs = true;
				// } else {
				// 	effect.enableUvs = false;
				// }
				// if ( current_material === "colors" ) {
				// 	effect.enableColors = true;
				// } else {
				// 	effect.enableColors = false;
				// }
			};
		};
		
		effectController = {
		morph: 0.0,
		material: "shiny",
		speed: 1.0,
		numBlobs: 10,
		//resolution: 28,
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
		changemorph: false,
		dummy: function() {},
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
		
		// rendering
		h = gui.addFolder( "Rendering" );
		h.add( effectController, "postprocessing" );
		
		h = gui.addFolder( "Morphing" );
		
		effectController[ "changemorph" ] = function() {
		    updateModel(volToGeometory);
		};//handler
		
		h.add( effectController , "morph",0.0, 1.0, 0.0).name("morph");
		h.add( effectController , "changemorph").name("update morph");
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








