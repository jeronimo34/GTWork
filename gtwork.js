/////////////////////////////////////////////////////////////
//最初に実行される
////////////////////////////////////////////////////////////
if(!Detector.webgl) Detector.addGetWebGLMessage();

var MARGIN = 0;
var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight - 2 * MARGIN;
var EPS = 1e-9;

var container, stats;

var camera, scene, renderer, controls;
var light, light2, pointLight, ambientLight;
var mesh, texture, geometry, materials, material, current_material;

var cube_material;
var shader_uniforms;

//MARCHING CUBES
var numBlobs;
var composer, effectFXAA, hblur, vblur;
var effect;
var volToGeometory;
var resolution = 72;//default value
var max_resolution = 48;//default value
var min_resolution = 16;

//export obj data
var exportButton, floatingDiv;

var time = 0;
var clock = new THREE.Clock();
var effectController;
var morphController;
var morphState = {
    isplaying:false,
};

var canvas, context;

var colorData0,colorData1,colorData;
var volumeData0,volumeData1,volumeData;
var fbvolData0, fbvolData1, rlvolData0, rlvolData1, tbvolData0, tbvolData1;
var volDataNotRmCell0, volDataNotRmCell1;

var cubeTex;


///////////////////////////////////////////////////////////
//ページがロードされた後に呼ばれる　すべてのリソースがロードされたとき
//imageはすべて同じサイズ同じサイズかつ、正方形である必要がある
/////////////////////////////////////////////////////////////
function init2DSpriteToVoxel(images0, images1){
    
    //init three.js
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    
    
    if ( ! canvas || ! canvas.getContext ) {
        throw new Error('canvas error');
    }
    
    //resolution = image_size * 3
    max_resolution = images0[0].naturalWidth * 3;
    min_resolution = images0[0].naturalWidth;
    resolution = max_resolution;
    console.log("resolution : " + resolution);

    //create volumedata0, colordata0
    colorData0 = new Float32Array( resolution * resolution * resolution);
    volDataNotRmCell0 = new Float32Array( resolution * resolution * resolution);
    fbvolData0 = new Float32Array( resolution * resolution * resolution);
    rlvolData0 = new Float32Array( resolution * resolution * resolution);
    tbvolData0 = new Float32Array( resolution * resolution * resolution);
    volumeData0 = createVolumeData(images0,colorData0, fbvolData0, rlvolData0, tbvolData0, volDataNotRmCell0);
    
    //create volumedata1, colordata1
    colorData1 = new Float32Array( resolution * resolution * resolution);
    volDataNotRmCell1 = new Float32Array( resolution * resolution * resolution);
    fbvolData1 = new Float32Array( resolution * resolution * resolution);
    rlvolData1 = new Float32Array( resolution * resolution * resolution);
    tbvolData1 = new Float32Array( resolution * resolution * resolution);
    volumeData1 = createVolumeData(images1,colorData1, fbvolData1, rlvolData1, tbvolData1, volDataNotRmCell1);
    
    colorData  = new Float32Array( resolution * resolution * resolution);
    volumeData = new Float32Array( resolution * resolution * resolution);
    
    //initialize three.js
    init(images0, images1);
    
    //render scene
    animate();
}


