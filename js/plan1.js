
//2値化フィルター
//srcImage ImageData 元の画素データ(rgba)
//dstImage ImageData 出力画像データ(rgba)
//dstArray 0 -> black 255 -> white
//thresh 閾値　この値を上回ると白くなる。
binarizationFilter = function(srcImage, dstArray, thresh){
    var width = srcImage.width;
    var height = srcImage.height;
    
    var src = srcImage.data;
    var dst = dstArray;
    //2値化
    //閾値　この値より大きければしろになる
        for(var i = 0; i < height; ++i){
            for(var j = 0; j < width; ++j){
                
                var idx = (j + i*width)*4;
                var r = src[idx];
                var g = src[idx+1];
                var b = src[idx+2];
                var a = src[idx+3];
                
                var gray = (r + g + b)/3;
                var color = 0;
                if(gray > thresh)color = 255;
                
                dst[i * width + j] = color;
            }
        }
}

//srcArray and dstArray have one component.
//反転フィルター
negativeFilter = function(srcArray, dstArray, width, height){
    // var width = srcImage.width;
    // var height = srcImage.height;
    
    var src = srcArray;
    var dst = dstArray;
    
    //閾値　この値より大きければしろになる
        for(var i = 0; i < height; ++i){
            for(var j = 0; j < width; ++j){
                
                var idx = j + i*width;
                var color = src[idx];
                
                dst[idx] = 255 - color;
            }
        }
}

//return inside(1) or outside(-1)
pointPolygonTest = function(binari){
    //inside or outside
    if(binari == 0){
        return -1;
    }
    return 1;
}

//点と輪郭の関係を調べる
//opencvのpointPolygonTestと同じ
//contourImg 白い輪郭線と黒い背景のみの画像
//binarizationImage ２値化した画像内部なら白くなっているはず
//point 調べたいポイント
//width 画像の横幅
//height 画像の縦幅
//戻り値 輪郭線と任意点との符号付の最短距離を返します。輪郭の内側の場合+ 輪郭の外側の場合-　同じなら０
computeSignedDist = function(contourPosArray, binArray, point, width, height){
    
    var contour = contourPosArray;
    var binari = binArray;
    
    var distance = Number.MAX_VALUE;//十分大きい数字
    var signed = pointPolygonTest(binArray[point.y*width+point.x]);

     //最短距離
     for(var i = 0; i < contourPosArray.length; ++i){
         var contourPos = contourPosArray[i];
         var newDist = Math.sqrt((point.x - contourPos.x) *(point.x - contourPos.x) + (point.y - contourPos.y) *(point.y - contourPos.y));
         distance = Math.min(newDist, distance);
     }
    return signed * distance;
}

//エッジ検出
//Laplacianオペレータ
//4方向２次微分オペレータ
//binArray have 1 component. 0 black 255 white
Laplacian = function(binArray, dstImage)
{
    var width = dstImage.width;
    var height = dstImage.height;
    
    var src = binArray;
    var dst = dstImage.data;
    
    //上下左右の２次微分オペレータ
   var weight = [
        0,1,0,
        1,-4,1,
        0,1,0
    ];
    
    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
            var idx = (j + i * width) * 4;
            var val = [0,0,0];
        
            //オペレータを積和演算している    
            for(var k = -1; k <= 1; k++){
                for(var l = -1; l <= 1 ; l++){
                    var x = j + l;
                    var y = i + k;
                    if(x < 0 || x >= width || y < 0 || y >= height){
                        continue;
                    }
                    var idx1 = x + y * width;
                    var idx2 = (l + 1) + (k + 1)*3;
                    
                    val[0] += weight[idx2]*src[idx1];
                    val[1] += weight[idx2]*src[idx1];
                    val[2] += weight[idx2]*src[idx1];
                }
            }
            
            dst[idx] = val[0];
            dst[idx + 1] = val[1];
            dst[idx + 2] = val[2];
            dst[idx + 3] = 255;
        }
    }
}

//
//dstCoutourPosArray is Vector2 Array
getContourPosArray = function(coutourImage, dstCoutourPosArray){
    var width = coutourImage.width;
    var height = coutourImage.height;
    var src = coutourImage.data;
    var dst = dstCoutourPosArray;
    var idx = 0;
    
    for(var i = 0; i < height; ++i)
    {
        for(var j = 0; j < width; ++j)
        {
            var idx2 = (i*width + j) * 4;
            
            //エッジの上にある点
            if(src[idx2] == 255){
                dst[idx++] = new Vector2(j,i);
            }
        }
    }
    
}

//符号付距離が視覚的にわかる画像を生成する
getSignedDistImage = function(coutourPosArray, binArray, dstImage){
        var width = dstImage.width;
        var height = dstImage.height;
    
        var dst = dstImage.data;

    // find min (<0) and max (>0) distance for rescaling
    var minDist = Number.MAX_VALUE;
    var maxDist = -Number.MAX_VALUE;
    var distanceArray = []; // array of size width*height
    // TODO Float32 array or something like that
    // and pre-allocate size
 
    for(var i = 0; i < height; ++i){
        for(var j = 0; j < width; ++j){
            var point = new Vector2(j,i);
            var distance = computeSignedDist(coutourPosArray, binArray, point,width,height);
            var idx = (j + i * width);
	    distanceArray[idx] = distance;
	    minDist = Math.min(distance, minDist);
	    maxDist = Math.max(distance, maxDist);
	    
        }
    }
        
    
    
       //get signed distance image
        for(var i = 0; i < height; ++i){
            for(var j = 0; j < width; ++j){
                var point = new Vector2(j,i);
                //var distance = pointPolygonTest(laplacianImage, binImage, point);
                var distance = distanceArray[j + i*width];

		var idx = (j + i * width) * 4;
                        
                if(distance == 0){
                    dst[idx] = 0;
                    dst[idx+1] = 255; 
                    dst[idx+2] = 0; 
                    dst[idx + 3] = 255;
                }
                else if(distance > 0){
                    //inside
                    //dst[idx] = Math.max(distance*50, 255);
                    dst[idx] = Math.floor(distance/maxDist * 255);
		    dst[idx + 1] = dst[idx + 2] = 0;
                    dst[idx + 3] = 255;
                }
                else {
                    //outside
                    dst[idx] = dst[idx + 1] = 0;
                    //dst[idx + 2] = -Math.max(distance*50, 255);
                    dst[idx + 2] = Math.floor(distance/minDist * 255);
		    dst[idx + 3] = 255;
                }
            }
        }
}


//ページがロードされた後に呼ばれる
onload = function(){
   
    if ( ! canvas || ! canvas.getContext ) {
    return false;
    }
  
    var image = new Image();
    image.src = "./frontResizedPadded.png"

    //画像のロードに成功
    image.onload = function(e){
    //イメージを白黒画像にして出力
        console.log("w" + image.width);
        console.log("h" + image.height);
        //
        //キャンバスに画像をセット
        var canvas = document.getElementById('canvas');
        var context = canvas.getContext('2d');
        
        var width = image.width;
        var height = image.height;
        
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
        
        //filter
        binarizationFilter(srcImage, binArray, 1);
        negativeFilter(binArray, negativeArray, srcImage.width, srcImage.height);
        
        Laplacian(negativeArray, laplacianImage);

   
        getContourPosArray(laplacianImage, coutourPosArray);

        getSignedDistImage(coutourPosArray, binArray, dstImage); 
        
	context.putImageData(laplacianImage, image.width, 0);
	context.putImageData(dstImage, 2*image.width, 0);
    };
}
