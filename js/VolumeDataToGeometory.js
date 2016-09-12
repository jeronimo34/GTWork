//ボリュームデータからボクセルメッシュを生成する
console.log("load voldatatogeo");
THREE.VolumeDataToGeometory = function(resolution, material){
    
    THREE.ImmediateRenderObject.call(this, material);
    
    this.enableUvs = false;
	this.enableColors = false;

    this.init = function(resolution)
    {
        this.resolution = resolution;
        
        this.size = resolution;
        this.size2 = resolution * resolution;
        this.size3 = resolution * resolution * resolution;
        this.halfsize = this.size / 2;
        
        this.invsize = 1.0 / resolution;
        
        this.field = new Float32Array( this.size3 );
        
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
    }
    
    ////////////////////////////////
    //updates
    ////////////////////////////////
    this.reset = function(){
        for(var i = 0; i < this.size3; ++i){
            this.field[i] = 0.0;
        }
        this.count = 0;
        this.count_cache = 0;
    }
    
    function outOfRange(val, mn, mx){
        return val < mn || mx < val;
    }
    
    this.setVolumeData = function(volumeData){
        for(var z = 0; z < resolution; ++z){
            for(var y = 0; y < resolution; ++y){
                for(var x = 0; x < resolution; ++x){
                    var idx = z*this.size2 + y * this.size + x;
                    this.field[idx] = volumeData[idx];
                }
            }
        }
    }
    
    this.update = function(volumeData){
        this.setVolumeData(volumeData);
        
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
                        
                        //add quad
                        for(var j = 0; j < noExistsAdjacentCells.length; ++j){
                            var i = noExistsAdjacentCells[j];
                            var p0 = cubeVertices[cubeFaces[i*6+0]];
                            var p1 = cubeVertices[cubeFaces[i*6+1]];
                            var p2 = cubeVertices[cubeFaces[i*6+2]];
                            var p3 = cubeVertices[cubeFaces[i*6+3]];
                            var p4 = cubeVertices[cubeFaces[i*6+4]];
                            var p5 = cubeVertices[cubeFaces[i*6+5]];
                            
                            this.positionArray[this.count*3 + 0] = (x+p0[0]) * this.invsize;
                            this.positionArray[this.count*3 + 1] = (y+p0[1]) * this.invsize;
                            this.positionArray[this.count*3 + 2] = (z+p0[2]) * this.invsize;
                            this.normalArray[this.count*3 + 0] = cubeNormals[i][0];
                            this.normalArray[this.count*3 + 1] = cubeNormals[i][1];
                            this.normalArray[this.count*3 + 2] = cubeNormals[i][2];
                            this.count += 1;
                            
                            this.positionArray[this.count*3  + 0] = (x+p1[0]) * this.invsize;
                            this.positionArray[this.count*3  + 1] = (y+p1[1]) * this.invsize;
                            this.positionArray[this.count*3  + 2] = (z+p1[2]) * this.invsize;
                            this.normalArray[this.count*3  + 0] = cubeNormals[i][0];
                            this.normalArray[this.count*3  + 1] = cubeNormals[i][1];
                            this.normalArray[this.count*3  + 2] = cubeNormals[i][2];
                            this.count += 1;
                            
                            this.positionArray[this.count*3  + 0] = (x+p2[0]) * this.invsize;
                            this.positionArray[this.count*3  + 1] = (y+p2[1]) * this.invsize;
                            this.positionArray[this.count*3  + 2] = (z+p2[2]) * this.invsize;
                            this.normalArray[this.count*3  + 0] = cubeNormals[i][0];
                            this.normalArray[this.count*3  + 1] = cubeNormals[i][1];
                            this.normalArray[this.count*3  + 2] = cubeNormals[i][2];
                            this.count += 1;
                            
                            this.positionArray[this.count*3  + 0] = (x+p3[0]) * this.invsize;
                            this.positionArray[this.count*3  + 1] = (y+p3[1]) * this.invsize;
                            this.positionArray[this.count*3  + 2] = (z+p3[2]) * this.invsize;
                            this.normalArray[this.count*3  + 0] = cubeNormals[i][0];
                            this.normalArray[this.count*3  + 1] = cubeNormals[i][1];
                            this.normalArray[this.count*3  + 2] = cubeNormals[i][2];
                            this.count += 1;
                            
                            this.positionArray[this.count*3  + 0] = (x+p4[0]) * this.invsize;
                            this.positionArray[this.count*3  + 1] = (y+p4[1]) * this.invsize;
                            this.positionArray[this.count*3  + 2] = (z+p4[2]) * this.invsize;
                            this.normalArray[this.count*3  + 0] = cubeNormals[i][0];
                            this.normalArray[this.count*3  + 1] = cubeNormals[i][1];
                            this.normalArray[this.count*3  + 2] = cubeNormals[i][2];
                            this.count += 1;
                            
                            this.positionArray[this.count*3  + 0] = (x+p5[0]) * this.invsize;
                            this.positionArray[this.count*3  + 1] = (y+p5[1]) * this.invsize;
                            this.positionArray[this.count*3  + 2] = (z+p5[2]) * this.invsize;
                            this.normalArray[this.count*3  + 0] = cubeNormals[i][0];
                            this.normalArray[this.count*3  + 1] = cubeNormals[i][1];
                            this.normalArray[this.count*3  + 2] = cubeNormals[i][2];
                            this.count += 1;
                            
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