////////////////////////////////////////////////////////////
//initialize three.js
/////////////////////////////////////////////////////////
function init(images0, images1){
    
    //CAMERA
    camera = new THREE.PerspectiveCamera(45, SCREEN_WIDTH/SCREEN_HEIGHT, 1, 10000);
    camera.position.set(1000, 1000, 3000);
    
    //SCENE
    scene = new THREE.Scene();
    
    //LIGHT
    light = new THREE.DirectionalLight(0x888888);
    light.position.set(0.5, 0.5, -1);
    scene.add(light);
    
    light2 = new THREE.DirectionalLight(0x888888);
    light2.position.set(0.5, -0.5, -1);
    scene.add(light2);
    
    pointLight = new THREE.PointLight( 0x333333 );
	pointLight.position.set( 0, 700, 700 );
	scene.add( pointLight );
	
	ambientLight = new THREE.AmbientLight( 0x4f4f4f );
	scene.add( ambientLight );
    
    //MATERIALS
    current_material = "colors";
    materials = generateMaterials();
    
    
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
    container.appendChild(stats.domElement);
    
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
	exportButton.addEventListener( 'click', exportToObj);
	floatingDiv = document.createElement( 'div' );
	floatingDiv.className = 'floating';
	container.appendChild( floatingDiv );
	
	//volumeDataToGeometory
    //volumeDataからvoxelModelを生成する
    volToGeometory = new THREE.VolumeDataToGeometory(min_resolution, materials[ current_material ].m, true);//,side:THREE.DoubleSide
    volToGeometory.position.set(0,0,0);
    volToGeometory.scale.set(700, 700, 700);
    
    //MARCHING CUBES
    //空間の分割数、マテリアル、テクスチャ、カラー、CCW
    effect = new THREE.MarchingCubes( resolution, materials[ current_material ].m, true, true , true);
    effect.position.set(0,0,0);
    effect.scale.set(700, 700, 700);
    effect.enableUvs = true;
    effect.enableColors = true;
    effect.visible = false;//最初は非表示
    
	//モデルをシーンに追加
    scene.add(volToGeometory);
    //volToGeometory.init(min_resolution);
    updateModel(volToGeometory);
    volToGeometory.visible = false;
    
    scene.add(effect);
    effect.init(resolution);
    updateModel(effect);
    effect.visible = true;
    
    // environment map
    var cubeTextureLoader = new THREE.CubeTextureLoader();
    var cubeTex0 = cubeTextureLoader.load([rotateImage(images0[3],90,true),rotateImage(images0[2],90),
                                                                rotateImage(images0[4],-90),rotateImage(images0[5],-90),
                                                                rotateImage(images0[0],0),rotateImage(images0[1],0)]);
    cubeTex0.generateMipmaps = true;
    cubeTex0.magFilter = THREE.NearestFilter;
    cubeTex0.minFilter = THREE.NearestFilter;
    
    var cubeTex1 = cubeTextureLoader.load([rotateImage(images1[3],90,true),rotateImage(images1[2],90),
                                                                rotateImage(images1[4],-90),rotateImage(images1[5],-90),
                                                                rotateImage(images1[0],0),rotateImage(images1[1],0)] );
    cubeTex1.generateMipmaps = true;
    cubeTex1.magFilter = THREE.NearestFilter;
    cubeTex1.minFilter = THREE.NearestFilter;
    
    shader_uniforms = {
        "uTexCube" : { type: "t", value: cubeTex0 },
        "uTexCube2" : { type: "t", value: cubeTex1 },
        "uColor" : { type: "c", value: new THREE.Color(0xffffff) },                                                        
        "morph" : { type: "f", value:0.0},
        "imageScale" : {type:"f", value:0.0},
        "uCubeScale" : {type:"v2", value:new THREE.Vector2( 0, 0 )},
    };
    
    //cube material 
    //generatematerial()の中で生成したらうまく動かなかったのでここでしている
    cube_material = new THREE.ShaderMaterial({ 
    uniforms : shader_uniforms,
    vertexShader: document.getElementById("vshader").textContent, fragmentShader: document.getElementById("fshader").textContent});
    materials['cubeMap'].m = cube_material;
}

function rotateImage(image, degree, flipY){
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    
    var halfW = canvas.width * 0.5;
    var halfH = canvas.height * 0.5;
    var originx = canvas.top;
    var originy = canvas.left;
    
    //一旦キャンバスをクリア
    context.clearRect(0, 0, canvas.width, canvas.height);
    //canvasの状態を一旦保存
    context.save();
    
    //画像の縦横半分の位置へtranslate
    context.translate(halfW, halfH);
    //変形マトリックスに回転を適用
    context.rotate(degree * Math.PI / 180);
    if(flipY === true) context.scale(1,-1);
    
    //translateした分戻して原点を0，0に
    context.translate( -halfW, -halfH );
    
    //読み込んだimgをcanvas(c1)に貼付け
    context.drawImage(image, 0, 0);
    
    //canvasの状態を元に戻す
    context.restore();
    
    return canvas.toDataURL();
}

