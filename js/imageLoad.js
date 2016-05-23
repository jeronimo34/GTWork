
//2値化フィルター
//srcImage ImageData 元の画素データ(rgba)
//dstImage ImageData 出力画像データ(rgba)
//thresh 閾値　この値を上回ると白くなる。
binarizationFilter = function(srcImage, dstImage, thresh){
    var width = srcImage.width;
    var height = srcImage.height;
    
    var src = srcImage.data;
    var dst = dstImage.data;
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
                
                dst[idx] = color;
                dst[idx + 1] = color;
                dst[idx + 2] = color;
                dst[idx + 3] = a;
            }
        }
}

//反転フィルター
negativeFilter = function(srcImage, dstImage){
    var width = srcImage.width;
    var height = srcImage.height;
    
    var src = srcImage.data;
    var dst = dstImage.data;
    
    //閾値　この値より大きければしろになる
        for(var i = 0; i < height; ++i){
            for(var j = 0; j < width; ++j){
                
                var idx = (j + i*width)*4;
                var r = src[idx];
                var g = src[idx+1];
                var b = src[idx+2];
                var a = src[idx+3];
                
                dst[idx] = 255 - r;
                dst[idx + 1] = 255 - g;
                dst[idx + 2] = 255 - b;
                dst[idx + 3] = a;
            }
        }
}

//点と輪郭の関係を調べる
//opencvのpointPolygonTestと同じ
//contourImg 白い輪郭線と黒い背景のみの画像
//binarizationImage ２値化した画像内部なら白くなっているはず
//point 調べたいポイント
//戻り値 輪郭との距離を返します。輪郭の内側の場合+ 輪郭の外側の場合-　同じなら０
pointPolygonTest = function(contourImage, binarizationImage, point){
    var width = contourImage.width;
    var height = contourImage.height;
    
    var contour = contourImage.data;
    var binari = binarizationImage.data;
    
    var distance = 1 << 24;//十分大きい数字
    var signed = 1;
    
    //内部にいるか外部にいるか
    if(binari[(point.x + point.y*width)*4] == 0){
        signed = -1;
    }
     
    //最短距離
    for(var i = 0; i < height; ++i)
    {
        for(var j = 0; j < width; ++j)
        {
            var idx = (i*width + j)*4;
            //画素が黒であれば輪郭線上の画素でないためとばす
            if(contour[idx] == 0)continue;
            
            var newDist = Math.sqrt((point.x - j) * (point.x - j) + (point.y - i) * (point.y - i));
            distance = Math.min(newDist, distance);
        }
    }
    
    return signed * distance;
}

//エッジ検出
//Sobelオペレータ
//4方向２次微分オペレータ？　
//よくわからない
Sobel = function(srcImage, dstImage)
{
    var width = srcImage.width;
    var height = srcImage.height;
    
    var src = srcImage.data;
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
                    var idx1 = (x + y * width) * 4;
                    var idx2 = (l + 1) + (k + 1)*3;
                    val[0] += weight[idx2]*src[idx1];
                    val[1] += weight[idx2]*src[idx1 + 1];
                    val[2] += weight[idx2]*src[idx1 + 2];
                }
            }
            dst[idx] = val[0];
            dst[idx + 1] = val[1];
            dst[idx + 2] = val[2];
            dst[idx + 3] = src[idx + 3];
        }
    }
}

//エッジ検出
//Laplacianオペレータを使う opencv画像処理入門 P131
edgeDetectionFilterLaplacian = function(srcImage, dstImage){} 

getSignedDistImage = function(solbeImage, binImage, dstImage){
        var width = solbeImage.width;
        var height = solbeImage.height;
    
        var dst = dstImage.data;
    
       //get signed distance image
        for(var i = 0; i < height; ++i){
            for(var j = 0; j < width; ++j){
                var point = new Vector2(j,i);
                var distance = pointPolygonTest(solbeImage, binImage, point);
                var idx = (j + i * width) * 4;
                        
                if(distance == 0){
                    dst[idx] = 0;
                    dst[idx+1] = 255; 
                    dst[idx+2] = 0; 
                    dst[idx + 3] = 255;
                }
                else if(distance > 0){
                    //inside
                    dst[idx] = Math.max(distance*50, 255);
                    dst[idx + 1] = dst[idx + 2] = 0;
                    dst[idx + 3] = 255;
                }
                else {
                    //outside
                    dst[idx] = dst[idx + 1] = 0;
                    dst[idx + 2] = -Math.max(distance*50, 255);
                    dst[idx + 3] = 255;
                }
            }
            console.log("i : " + i);
        }
}


//ページがロードされた後に呼ばれる
onload = function(){
   
    if ( ! canvas || ! canvas.getContext ) {
    return false;
    }
  
    var image = new Image();
    image.src = "./front.png"

    //画像のロードに成功
    image.onload = function(e){
    //イメージを白黒画像にして出力
        console.log("w" + image.width);
        console.log("h" + image.height);
        
        //キャンバスに画像をセット
        var canvas = document.getElementById('canvas');
        var context = canvas.getContext('2d');
        
        var width = image.width;
        var height = image.height;
        
        //canvasと画像のサイズを同じにする     
        canvas.width = image.width;
        canvas.height = image.height;
        
        context.drawImage(image,0,0);
        
        var srcImage = context.getImageData(0,0,width,height);
        var dstImage = context.createImageData(width, height);
        
        var binImage = context.createImageData(width, height);
        var negativeImage = context.createImageData(width, height);
        var solbeImage = context.createImageData(width, height);
        
        //filter
        binarizationFilter(srcImage, binImage, 1);
        negativeFilter(binImage, negativeImage);
        
        Sobel(negativeImage, solbeImage);
        
        getSignedDistImage(solbeImage, binImage, dstImage); 
        
        context.putImageData(dstImage,0, 0);
    };
}
