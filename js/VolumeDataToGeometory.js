//ボリュームデータからボクセルメッシュを生成する
THREE.VolumeDataToGeometory = function(resolution, material, enableColors){
    
    THREE.ImmediateRenderObject.call(this, material);
    
    this.enableUvs = false;
	this.enableColors = enableColors !== undefined ? enableColors : false;

    this.init = function(resolution)
    {
        this.resolution = resolution;
        
        this.size = resolution;
        this.size2 = resolution * resolution;
        this.size3 = resolution * resolution * resolution;
        this.halfsize = this.size / 2;
        
        this.invsize = 1.0 / resolution;
        
        this.field = new Float32Array( this.size3 );
        this.color_field = new Float32Array( this.size3 );
        
        // immediate render mode simulator

		this.maxCount = 4096; // TODO: find the fastest size for this buffer
		this.count = 0;
        this.count_cache = 0;
        
		this.hasPositions = false;
		this.hasNormals = false;
		this.hasColors = false;
		this.hasUvs = false;

		this.positionArray = new Float32Array( this.size3 * 3 * 6 * 6);
		this.normalArray   = new Float32Array( this.size3 * 3 * 6 * 6);
		
		if( this.enableColors ){
		    this.colorArray = new Float32Array( this.size3 * 3 * 6 * 6);
		}
    }
    
    ////////////////////////////////
    //updates
    ////////////////////////////////
    this.reset = function(){
        for(var i = 0; i < this.size3; ++i){
            this.field[i] = 0.0;
            this.color_field[i] = 0.0;
        }
        this.count = 0;
        this.count_cache = 0;
    }
    
    function outOfRange(val, mn, mx){
        return val < mn || mx < val;
    }
    
    this.binaryColorToArray = function(bin)
    {
        return [((bin >> 16) & 0xff), ((bin >> 8) & 0xff), (bin & 0xff)];
    }
    
    this.setVolumeData = function(volumeData, volSize){
        var scale = volSize / resolution;
        var volSize2 = volSize * volSize;
        
        for(var z = 0; z < resolution; ++z){
            for(var y = 0; y < resolution; ++y){
                for(var x = 0; x < resolution; ++x){
                    var idx = z*this.size2 + y * this.size + x;
                    var idx2 = (z*scale+1) * volSize2 + (y*scale+1)*volSize + x*scale+1;
                    this.field[idx] = volumeData[idx2];
                }
            }
        }
    }
    
    this.setColorData = function(colorData, volSize)
    {
        var scale = volSize / resolution;
        var volSize2 = volSize * volSize;
        
        for(var z = 0; z < resolution; ++z){
            for(var y = 0; y < resolution; ++y){
                for(var x = 0; x < resolution; ++x){
                    var idx = z*this.size2 + y * this.size + x;
                    var idx2 = (z*scale+1) * volSize2 + (y*scale+1)*volSize + x*scale+1;
                    
                    this.color_field[idx] = colorData[idx2];
                }
            }
        }
    }
    
    this.update = function(volumeData, colorData, volSize){
        this.setVolumeData(volumeData, volSize);
        this.setColorData(colorData, volSize);
        
        var scale = volSize / resolution;
        var volSize2 = volSize * volSize;
        
        //polygonization
        for(var x = 0; x < this.size; ++x){
            for(var y = 0; y < this.size; ++y){
                for(var z = 0; z < this.size; ++z){
                    
                    var idx = z * this.size2 + (resolution-1-y) * this.size + x;
                        
                    if(this.field[idx] >= 0){
                        
                        var noExistsAdjacentCells = [];
                        var dir = [[0,0,1], [0,0,-1],[1,0,0],
                                   [-1,0,0],[0,-1,0],[0,1,0]];
                                   
                        for(var i = 0; i < 6; ++i){
                            var nx = x + dir[i][0];
                            var ny = (resolution-1-y) + dir[i][1];
                            var nz = z + dir[i][2];
                            if(outOfRange(nx,0,resolution-1) || outOfRange(ny,0,resolution-1) || outOfRange(nz,0,resolution-1)){
                                    //どのセルとも衝突しなかった
                                    noExistsAdjacentCells.push(i);
                                    continue;
                            }
                            var idx2 = nz * this.size2 + ny * this.size + nx;
                            
                            if(this.field[idx2] < 0){
                                noExistsAdjacentCells.push(i);
                            }
                            
                        }
                        
                        for(var j = 0; j < noExistsAdjacentCells.length; ++j){
                            var faceidx = noExistsAdjacentCells[j];
                            
                            //add quad
                            for(var k = 0; k < 6; ++k){
                                var p = cubeVertices[cubeFaces[faceidx*6+k]];
                                
                                this.positionArray[this.count*3 + 0] = ((x+p[0])-this.halfsize) / this.halfsize;
                                this.positionArray[this.count*3 + 1] = ((y+p[1])-this.halfsize) / this.halfsize;
                                this.positionArray[this.count*3 + 2] = ((z+p[2])-this.halfsize) / this.halfsize;
                                this.normalArray[this.count*3 + 0] = cubeNormals[faceidx][0];
                                this.normalArray[this.count*3 + 1] = cubeNormals[faceidx][1];
                                this.normalArray[this.count*3 + 2] = cubeNormals[faceidx][2];
                                
                                if( this.enableColors ){
                                    var color = this.binaryColorToArray(this.color_field[idx]);
                                    var inv = 1.0/255.0;
                                    this.colorArray[this.count*3+0] = color[0] * inv;//0 ~ 255 -> 0 ~ 1
                                    this.colorArray[this.count*3+1] = color[1] * inv;
                                    this.colorArray[this.count*3+2] = color[2] * inv;
                                }
                                
                                this.count += 1;
                            }
                            
                        }
                    }
                }
            }
        }
        
        this.count_cache = this.count;
    }
    
    this.render = function( renderCallback ){
        this.count = this.count_cache;
        if ( this.count === 0 ) return;

        this.hasPositions = true;
		this.hasNormals = true;

		if ( this.enableUvs ) {

			this.hasUvs = true;

		}

		if ( this.enableColors ) {

			this.hasColors = true;

		}

        renderCallback(this);
        
    }
    
    this.generateGeometry = function() {
       var start = 0, geo = new THREE.Geometry();
		var normals = [];

		var geo_callback = function( object ) {

			var i, x, y, z, vertex, normal,
				face, a, b, c, na, nb, nc, nfaces;


			for ( i = 0; i < object.count; i ++ ) {
				a = i * 3;
				b = a + 1;
				c = a + 2;

				x = object.positionArray[ a ];
				y = object.positionArray[ b ];
				z = object.positionArray[ c ];
				vertex = new THREE.Vector3( x, y, z );

				x = object.normalArray[ a ];
				y = object.normalArray[ b ];
				z = object.normalArray[ c ];
				normal = new THREE.Vector3( x, y, z );
				normal.normalize();

				geo.vertices.push( vertex );
				normals.push( normal );

			}

			nfaces = object.count / 3;

			for ( i = 0; i < nfaces; i ++ ) {

				a = ( start + i ) * 3;
				b = a + 1;
				c = a + 2;

				na = normals[ a ];
				nb = normals[ b ];
				nc = normals[ c ];

				face = new THREE.Face3( a, b, c, [ na, nb, nc ] );

				geo.faces.push( face );

			}

			start += nfaces;
			object.count = 0;

		};

		this.render( geo_callback );

		// console.log( "generated " + geo.faces.length + " triangles" );

		return geo;
 
    };
    
    this.init( resolution );
};

THREE.VolumeDataToGeometory.prototype = Object.create(THREE.ImmediateRenderObject.prototype);
THREE.VolumeDataToGeometory.prototype.constructor = THREE.VolumeDataToGeometory;

cubeVertices = [
              [-0.5, -0.5, 0.5],
              [-0.5, -0.5, -0.5],
              [0.5, -0.5, -0.5],
              [0.5, -0.5,  0.5],
              [-0.5,0.5,0.5],
              [-0.5,0.5,-0.5],
              [0.5, 0.5, -0.5],
              [0.5, 0.5, 0.5]];

cubeFaces = new Int32Array([0,3,7,7,4,0,//front
                            1,5,6,6,2,1,//back
                            2,6,7,7,3,2,//left
                            0,4,5,5,1,0,//right
                            4,7,6,6,5,4,//top
                            0,1,2,2,3,0//bottom
                            ]);
                            
cubeNormals = [[0,0,1],
                [0,0,-1],
                [1,0,0],
                [-1,0,0],
                [0,1,0],
                [0,-1,0]];