//////////////////////////////////////////////////////////////
//６枚の画像からボリュームデータを生成
//////////////////////////////////////////////////////////////
function createVolumeData(images, colorData, fbvolData, rlvolData, tbvolData, volDataNotRmCell){
    var imageNum = images.length;
    
    var volDataX = resolution;
    var volDataY = volDataX;
    var volDataZ = volDataX;

    var imagesData = [];
    //ロードした画像からimageDataの配列を作成
    for(var i = 0; i < imageNum; ++i){
        imageData = createImageData(images[i], images[i].naturalWidth, images[i].naturalHeight);
        imagesData[i] = imageData;
    }
    
    //volumeDataの作成
    var tfbvolData = createVolumeDataFrom2ImgData(imagesData[0], imagesData[1],0);//front, back
    var trlvolData = createVolumeDataFrom2ImgData(imagesData[2], imagesData[3],1);//right, left
    var ttbvolData = createVolumeDataFrom2ImgData(imagesData[4], imagesData[5],2);//top bottom
    var volData = new Float32Array(resolution * resolution * max_resolution);
    
    //三つの密度データを合わせる
    for(var x = 0; x < volDataX; ++x){
        for(var y = 0; y <  volDataY; ++y){
            for(var z = 0; z < volDataZ; ++z){
                var idx0 = x + y*volDataX + z*volDataX*volDataY;
                volData[idx0] = Math.min(tfbvolData[idx0], Math.min(trlvolData[idx0], ttbvolData[idx0]));
                volDataNotRmCell[idx0] = volData[idx0];
                fbvolData[idx0] = tfbvolData[idx0];
                rlvolData[idx0] = trlvolData[idx0];
                tbvolData[idx0] = ttbvolData[idx0];
            }
        }
    }
    //
    
    //色情報をもとに余計な部分を消す。
    removeCell(volData, imagesData, colorData);
    
    //recalculate 3d signed distance.
    compute3dSignedDist(volData);
    
    return volData;
    
}

////////////////////////////////////////////////////
//recalculate signedDist after remove cells.
////////////////////////////////////////////////////
function compute3dSignedDist(volData)
{
    var size = max_resolution;
    var coutourPosArray = get3dCoutourPosArray(volData);//vector3 Array
    
    var minDist =  1000000;//Number.MAX_VALUE;
    var maxDist = -1000000;//Number.MAX_VALUE;
    var sign = 0;
    
    console.log(maxDist + " : dist : " + minDist)
    for(var x = 0; x < size; ++x)
    {
        for(var y = 0; y < size; ++y)
        {
            for(var z = 0; z < size; ++z)
            {
            var idx = z * size * size + y * size + x;
            var value = volData[idx];
            
            //on the coutour.
            if(Math.abs(value) < EPS ) continue;
            
            if(value > 0) sign = 1;
            else sign = -1;
            
            var distance = sign;//*getShortestDistToCoutour(x,y,z, coutourPosArray);       
            //minDist = Math.min(distance, minDist);
	        //maxDist = Math.max(distance, maxDist);
            volData[idx] = distance;
            }
        }
        
    }
    //console.log("re :" + maxDist + " : dist : " + minDist)
    //console.log(maxDist + " : dist : " + minDist)
    //volData -1 ~ +1
    /*
    for(var i = 0; i < size * size * size; ++i)
    {
        //if(volData[i] > 0) volData[i] /= maxDist;
        //else if(volData[i] < 0) volData[i] /= -minDist;
    }
    */
}

/////////////////////////////////////////
//get coutour positions
////////////////////////////////////////
function get3dCoutourPosArray(volData)
{
    var coutourPosArray = [];
    var size = max_resolution;
    
      for(var x = 0; x < size; ++x)
    {
        for(var y = 0; y < size; ++y)
        {
            for(var z = 0; z < size; ++z)
            {
                var idx = z * size * size + y * size + x;
                if(Math.abs(volData[idx]) < EPS)
                {
                    coutourPosArray.push(new THREE.Vector3(x,y,z));
                }
            }
        }
    }
    
    return coutourPosArray;
}

