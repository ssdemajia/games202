
function loadOBJ(renderer, path, name) {

	const manager = new THREE.LoadingManager();
	manager.onProgress = function (item, loaded, total) {
		console.log("onProgress:", item, loaded, total);
	};

	function onProgress(xhr) {
		if (xhr.lengthComputable) {
			const percentComplete = xhr.loaded / xhr.total * 100;
			console.log('model ' + Math.round(percentComplete, 2) + '% downloaded');
		}
	}
	function onError() { }

	new THREE.MTLLoader(manager)
		.setPath(path)
		.load(name + '.mtl', async function (materials) {
			
			await materials.preload();
			console.log(materials);
			new THREE.OBJLoader(manager)
				.setMaterials(materials)
				.setPath(path)
				.load(name + '.obj', function (object) {
					object.traverse(async function (child) {
						console.log("load Obj:", child.isMesh == true, child);
						if (child.isMesh) {
							let geo = child.geometry;
							let mat;
							if (Array.isArray(child.material)) {
								mat = child.material[0];
							}
							else {
								mat = child.material;
							}
							mat = await mat;
							var indices = Array.from({ length: geo.attributes.position.count }, (v, k) => k);
							let mesh = new Mesh({ name: 'aVertexPosition', array: geo.attributes.position.array },
								{ name: 'aNormalPosition', array: geo.attributes.normal.array },
								{ name: 'aTextureCoord', array: geo.attributes.uv.array },
								indices);

							let colorMap = null;
							if (mat.map != null && mat.map.image != null) {
								colorMap = new Texture(renderer.gl, mat.map.image);
							}
							// MARK: You can change the myMaterial object to your own Material instance
							let textureSample = 0;
							let myMaterial;
							let uniforms = {
								'uKd': { type: '3fv', value: mat.color.toArray() },
								'uKs': { type: '3fv', value: mat.specular.toArray() },
							}
							if (colorMap != null) {
								textureSample = 1;
								uniforms['uSampler'] = { type: 'texture', value: colorMap };
							}
							uniforms['uTextureSample'] = { type: '1i', value: textureSample };
							myMaterial = new Material(uniforms, [], 'phongShader');
							let meshRender = new MeshRender(renderer.gl, mesh, myMaterial);
							renderer.addMesh(meshRender);
						}
					});
				}, onProgress, onError);
		});
}
