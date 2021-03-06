/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.OBJExporter = function () {};

THREE.OBJExporter.prototype = {

	constructor: THREE.OBJExporter,

	parse: function ( object ) {

		var output = '';

		var indexVertex = 0;
		var indexVertexUvs = 0;
		var indexNormals = 0;

		var faceVertexKeys = [ "a", "b", "c" ];

		var parseMesh = function ( mesh ) {

			var nbVertex = 0;
			var nbVertexUvs = 0;
			var nbNormals = 0;

			var geometry = mesh.geometry;

			if ( geometry instanceof THREE.BufferGeometry ) {

				geometry = new THREE.Geometry().fromBufferGeometry( geometry );

			}

			if ( geometry instanceof THREE.Geometry ) {

				output += 'o ' + mesh.name + '\n';

				var vertices = geometry.vertices;
				console.log("size : " + vertices.length);
				for ( var i = 0, l = vertices.length; i < l; i ++ ) {

					var vertex = vertices[ i ].clone();
					vertex.applyMatrix4( mesh.matrixWorld );

					output += 'v ' + vertex.x + ' ' + vertex.y + ' ' + vertex.z + '\n';

					nbVertex ++;

				}

				// uvs

				var faces = geometry.faces;
				var faceVertexUvs = geometry.faceVertexUvs[ 0 ];
				var hasVertexUvs = faces.length === faceVertexUvs.length;

				if ( hasVertexUvs ) {

					for ( var i = 0, l = faceVertexUvs.length; i < l; i ++ ) {

						var vertexUvs = faceVertexUvs[ i ];

						for ( var j = 0, jl = vertexUvs.length; j < jl; j ++ ) {

							var uv = vertexUvs[ j ];

							output += 'vt ' + uv.x + ' ' + uv.y + '\n';

							nbVertexUvs ++;

						}

					}

				}

				// normals

				var normalMatrixWorld = new THREE.Matrix3();
				normalMatrixWorld.getNormalMatrix( mesh.matrixWorld );
				
				console.log("face num" + faces.length);
				
				
				for ( var i = 0, l = faces.length; i < l; i ++ ) {

					var face = faces[ i ];
					var vertexNormals = face.vertexNormals;

					if ( vertexNormals.length === 3 ) {

						for ( var j = 0, jl = vertexNormals.length; j < jl; j ++ ) {

							var normal = vertexNormals[ j ].clone();
							normal.applyMatrix3( normalMatrixWorld );

							output += 'vn ' + normal.x + ' ' + normal.y + ' ' + normal.z + '\n';

							nbNormals ++;

						}

					} else {

						var normal = face.normal.clone();
						normal.applyMatrix3( normalMatrixWorld );

						for ( var j = 0; j < 3; j ++ ) {

							output += 'vn ' + normal.x + ' ' + normal.y + ' ' + normal.z + '\n';

							nbNormals ++;

						}

					}

				}

				// faces
				var indices = [];

				for ( var i = 0, j = 1, l = faces.length; i < l; i ++, j += 3 ) {

					var face = faces[ i ];

					for ( var m = 0; m < 3; m ++ ) {

					    indices[ m ] = ( indexVertex + face[ faceVertexKeys[ m ] ] + 1 ) + '/' + ( hasVertexUvs ? ( indexVertexUvs + j + m + 1 ) : '' ) + '/' + ( indexNormals + j + m );

					}

					output += 'f ' + indices.join( ' ' ) + "\n";

				}

			} else {

				console.warn( 'THREE.OBJExporter.parseMesh(): geometry type unsupported', mesh );

			}

			// update index
			indexVertex += nbVertex;
			indexVertexUvs += nbVertexUvs;
			indexNormals += nbNormals;

		};

		var parseLine = function( line ) {

			var geometry = line.geometry;
			var type = line.type;

			if ( geometry instanceof THREE.BufferGeometry ) {

				geometry = new THREE.Geometry().fromBufferGeometry( geometry );

			}

			if ( geometry instanceof THREE.Geometry ) {

				output += 'o ' + line.name + '\n';

				var vertices = geometry.vertices;

				for ( var i = 0, l = vertices.length; i < l; i++ ) {

					var vertex = vertices[ i ].clone();
					vertex.applyMatrix4( line.matrixWorld );

					output += 'v ' + vertex.x + ' ' + vertex.y + ' ' + vertex.z + '\n';

				}

				if ( type === 'Line' ) {

					output += 'l ';

					for ( var j = 1, m = vertices.length; j <= m; j++ ) {

						output += j + ' ';

					}

					output += '\n';

				}

				if ( type === 'LineSegments' ) {

					for ( var j = 1, k = j + 1, m = vertices.length; j < m; j += 2, k = j + 1 ) {

						output += 'l ' + j + ' ' + k + '\n';

					}

				}

			} else {

				console.warn('THREE.OBJExporter.parseLine(): geometry type unsupported', line);

			}
		};
		
		object.traverse( function ( child ) {

			if ( child instanceof THREE.Mesh ) {

				parseMesh( child );

			}

			if ( child instanceof THREE.Line ) {

				parseLine( child );

			}

		} );


		return output;

	}

};