function getShortestDistToCoutour(x,y,z, coutourPosArray)
{
    var shortest_dist = 1000000;//Number.MAX_VALUE;
    var targetpos = new THREE.Vector3(x,y,z);
    
    for(var i = 0; i < coutourPosArray.length; ++i)
    {
        var c_pos = coutourPosArray[i];
        var dist = c_pos.distanceTo(targetpos);
        shortest_dist = Math.min(shortest_dist, dist );    
    }
    
    return shortest_dist;
}
///////////////////////////////////////////////////////////////////
//色は配列かバイナリであらわされ、その相互変換を行う
///////////////////////////////////////////////////////////////////
function colorArrayToBinary(array){
    return (array[0] << 16) | (array[1] << 8) | (array[2]);
}

function binaryColorToArray(bin)
{
    return [((bin >> 16) & 0xff), ((bin >> 8) & 0xff), (bin & 0xff)];
}


///////////////////////////////////////////////////////////////////
//the voxel carving procedure
//use the color information to remove inconsistent cells.
///////////////////////////////////////////////////////////////////
function removeCell(volumeData, imagesData, colorData){
    
    var front = imagesData[0];
    var back = imagesData[1];
    var left = imagesData[2];
    var right = imagesData[3];
    var top = imagesData[4];
    var bottom = imagesData[5];
    
    var existsRemovableCell = true;
    var count = 0;
    var repeat_num = 100;
    //front, back, top, bottom, left, right
    var dir = [[0,0,1], [0,0,-1],[0,-1,0],
               [0,1,0],[-1,0,0],[1,0,0]];
    
    while(existsRemovableCell && count < repeat_num){
        count++;    
        existsRemovableCell = false;
        
        for(var z = 0; z < max_resolution; ++z)
        {
            for(var y = 0; y < max_resolution; ++y)
            {
                for(var x = 0; x < max_resolution; ++x)
                {
                    
                    var volidx = z*max_resolution*max_resolution+y*max_resolution+x;
                    
                    //cell completely outside.
                    if(volumeData[volidx] < 0)continue;
                    
                    var canProjectDirection = [];
                    var adjacentCells = [];
                    
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
                            if(outOfRange(nx,0,max_resolution-1) || outOfRange(ny,0,max_resolution-1) || outOfRange(nz,0,max_resolution-1)){
                                //どのセルとも衝突しなかった
                                break;
                            }
                            var volidx2 = nz * max_resolution * max_resolution + ny * max_resolution + nx;
                            if(volumeData[volidx2] >= 0){
                                //セルと衝突したので、この方向には投影できない
                                
                                if(ray == 1) adjacentCells.push(volidx2);//隣接しているセルを記録
                                canProjection = false;
                                break;
                            }
                            ray++;
                        }
                        if(canProjection) canProjectDirection.push(i);
                    }
                    
                    
                    //If the cell projects on several images, look up the corresponding pixel color on each image. 
                    //If the pixel colors are similar, then we keep the cell
                    var idxFB = (y*max_resolution + x)*4;
                    var idxLR = ((max_resolution-1-z)*max_resolution + y)*4;
                    var idxTB = (x*max_resolution + max_resolution-1-z)*4;
                    
                    var colorFront = [front.data[idxFB], front.data[idxFB+1], front.data[idxFB+2]];
                    var colorBack = [back.data[idxFB], back.data[idxFB+1], back.data[idxFB+2]];
                    
                    var colorTop = [top.data[idxTB], top.data[idxTB+1], top.data[idxTB+2]];
                    var colorBottom = [bottom.data[idxTB], bottom.data[idxTB+1], bottom.data[idxTB+2]];
                    
                    var colorLeft = [left.data[idxLR], left.data[idxLR+1], left.data[idxLR+2]];
                    var colorRight = [right.data[idxLR], right.data[idxLR+1], right.data[idxLR+2]];
                    
                    var projectionColor = [colorFront, colorBack, colorTop, colorBottom, colorLeft, colorRight];
                    
                    var someColor =  true;
                    var color0, color1;
                    
                    
                    //completely inside
                    if(canProjectDirection.length == 0){
                        //色がわからない部分は周りの色の平均値をとってごまかす。
                        var r,g,b,cnt;
                        r = g = b = cnt = 0;
                        for(var i = 0; i < 6; ++i){
                            var nx = x + dir[i][0],
                                ny = y + dir[i][1],
                                nz = z + dir[i][2];
                            
                            if(outOfRange(nx,0,max_resolution-1) || outOfRange(ny,0,max_resolution-1) || outOfRange(nz,0,max_resolution-1)){
                                continue;
                            }
                            
                            var idx2 = nz * max_resolution * max_resolution + ny * max_resolution + nx,
                                tr = (colorData[idx2] >> 16) & 0xff,
                                tg = (colorData[idx2] >> 8) & 0xff,
                                tb = colorData[idx2] & 0xff;
                            
                            if( tr == 0 && tb == 0 && tg == 0)continue;
                            r += tr;
                            g += tg;
                            b += tb;
                            cnt++;
                        }
                        if(cnt > 0){
                            r /= cnt;
                            g /= cnt;
                            b /= cnt;
                            colorData[volidx] = colorArrayToBinary([r,g,b]);
                        }
                        continue;
                    }
                    
                    //the cell projects only one image. keep cell
                    if(canProjectDirection.length == 1){
                        colorData[volidx] = colorArrayToBinary(projectionColor[canProjectDirection[0]]);
                        continue;
                    }
                    
                    //canProjectDirection.length >= 2
                    for(var i = 0; i < canProjectDirection.length-1; ++i){
                        var dir0 = canProjectDirection[i];
                        var dir1 = canProjectDirection[i+1];
                        
                        color0 = projectionColor[dir0];
                        color1 = projectionColor[dir1];
                        //console.log("dir0" + dir0 + " dir1" + dir1);
                        
                        if(!isSomeColor(color0, color1)){
                            someColor = false;
                            break;
                        }
                    }
                    
                    //If the pixel colors are some ( or similar), then keep the cell.
                    //otherwase, discard it.
                    if(!someColor){
                        //the adjacent cells sets 0 value.
                        for(var i = 0; i < adjacentCells.length; ++i)
                        {
                            var idx = adjacentCells[i];
                            volumeData[idx] = 0;
                        }
                        
                        volumeData[volidx] = -1;//outside
                        existsRemovableCell = true;
                    } else {
                        colorData[volidx] = colorArrayToBinary(color0);
                    }
                    
                }
            }
        }
    }
}

function outOfRange(val, mn, mx){
    return val < mn || mx < val;
}

function isSomeColor(color0, color1){
    return colorArrayToBinary(color0) == colorArrayToBinary(color1);
}

// //
// function isSimilarColor(color0, color1){
//     var distance = Math.pow((color0[0]-color1[0]), 2) + Math.pow((color0[1]-color1[1]), 2) + Math.pow((color0[2]-color1[2]), 2);
//     var similarValue = distance/(255*255*3);
//     return similarValue < 0.005;//0.5%以内なら似てる
// }

/////////////////////////////////////////////////////////////
//ロード済みの画像からimageDataを作成
//image.width * image.heightを
//max_resolution * max_resolutionにリサイズする
//そのままdrawImage(image, 0,0, max_resolution, max_resolution)でやると画像がぼけてしまうので
//ぼけないようにリサイズする
/////////////////////////////////////////////////////////////
function createImageData(image, imgW, imgH){
    
        //volumeデータ１辺のサイズが入力画像のサイズより小さい場合
        //fillRectを使用した画像のリサイズを行う
        //drawImageによるリサイズよりかなりきれいになる
        canvas.width = imgW;
        canvas.height = imgH;
        
        //黒で塗りつぶしてから画像を貼る
        context.fillStyle = "rgb(0,0,0)";
        context.fillRect(0,0,imgW,imgH);
        context.drawImage(image,0,0,imgW,imgH);
        
        var imageData = context.getImageData(0,0, imgW, imgH);
        
        //canvas黒で塗りつぶし
        canvas.width = max_resolution;
        canvas.height = max_resolution;
        context.fillStyle = "rgb(0,0,0)";
        context.fillRect(0,0,max_resolution,max_resolution);
        
        //imageDataをmax_resolution*max_resolutionにリサイズする
        var cellsize = max_resolution/imgW;
        var src = imageData.data;
        
        for(var i = 0; i < imgH; ++i){
            for(var j = 0; j < imgW; ++j){
                var idx = (i*imgW + j)*4;
                context.fillStyle = "rgb(" + src[idx] + "," + src[idx+1] +"," + src[idx+2] + ")";
                context.fillRect(j*cellsize, i*cellsize,cellsize,cellsize);        
            }
        }
        
        var dstImageData = context.getImageData(0,0,max_resolution,max_resolution);
        
        //canvas後始末
        context.clearRect(0,0,max_resolution,max_resolution);
        canvas.width  = 0;
        canvas.height = 0;
        
        return dstImageData;
}

///////////////////////////////////////////////////////////////
//export current model data to obj file
////////////////////////////////////////////////////////////////
function exportToObj() {
    var obj = volToGeometory;
    if(effect.visible) obj = effect;
    
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
    var geo = obj.generateGeometry();
    var mesh = new THREE.Mesh(geo, materials[current_material]);
    scene.add(mesh);
    //export obj file
	var exporter = new THREE.OBJExporter();
	var result = exporter.parse( scene );
	//floatingDiv.style.display = 'block';
	//floatingDiv.innerHTML = ;
	
	var obj_filename = document.getElementById("obj-filename");
	
	var blob = new Blob([result], {type: "text/plain;charset=utf-8"});
    saveAs(blob, (obj_filename.value || obj_filename.placeholder)+".obj");
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

function clamp(val, mn, mx)
{
    if(val < mn)return mn;
    if(val > mx)return mx;
    return val;
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
    
    //update
    var delta = clock.getDelta();
    time += delta * effectController.speed * 0.5;
    controls.update(delta);
    
    //marching cubes params
    if ( effectController.isolation !== effect.isolation ) {
		effect.isolation = effectController.isolation;
	}
			
    //update morph
    if(morphState.isplaying){
        morphController.morph = clamp(morphController.morph + delta * morphController.speed,0,1);
        if(morphController.morph == 1 || morphController.morph == 0)morphState.isplaying = false;
        
        var eff = effect;
        if(volToGeometory.visible){            
            eff = volToGeometory;
        }
        updateModel(eff);
    }
    
    //update shader
    shader_uniforms.morph.value = morphController.morph;
    shader_uniforms.imageScale.value = effectController.cubeImageScale;
    shader_uniforms.uCubeScale.value.set(effectController.cubeWScale, effectController.cubeHScale);
    
    //material
    var mesh = effect.visible ? effect : volToGeometory;
    
    if(mesh.material instanceof THREE.ShaderMaterial){
        shader_uniforms.uColor.value.setHSL(effectController.hue, effectController.saturation, effectController.lightness);
    }else{
        mesh.material.color.setHSL( effectController.hue, effectController.saturation, effectController.lightness );
    }
    
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
	reflectionCube.mapping = THREE.CubeRefractionMapping;
	
    var materials = {
        "shiny"  :
	    {
		m: new THREE.MeshStandardMaterial( { color: 0x550000, envMap: reflectionCube, roughness: 0.0, metalness: 0.0, /*side: THREE.DoubleSide*/ } ),
		h: 0, s: 0.8, l: 0.2
	    },
		"colors" :
	    {
		m: new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0xffffff, shininess: 2, vertexColors: THREE.VertexColors, /*side: THREE.DoubleSide*/} ),
		h: 0, s: 0, l: 1
	    },
	    //この方法だとshader materialだけうまく動作しない。原因わからない
	   // "cubeMap" :
	   // {
	   // m: new THREE.ShaderMaterial({ vertexShader: document.getElementById("vshader").textContent, fragmentShader: document.getElementById("fshader").textContent})
	   // }
	   "cubeMap" ://init関数の中で初期化している
	   {
	       m:null,
	       h:0,s:0,l:1
	   }
    };
    
    return materials;
}

/////////////////////////////////////////////////////////////
//liner interpolation
/////////////////////////////////////////////////////////////
function lerp(a,b,t){
    return a * (1-t) + b * t;
}

function lerpBinaryColor(c0, c1, t){
    var carray0 = binaryColorToArray(c0);
    var carray1 = binaryColorToArray(c1);
    var carray = [lerp(carray0[0],carray1[0],t),lerp(carray0[1],carray1[1],t),lerp(carray0[2],carray1[2],t),];
    return colorArrayToBinary(carray);
}

///////////////////////////////////////////////////////////////////////
//this controls content of marching cubes voxel field
///////////////////////////////////////////////////////////////////////
function updateModel(object)
{
    object.reset();

    var v0 = volumeData0;
    var v1 = volumeData1;
    var showColor = !(effectController.showfbVolData==true || effectController.showlrVolData==true ||
                        effectController.showtbVolData==true || effectController.showCombineVolData==true);
    if(effectController.showfbVolData)
    {
        v0 = fbvolData0;
        v1 = fbvolData1;
    }
    else if(effectController.showlrVolData)
    {
        v0 = rlvolData0;
        v1 = rlvolData1;
    }
    else if(effectController.showtbVolData)
    {
        v0 = tbvolData0;
        v1 = tbvolData1;
    }
    else if(effectController.showCombineVolData)
    {
        v0 = volDataNotRmCell0;
        v1 = volDataNotRmCell1;
    }
    
    
    var morph = morphController.morph;
    var czy, cz, idx;
    //三つの密度データを合わせた密度データを生成する
    for(var z = 0; z < max_resolution; ++z){
        cz = z * max_resolution * max_resolution;
        for(var y = 0; y < max_resolution; ++y){
            czy = cz + y * max_resolution;
            for(var x = 0; x < max_resolution; ++x){
                idx = czy + x;
                volumeData[idx] = lerp(v0[idx], v1[idx], morph);
                if(showColor) colorData[idx] = lerpBinaryColor(colorData0[idx], colorData1[idx], morph);
                else colorData[idx] = 0;
            }
        }
    }
    
    if(volToGeometory.visible){
        //voxel
        object.update(volumeData, colorData, max_resolution);//voxel modelを更新  
    } 
    else 
    {
        //marching cubes
        if ( effectController.resolution !== resolution ) {
		    resolution = effectController.resolution;
		    object.init( Math.floor( resolution ) );
        }
        object.addExtrusionObject(volumeData, max_resolution, max_resolution, max_resolution, colorData);//マーチングキューブオブジェクトを更新
    }
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
    
    
    var volumeData = new Float32Array(max_resolution*max_resolution*max_resolution);
    
    //signedDistArrayからボリュームデータを作成
    getVolumeDataFrom2Img(max_resolution, max_resolution, max_resolution, sArrays[0], sArrays[1], volumeData, rotateFlag);
    
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
	isolation: 1,
	floor: true,
	wallx: false,
	wallz: false,
	hue: 0,
	saturation: 0.0,
	lightness: 0.7,
	lhue: 0.04,
	lsaturation: 0.0,
	llightness: 0.4,
	lx: 0.5,
	ly: 0.5,
	lz: 1.0,
	cubeWScale:1,
	cubeHScale:1,
	postprocessing: false,
	useMC:function(){effect.visible = !effect.visible; volToGeometory.visible = !volToGeometory.visible;},//MCアルゴリズムを使用するかどうかのフラグ
	cubeImageScale: 0,
	showfbVolData:false,
	showlrVolData:false,
	showtbVolData:false,
	showCombineVolData:false,
	};
	
	var h, m_h, m_s, m_l;
	
	var gui = new dat.GUI();
	
	//show mid result flag
	//radio button
	h = gui.addFolder("SHOW MID RESULT");
	var tcontroll = h.add(effectController, "showfbVolData").name("front back").listen();
	tcontroll.onChange(function(value){
	    if(value){
	    effectController.showlrVolData = false;    
	    effectController.showtbVolData = false;
	    effectController.showCombineVolData = false;
	    }
	    if(volToGeometory.visible)updateModel(volToGeometory);
	    else updateModel(effect);
	});
	
	tcontroll = h.add(effectController, "showlrVolData").name("left right").listen();
	tcontroll.onChange(function(value){
	    if(value){
	    effectController.showfbVolData = false;    
	    effectController.showtbVolData = false;
	    effectController.showCombineVolData = false;

	    }
	    	    
	    if(volToGeometory.visible)updateModel(volToGeometory);
	    else updateModel(effect);
	});
	
	tcontroll = h.add(effectController, "showtbVolData").name("top bottom").listen();
	tcontroll.onChange(function(value){
	    if(value){
	    effectController.showlrVolData = false;    
	    effectController.showfbVolData = false;
	    effectController.showCombineVolData = false;

	    }
	    	    
	    if(volToGeometory.visible)updateModel(volToGeometory);
	    else updateModel(effect);
	});
	
	tcontroll = h.add(effectController, "showCombineVolData").name("combine").listen();
	tcontroll.onChange(function(value){
	    if(value){
	    effectController.showfbVolData = false;    
	    effectController.showlrVolData = false;    
	    effectController.showtbVolData = false;
	    }
	    if(volToGeometory.visible)updateModel(volToGeometory);
	    else updateModel(effect);
	});
	
	
	//change polygonize algorithm
	h = gui.addFolder("MARCHING CUBE");
	h.add(effectController, "useMC");
	// material (type)
	h = gui.addFolder( "Materials" );
	for ( var m in materials ) {
		effectController[ m ] = createHandler( m );
		h.add( effectController, m ).name( m );
	}
	h.add(effectController, "cubeImageScale", 0.0, 400, 0.0).name("CubeMap image scale");
	h.add(effectController, "cubeWScale", 1, 3, 1).name("Cube width scale");
	h.add(effectController, "cubeHScale", 1, 3, 1).name("Cube height scale");
	
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
	
	//simulation
	h = gui.addFolder( "Simulation" );
	
	h.add( effectController, "resolution", min_resolution, max_resolution, 1 ).name("resolution (only MC)");
	h.add( effectController, "isolation", 0, 1, 1 ).name("isolation (only MC)");
    
	morphController = {
	    isplaying:false,
	    play: function(){ morphState.isplaying = true;},
	    stop: function(){ morphState.isplaying = false;},
	    changemorph: function(){
	        if(volToGeometory.visible)updateModel(volToGeometory);
	        else updateModel(effect);
	    },
	    morph: 0.0,
	    speed: 0.5,
	};
	h.add( morphController , "changemorph").name("update (morph, resolution)");
	
	h = h.addFolder( "Morphing" );
	
	h.add( morphController , "morph",0.0, 1.0, 0.0).name("morph").listen();
	h.add( morphController , "speed",-1, 1.0, 0.5);
	h.add( morphController , "play");
	h.add( morphController , "stop");
}

//////////////////////////////////////////
//追加したエレメントを全て削除する
//////////////////////////////////////////
function endProcess(){
    //delete container children
    var element = document.getElementById("container");
    removeChildren(element);
    
    //delete gui 
    var elements = document.getElementsByClassName("dg main a");
    //console.log(elements);
    for(var i = 0; i < elements.length; ++i){
        elements[i].parentNode.removeChild(elements[i]);
    }
    
    //remove listerner
    exportButton.addEventListener( 'click', exportToObj, false);
    
    canvas.width = 0;
    canvas.height = 0;
}

function removeChildren(element){
    while (element.firstChild) element.removeChild(element.firstChild);
}

///////////////////////////////////////////////////////////
//frontとbackのsigneddistanceを合成する, zは0.0 ~ 1.0, zMaxは1
///////////////////////////////////////////////////////////
getExtrusionFunction = function(sf, sb, z,zMax){
    var sd = (zMax - z)/zMax * sf + sb*z/zMax;
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

getTestVolumeData = function(resolution)
{
    var volumeData = new Float32Array(resolution * resolution * resolution);
    
    for(var z = 0; z < resolution; ++z)
    {
        for(var y = 0; y < resolution; ++y)
        {
            for(var x = 0; x < resolution; ++x)
            {
                var idx = z * resolution * resolution + y * resolution + x;
                if(x == 0)volumeData[idx] = 1.0;
                else volumeData[idx] = 0.0;
                
            }
        }
    }
    return volumeData;
    
}







